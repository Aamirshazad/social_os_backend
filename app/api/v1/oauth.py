"""
OAuth API endpoints - Social platform OAuth flows
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import httpx
import structlog

from app.database import get_db
from app.dependencies import get_current_active_user, get_workspace_id
from app.services.credential_service import CredentialService
from app.config import settings

logger = structlog.get_logger()
router = APIRouter()


@router.get("/twitter/authorize")
async def twitter_authorize(
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Initiate Twitter OAuth flow
    
    Returns authorization URL for user to grant access
    """
    if not settings.TWITTER_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Twitter OAuth not configured")
    
    # OAuth 2.0 PKCE flow
    state = f"{workspace_id}:twitter"
    
    auth_url = (
        f"https://twitter.com/i/oauth2/authorize?"
        f"response_type=code&"
        f"client_id={settings.TWITTER_CLIENT_ID}&"
        f"redirect_uri={settings.CALLBACK_URL}/twitter&"
        f"scope=tweet.read tweet.write users.read offline.access&"
        f"state={state}"
    )
    
    return {
        "success": True,
        "data": {
            "authorization_url": auth_url,
            "state": state
        }
    }


@router.get("/twitter/callback")
async def twitter_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    Twitter OAuth callback
    
    Exchanges authorization code for access token
    """
    try:
        # Parse state
        workspace_id, platform = state.split(":")
        
        # Exchange code for token
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.twitter.com/2/oauth2/token",
                data={
                    "code": code,
                    "grant_type": "authorization_code",
                    "client_id": settings.TWITTER_CLIENT_ID,
                    "redirect_uri": f"{settings.CALLBACK_URL}/twitter",
                    "code_verifier": "challenge"  # Should match PKCE challenge
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            if response.status_code == 200:
                token_data = response.json()
                
                # Store credentials
                CredentialService.store_credential(
                    db=db,
                    workspace_id=workspace_id,
                    platform="twitter",
                    access_token=token_data["access_token"],
                    refresh_token=token_data.get("refresh_token"),
                    token_expires_at=token_data.get("expires_in")
                )
                
                logger.info("twitter_oauth_success", workspace_id=workspace_id)
                
                return {
                    "success": True,
                    "message": "Twitter connected successfully",
                    "redirect_url": f"{settings.FRONTEND_URL}/settings/platforms"
                }
            else:
                raise Exception(f"Token exchange failed: {response.text}")
                
    except Exception as e:
        logger.error("twitter_oauth_error", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/linkedin/authorize")
async def linkedin_authorize(
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user)
):
    """Initiate LinkedIn OAuth flow"""
    if not settings.LINKEDIN_CLIENT_ID:
        raise HTTPException(status_code=400, detail="LinkedIn OAuth not configured")
    
    state = f"{workspace_id}:linkedin"
    
    auth_url = (
        f"https://www.linkedin.com/oauth/v2/authorization?"
        f"response_type=code&"
        f"client_id={settings.LINKEDIN_CLIENT_ID}&"
        f"redirect_uri={settings.CALLBACK_URL}/linkedin&"
        f"scope=w_member_social r_liteprofile&"
        f"state={state}"
    )
    
    return {"success": True, "data": {"authorization_url": auth_url}}


@router.get("/linkedin/callback")
async def linkedin_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db)
):
    """LinkedIn OAuth callback"""
    try:
        workspace_id, _ = state.split(":")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://www.linkedin.com/oauth/v2/accessToken",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": settings.LINKEDIN_CLIENT_ID,
                    "client_secret": settings.LINKEDIN_CLIENT_SECRET,
                    "redirect_uri": f"{settings.CALLBACK_URL}/linkedin"
                }
            )
            
            if response.status_code == 200:
                token_data = response.json()
                
                CredentialService.store_credential(
                    db=db,
                    workspace_id=workspace_id,
                    platform="linkedin",
                    access_token=token_data["access_token"],
                    token_expires_at=token_data.get("expires_in")
                )
                
                return {
                    "success": True,
                    "message": "LinkedIn connected successfully",
                    "redirect_url": f"{settings.FRONTEND_URL}/settings/platforms"
                }
                
    except Exception as e:
        logger.error("linkedin_oauth_error", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/facebook/authorize")
async def facebook_authorize(
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user)
):
    """Initiate Facebook OAuth flow"""
    if not settings.FACEBOOK_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Facebook OAuth not configured")
    
    state = f"{workspace_id}:facebook"
    
    auth_url = (
        f"https://www.facebook.com/v18.0/dialog/oauth?"
        f"client_id={settings.FACEBOOK_CLIENT_ID}&"
        f"redirect_uri={settings.CALLBACK_URL}/facebook&"
        f"scope=pages_manage_posts,pages_read_engagement&"
        f"state={state}"
    )
    
    return {"success": True, "data": {"authorization_url": auth_url}}


@router.get("/facebook/callback")
async def facebook_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db)
):
    """Facebook OAuth callback"""
    try:
        workspace_id, _ = state.split(":")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://graph.facebook.com/v18.0/oauth/access_token",
                params={
                    "client_id": settings.FACEBOOK_CLIENT_ID,
                    "client_secret": settings.FACEBOOK_CLIENT_SECRET,
                    "redirect_uri": f"{settings.CALLBACK_URL}/facebook",
                    "code": code
                }
            )
            
            if response.status_code == 200:
                token_data = response.json()
                
                CredentialService.store_credential(
                    db=db,
                    workspace_id=workspace_id,
                    platform="facebook",
                    access_token=token_data["access_token"]
                )
                
                return {
                    "success": True,
                    "message": "Facebook connected successfully",
                    "redirect_url": f"{settings.FRONTEND_URL}/settings/platforms"
                }
                
    except Exception as e:
        logger.error("facebook_oauth_error", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/youtube/authorize")
async def youtube_authorize(
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user)
):
    """Initiate YouTube OAuth flow"""
    if not settings.YOUTUBE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="YouTube OAuth not configured")
    
    state = f"{workspace_id}:youtube"
    
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.YOUTUBE_CLIENT_ID}&"
        f"redirect_uri={settings.CALLBACK_URL}/youtube&"
        f"response_type=code&"
        f"scope=https://www.googleapis.com/auth/youtube.upload&"
        f"access_type=offline&"
        f"state={state}"
    )
    
    return {"success": True, "data": {"authorization_url": auth_url}}


@router.get("/youtube/callback")
async def youtube_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db)
):
    """YouTube OAuth callback"""
    try:
        workspace_id, _ = state.split(":")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.YOUTUBE_CLIENT_ID,
                    "client_secret": settings.YOUTUBE_CLIENT_SECRET,
                    "redirect_uri": f"{settings.CALLBACK_URL}/youtube",
                    "grant_type": "authorization_code"
                }
            )
            
            if response.status_code == 200:
                token_data = response.json()
                
                CredentialService.store_credential(
                    db=db,
                    workspace_id=workspace_id,
                    platform="youtube",
                    access_token=token_data["access_token"],
                    refresh_token=token_data.get("refresh_token"),
                    token_expires_at=token_data.get("expires_in")
                )
                
                return {
                    "success": True,
                    "message": "YouTube connected successfully",
                    "redirect_url": f"{settings.FRONTEND_URL}/settings/platforms"
                }
                
    except Exception as e:
        logger.error("youtube_oauth_error", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/facebook/authorize")
async def facebook_authorize(
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Initiate Facebook OAuth flow
    
    Returns authorization URL for user to grant access
    """
    if not settings.FACEBOOK_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Facebook OAuth not configured")
    
    state = f"{workspace_id}:facebook"
    
    auth_url = (
        f"https://www.facebook.com/v18.0/dialog/oauth?"
        f"client_id={settings.FACEBOOK_CLIENT_ID}&"
        f"redirect_uri={settings.CALLBACK_URL}/facebook&"
        f"scope=pages_manage_posts,pages_read_engagement,publish_to_groups&"
        f"state={state}&"
        f"response_type=code"
    )
    
    return {
        "success": True,
        "data": {
            "authorization_url": auth_url,
            "state": state
        }
    }


