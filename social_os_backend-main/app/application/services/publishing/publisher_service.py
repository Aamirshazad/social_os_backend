"""
Publisher Service - Multi-platform content publishing via Supabase HTTP
"""
from typing import Dict, Any, List
import asyncio
import structlog

from app.infrastructure.external.platforms import (
    TwitterPublisher, LinkedInPublisher, FacebookPublisher, 
    InstagramPublisher, YouTubePublisher, TikTokPublisher
)
from app.application.services.credential_service import CredentialService

logger = structlog.get_logger()

# Platform service mapping
PLATFORM_SERVICES = {
    "twitter": TwitterPublisher,
    "linkedin": LinkedInPublisher,
    "facebook": FacebookPublisher,
    "instagram": InstagramPublisher,
    "youtube": YouTubePublisher,
    "tiktok": TikTokPublisher,
}


class PublisherService:
    """Service for publishing content to multiple platforms"""
    
    @staticmethod
    async def publish_to_platform(
        workspace_id: str,
        platform: str,
        content: str,
        media_urls: List[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Publish content to a single platform
        
        Args:
            workspace_id: Workspace ID
            platform: Platform name
            content: Content to publish
            media_urls: Optional media URLs
            **kwargs: Additional platform-specific parameters
        
        Returns:
            Publication result
        """
        try:
            # Get platform service
            platform_service_class = PLATFORM_SERVICES.get(platform)
            if not platform_service_class:
                return {
                    "success": False,
                    "error": f"Platform {platform} not supported",
                    "platform": platform
                }
            
            platform_service = platform_service_class()

            # Get credentials for platform
            credentials = await CredentialService.get_platform_credentials(
                workspace_id=workspace_id,
                platform=platform
            )

            if not credentials or not credentials.get("access_token"):
                return {
                    "success": False,
                    "error": f"No credentials found for {platform}",
                    "platform": platform,
                }
            
            # Publish to platform
            result = await platform_service.publish_post(
                access_token=credentials["access_token"],
                content=content,
                media_urls=media_urls,
                **kwargs
            )
            
            logger.info("content_published", platform=platform, success=result.get("success"))
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
        workspace_id: str,
        platforms: List[str],
        content_by_platform: Dict[str, str],
        media_urls: List[str] = None,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """
        Publish content to multiple platforms simultaneously
        
        Args:
            workspace_id: Workspace ID
            platforms: List of platform names
            content: Content to publish
            media_urls: Optional media URLs
            **kwargs: Additional platform-specific parameters
        
        Returns:
            Dictionary with results for each platform
        """
        try:
            # Create publishing tasks for each platform using platform-specific content
            tasks = []
            for platform in platforms:
                platform_content = content_by_platform.get(platform)
                if not platform_content:
                    # If no content provided for this platform, record as failure
                    tasks.append((
                        platform,
                        asyncio.create_task(
                            asyncio.sleep(0, result={
                                "success": False,
                                "error": f"No content provided for platform {platform}",
                                "platform": platform,
                            })
                        ),
                    ))
                else:
                    task = asyncio.create_task(
                        PublisherService.publish_to_platform(
                            workspace_id=workspace_id,
                            platform=platform,
                            content=platform_content,
                            media_urls=media_urls,
                            **kwargs,
                        )
                    )
                    tasks.append((platform, task))

            # Execute all publishing tasks concurrently
            results: List[Dict[str, Any]] = []
            for platform, task in tasks:
                try:
                    result = await task
                    results.append(result)
                except Exception as e:
                    results.append(
                        {
                            "success": False,
                            "error": str(e),
                            "platform": platform,
                        }
                    )

            successful_platforms = [r for r in results if r.get("success")]

            logger.info(
                "multi_platform_publish_completed",
                successful=len(successful_platforms),
                total=len(platforms),
            )

            return results
            
        except Exception as e:
            logger.error("multi_platform_publish_error", error=str(e))
            return {
                "success": False,
                "error": str(e),
                "results": {}
            }
    
    @staticmethod
    async def schedule_post(
        workspace_id: str,
        platform: str,
        content: str,
        scheduled_time: int,
        media_urls: List[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Schedule a post for later publication
        
        Args:
            workspace_id: Workspace ID
            platform: Platform name
            content: Content to publish
            scheduled_time: Unix timestamp for scheduling
            media_urls: Optional media URLs
            **kwargs: Additional platform-specific parameters
        
        Returns:
            Scheduling result
        """
        try:
            # Get platform service
            platform_service_class = PLATFORM_SERVICES.get(platform)
            if not platform_service_class:
                return {
                    "success": False,
                    "error": f"Platform {platform} not supported",
                    "platform": platform
                }
            
            platform_service = platform_service_class()
            
            # Get credentials for platform
            credentials = await CredentialService.get_platform_credentials(
                workspace_id=workspace_id,
                platform=platform
            )
            
            if not credentials:
                return {
                    "success": False,
                    "error": f"No credentials found for {platform}",
                    "platform": platform
                }
            
            # Schedule post on platform
            result = await platform_service.schedule_post(
                access_token=credentials.get("access_token"),
                content=content,
                scheduled_time=scheduled_time,
                media_urls=media_urls,
                **kwargs
            )
            
            logger.info("post_scheduled", platform=platform, success=result.get("success"))
            return result
            
        except Exception as e:
            logger.error("schedule_error", platform=platform, error=str(e))
            return {
                "success": False,
                "error": str(e),
                "platform": platform
            }
    
    @staticmethod
    async def get_post_metrics(
        workspace_id: str,
        platform: str,
        post_id: str
    ) -> Dict[str, Any]:
        """
        Get metrics for a published post
        
        Args:
            workspace_id: Workspace ID
            platform: Platform name
            post_id: Platform-specific post ID
        
        Returns:
            Post metrics
        """
        try:
            # Get platform service
            platform_service_class = PLATFORM_SERVICES.get(platform)
            if not platform_service_class:
                return {
                    "success": False,
                    "error": f"Platform {platform} not supported"
                }
            
            platform_service = platform_service_class()
            
            # Get credentials for platform
            credentials = await CredentialService.get_platform_credentials(
                workspace_id=workspace_id,
                platform=platform
            )
            
            if not credentials:
                return {
                    "success": False,
                    "error": f"No credentials found for {platform}"
                }
            
            # Get post metrics
            metrics = await platform_service.get_post_metrics(
                access_token=credentials.get("access_token"),
                post_id=post_id
            )
            
            return {
                "success": True,
                "metrics": metrics,
                "platform": platform
            }
            
        except Exception as e:
            logger.error("metrics_error", platform=platform, error=str(e))
            return {
                "success": False,
                "error": str(e),
                "platform": platform
            }
