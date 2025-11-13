"""
Platform API endpoints - Publishing and platform management
"""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.database import get_db
from app.dependencies import get_current_active_user, get_workspace_id
from app.application.services.publishing import PublisherService as PublishingService
from app.application.services.auth.authentication_service import AuthenticationService
from app.application.services.credential_service import CredentialService
import structlog

logger = structlog.get_logger()
router = APIRouter()


class PublishRequest(BaseModel):
    """Request schema for publishing a post"""
    platform: str = Field(..., description="Platform name (twitter, linkedin, facebook, instagram)")
    content: str = Field(..., min_length=1, max_length=10000)
    media_urls: List[str] = Field(default_factory=list)
    additional_params: Dict[str, Any] = Field(default_factory=dict)


class MultiPlatformPublishRequest(BaseModel):
    """Request schema for publishing to multiple platforms"""
    platforms: List[str] = Field(..., min_items=1)
    content_by_platform: Dict[str, str] = Field(...)
    media_urls: List[str] = Field(default_factory=list)


class VerifyCredentialsResponse(BaseModel):
    """Response schema for credential verification"""
    valid: bool
    user_id: str = None
    username: str = None
    error: str = None


@router.post("/publish")
async def publish_to_platform(
    request: PublishRequest,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Publish content to a single platform
    
    Requires platform credentials to be connected first
    """
    try:
        result = await PublishingService.publish_to_platform(
            db=db,
            workspace_id=workspace_id,
            platform=request.platform,
            content=request.content,
            media_urls=request.media_urls,
            **request.additional_params
        )
        
        if result.get("success"):
            return {
                "success": True,
                "data": result,
                "message": f"Post published successfully to {request.platform}"
            }
        else:
            return {
                "success": False,
                "error": result.get("error"),
                "platform": request.platform
            }
            
    except Exception as e:
        logger.error("publish_endpoint_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/publish/multiple")
async def publish_to_multiple_platforms(
    request: MultiPlatformPublishRequest,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Publish content to multiple platforms concurrently
    
    Each platform can have customized content
    """
    try:
        results = await PublishingService.publish_to_multiple_platforms(
            db=db,
            workspace_id=workspace_id,
            platforms=request.platforms,
            content_by_platform=request.content_by_platform,
            media_urls=request.media_urls
        )
        
        # Count successes
        success_count = sum(1 for r in results if r.get("success"))
        
        return {
            "success": True,
            "data": {
                "results": results,
                "total": len(results),
                "successful": success_count,
                "failed": len(results) - success_count
            },
            "message": f"Published to {success_count}/{len(results)} platforms"
        }
        
    except Exception as e:
        logger.error("multi_publish_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{platform}/verify")
async def verify_platform_credentials(
    platform: str,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Verify credentials for a platform
    
    Returns account information if credentials are valid
    """
    result = await PublishingService.verify_platform_credentials(
        db=db,
        workspace_id=workspace_id,
        platform=platform
    )
    
    return {
        "success": result.get("valid", False),
        "data": result,
        "platform": platform
    }


@router.get("/credentials/status")
async def get_credentials_status(
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get status of all platform credentials
    
    Returns list of connected platforms with metadata
    """
    credentials = CredentialService.get_all_credentials(
        db=db,
        workspace_id=workspace_id
    )
    
    return {
        "success": True,
        "data": {
            "credentials": credentials,
            "total": len(credentials)
        }
    }


@router.delete("/{platform}/disconnect")
async def disconnect_platform(
    platform: str,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Disconnect a platform by deleting its credentials
    """
    try:
        CredentialService.delete_credential(
            db=db,
            workspace_id=workspace_id,
            platform=platform
        )
        
        logger.info(
            "platform_disconnected",
            platform=platform,
            workspace_id=workspace_id
        )
        
        return {
            "success": True,
            "message": f"{platform} disconnected successfully"
        }
        
    except Exception as e:
        logger.error("disconnect_error", platform=platform, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


# Facebook-specific endpoints
class FacebookPostRequest(BaseModel):
    """Request schema for Facebook post"""
    content: str = Field(..., min_length=1, max_length=63206)
    media_urls: List[str] = Field(default_factory=list)
    page_id: str = Field(None, description="Facebook page ID (optional)")


class FacebookScheduleRequest(BaseModel):
    """Request schema for Facebook scheduled post"""
    content: str = Field(..., min_length=1, max_length=63206)
    scheduled_time: int = Field(..., description="Unix timestamp for scheduling")
    media_urls: List[str] = Field(default_factory=list)
    page_id: str = Field(None, description="Facebook page ID (optional)")


@router.post("/facebook/post")
async def facebook_post(
    request: FacebookPostRequest,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Post content to Facebook
    """
    try:
        # Get Facebook credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="facebook"
        )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Facebook credentials not found"
            )
        
        # Import and use Facebook publisher
        from app.infrastructure.external.platforms.facebook import FacebookPublisher
        facebook_publisher = FacebookPublisher()
        
        result = await facebook_publisher.publish_post(
            access_token=credentials["access_token"],
            content=request.content,
            media_urls=request.media_urls,
            page_id=request.page_id
        )
        
        logger.info("facebook_post_published", workspace_id=workspace_id, result=result)
        
        return result
        
    except Exception as e:
        logger.error("facebook_post_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/facebook/schedule")
async def facebook_schedule_post(
    request: FacebookScheduleRequest,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Schedule a Facebook post
    """
    try:
        # Get Facebook credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="facebook"
        )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Facebook credentials not found"
            )
        
        # Import and use Facebook publisher
        from app.infrastructure.external.platforms.facebook import FacebookPublisher
        facebook_publisher = FacebookPublisher()
        
        result = await facebook_publisher.schedule_post(
            access_token=credentials["access_token"],
            content=request.content,
            scheduled_time=request.scheduled_time,
            media_urls=request.media_urls,
            page_id=request.page_id
        )
        
        logger.info("facebook_post_scheduled", workspace_id=workspace_id, result=result)
        
        return result
        
    except Exception as e:
        logger.error("facebook_schedule_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/facebook/upload-media")
async def facebook_upload_media(
    media_url: str,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Upload media to Facebook
    """
    try:
        # Get Facebook credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="facebook"
        )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Facebook credentials not found"
            )
        
        # Import and use Facebook publisher
        from app.infrastructure.external.platforms.facebook import FacebookPublisher
        facebook_publisher = FacebookPublisher()
        
        result = await facebook_publisher.upload_media(
            access_token=credentials["access_token"],
            media_url=media_url
        )
        
        logger.info("facebook_media_uploaded", workspace_id=workspace_id, result=result)
        
        return result
        
    except Exception as e:
        logger.error("facebook_upload_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/facebook/post/{post_id}/metrics")
