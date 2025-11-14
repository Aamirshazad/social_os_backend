"""
OAuth API endpoints - Social platform OAuth flows
Production-ready implementation using Supabase auth helper and CredentialService.
"""
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.database import get_async_db
from app.core.auth_helper import verify_auth_and_get_user
from app.application.services.credential_service import CredentialService
from app.config import settings
from app.infrastructure.external.platforms.twitter import TwitterOAuthHandler
from app.infrastructure.external.platforms.facebook import FacebookOAuthHandler
from app.infrastructure.external.platforms.instagram import InstagramOAuthHandler
from app.infrastructure.external.platforms.linkedin import LinkedInOAuthHandler
from app.infrastructure.external.platforms.tiktok import TikTokOAuthHandler
from app.infrastructure.external.platforms.youtube import YouTubeOAuthHandler

logger = structlog.get_logger()
router = APIRouter()


def _build_state(workspace_id: str, platform: str) -> str:
    """Build OAuth state parameter that encodes workspace context."""
    return f"{workspace_id}:{platform}"


def _parse_state(state: str, expected_platform: str) -> str:
    """Parse and validate state, returning workspace_id or raising HTTPException."""
    try:
        workspace_id, platform = state.split(":", 1)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid state parameter",
        )

    if platform != expected_platform:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid state parameter",
        )

    return workspace_id


async def _store_credentials(
    db: AsyncSession,
    workspace_id: str,
    platform: str,
    token_data: Dict[str, Any],
    platform_user_id: str | None = None,
    platform_username: str | None = None,
) -> None:
    """Helper to persist OAuth tokens via CredentialService."""
    scopes_raw = token_data.get("scope")
    scopes = None
    if isinstance(scopes_raw, str):
        scopes = scopes_raw.split(" ")

    await CredentialService.store_platform_credentials(
        db=db,
        workspace_id=workspace_id,
        platform=platform,
        access_token=token_data["access_token"],
        refresh_token=token_data.get("refresh_token"),
        platform_user_id=platform_user_id,
        platform_username=platform_username,
        scopes=scopes,
        additional_data={
            "token_type": token_data.get("token_type"),
        },
        token_expires_at=str(token_data.get("expires_in")) if token_data.get("expires_in") else None,
    )


# ---------------------------------------------------------------------------
# Twitter
# ---------------------------------------------------------------------------


@router.get("/twitter/authorize")
async def twitter_authorize(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """Start Twitter OAuth flow for the current workspace."""
    if not settings.TWITTER_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Twitter OAuth not configured")

    user_id, user_data = await verify_auth_and_get_user(request, db)
    workspace_id = user_data["workspace_id"]
    state = _build_state(workspace_id, "twitter")

    scope = "tweet.read tweet.write users.read offline.access"
    auth_url = (
        "https://twitter.com/i/oauth2/authorize?"
        f"response_type=code&"
        f"client_id={settings.TWITTER_CLIENT_ID}&"
        f"redirect_uri={settings.CALLBACK_URL}/twitter&"
        f"scope={scope}&"
        f"state={state}"
    )

    return {
        "success": True,
        "data": {
            "authorization_url": auth_url,
            "state": state,
        },
    }


@router.get("/twitter/callback")
async def twitter_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_async_db),
):
    """Twitter OAuth callback: exchange code for token and store credentials."""
    if not settings.TWITTER_CLIENT_ID or not settings.TWITTER_CLIENT_SECRET:
        raise HTTPException(status_code=400, detail="Twitter OAuth not configured")

    try:
        workspace_id = _parse_state(state, "twitter")

        oauth_handler = TwitterOAuthHandler()
        token_data = await oauth_handler.exchange_code_for_token(
            code=code,
            client_id=settings.TWITTER_CLIENT_ID,
            client_secret=settings.TWITTER_CLIENT_SECRET,
            redirect_uri=f"{settings.CALLBACK_URL}/twitter",
        )

        await _store_credentials(db, workspace_id, "twitter", token_data)

        logger.info("twitter_oauth_success", workspace_id=workspace_id)
        redirect_url = f"{settings.FRONTEND_URL}/settings?tab=accounts&oauth_success=twitter"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)
    except Exception as e:
        logger.error("twitter_oauth_error", error=str(e))
        redirect_url = f"{settings.FRONTEND_URL}/settings?tab=accounts&oauth_error=oauth_error"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)


