"""
LinkedIn API Client - Core API communication
"""
from typing import Dict, Any, Optional
import httpx
import structlog
from ..base import BasePlatformClient

logger = structlog.get_logger()


class LinkedInClient(BasePlatformClient):
    """LinkedIn API client for basic operations"""
    
    def __init__(self):
        super().__init__("linkedin")
        self.api_base = "https://api.linkedin.com/v2"
    
    async def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[list] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Publish a LinkedIn post (UGC Post)
        
        Args:
            access_token: OAuth access token
            content: Post content (max 3000 chars, 1300 optimal)
            media_urls: Optional media URLs
            **kwargs: Additional parameters including person_urn
        
        Returns:
            Publication result with post ID and URL
        """
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0"
            }
            
            # Get user's person URN
            person_urn = kwargs.get("person_urn")
            if not person_urn:
                person_urn = await self._get_person_urn(access_token)
            
            # Build post payload
            payload = {
                "author": person_urn,
                "lifecycleState": "PUBLISHED",
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
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_base}/ugcPosts",
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code in [200, 201]:
                    post_id = response.headers.get("X-RestLi-Id", "")
                    
                    self.logger.info("linkedin_post_published", post_id=post_id)
                    
                    return {
                        "success": True,
                        "post_id": post_id,
                        "url": f"https://www.linkedin.com/feed/update/{post_id}",
                        "platform": self.platform_name
                    }
                else:
                    error_msg = response.json().get("message", response.text)
                    raise Exception(f"LinkedIn API error: {error_msg}")
                    
        except Exception as e:
            return self._handle_error(e, "publish_linkedin_post")
    
    async def delete_post(
        self,
        access_token: str,
        post_id: str
    ) -> bool:
        """Delete a LinkedIn post"""
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "X-Restli-Protocol-Version": "2.0.0"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.api_base}/ugcPosts/{post_id}",
                    headers=headers,
                    timeout=30.0
                )
                
                return response.status_code in [200, 204]
                
        except Exception as e:
            self.logger.error("delete_linkedin_post_error", error=str(e))
            return False
    
    async def get_post(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get LinkedIn post details"""
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "X-Restli-Protocol-Version": "2.0.0"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/ugcPosts/{post_id}",
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return response.json()
                return {}
                
        except Exception as e:
            self.logger.error("get_linkedin_post_error", error=str(e))
            return {}
    
    async def verify_credentials(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Verify LinkedIn credentials"""
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "X-Restli-Protocol-Version": "2.0.0"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/me",
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "valid": True,
                        "user_id": data.get("id"),
                        "name": f"{data.get('localizedFirstName', '')} {data.get('localizedLastName', '')}"
                    }
                
                return {"valid": False, "error": "Invalid credentials"}
                
        except Exception as e:
            return {"valid": False, "error": str(e)}
    
    async def get_user_profile(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Get LinkedIn user profile"""
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "X-Restli-Protocol-Version": "2.0.0"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/me",
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "id": data["id"],
                        "username": f"{data.get('localizedFirstName', '')} {data.get('localizedLastName', '')}".strip(),
                        "name": f"{data.get('localizedFirstName', '')} {data.get('localizedLastName', '')}".strip(),
                        "profile_image_url": data.get("profilePicture", {}).get("displayImage")
                    }
                
                raise Exception("Failed to fetch user profile")
                
        except Exception as e:
            logger.error("linkedin_user_profile_error", error=str(e))
            raise Exception(f"Failed to get user profile: {str(e)}")
    
    async def get_post_metrics(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get LinkedIn post analytics"""
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "X-Restli-Protocol-Version": "2.0.0"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/socialMetadata/{post_id}?fields=totalShareStatistics",
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    stats = data.get("value", {}).get("totalShareStatistics", {})
                    
                    return {
                        "post_id": post_id,
                        "platform": "linkedin",
                        "impressions": stats.get("impressionCount", 0),
                        "engagements": (
                            stats.get("commentCount", 0) + 
                            stats.get("likeCount", 0) + 
                            stats.get("shareCount", 0)
                        ),
                        "comments": stats.get("commentCount", 0),
                        "likes": stats.get("likeCount", 0),
                        "shares": stats.get("shareCount", 0),
                        "fetched_at": None
                    }
                
                return {}
                
        except Exception as e:
            logger.error("linkedin_post_metrics_error", error=str(e))
            return {}
    
    async def _get_person_urn(self, access_token: str) -> str:
        """Get person URN for the authenticated user"""
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "X-Restli-Protocol-Version": "2.0.0"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/me",
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    user_id = response.json().get("id")
                    return f"urn:li:person:{user_id}"
                
                raise Exception("Failed to get person URN")
                
        except Exception as e:
            self.logger.error("get_person_urn_error", error=str(e))
            raise
