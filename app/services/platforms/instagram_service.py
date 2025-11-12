"""
Instagram Platform Service
"""
from typing import Dict, Any, Optional, List
import httpx
import structlog
from app.services.platforms.base import BasePlatformService

logger = structlog.get_logger()


class InstagramService(BasePlatformService):
    """Instagram platform integration via Instagram Graph API"""
    
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
        
        Note: Instagram requires media. Text-only posts are not supported.
        Max caption: 2,200 characters
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
                
                if container_response.status_code != 200:
                    error = container_response.json().get("error", {})
                    raise Exception(f"Failed to create media container: {error.get('message')}")
                
                container_id = container_response.json().get("id")
                
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
                
                if publish_response.status_code == 200:
                    post_id = publish_response.json().get("id")
                    
                    self.logger.info("instagram_post_published", post_id=post_id)
                    
                    return {
                        "success": True,
                        "post_id": post_id,
                        "url": f"https://www.instagram.com/p/{post_id}",
                        "platform": self.platform_name
                    }
                else:
                    error = publish_response.json().get("error", {})
                    raise Exception(f"Failed to publish: {error.get('message')}")
                    
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
                
                return response.status_code == 200
                
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
                        "fields": "caption,media_type,media_url,timestamp,like_count,comments_count"
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
            # First get Facebook pages
            async with httpx.AsyncClient() as client:
                pages_response = await client.get(
                    f"{self.api_base}/me/accounts",
                    params={"access_token": access_token},
                    timeout=30.0
                )
                
                if pages_response.status_code == 200:
                    pages = pages_response.json().get("data", [])
                    
                    # Get Instagram business account from first page
                    if pages:
                        page_id = pages[0].get("id")
                        ig_response = await client.get(
                            f"{self.api_base}/{page_id}",
                            params={
                                "access_token": access_token,
                                "fields": "instagram_business_account"
                            },
                            timeout=30.0
                        )
                        
                        if ig_response.status_code == 200:
                            ig_data = ig_response.json()
                            ig_account = ig_data.get("instagram_business_account", {})
                            
                            return {
                                "valid": True,
                                "user_id": ig_account.get("id"),
                                "page_id": page_id
                            }
                
                return {"valid": False, "error": "No Instagram business account found"}
                
        except Exception as e:
            return {"valid": False, "error": str(e)}
    
    async def exchange_code_for_token(
        self,
        code: str,
        client_id: str,
        client_secret: str,
        redirect_uri: str
    ) -> Dict[str, Any]:
        """Exchange authorization code for access token (uses Facebook OAuth)"""
        try:
            # Step 1: Get short-lived token
            params = {
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "code": code
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/oauth/access_token",
                    params=params,
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise Exception("Failed to get short-lived token")
                
                short_lived_data = response.json()
                
                # Step 2: Exchange for long-lived token
                long_lived_params = {
                    "grant_type": "fb_exchange_token",
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "fb_exchange_token": short_lived_data["access_token"]
                }
                
                long_lived_response = await client.get(
                    f"{self.api_base}/oauth/access_token",
                    params=long_lived_params,
                    timeout=30.0
                )
                
                if long_lived_response.status_code != 200:
                    raise Exception("Failed to extend token to long-lived")
                
                long_lived_data = long_lived_response.json()
                
                return {
                    "access_token": long_lived_data["access_token"],
                    "token_type": "Bearer",
                    "expires_in": long_lived_data.get("expires_in", 5184000)  # 60 days
                }
                
        except Exception as e:
            logger.error("instagram_token_exchange_error", error=str(e))
            raise Exception(f"Token exchange failed: {str(e)}")
    
    async def refresh_access_token(
        self,
        refresh_token: str,
        client_id: str,
        client_secret: str
    ) -> Dict[str, Any]:
        """Refresh Instagram access token"""
        try:
            params = {
                "grant_type": "fb_extend_token",
                "client_id": client_id,
                "client_secret": client_secret,
                "fb_exchange_token": refresh_token
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/oauth/access_token",
                    params=params,
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise Exception("Failed to refresh token")
                
                data = response.json()
                
                return {
                    "access_token": data["access_token"],
                    "token_type": "Bearer",
                    "expires_in": data.get("expires_in", 5184000)  # 60 days
                }
                
        except Exception as e:
            logger.error("instagram_token_refresh_error", error=str(e))
            raise Exception(f"Token refresh failed: {str(e)}")
    
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
                        "fields": "id,username,name,profile_picture_url,biography,followers_count"
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
                        "biography": data.get("biography"),
                        "followers_count": data.get("followers_count", 0)
                    }
                
                raise Exception("Failed to fetch user profile")
                
        except Exception as e:
            logger.error("instagram_user_profile_error", error=str(e))
            raise Exception(f"Failed to get user profile: {str(e)}")
    
    async def upload_media(
        self,
        access_token: str,
        media_url: str,
        instagram_account_id: str
    ) -> Dict[str, Any]:
        """Upload media to Instagram"""
        try:
            # Instagram accepts direct URLs for media
            return {
                "success": True,
                "media_url": media_url,
                "platform": self.platform_name
            }
                
        except Exception as e:
            logger.error("instagram_media_upload_error", error=str(e))
            return {"success": False, "error": str(e)}
    
    async def schedule_post(
        self,
        access_token: str,
        content: str,
        scheduled_time: int,
        media_urls: List[str],
        instagram_account_id: str
    ) -> Dict[str, Any]:
        """Schedule an Instagram post"""
        try:
            if not media_urls or len(media_urls) == 0:
                raise Exception("Instagram requires at least one media item")
            
            payload = {
                "image_url": media_urls[0],
                "caption": content,
                "scheduled_publish_time": scheduled_time,
                "access_token": access_token
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_base}/{instagram_account_id}/media",
                    data=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "success": True,
                        "post_id": data.get("id"),
                        "platform": self.platform_name,
                        "status": "scheduled"
                    }
                else:
                    error_msg = response.json().get("error", {}).get("message", response.text)
                    raise Exception(f"Instagram API error: {error_msg}")
                    
        except Exception as e:
            logger.error("instagram_schedule_post_error", error=str(e))
            return {"success": False, "error": str(e)}
    
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
                        "metric": "engagement,impressions,reach,saved"
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Map Instagram insights to standard analytics
                    metrics_map = {}
                    if data.get("data"):
                        for metric in data["data"]:
                            metric_name = metric.get("name")
                            metric_value = metric.get("values", [{}])[0].get("value", 0)
                            metrics_map[metric_name] = metric_value
                    
                    return {
                        "post_id": post_id,
                        "platform": "instagram",
                        "impressions": metrics_map.get("impressions", 0),
                        "engagements": metrics_map.get("engagement", 0),
                        "reach": metrics_map.get("reach", 0),
                        "saves": metrics_map.get("saved", 0),
                        "fetched_at": None
                    }
                
                return {}
                
        except Exception as e:
            logger.error("instagram_post_metrics_error", error=str(e))
            return {}