@router.get("/facebook/callback")
async def facebook_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    Handle Facebook OAuth callback
    
    Exchange authorization code for access token and store credentials
    """
    try:
        # Parse state to get workspace_id
        workspace_id, platform = state.split(":")
        if platform != "facebook":
            raise HTTPException(status_code=400, detail="Invalid state parameter")
        
        # Import Facebook service
        from app.services.platforms.facebook_service import FacebookService
        facebook_service = FacebookService()
        
        # Exchange code for token
        token_data = await facebook_service.exchange_code_for_token(
            code=code,
            client_id=settings.FACEBOOK_CLIENT_ID,
            client_secret=settings.FACEBOOK_CLIENT_SECRET,
            redirect_uri=f"{settings.CALLBACK_URL}/facebook"
        )
        
        # Get user profile
        profile_data = await facebook_service.get_user_profile(
            access_token=token_data["access_token"]
        )
        
        # Store credentials
        credential_service = CredentialService(db)
        await credential_service.store_platform_credentials(
            workspace_id=workspace_id,
            platform="facebook",
            credentials={
                "access_token": token_data["access_token"],
                "token_type": token_data["token_type"],
                "expires_in": token_data["expires_in"],
                "user_id": profile_data["id"],
                "username": profile_data["username"],
                "name": profile_data["name"],
                "email": profile_data.get("email"),
                "profile_image_url": profile_data.get("profile_image_url")
            }
        )
        
        logger.info("facebook_oauth_success", workspace_id=workspace_id, user_id=profile_data["id"])
        
        return {
            "success": True,
            "message": "Facebook connected successfully",
            "redirect_url": f"{settings.FRONTEND_URL}/settings/platforms"
        }
        
    except Exception as e:
        logger.error("facebook_oauth_error", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/instagram/authorize")
async def instagram_authorize(
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Initiate Instagram OAuth flow
    
    Instagram uses Facebook OAuth with Instagram-specific scopes
    """
    if not settings.FACEBOOK_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Instagram OAuth not configured")
    
    state = f"{workspace_id}:instagram"
    
    auth_url = (
        f"https://www.facebook.com/v18.0/dialog/oauth?"
        f"client_id={settings.FACEBOOK_CLIENT_ID}&"
        f"redirect_uri={settings.CALLBACK_URL}/instagram&"
        f"scope=instagram_basic,instagram_content_publish,pages_read_engagement&"
        f"state={state}&"
        f"response_type=code"
    )
    
    return {
        "success": True,
        "data": {
            "authorization_url": auth_url,
            "state": state
        }
    }


