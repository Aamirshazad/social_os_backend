"""
Twitter Publisher - High-level publishing interface
"""
from typing import Dict, Any, Optional, List
import structlog
from .client import TwitterClient
from .oauth import TwitterOAuthHandler

logger = structlog.get_logger()


class TwitterPublisher:
    """High-level Twitter publishing service"""
    
    def __init__(self):
        self.client = TwitterClient()
        self.oauth_handler = TwitterOAuthHandler()
        self.logger = logger.bind(service="twitter_publisher")
    
    async def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[List[str]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Publish a post to Twitter
        
        Args:
            access_token: OAuth access token
            content: Tweet content
            media_urls: Optional media URLs
            **kwargs: Additional parameters
        
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
        """Delete a post from Twitter"""
        return await self.client.delete_post(access_token, post_id)
    
    async def get_post(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get post details from Twitter"""
        return await self.client.get_post(access_token, post_id)
    
    async def verify_credentials(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Verify Twitter credentials"""
        return await self.client.verify_credentials(access_token)
    
    async def get_user_profile(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Get user profile from Twitter"""
        return await self.client.get_user_profile(access_token)
    
    async def upload_media(
        self,
        access_token: str,
        media_url: str
    ) -> Dict[str, Any]:
        """Upload media to Twitter"""
        try:
            from .media_uploader import TwitterMediaUploader
            uploader = TwitterMediaUploader()
            media_ids = await uploader.upload_multiple(access_token, [media_url])
            
            if media_ids:
                return {
                    "success": True,
                    "media_id": media_ids[0],
                    "platform": "twitter"
                }
            else:
                return {"success": False, "error": "Failed to upload media"}
                
        except Exception as e:
            logger.error("twitter_media_upload_error", error=str(e))
            return {"success": False, "error": str(e)}
    
    async def schedule_post(
        self,
        access_token: str,
        content: str,
        scheduled_time: int,
        media_urls: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Twitter doesn't support scheduled posting via API"""
        return {
            "success": False,
            "error": "Twitter API v2 does not support scheduled posting",
            "platform": "twitter",
            "message": "Use Twitter's native scheduler or post immediately"
        }
    
    async def get_post_metrics(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get post analytics from Twitter"""
        return await self.client.get_post_metrics(access_token, post_id)
    
    # OAuth methods
    async def exchange_code_for_token(
        self,
        code: str,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
        code_verifier: Optional[str] = None
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
