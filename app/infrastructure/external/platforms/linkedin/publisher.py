"""
LinkedIn Publisher - High-level publishing interface
"""
from typing import Dict, Any, Optional, List
import structlog
from .client import LinkedInClient
from .oauth import LinkedInOAuthHandler

logger = structlog.get_logger()


class LinkedInPublisher:
    """High-level LinkedIn publishing service"""
    
    def __init__(self):
        self.client = LinkedInClient()
        self.oauth_handler = LinkedInOAuthHandler()
        self.logger = logger.bind(service="linkedin_publisher")
    
    async def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[List[str]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Publish a post to LinkedIn
        
        Args:
            access_token: OAuth access token
            content: Post content
            media_urls: Optional media URLs
            **kwargs: Additional parameters including person_urn
        
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
        """Delete a post from LinkedIn"""
        return await self.client.delete_post(access_token, post_id)
    
    async def get_post(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get post details from LinkedIn"""
        return await self.client.get_post(access_token, post_id)
    
    async def verify_credentials(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Verify LinkedIn credentials"""
        return await self.client.verify_credentials(access_token)
    
    async def get_user_profile(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Get user profile from LinkedIn"""
        return await self.client.get_user_profile(access_token)
    
    async def upload_media(
        self,
        access_token: str,
        media_url: str,
        person_urn: str
    ) -> Dict[str, Any]:
        """Upload media to LinkedIn"""
        try:
            from .media_uploader import LinkedInMediaUploader
            uploader = LinkedInMediaUploader()
            media_assets = await uploader.upload_multiple(access_token, person_urn, [media_url])
            
            if media_assets:
                return {
                    "success": True,
                    "media_urn": media_assets[0]["media"],
                    "platform": "linkedin"
                }
            else:
                return {"success": False, "error": "Failed to upload media"}
                
        except Exception as e:
            logger.error("linkedin_media_upload_error", error=str(e))
            return {"success": False, "error": str(e)}
    
    async def schedule_post(
        self,
        access_token: str,
        content: str,
        scheduled_time: int,
        media_urls: Optional[List[str]] = None,
        person_urn: Optional[str] = None
    ) -> Dict[str, Any]:
        """Schedule a LinkedIn post (creates as draft - LinkedIn doesn't support true scheduling)"""
        try:
            if not person_urn:
                person_urn = await self.client._get_person_urn(access_token)
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0"
            }
            
            # Build post payload as draft
            payload = {
                "author": person_urn,
                "lifecycleState": "DRAFT",  # LinkedIn doesn't support scheduled posts directly
                "specificContent": {
                    "com.linkedin.ugc.ShareContent": {
                        "shareCommentary": {
                            "text": content
                        },
                        "shareMediaCategory": "NONE"
                    }
                },
                "visibility": {
                    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
                }
            }
            
            # Handle media if present
            if media_urls:
                from .media_uploader import LinkedInMediaUploader
                uploader = LinkedInMediaUploader()
                media_assets = await uploader.upload_multiple(access_token, person_urn, media_urls)
                if media_assets:
                    payload["specificContent"]["com.linkedin.ugc.ShareContent"]["shareMediaCategory"] = "IMAGE"
                    payload["specificContent"]["com.linkedin.ugc.ShareContent"]["media"] = media_assets
            
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.client.api_base}/ugcPosts",
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code in [200, 201]:
                    post_id = response.headers.get("X-RestLi-Id", "")
                    return {
                        "success": True,
                        "post_id": post_id,
                        "platform": "linkedin",
                        "status": "draft",  # LinkedIn doesn't support true scheduling
                        "message": "Post created as draft. LinkedIn doesn't support scheduled posting via API."
                    }
                else:
                    error_msg = response.json().get("message", response.text)
                    raise Exception(f"LinkedIn API error: {error_msg}")
                    
        except Exception as e:
            logger.error("linkedin_schedule_post_error", error=str(e))
            return {"success": False, "error": str(e)}
    
    async def get_post_metrics(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get post analytics from LinkedIn"""
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
        """Refresh access token (not supported by LinkedIn)"""
        return await self.oauth_handler.refresh_access_token(
            refresh_token, client_id, client_secret
        )