@router.get("/instagram/callback")
async def instagram_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    Handle Instagram OAuth callback
    
    Exchange authorization code for access token and store credentials
    """
    try:
        # Parse state to get workspace_id
        workspace_id, platform = state.split(":")
        if platform != "instagram":
            raise HTTPException(status_code=400, detail="Invalid state parameter")
        
        # Import Instagram service
        from app.services.platforms.instagram_service import InstagramService
        instagram_service = InstagramService()
        
        # Exchange code for token
        token_data = await instagram_service.exchange_code_for_token(
            code=code,
            client_id=settings.FACEBOOK_CLIENT_ID,
            client_secret=settings.FACEBOOK_CLIENT_SECRET,
            redirect_uri=f"{settings.CALLBACK_URL}/instagram"
        )
        
        # Verify credentials and get Instagram account info
        credentials_info = await instagram_service.verify_credentials(
            access_token=token_data["access_token"]
        )
        
        if not credentials_info.get("valid"):
            raise HTTPException(status_code=400, detail="No Instagram business account found")
        
        # Get user profile
        profile_data = await instagram_service.get_user_profile(
            access_token=token_data["access_token"],
            instagram_account_id=credentials_info["user_id"]
        )
        
        # Store credentials
        credential_service = CredentialService(db)
        await credential_service.store_platform_credentials(
            workspace_id=workspace_id,
            platform="instagram",
            credentials={
                "access_token": token_data["access_token"],
                "token_type": token_data["token_type"],
                "expires_in": token_data["expires_in"],
                "user_id": credentials_info["user_id"],
                "page_id": credentials_info["page_id"],
                "username": profile_data["username"],
                "name": profile_data["name"],
                "profile_image_url": profile_data.get("profile_image_url"),
                "followers_count": profile_data.get("followers_count", 0)
            }
        )
        
        logger.info("instagram_oauth_success", workspace_id=workspace_id, user_id=credentials_info["user_id"])
        
        return {
            "success": True,
            "message": "Instagram connected successfully",
            "redirect_url": f"{settings.FRONTEND_URL}/settings/platforms"
        }
        
    except Exception as e:
        logger.error("instagram_oauth_error", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/linkedin/authorize")
async def linkedin_authorize(
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Initiate LinkedIn OAuth flow
    
    Returns authorization URL for user to grant access
    """
    if not settings.LINKEDIN_CLIENT_ID:
        raise HTTPException(status_code=400, detail="LinkedIn OAuth not configured")
    
    state = f"{workspace_id}:linkedin"
    
    auth_url = (
        f"https://www.linkedin.com/oauth/v2/authorization?"
        f"response_type=code&"
        f"client_id={settings.LINKEDIN_CLIENT_ID}&"
        f"redirect_uri={settings.CALLBACK_URL}/linkedin&"
        f"scope=r_liteprofile r_emailaddress w_member_social&"
        f"state={state}"
    )
    
    return {
        "success": True,
        "data": {
            "authorization_url": auth_url,
            "state": state
        }
    }