async def facebook_post_metrics(
    post_id: str,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get Facebook post analytics
    """
    try:
        # Get Facebook credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="facebook"
        )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Facebook credentials not found"
            )
        
        # Import and use Facebook publisher
        from app.infrastructure.external.platforms.facebook import FacebookPublisher
        facebook_publisher = FacebookPublisher()
        
        result = await facebook_publisher.get_post_metrics(
            access_token=credentials["access_token"],
            post_id=post_id
        )
        
        return result
        
    except Exception as e:
        logger.error("facebook_metrics_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/facebook/verify")
async def facebook_verify_credentials(
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Verify Facebook credentials
    """
    try:
        # Get Facebook credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="facebook"
        )
        
        if not credentials:
            return {"valid": False, "error": "No credentials found"}
        
        # Import and use Facebook publisher
        from app.infrastructure.external.platforms.facebook import FacebookPublisher
        facebook_publisher = FacebookPublisher()
        
        result = await facebook_publisher.verify_credentials(
            access_token=credentials["access_token"]
        )
        
        return result
        
    except Exception as e:
        logger.error("facebook_verify_error", error=str(e))
        return {"valid": False, "error": str(e)}


# Instagram-specific endpoints
class InstagramPostRequest(BaseModel):
    """Request schema for Instagram post"""
    content: str = Field(..., min_length=1, max_length=2200)
    media_urls: List[str] = Field(..., min_items=1, description="Instagram requires at least one media item")
    instagram_account_id: str = Field(..., description="Instagram business account ID")


class InstagramScheduleRequest(BaseModel):
    """Request schema for Instagram scheduled post"""
    content: str = Field(..., min_length=1, max_length=2200)
    scheduled_time: int = Field(..., description="Unix timestamp for scheduling")
    media_urls: List[str] = Field(..., min_items=1, description="Instagram requires at least one media item")
    instagram_account_id: str = Field(..., description="Instagram business account ID")


