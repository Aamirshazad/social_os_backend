"""
Facebook Publisher - High-level publishing interface
"""
from typing import Dict, Any, Optional, List
import structlog
from .client import FacebookClient
from .oauth import FacebookOAuthHandler

logger = structlog.get_logger()


class FacebookPublisher:
    """High-level Facebook publishing service"""
    
    def __init__(self):
        self.client = FacebookClient()
        self.oauth_handler = FacebookOAuthHandler()
        self.logger = logger.bind(service="facebook_publisher")
    
    async def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[List[str]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Publish a post to Facebook
        
        Args:
            access_token: OAuth access token
            content: Post content
            media_urls: Optional media URLs
            **kwargs: Additional parameters including page_id
        
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
        """Delete a post from Facebook"""
        return await self.client.delete_post(access_token, post_id)
    
    async def get_post(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get post details from Facebook"""
        return await self.client.get_post(access_token, post_id)
    
    async def verify_credentials(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Verify Facebook credentials"""
        return await self.client.verify_credentials(access_token)
    
    async def get_user_profile(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Get user profile from Facebook"""
        return await self.client.get_user_profile(access_token)
    
    async def upload_media(
        self,
        access_token: str,
        media_url: str,
        page_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Upload media to Facebook (Facebook can handle URLs directly)"""
        try:
            return {
                "success": True,
                "media_url": media_url,
                "platform": "facebook"
            }
                
        except Exception as e:
            logger.error("facebook_media_upload_error", error=str(e))
            return {"success": False, "error": str(e)}
    
    async def schedule_post(
        self,
        access_token: str,
        content: str,
        scheduled_time: int,
        media_urls: Optional[List[str]] = None,
        page_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Schedule a Facebook post"""
        try:
            target_id = page_id or "me"
            
            payload = {
                "message": content,
                "published": False,
                "scheduled_publish_time": scheduled_time,
                "access_token": access_token
            }
            
            if media_urls and len(media_urls) > 0:
                payload["url"] = media_urls[0]
                endpoint = f"{self.client.api_base}/{target_id}/photos"
            else:
                endpoint = f"{self.client.api_base}/{target_id}/feed"
            
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    endpoint,
                    data=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "success": True,
                        "post_id": data.get("id"),
                        "platform": "facebook",
                        "status": "scheduled"
                    }
                else:
                    error_msg = response.json().get("error", {}).get("message", response.text)
                    raise Exception(f"Facebook API error: {error_msg}")
                    
        except Exception as e:
            logger.error("facebook_schedule_post_error", error=str(e))
            return {"success": False, "error": str(e)}
    
    async def get_post_metrics(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get post analytics from Facebook"""
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
