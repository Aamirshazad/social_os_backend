"""
Instagram API Client - Core API communication
"""
from typing import Dict, Any, Optional
import httpx
import structlog
from ..base import BasePlatformClient

logger = structlog.get_logger()


class InstagramClient(BasePlatformClient):
    """Instagram API client for basic operations"""
    
    def __init__(self):
        super().__init__("instagram")
        self.api_base = "https://graph.facebook.com/v18.0"
    
    async def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[list] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Publish an Instagram post
        
        Args:
            access_token: OAuth access token
            content: Post caption (max 2,200 characters)
            media_urls: Required media URLs (Instagram requires media)
            **kwargs: Additional parameters including instagram_account_id
        
        Returns:
            Publication result with post ID and URL
        
        Note: Instagram requires media. Text-only posts are not supported.
        """
        try:
            instagram_account_id = kwargs.get("instagram_account_id")
            if not instagram_account_id:
                raise Exception("Instagram account ID required")
            
            if not media_urls or len(media_urls) == 0:
                raise Exception("Instagram requires at least one image or video")
            
            # Step 1: Create media container
            container_payload = {
                "image_url": media_urls[0],  # Instagram API expects image_url
                "caption": content,
                "access_token": access_token
            }
            
            async with httpx.AsyncClient() as client:
                # Create container
                container_response = await client.post(
                    f"{self.api_base}/{instagram_account_id}/media",
                    data=container_payload,
                    timeout=30.0
                )
                
                if container_response.status_code not in [200, 201]:
                    error_msg = container_response.json().get("error", {}).get("message", container_response.text)
                    raise Exception(f"Instagram container creation error: {error_msg}")
                
                container_data = container_response.json()
                container_id = container_data.get("id")
                
                # Step 2: Publish the container
                publish_payload = {
                    "creation_id": container_id,
                    "access_token": access_token
                }
                
                publish_response = await client.post(
                    f"{self.api_base}/{instagram_account_id}/media_publish",
                    data=publish_payload,
                    timeout=30.0
                )
                
                if publish_response.status_code in [200, 201]:
                    publish_data = publish_response.json()
                    post_id = publish_data.get("id")
                    
                    self.logger.info("instagram_post_published", post_id=post_id)
                    
                    return {
                        "success": True,
                        "post_id": post_id,
                        "url": f"https://www.instagram.com/p/{post_id}",
                        "platform": self.platform_name
                    }
                else:
                    error_msg = publish_response.json().get("error", {}).get("message", publish_response.text)
                    raise Exception(f"Instagram publish error: {error_msg}")
                    
        except Exception as e:
            return self._handle_error(e, "publish_instagram_post")
    
    async def delete_post(
        self,
        access_token: str,
        post_id: str
    ) -> bool:
        """Delete an Instagram post"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.api_base}/{post_id}",
                    params={"access_token": access_token},
                    timeout=30.0
                )
                
                return response.status_code in [200, 204]
                
        except Exception as e:
            self.logger.error("delete_instagram_post_error", error=str(e))
            return False
    
    async def get_post(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get Instagram post details"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/{post_id}",
                    params={
                        "access_token": access_token,
                        "fields": "id,caption,media_type,media_url,permalink,timestamp"
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return response.json()
                return {}
                
        except Exception as e:
            self.logger.error("get_instagram_post_error", error=str(e))
            return {}
    
    async def verify_credentials(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Verify Instagram credentials"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/me/accounts",
                    params={
                        "access_token": access_token,
                        "fields": "instagram_business_account"
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    accounts = data.get("data", [])
                    
                    for account in accounts:
                        if account.get("instagram_business_account"):
                            return {
                                "valid": True,
                                "account_id": account["instagram_business_account"]["id"]
                            }
                    
                    return {"valid": False, "error": "No Instagram business account found"}
                
                return {"valid": False, "error": "Invalid credentials"}
                
        except Exception as e:
            return {"valid": False, "error": str(e)}
    
    async def get_user_profile(
        self,
        access_token: str,
        instagram_account_id: str
    ) -> Dict[str, Any]:
        """Get Instagram user profile"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/{instagram_account_id}",
                    params={
                        "access_token": access_token,
                        "fields": "id,username,name,profile_picture_url,followers_count,media_count"
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "id": data["id"],
                        "username": data.get("username"),
                        "name": data.get("name"),
                        "profile_image_url": data.get("profile_picture_url"),
                        "followers_count": data.get("followers_count", 0),
                        "media_count": data.get("media_count", 0)
                    }
                
                raise Exception("Failed to fetch user profile")
                
        except Exception as e:
            logger.error("instagram_user_profile_error", error=str(e))
            raise Exception(f"Failed to get user profile: {str(e)}")
    
    async def get_post_metrics(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get Instagram post analytics"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/{post_id}/insights",
                    params={
                        "access_token": access_token,
                        "metric": "engagement,impressions,reach,likes,comments,saves,shares"
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    insights = data.get("data", [])
                    
                    metrics = {}
                    for insight in insights:
                        metric_name = insight.get("name")
                        metric_value = insight.get("values", [{}])[0].get("value", 0)
                        metrics[metric_name] = metric_value
                    
                    return {
                        "post_id": post_id,
                        "platform": "instagram",
                        "impressions": metrics.get("impressions", 0),
                        "reach": metrics.get("reach", 0),
                        "engagements": metrics.get("engagement", 0),
                        "likes": metrics.get("likes", 0),
                        "comments": metrics.get("comments", 0),
                        "saves": metrics.get("saves", 0),
                        "shares": metrics.get("shares", 0),
                        "fetched_at": None
                    }
                
                return {}
                
        except Exception as e:
            logger.error("instagram_post_metrics_error", error=str(e))
            return {}