@router.post("/instagram/post")
async def instagram_post(
    request: InstagramPostRequest,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Post content to Instagram
    """
    try:
        # Get Instagram credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="instagram"
        )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Instagram credentials not found"
            )
        
        # Import and use Instagram publisher
        from app.infrastructure.external.platforms.instagram import InstagramPublisher
        instagram_publisher = InstagramPublisher()
        
        result = await instagram_publisher.publish_post(
            access_token=credentials["access_token"],
            content=request.content,
            media_urls=request.media_urls,
            instagram_account_id=request.instagram_account_id
        )
        
        logger.info("instagram_post_published", workspace_id=workspace_id, result=result)
        
        return result
        
    except Exception as e:
        logger.error("instagram_post_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/instagram/schedule")
async def instagram_schedule_post(
    request: InstagramScheduleRequest,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Schedule an Instagram post
    """
    try:
        # Get Instagram credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="instagram"
        )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Instagram credentials not found"
            )
        
        # Import and use Instagram publisher
        from app.infrastructure.external.platforms.instagram import InstagramPublisher
        instagram_publisher = InstagramPublisher()
        
        result = await instagram_publisher.schedule_post(
            access_token=credentials["access_token"],
            content=request.content,
            scheduled_time=request.scheduled_time,
            media_urls=request.media_urls,
            instagram_account_id=request.instagram_account_id
        )
        
        logger.info("instagram_post_scheduled", workspace_id=workspace_id, result=result)
        
        return result
        
    except Exception as e:
        logger.error("instagram_schedule_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/instagram/upload-media")
async def instagram_upload_media(
    media_url: str,
    instagram_account_id: str,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Upload media to Instagram
    """
    try:
        # Get Instagram credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="instagram"
        )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Instagram credentials not found"
            )
        
        # Import and use Instagram publisher
        from app.infrastructure.external.platforms.instagram import InstagramPublisher
        instagram_publisher = InstagramPublisher()
        
        result = await instagram_publisher.upload_media(
            access_token=credentials["access_token"],
            media_url=media_url,
            instagram_account_id=instagram_account_id
        )
        
        logger.info("instagram_media_uploaded", workspace_id=workspace_id, result=result)
        
        return result
        
    except Exception as e:
        logger.error("instagram_upload_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/instagram/post/{post_id}/metrics")
async def instagram_post_metrics(
    post_id: str,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get Instagram post analytics
    """
    try:
        # Get Instagram credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="instagram"
        )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Instagram credentials not found"
            )
        
        # Import and use Instagram publisher
        from app.infrastructure.external.platforms.instagram import InstagramPublisher
        instagram_publisher = InstagramPublisher()
        
        result = await instagram_publisher.get_post_metrics(
            access_token=credentials["access_token"],
            post_id=post_id
        )
        
        return result
        
    except Exception as e:
        logger.error("instagram_metrics_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/instagram/verify")
async def instagram_verify_credentials(
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Verify Instagram credentials
    """
    try:
        # Get Instagram credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="instagram"
        )
        
        if not credentials:
            return {"valid": False, "error": "No credentials found"}
        
        # Import and use Instagram publisher
        from app.infrastructure.external.platforms.instagram import InstagramPublisher
        instagram_publisher = InstagramPublisher()
        
        result = await instagram_publisher.verify_credentials(
            access_token=credentials["access_token"]
        )
        
        return result
        
    except Exception as e:
        logger.error("instagram_verify_error", error=str(e))
        return {"valid": False, "error": str(e)}


# LinkedIn-specific endpoints
class LinkedInPostRequest(BaseModel):
    """Request schema for LinkedIn post"""
    content: str = Field(..., min_length=1, max_length=3000)
    media_urls: List[str] = Field(default_factory=list)
    person_urn: str = Field(None, description="LinkedIn person URN (optional)")


class LinkedInScheduleRequest(BaseModel):
    """Request schema for LinkedIn scheduled post"""
    content: str = Field(..., min_length=1, max_length=3000)
    scheduled_time: int = Field(..., description="Unix timestamp for scheduling")
    media_urls: List[str] = Field(default_factory=list)
    person_urn: str = Field(None, description="LinkedIn person URN (optional)")


@router.post("/linkedin/post")
async def linkedin_post(
    request: LinkedInPostRequest,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Post content to LinkedIn
    """
    try:
        # Get LinkedIn credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="linkedin"
        )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="LinkedIn credentials not found"
            )
        
        # Import and use LinkedIn publisher
        from app.infrastructure.external.platforms.linkedin import LinkedInPublisher
        linkedin_publisher = LinkedInPublisher()
        
        result = await linkedin_publisher.publish_post(
            access_token=credentials["access_token"],
            content=request.content,
            media_urls=request.media_urls,
            person_urn=request.person_urn or f"urn:li:person:{credentials['user_id']}"
        )
        
        logger.info("linkedin_post_published", workspace_id=workspace_id, result=result)
        
        return result
        
    except Exception as e:
        logger.error("linkedin_post_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/linkedin/schedule")
