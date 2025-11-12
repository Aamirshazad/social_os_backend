"""
Facebook Platform Service
"""
from typing import Dict, Any, Optional, List
import httpx
import structlog
from app.services.platforms.base import BasePlatformService

logger = structlog.get_logger()


class FacebookService(BasePlatformService):
    """Facebook platform integration"""
    
    def __init__(self):
        super().__init__("facebook")
        self.api_base = "https://graph.facebook.com/v18.0"
    
    async def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[list] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Publish a Facebook post
        
        Max characters: 63,206 (but 500 is optimal)
        """
        try:
            # Get page ID or use user feed
            page_id = kwargs.get("page_id", "me")
            
            payload = {
                "message": content,
                "access_token": access_token
            }
            
            # Handle media
            if media_urls and len(media_urls) > 0:
                # For single image
                if len(media_urls) == 1:
                    payload["url"] = media_urls[0]
                    endpoint = f"{self.api_base}/{page_id}/photos"
                else:
                    # For multiple images (album)
                    # Would need to create album first
                    endpoint = f"{self.api_base}/{page_id}/feed"
            else:
                endpoint = f"{self.api_base}/{page_id}/feed"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    endpoint,
                    data=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    post_id = data.get("id", "")
                    
                    self.logger.info("facebook_post_published", post_id=post_id)
                    
                    return {
                        "success": True,
                        "post_id": post_id,
                        "url": f"https://www.facebook.com/{post_id}",
                        "platform": self.platform_name
                    }
                else:
                    error_msg = response.json().get("error", {}).get("message", response.text)
                    raise Exception(f"Facebook API error: {error_msg}")
                    
        except Exception as e:
            return self._handle_error(e, "publish_facebook_post")
    
    async def delete_post(
        self,
        access_token: str,
        post_id: str
    ) -> bool:
        """Delete a Facebook post"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.api_base}/{post_id}",
                    params={"access_token": access_token},
                    timeout=30.0
                )
                
                return response.status_code == 200
                
        except Exception as e:
            self.logger.error("delete_facebook_post_error", error=str(e))
            return False
    
    async def get_post(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get Facebook post details"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/{post_id}",
                    params={
                        "access_token": access_token,
                        "fields": "message,created_time,shares,likes.summary(true),comments.summary(true)"
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return response.json()
                return {}
                
        except Exception as e:
            self.logger.error("get_facebook_post_error", error=str(e))
            return {}
    
    async def verify_credentials(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Verify Facebook credentials"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/me",
                    params={
                        "access_token": access_token,
                        "fields": "id,name,email"
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "valid": True,
                        "user_id": data.get("id"),
                        "name": data.get("name"),
                        "email": data.get("email")
                    }
                
                return {"valid": False, "error": "Invalid credentials"}
                
        except Exception as e:
            return {"valid": False, "error": str(e)}
    
    async def exchange_code_for_token(
        self,
        code: str,
        client_id: str,
        client_secret: str,
        redirect_uri: str
    ) -> Dict[str, Any]:
        """Exchange authorization code for access token"""
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
            logger.error("facebook_token_exchange_error", error=str(e))
            raise Exception(f"Token exchange failed: {str(e)}")
    
    async def refresh_access_token(
        self,
        refresh_token: str,
        client_id: str,
        client_secret: str
    ) -> Dict[str, Any]:
        """Refresh Facebook access token"""
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
            logger.error("facebook_token_refresh_error", error=str(e))
            raise Exception(f"Token refresh failed: {str(e)}")
    
    async def get_user_profile(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Get Facebook user profile"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/me",
                    params={
                        "access_token": access_token,
                        "fields": "id,name,email,picture"
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "id": data["id"],
                        "username": data.get("name", data["id"]),
                        "name": data.get("name"),
                        "email": data.get("email"),
                        "profile_image_url": data.get("picture", {}).get("data", {}).get("url")
                    }
                
                raise Exception("Failed to fetch user profile")
                
        except Exception as e:
            logger.error("facebook_user_profile_error", error=str(e))
            raise Exception(f"Failed to get user profile: {str(e)}")
    
    async def upload_media(
        self,
        access_token: str,
        media_url: str,
        page_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Upload media to Facebook"""
        try:
            # Facebook can handle URLs directly
            return {
                "success": True,
                "media_url": media_url,
                "platform": self.platform_name
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
                endpoint = f"{self.api_base}/{target_id}/photos"
            else:
                endpoint = f"{self.api_base}/{target_id}/feed"
            
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
                        "platform": self.platform_name,
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
        """Get Facebook post analytics"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/{post_id}",
                    params={
                        "access_token": access_token,
                        "fields": "shares,likes.summary(total_count).limit(0),comments.summary(total_count).limit(0)"
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    likes = data.get("likes", {}).get("summary", {}).get("total_count", 0)
                    comments = data.get("comments", {}).get("summary", {}).get("total_count", 0)
                    shares = data.get("shares", {}).get("count", 0)
                    
                    return {
                        "post_id": post_id,
                        "platform": "facebook",
                        "impressions": 0,  # Not available in basic API
                        "engagements": likes + comments + shares,
                        "likes": likes,
                        "comments": comments,
                        "shares": shares,
                        "fetched_at": None
                    }
                
                return {}
                
        except Exception as e:
            logger.error("facebook_post_metrics_error", error=str(e))
            return {}