@router.get("/linkedin/authorize")
async def linkedin_authorize(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """Start LinkedIn OAuth flow for the current workspace."""
    if not settings.LINKEDIN_CLIENT_ID:
        raise HTTPException(status_code=400, detail="LinkedIn OAuth not configured")

    user_id, user_data = await verify_auth_and_get_user(request, db)
    workspace_id = user_data["workspace_id"]
    state = _build_state(workspace_id, "linkedin")

    scope = "r_liteprofile r_emailaddress w_member_social"
    auth_url = (
        "https://www.linkedin.com/oauth/v2/authorization?"
        f"response_type=code&"
        f"client_id={settings.LINKEDIN_CLIENT_ID}&"
        f"redirect_uri={settings.CALLBACK_URL}/linkedin&"
        f"scope={scope}&"
        f"state={state}"
    )

    return {
        "success": True,
        "data": {
            "authorization_url": auth_url,
            "state": state,
        },
    }


@router.get("/linkedin/callback")
async def linkedin_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_async_db),
):
    """LinkedIn OAuth callback: exchange code for token and store credentials."""
    if not settings.LINKEDIN_CLIENT_ID or not settings.LINKEDIN_CLIENT_SECRET:
        raise HTTPException(status_code=400, detail="LinkedIn OAuth not configured")

    try:
        workspace_id = _parse_state(state, "linkedin")

        oauth_handler = LinkedInOAuthHandler()
        token_data = await oauth_handler.exchange_code_for_token(
            code=code,
            client_id=settings.LINKEDIN_CLIENT_ID,
            client_secret=settings.LINKEDIN_CLIENT_SECRET,
            redirect_uri=f"{settings.CALLBACK_URL}/linkedin",
        )

        await _store_credentials(db, workspace_id, "linkedin", token_data)

        logger.info("linkedin_oauth_success", workspace_id=workspace_id)
        redirect_url = f"{settings.FRONTEND_URL}/settings?tab=accounts&oauth_success=linkedin"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)
    except Exception as e:
        logger.error("linkedin_oauth_error", error=str(e))
        redirect_url = f"{settings.FRONTEND_URL}/settings?tab=accounts&oauth_error=oauth_error"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)


@router.get("/facebook/authorize")
async def facebook_authorize(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """Start Facebook OAuth flow for the current workspace."""
    if not settings.FACEBOOK_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Facebook OAuth not configured")

    user_id, user_data = await verify_auth_and_get_user(request, db)
    workspace_id = user_data["workspace_id"]
    state = _build_state(workspace_id, "facebook")

    scope = "pages_manage_posts,pages_read_engagement"
    auth_url = (
        "https://www.facebook.com/v18.0/dialog/oauth?"
        f"client_id={settings.FACEBOOK_CLIENT_ID}&"
        f"redirect_uri={settings.CALLBACK_URL}/facebook&"
        f"scope={scope}&"
        f"state={state}&"
        "response_type=code"
    )

    return {
        "success": True,
        "data": {
            "authorization_url": auth_url,
            "state": state,
        },
    }


@router.get("/facebook/callback")
async def facebook_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_async_db),
):
    """Facebook OAuth callback: exchange code for token and store credentials."""
    if not settings.FACEBOOK_CLIENT_ID or not settings.FACEBOOK_CLIENT_SECRET:
        raise HTTPException(status_code=400, detail="Facebook OAuth not configured")

    try:
        workspace_id = _parse_state(state, "facebook")

        oauth_handler = FacebookOAuthHandler()
        token_data = await oauth_handler.exchange_code_for_token(
            code=code,
            client_id=settings.FACEBOOK_CLIENT_ID,
            client_secret=settings.FACEBOOK_CLIENT_SECRET,
            redirect_uri=f"{settings.CALLBACK_URL}/facebook",
        )

        await _store_credentials(db, workspace_id, "facebook", token_data)

        logger.info("facebook_oauth_success", workspace_id=workspace_id)
        redirect_url = f"{settings.FRONTEND_URL}/settings?tab=accounts&oauth_success=facebook"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)
    except Exception as e:
        logger.error("facebook_oauth_error", error=str(e))
        redirect_url = f"{settings.FRONTEND_URL}/settings?tab=accounts&oauth_error=oauth_error"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)


@router.get("/youtube/authorize")
async def youtube_authorize(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """Start YouTube OAuth flow for the current workspace."""
    if not settings.YOUTUBE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="YouTube OAuth not configured")

    user_id, user_data = await verify_auth_and_get_user(request, db)
    workspace_id = user_data["workspace_id"]
    state = _build_state(workspace_id, "youtube")

    scope = "https://www.googleapis.com/auth/youtube.upload"
    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.YOUTUBE_CLIENT_ID}&"
        f"redirect_uri={settings.CALLBACK_URL}/youtube&"
        "response_type=code&"
        f"scope={scope}&"
        "access_type=offline&"
        "include_granted_scopes=true&"
        f"state={state}"
    )

    return {
        "success": True,
        "data": {
            "authorization_url": auth_url,
            "state": state,
        },
    }


