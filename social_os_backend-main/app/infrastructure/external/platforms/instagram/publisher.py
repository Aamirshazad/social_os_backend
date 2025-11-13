"""
Instagram Publisher - High-level publishing interface
"""
from typing import Dict, Any, Optional, List
import structlog
from .client import InstagramClient
from .oauth import InstagramOAuthHandler

logger = structlog.get_logger()


class InstagramPublisher:
    """High-level Instagram publishing service"""
    
    def __init__(self):
        self.client = InstagramClient()
        self.oauth_handler = InstagramOAuthHandler()
        self.logger = logger.bind(service="instagram_publisher")
    
    async def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[List[str]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Publish a post to Instagram
        
        Args:
            access_token: OAuth access token
            content: Post caption
            media_urls: Required media URLs (Instagram requires media)
            **kwargs: Additional parameters including instagram_account_id
        
        Returns:
            Publication result
        """
        return await self.client.publish_post(
            access_token=access_token,
            content=content,
            media_urls=media_urls,
            **kwargs
        )
    
    async def delete_post(
        self,
        access_token: str,
        post_id: str
    ) -> bool:
        """Delete a post from Instagram"""
        return await self.client.delete_post(access_token, post_id)
    
    async def get_post(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get post details from Instagram"""
        return await self.client.get_post(access_token, post_id)
    
    async def verify_credentials(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Verify Instagram credentials"""
        return await self.client.verify_credentials(access_token)
    
    async def get_user_profile(
        self,
        access_token: str,
        instagram_account_id: str
    ) -> Dict[str, Any]:
        """Get user profile from Instagram"""
        return await self.client.get_user_profile(access_token, instagram_account_id)
    
    async def upload_media(
        self,
        access_token: str,
        media_url: str,
        instagram_account_id: str
    ) -> Dict[str, Any]:
        """Upload media to Instagram (handled during post creation)"""
        try:
            return {
                "success": True,
                "media_url": media_url,
                "platform": "instagram",
                "message": "Media will be uploaded during post creation"
            }
                
        except Exception as e:
            logger.error("instagram_media_upload_error", error=str(e))
            return {"success": False, "error": str(e)}
    
    async def schedule_post(
        self,
        access_token: str,
        content: str,
        scheduled_time: int,
        media_urls: Optional[List[str]] = None,
        instagram_account_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Schedule an Instagram post (not supported by Instagram API)"""
        try:
            return {
                "success": False,
                "error": "Instagram API does not support scheduled posting",
                "platform": "instagram",
                "message": "Use Instagram's native Creator Studio for scheduling or post immediately"
            }
                    
        except Exception as e:
            logger.error("instagram_schedule_post_error", error=str(e))
            return {"success": False, "error": str(e)}
    
    async def get_post_metrics(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get post analytics from Instagram"""
        return await self.client.get_post_metrics(access_token, post_id)
    
    # OAuth methods
    async def exchange_code_for_token(
        self,
        code: str,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
        code_verifier: str = None
    ) -> Dict[str, Any]:
        """Exchange authorization code for access token"""
        return await self.oauth_handler.exchange_code_for_token(
            code, client_id, client_secret, redirect_uri, code_verifier
        )
    
    async def refresh_access_token(
        self,
        refresh_token: str,
        client_id: str,
        client_secret: str
    ) -> Dict[str, Any]:
        """Refresh access token"""
        return await self.oauth_handler.refresh_access_token(
            refresh_token, client_id, client_secret
        )