async def linkedin_schedule_post(
    request: LinkedInScheduleRequest,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Schedule a LinkedIn post (creates as draft)
    """
    try:
        # Get LinkedIn credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="linkedin"
        )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="LinkedIn credentials not found"
            )
        
        # Import and use LinkedIn publisher
        from app.infrastructure.external.platforms.linkedin import LinkedInPublisher
        linkedin_publisher = LinkedInPublisher()
        
        result = await linkedin_publisher.schedule_post(
            access_token=credentials["access_token"],
            content=request.content,
            scheduled_time=request.scheduled_time,
            media_urls=request.media_urls,
            person_urn=request.person_urn or f"urn:li:person:{credentials['user_id']}"
        )
        
        logger.info("linkedin_post_scheduled", workspace_id=workspace_id, result=result)
        
        return result
        
    except Exception as e:
        logger.error("linkedin_schedule_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/linkedin/upload-media")
async def linkedin_upload_media(
    media_url: str,
    person_urn: str = None,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Upload media to LinkedIn
    """
    try:
        # Get LinkedIn credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="linkedin"
        )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="LinkedIn credentials not found"
            )
        
        # Import and use LinkedIn publisher
        from app.infrastructure.external.platforms.linkedin import LinkedInPublisher
        linkedin_publisher = LinkedInPublisher()
        
        result = await linkedin_publisher.upload_media(
            access_token=credentials["access_token"],
            media_url=media_url,
            person_urn=person_urn or f"urn:li:person:{credentials['user_id']}"
        )
        
        logger.info("linkedin_media_uploaded", workspace_id=workspace_id, result=result)
        
        return result
        
    except Exception as e:
        logger.error("linkedin_upload_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/linkedin/post/{post_id}/metrics")
async def linkedin_post_metrics(
    post_id: str,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get LinkedIn post analytics
    """
    try:
        # Get LinkedIn credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="linkedin"
        )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="LinkedIn credentials not found"
            )
        
        # Import and use LinkedIn publisher
        from app.infrastructure.external.platforms.linkedin import LinkedInPublisher
        linkedin_publisher = LinkedInPublisher()
        
        result = await linkedin_publisher.get_post_metrics(
            access_token=credentials["access_token"],
            post_id=post_id
        )
        
        return result
        
    except Exception as e:
        logger.error("linkedin_metrics_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/linkedin/verify")
async def linkedin_verify_credentials(
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Verify LinkedIn credentials
    """
    try:
        # Get LinkedIn credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="linkedin"
        )
        
        if not credentials:
            return {"valid": False, "error": "No credentials found"}
        
        # Import and use LinkedIn publisher
        from app.infrastructure.external.platforms.linkedin import LinkedInPublisher
        linkedin_publisher = LinkedInPublisher()
        
        result = await linkedin_publisher.verify_credentials(
            access_token=credentials["access_token"]
        )
        
        return result
        
    except Exception as e:
        logger.error("linkedin_verify_error", error=str(e))
        return {"valid": False, "error": str(e)}


# TikTok-specific endpoints
class TikTokPostRequest(BaseModel):
    """Request schema for TikTok post"""
    content: str = Field(..., min_length=1, max_length=2200)
    media_urls: List[str] = Field(..., min_items=1, description="TikTok requires at least one video")
    privacy_level: str = Field(default="PUBLIC_TO_EVERYONE")
    disable_duet: bool = Field(default=False)
    disable_comment: bool = Field(default=False)
    disable_stitch: bool = Field(default=False)