@router.get("/youtube/callback")
async def youtube_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_async_db),
):
    """YouTube OAuth callback: exchange code for token and store credentials."""
    if not settings.YOUTUBE_CLIENT_ID or not settings.YOUTUBE_CLIENT_SECRET:
        raise HTTPException(status_code=400, detail="YouTube OAuth not configured")

    try:
        workspace_id = _parse_state(state, "youtube")

        oauth_handler = YouTubeOAuthHandler()
        token_data = await oauth_handler.exchange_code_for_token(
            code=code,
            client_id=settings.YOUTUBE_CLIENT_ID,
            client_secret=settings.YOUTUBE_CLIENT_SECRET,
            redirect_uri=f"{settings.CALLBACK_URL}/youtube",
        )

        await _store_credentials(db, workspace_id, "youtube", token_data)

        logger.info("youtube_oauth_success", workspace_id=workspace_id)
        redirect_url = f"{settings.FRONTEND_URL}/settings?tab=accounts&oauth_success=youtube"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)
    except Exception as e:
        logger.error("youtube_oauth_error", error=str(e))
        redirect_url = f"{settings.FRONTEND_URL}/settings?tab=accounts&oauth_error=oauth_error"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)


@router.get("/instagram/authorize")
async def instagram_authorize(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """Start Instagram OAuth flow for the current workspace (via Facebook OAuth)."""
    if not settings.FACEBOOK_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Instagram OAuth not configured")

    user_id, user_data = await verify_auth_and_get_user(request, db)
    workspace_id = user_data["workspace_id"]
    state = _build_state(workspace_id, "instagram")

    scope = "instagram_basic,instagram_content_publish,pages_read_engagement"
    auth_url = (
        "https://www.facebook.com/v18.0/dialog/oauth?"
        f"client_id={settings.FACEBOOK_CLIENT_ID}&"
        f"redirect_uri={settings.CALLBACK_URL}/instagram&"
        f"scope={scope}&"
        f"state={state}&"
        "response_type=code"
    )

    return {
        "success": True,
        "data": {
            "authorization_url": auth_url,
            "state": state,
        },
    }


@router.get("/instagram/callback")
async def instagram_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_async_db),
):
    """Instagram OAuth callback: exchange code for token and store credentials."""
    if not settings.FACEBOOK_CLIENT_ID or not settings.FACEBOOK_CLIENT_SECRET:
        raise HTTPException(status_code=400, detail="Instagram OAuth not configured")

    try:
        workspace_id = _parse_state(state, "instagram")

        oauth_handler = InstagramOAuthHandler()
        token_data = await oauth_handler.exchange_code_for_token(
            code=code,
            client_id=settings.FACEBOOK_CLIENT_ID,
            client_secret=settings.FACEBOOK_CLIENT_SECRET,
            redirect_uri=f"{settings.CALLBACK_URL}/instagram",
        )

        await _store_credentials(db, workspace_id, "instagram", token_data)

        logger.info("instagram_oauth_success", workspace_id=workspace_id)
        redirect_url = f"{settings.FRONTEND_URL}/settings?tab=accounts&oauth_success=instagram"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)
    except Exception as e:
        logger.error("instagram_oauth_error", error=str(e))
        redirect_url = f"{settings.FRONTEND_URL}/settings?tab=accounts&oauth_error=oauth_error"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)


@router.get("/tiktok/authorize")
async def tiktok_authorize(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """Start TikTok OAuth flow for the current workspace."""
    if not settings.TIKTOK_CLIENT_ID:
        raise HTTPException(status_code=400, detail="TikTok OAuth not configured")

    user_id, user_data = await verify_auth_and_get_user(request, db)
    workspace_id = user_data["workspace_id"]
    state = _build_state(workspace_id, "tiktok")

    scope = "user.info.basic,video.list,video.upload"
    auth_url = (
        "https://www.tiktok.com/v2/auth/authorize/?"
        f"client_key={settings.TIKTOK_CLIENT_ID}&"
        "response_type=code&"
        f"scope={scope}&"
        f"redirect_uri={settings.CALLBACK_URL}/tiktok&"
        f"state={state}"
    )

    return {
        "success": True,
        "data": {
            "authorization_url": auth_url,
            "state": state,
        },
    }


@router.get("/tiktok/callback")
async def tiktok_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_async_db),
):
    """TikTok OAuth callback: exchange code for token and store credentials."""
    if not settings.TIKTOK_CLIENT_ID or not settings.TIKTOK_CLIENT_SECRET:
        raise HTTPException(status_code=400, detail="TikTok OAuth not configured")

    try:
        workspace_id = _parse_state(state, "tiktok")

        oauth_handler = TikTokOAuthHandler()
        token_data = await oauth_handler.exchange_code_for_token(
            code=code,
            client_id=settings.TIKTOK_CLIENT_ID,
            client_secret=settings.TIKTOK_CLIENT_SECRET,
            redirect_uri=f"{settings.CALLBACK_URL}/tiktok",
        )

        await _store_credentials(db, workspace_id, "tiktok", token_data)

        logger.info("tiktok_oauth_success", workspace_id=workspace_id)
        redirect_url = f"{settings.FRONTEND_URL}/settings?tab=accounts&oauth_success=tiktok"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)
    except Exception as e:
        logger.error("tiktok_oauth_error", error=str(e))
        redirect_url = f"{settings.FRONTEND_URL}/settings?tab=accounts&oauth_error=oauth_error"
        return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)