@router.get("/linkedin/callback")
async def linkedin_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    Handle LinkedIn OAuth callback
    
    Exchange authorization code for access token and store credentials
    """
    try:
        # Parse state to get workspace_id
        workspace_id, platform = state.split(":")
        if platform != "linkedin":
            raise HTTPException(status_code=400, detail="Invalid state parameter")
        
        # Import LinkedIn service
        from app.services.platforms.linkedin_service import LinkedInService
        linkedin_service = LinkedInService()
        
        # Exchange code for token
        token_data = await linkedin_service.exchange_code_for_token(
            code=code,
            client_id=settings.LINKEDIN_CLIENT_ID,
            client_secret=settings.LINKEDIN_CLIENT_SECRET,
            redirect_uri=f"{settings.CALLBACK_URL}/linkedin"
        )
        
        # Get user profile
        profile_data = await linkedin_service.get_user_profile(
            access_token=token_data["access_token"]
        )
        
        # Store credentials
        credential_service = CredentialService(db)
        await credential_service.store_platform_credentials(
            workspace_id=workspace_id,
            platform="linkedin",
            credentials={
                "access_token": token_data["access_token"],
                "token_type": token_data["token_type"],
                "expires_in": token_data["expires_in"],
                "user_id": profile_data["id"],
                "username": profile_data["username"],
                "name": profile_data["name"],
                "profile_image_url": profile_data.get("profile_image_url")
            }
        )
        
        logger.info("linkedin_oauth_success", workspace_id=workspace_id, user_id=profile_data["id"])
        
        return {
            "success": True,
            "message": "LinkedIn connected successfully",
            "redirect_url": f"{settings.FRONTEND_URL}/settings/platforms"
        }
        
    except Exception as e:
        logger.error("linkedin_oauth_error", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tiktok/authorize")
async def tiktok_authorize(
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Initiate TikTok OAuth flow
    
    Returns authorization URL for user to grant access
    """
    if not settings.TIKTOK_CLIENT_ID:
        raise HTTPException(status_code=400, detail="TikTok OAuth not configured")
    
    state = f"{workspace_id}:tiktok"
    
    auth_url = (
        f"https://www.tiktok.com/v2/auth/authorize/?"
        f"client_key={settings.TIKTOK_CLIENT_ID}&"
        f"response_type=code&"
        f"scope=user.info.basic,video.list,video.upload&"
        f"redirect_uri={settings.CALLBACK_URL}/tiktok&"
        f"state={state}"
    )
    
    return {
        "success": True,
        "data": {
            "authorization_url": auth_url,
            "state": state
        }
    }