class TikTokScheduleRequest(BaseModel):
    """Request schema for TikTok scheduled post (not supported)"""
    content: str = Field(..., min_length=1, max_length=2200)
    scheduled_time: int = Field(..., description="Unix timestamp for scheduling")
    media_urls: List[str] = Field(..., min_items=1, description="TikTok requires at least one video")


@router.post("/tiktok/post")
async def tiktok_post(
    request: TikTokPostRequest,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Post content to TikTok
    """
    try:
        # Get TikTok credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="tiktok"
        )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="TikTok credentials not found"
            )
        
        # Import and use TikTok publisher
        from app.infrastructure.external.platforms.tiktok import TikTokPublisher
        tiktok_publisher = TikTokPublisher()
        
        result = await tiktok_publisher.publish_post(
            access_token=credentials["access_token"],
            content=request.content,
            media_urls=request.media_urls,
            privacy_level=request.privacy_level,
            disable_duet=request.disable_duet,
            disable_comment=request.disable_comment,
            disable_stitch=request.disable_stitch
        )
        
        logger.info("tiktok_post_published", workspace_id=workspace_id, result=result)
        
        return result
        
    except Exception as e:
        logger.error("tiktok_post_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/tiktok/schedule")
async def tiktok_schedule_post(
    request: TikTokScheduleRequest,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Schedule a TikTok post (not supported by TikTok API)
    """
    try:
        # Get TikTok credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="tiktok"
        )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="TikTok credentials not found"
            )
        
        # Import and use TikTok publisher
        from app.infrastructure.external.platforms.tiktok import TikTokPublisher
        tiktok_publisher = TikTokPublisher()
        
        result = await tiktok_publisher.schedule_post(
            access_token=credentials["access_token"],
            content=request.content,
            scheduled_time=request.scheduled_time,
            media_urls=request.media_urls
        )
        
        logger.info("tiktok_post_schedule_attempted", workspace_id=workspace_id, result=result)
        
        return result
        
    except Exception as e:
        logger.error("tiktok_schedule_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/tiktok/upload-media")
async def tiktok_upload_media(
    media_url: str,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Upload media to TikTok
    """
    try:
        # Get TikTok credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="tiktok"
        )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="TikTok credentials not found"
            )
        
        # Import and use TikTok publisher
        from app.infrastructure.external.platforms.tiktok import TikTokPublisher
        tiktok_publisher = TikTokPublisher()
        
        result = await tiktok_publisher.upload_media(
            access_token=credentials["access_token"],
            media_url=media_url
        )
        
        logger.info("tiktok_media_uploaded", workspace_id=workspace_id, result=result)
        
        return result
        
    except Exception as e:
        logger.error("tiktok_upload_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/tiktok/post/{post_id}/metrics")
async def tiktok_post_metrics(
    post_id: str,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get TikTok post analytics
    """
    try:
        # Get TikTok credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="tiktok"
        )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="TikTok credentials not found"
            )
        
        # Import and use TikTok publisher
        from app.infrastructure.external.platforms.tiktok import TikTokPublisher
        tiktok_publisher = TikTokPublisher()
        
        result = await tiktok_publisher.get_post_metrics(
            access_token=credentials["access_token"],
            post_id=post_id
        )
        
        return result
        
    except Exception as e:
        logger.error("tiktok_metrics_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/tiktok/verify")
