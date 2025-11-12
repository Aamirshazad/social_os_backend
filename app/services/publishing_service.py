"""
Publishing Service - Multi-platform post publishing
"""
from typing import Dict, Any, List
from sqlalchemy.orm import Session
import asyncio
import structlog

from app.services.platforms import (
    TwitterService, 
    LinkedInService, 
    FacebookService, 
    InstagramService,
    YouTubeService,
    TikTokService
)
from app.services.credential_service import CredentialService

logger = structlog.get_logger()


class PublishingService:
    """Service for publishing posts to multiple platforms"""
    
    # Platform service mapping
    PLATFORM_SERVICES = {
        "twitter": TwitterService(),
        "linkedin": LinkedInService(),
        "facebook": FacebookService(),
        "instagram": InstagramService(),
        "youtube": YouTubeService(),
        "tiktok": TikTokService(),
    }
    
    @staticmethod
    async def publish_to_platform(
        db: Session,
        workspace_id: str,
        platform: str,
        content: str,
        media_urls: List[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Publish content to a single platform
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            platform: Platform name
            content: Post content
            media_urls: List of media URLs
            **kwargs: Additional platform-specific parameters
        
        Returns:
            Publishing result with post_id, url, success status
        """
        try:
            # Get platform service
            service = PublishingService.PLATFORM_SERVICES.get(platform.lower())
            if not service:
                return {
                    "success": False,
                    "error": f"Platform {platform} not supported",
                    "platform": platform
                }
            
            # Get credentials
            credential = CredentialService.get_credential(
                db=db,
                workspace_id=workspace_id,
                platform=platform.lower(),
                decrypt=True
            )
            
            if not credential:
                return {
                    "success": False,
                    "error": f"No credentials found for {platform}",
                    "platform": platform
                }
            
            # Publish post
            result = await service.publish_post(
                access_token=credential.access_token,
                content=content,
                media_urls=media_urls,
                **kwargs
            )
            
            logger.info(
                "post_published",
                platform=platform,
                workspace_id=workspace_id,
                success=result.get("success")
            )
            
            return result
            
        except Exception as e:
            logger.error("publish_error", platform=platform, error=str(e))
            return {
                "success": False,
                "error": str(e),
                "platform": platform
            }
    
    @staticmethod
    async def publish_to_multiple_platforms(
        db: Session,
        workspace_id: str,
        platforms: List[str],
        content_by_platform: Dict[str, str],
        media_urls: List[str] = None,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """
        Publish content to multiple platforms concurrently
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            platforms: List of platform names
            content_by_platform: Dict mapping platform to content
            media_urls: List of media URLs
            **kwargs: Additional parameters
        
        Returns:
            List of publishing results
        """
        tasks = []
        
        for platform in platforms:
            # Get platform-specific content
            content = content_by_platform.get(platform, "")
            
            task = PublishingService.publish_to_platform(
                db=db,
                workspace_id=workspace_id,
                platform=platform,
                content=content,
                media_urls=media_urls,
                **kwargs
            )
            tasks.append(task)
        
        # Execute all publishing tasks concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append({
                    "success": False,
                    "error": str(result),
                    "platform": platforms[i]
                })
            else:
                processed_results.append(result)
        
        return processed_results
    
    @staticmethod
    async def verify_platform_credentials(
        db: Session,
        workspace_id: str,
        platform: str
    ) -> Dict[str, Any]:
        """
        Verify credentials for a platform
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            platform: Platform name
        
        Returns:
            Verification result
        """
        try:
            service = PublishingService.PLATFORM_SERVICES.get(platform.lower())
            if not service:
                return {"valid": False, "error": "Platform not supported"}
            
            credential = CredentialService.get_credential(
                db=db,
                workspace_id=workspace_id,
                platform=platform.lower(),
                decrypt=True
            )
            
            if not credential:
                return {"valid": False, "error": "No credentials found"}
            
            result = await service.verify_credentials(credential.access_token)
            
            return result
            
        except Exception as e:
            logger.error("verify_credentials_error", platform=platform, error=str(e))
            return {"valid": False, "error": str(e)}