@router.get("/tiktok/callback")
async def tiktok_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    Handle TikTok OAuth callback
    
    Exchange authorization code for access token and store credentials
    """
    try:
        # Parse state to get workspace_id
        workspace_id, platform = state.split(":")
        if platform != "tiktok":
            raise HTTPException(status_code=400, detail="Invalid state parameter")
        
        # Import TikTok service
        from app.services.platforms.tiktok_service import TikTokService
        tiktok_service = TikTokService()
        
        # Exchange code for token
        token_data = await tiktok_service.exchange_code_for_token(
            code=code,
            client_id=settings.TIKTOK_CLIENT_ID,
            client_secret=settings.TIKTOK_CLIENT_SECRET,
            redirect_uri=f"{settings.CALLBACK_URL}/tiktok"
        )
        
        # Get user profile
        profile_data = await tiktok_service.get_user_profile(
            access_token=token_data["access_token"]
        )
        
        # Store credentials
        credential_service = CredentialService(db)
        await credential_service.store_platform_credentials(
            workspace_id=workspace_id,
            platform="tiktok",
            credentials={
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token"),
                "token_type": token_data["token_type"],
                "expires_in": token_data["expires_in"],
                "user_id": profile_data["id"],
                "username": profile_data["username"],
                "name": profile_data["name"],
                "profile_image_url": profile_data.get("profile_image_url")
            }
        )
        
        logger.info("tiktok_oauth_success", workspace_id=workspace_id, user_id=profile_data["id"])
        
        return {
            "success": True,
            "message": "TikTok connected successfully",
            "redirect_url": f"{settings.FRONTEND_URL}/settings/platforms"
        }
        
    except Exception as e:
        logger.error("tiktok_oauth_error", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/twitter/authorize")
async def twitter_authorize(
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Initiate Twitter OAuth flow
    
    Returns authorization URL for user to grant access
    """
    if not settings.TWITTER_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Twitter OAuth not configured")
    
    state = f"{workspace_id}:twitter"
    
    auth_url = (
        f"https://twitter.com/i/oauth2/authorize?"
        f"response_type=code&"
        f"client_id={settings.TWITTER_CLIENT_ID}&"
        f"redirect_uri={settings.CALLBACK_URL}/twitter&"
        f"scope=tweet.read tweet.write users.read offline.access&"
        f"state={state}&"
        f"code_challenge_method=plain"
    )
    
    return {
        "success": True,
        "data": {
            "authorization_url": auth_url,
            "state": state
        }
    }


@router.get("/twitter/callback")
async def twitter_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    Handle Twitter OAuth callback
    
    Exchange authorization code for access token and store credentials
    """
    try:
        # Parse state to get workspace_id
        workspace_id, platform = state.split(":")
        if platform != "twitter":
            raise HTTPException(status_code=400, detail="Invalid state parameter")
        
        # Import Twitter service
        from app.services.platforms.twitter_service import TwitterService
        twitter_service = TwitterService()
        
        # Exchange code for token
        token_data = await twitter_service.exchange_code_for_token(
            code=code,
            client_id=settings.TWITTER_CLIENT_ID,
            client_secret=settings.TWITTER_CLIENT_SECRET,
            redirect_uri=f"{settings.CALLBACK_URL}/twitter"
        )
        
        # Get user profile
        profile_data = await twitter_service.get_user_profile(
            access_token=token_data["access_token"]
        )
        
        # Store credentials
        credential_service = CredentialService(db)
        await credential_service.store_platform_credentials(
            workspace_id=workspace_id,
            platform="twitter",
            credentials={
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token"),
                "token_type": token_data["token_type"],
                "expires_in": token_data["expires_in"],
                "scope": token_data.get("scope"),
                "user_id": profile_data["id"],
                "username": profile_data["username"],
                "name": profile_data["name"],
                "profile_image_url": profile_data.get("profile_image_url"),
                "verified": profile_data.get("verified", False)
            }
        )
        
        logger.info("twitter_oauth_success", workspace_id=workspace_id, user_id=profile_data["id"])
        
        return {
            "success": True,
            "message": "Twitter connected successfully",
            "redirect_url": f"{settings.FRONTEND_URL}/settings/platforms"
        }
        
    except Exception as e:
        logger.error("twitter_oauth_error", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