async def tiktok_verify_credentials(
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Verify TikTok credentials
    """
    try:
        # Get TikTok credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="tiktok"
        )
        
        if not credentials:
            return {"valid": False, "error": "No credentials found"}
        
        # Import and use TikTok publisher
        from app.infrastructure.external.platforms.tiktok import TikTokPublisher
        tiktok_publisher = TikTokPublisher()
        
        result = await tiktok_publisher.verify_credentials(
            access_token=credentials["access_token"]
        )
        
        return result
        
    except Exception as e:
        logger.error("tiktok_verify_error", error=str(e))
        return {"valid": False, "error": str(e)}


# Twitter-specific endpoints
class TwitterPostRequest(BaseModel):
    """Request schema for Twitter post"""
    content: str = Field(..., min_length=1, max_length=280)
    media_urls: List[str] = Field(default_factory=list)
    reply_settings: str = Field(default="everyone")


class TwitterScheduleRequest(BaseModel):
    """Request schema for Twitter scheduled post (not supported)"""
    content: str = Field(..., min_length=1, max_length=280)
    scheduled_time: int = Field(..., description="Unix timestamp for scheduling")
    media_urls: List[str] = Field(default_factory=list)


@router.post("/twitter/post")
async def twitter_post(
    request: TwitterPostRequest,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Post content to Twitter
    """
    try:
        # Get Twitter credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="twitter"
        )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Twitter credentials not found"
            )
        
        # Import and use Twitter publisher
        from app.infrastructure.external.platforms.twitter import TwitterPublisher
        twitter_publisher = TwitterPublisher()
        
        result = await twitter_publisher.publish_post(
            access_token=credentials["access_token"],
            content=request.content,
            media_urls=request.media_urls,
            reply_settings=request.reply_settings
        )
        
        logger.info("twitter_post_published", workspace_id=workspace_id, result=result)
        
        return result
        
    except Exception as e:
        logger.error("twitter_post_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/twitter/schedule")
async def twitter_schedule_post(
    request: TwitterScheduleRequest,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Schedule a Twitter post (not supported by Twitter API)
    """
    try:
        # Get Twitter credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="twitter"
        )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Twitter credentials not found"
            )
        
        # Import and use Twitter publisher
        from app.infrastructure.external.platforms.twitter import TwitterPublisher
        twitter_publisher = TwitterPublisher()
        
        result = await twitter_publisher.schedule_post(
            access_token=credentials["access_token"],
            content=request.content,
            scheduled_time=request.scheduled_time,
            media_urls=request.media_urls
        )
        
        logger.info("twitter_post_schedule_attempted", workspace_id=workspace_id, result=result)
        
        return result
        
    except Exception as e:
        logger.error("twitter_schedule_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/twitter/upload-media")
async def twitter_upload_media(
    media_url: str,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Upload media to Twitter
    """
    try:
        # Get Twitter credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="twitter"
        )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Twitter credentials not found"
            )
        
        # Import and use Twitter publisher
        from app.infrastructure.external.platforms.twitter import TwitterPublisher
        twitter_publisher = TwitterPublisher()
        
        result = await twitter_publisher.upload_media(
            access_token=credentials["access_token"],
            media_url=media_url
        )
        
        logger.info("twitter_media_uploaded", workspace_id=workspace_id, result=result)
        
        return result
        
    except Exception as e:
        logger.error("twitter_upload_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/twitter/post/{post_id}/metrics")
async def twitter_post_metrics(
    post_id: str,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get Twitter post analytics
    """
    try:
        # Get Twitter credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="twitter"
        )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Twitter credentials not found"
            )
        
        # Import and use Twitter publisher
        from app.infrastructure.external.platforms.twitter import TwitterPublisher
        twitter_publisher = TwitterPublisher()
        
        result = await twitter_publisher.get_post_metrics(
            access_token=credentials["access_token"],
            post_id=post_id
        )
        
        return result
        
    except Exception as e:
        logger.error("twitter_metrics_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/twitter/verify")
async def twitter_verify_credentials(
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Verify Twitter credentials
    """
    try:
        # Get Twitter credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="twitter"
        )
        
        if not credentials:
            return {"valid": False, "error": "No credentials found"}
        
        # Import and use Twitter publisher
        from app.infrastructure.external.platforms.twitter import TwitterPublisher
        twitter_publisher = TwitterPublisher()
        
        result = await twitter_publisher.verify_credentials(
            access_token=credentials["access_token"]
        )
        
        return result
        
    except Exception as e:
        logger.error("twitter_verify_error", error=str(e))
        return {"valid": False, "error": str(e)}


# YouTube-specific endpoints
class YouTubePostRequest(BaseModel):
    """Request schema for YouTube post"""
    content: str = Field(..., min_length=1, max_length=5000)
    media_urls: List[str] = Field(..., min_items=1, description="YouTube requires at least one video")
    title: str = Field(..., min_length=1, max_length=100)
    category_id: str = Field(default="22", description="Video category (22 = People & Blogs)")
    privacy_status: str = Field(default="public", description="public, private, unlisted")
    tags: List[str] = Field(default_factory=list)


class YouTubeScheduleRequest(BaseModel):
    """Request schema for YouTube scheduled post"""
    content: str = Field(..., min_length=1, max_length=5000)
    scheduled_time: int = Field(..., description="Unix timestamp for scheduling")
    media_urls: List[str] = Field(..., min_items=1, description="YouTube requires at least one video")
    title: str = Field(..., min_length=1, max_length=100)
    category_id: str = Field(default="22")
    privacy_status: str = Field(default="public")
    tags: List[str] = Field(default_factory=list)


@router.post("/youtube/post")
async def youtube_post(
    request: YouTubePostRequest,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Post content to YouTube
    """
    try:
        # Get YouTube credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="youtube"
        )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="YouTube credentials not found"
            )
        
        # Import and use YouTube publisher
        from app.infrastructure.external.platforms.youtube import YouTubePublisher
        youtube_publisher = YouTubePublisher()
        
        result = await youtube_publisher.publish_post(
            access_token=credentials["access_token"],
            content=request.content,
            media_urls=request.media_urls,
            post_type="video",
            title=request.title,
            category_id=request.category_id,
            privacy_status=request.privacy_status,
            tags=request.tags
        )
        
        logger.info("youtube_post_published", workspace_id=workspace_id, result=result)
        
        return result
        
    except Exception as e:
        logger.error("youtube_post_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/youtube/schedule")
async def youtube_schedule_post(
    request: YouTubeScheduleRequest,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Schedule a YouTube video
    """
    try:
        # Get YouTube credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="youtube"
        )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="YouTube credentials not found"
            )
        
        # Import and use YouTube publisher
        from app.infrastructure.external.platforms.youtube import YouTubePublisher
        youtube_publisher = YouTubePublisher()
        
        result = await youtube_publisher.schedule_post(
            access_token=credentials["access_token"],
            content=request.content,
            scheduled_time=request.scheduled_time,
            media_urls=request.media_urls,
            title=request.title
        )
        
        logger.info("youtube_post_scheduled", workspace_id=workspace_id, result=result)
        
        return result
        
    except Exception as e:
        logger.error("youtube_schedule_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/youtube/upload-media")
async def youtube_upload_media(
    media_url: str,
    title: str = "Untitled Video",
    description: str = "",
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Upload media to YouTube
    """
    try:
        # Get YouTube credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="youtube"
        )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="YouTube credentials not found"
            )
        
        # Import and use YouTube publisher
        from app.infrastructure.external.platforms.youtube import YouTubePublisher
        youtube_publisher = YouTubePublisher()
        
        result = await youtube_publisher.upload_media(
            access_token=credentials["access_token"],
            media_url=media_url,
            title=title,
            description=description
        )
        
        logger.info("youtube_media_uploaded", workspace_id=workspace_id, result=result)
        
        return result
        
    except Exception as e:
        logger.error("youtube_upload_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/youtube/post/{post_id}/metrics")
async def youtube_post_metrics(
    post_id: str,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get YouTube video analytics
    """
    try:
        # Get YouTube credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="youtube"
        )
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="YouTube credentials not found"
            )
        
        # Import and use YouTube publisher
        from app.infrastructure.external.platforms.youtube import YouTubePublisher
        youtube_publisher = YouTubePublisher()
        
        result = await youtube_publisher.get_post_metrics(
            access_token=credentials["access_token"],
            post_id=post_id
        )
        
        return result
        
    except Exception as e:
        logger.error("youtube_metrics_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/youtube/verify")
async def youtube_verify_credentials(
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Verify YouTube credentials
    """
    try:
        # Get YouTube credentials
        credential_service = CredentialService(db)
        credentials = credential_service.get_platform_credentials_sync(
            workspace_id=workspace_id,
            platform="youtube"
        )
        
        if not credentials:
            return {"valid": False, "error": "No credentials found"}
        
        # Import and use YouTube publisher
        from app.infrastructure.external.platforms.youtube import YouTubePublisher
        youtube_publisher = YouTubePublisher()
        
        result = await youtube_publisher.verify_credentials(
            access_token=credentials["access_token"]
        )
        
        return result
        
    except Exception as e:
        logger.error("youtube_verify_error", error=str(e))
        return {"valid": False, "error": str(e)}
