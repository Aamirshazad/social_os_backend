"""
Twitter API Client - Core API communication
"""
from typing import Dict, Any, Optional
import httpx
import structlog
from ..base import BasePlatformClient

logger = structlog.get_logger()


class TwitterClient(BasePlatformClient):
    """Twitter API client for basic operations"""
    
    def __init__(self):
        super().__init__("twitter")
        self.api_base = "https://api.twitter.com/2"
    
    async def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[list] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Publish a tweet
        
        Args:
            access_token: OAuth access token
            content: Tweet content (max 280 chars)
            media_urls: Optional media URLs
            **kwargs: Additional parameters
        
        Returns:
            Publication result with tweet ID and URL
        """
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            payload = {"text": content}
            
            # Handle media if present - delegate to media uploader
            if media_urls:
                from .media_uploader import TwitterMediaUploader
                uploader = TwitterMediaUploader()
                media_ids = await uploader.upload_multiple(access_token, media_urls)
                if media_ids:
                    payload["media"] = {"media_ids": media_ids}
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_base}/tweets",
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code in [200, 201]:
                    data = response.json()
                    tweet_id = data.get("data", {}).get("id")
                    
                    self.logger.info("tweet_published", tweet_id=tweet_id)
                    
                    return {
                        "success": True,
                        "post_id": tweet_id,
                        "url": f"https://twitter.com/i/web/status/{tweet_id}",
                        "platform": self.platform_name
                    }
                else:
                    error_msg = response.json().get("detail", response.text)
                    raise Exception(f"Twitter API error: {error_msg}")
                    
        except Exception as e:
            return self._handle_error(e, "publish_tweet")
    
    async def delete_post(
        self,
        access_token: str,
        post_id: str
    ) -> bool:
        """Delete a tweet"""
        try:
            headers = {"Authorization": f"Bearer {access_token}"}
            
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.api_base}/tweets/{post_id}",
                    headers=headers,
                    timeout=30.0
                )
                
                return response.status_code in [200, 204]
                
        except Exception as e:
            self.logger.error("delete_tweet_error", error=str(e))
            return False
    
    async def get_post(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get tweet details"""
        try:
            headers = {"Authorization": f"Bearer {access_token}"}
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/tweets/{post_id}",
                    headers=headers,
                    params={"tweet.fields": "created_at,public_metrics"},
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return response.json()
                return {}
                
        except Exception as e:
            self.logger.error("get_tweet_error", error=str(e))
            return {}
    
    async def verify_credentials(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Verify Twitter credentials"""
        try:
            headers = {"Authorization": f"Bearer {access_token}"}
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/users/me",
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json().get("data", {})
                    return {
                        "valid": True,
                        "user_id": data.get("id"),
                        "username": data.get("username"),
                        "name": data.get("name")
                    }
                
                return {"valid": False, "error": "Invalid credentials"}
                
        except Exception as e:
            return {"valid": False, "error": str(e)}
    
    async def get_user_profile(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Get Twitter user profile"""
        try:
            headers = {"Authorization": f"Bearer {access_token}"}
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/users/me",
                    headers=headers,
                    params={"user.fields": "username,name,profile_image_url,verified"},
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if "errors" in data:
                        raise Exception(f"Twitter API error: {data['errors'][0]['message']}")
                    
                    user_data = data.get("data", {})
                    
                    return {
                        "id": user_data.get("id"),
                        "username": user_data.get("username"),
                        "name": user_data.get("name"),
                        "profile_image_url": user_data.get("profile_image_url"),
                        "verified": user_data.get("verified", False)
                    }
                
                raise Exception("Failed to fetch user profile")
                
        except Exception as e:
            logger.error("twitter_user_profile_error", error=str(e))
            raise Exception(f"Failed to get user profile: {str(e)}")
    
    async def get_post_metrics(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get Twitter post analytics"""
        try:
            headers = {"Authorization": f"Bearer {access_token}"}
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/tweets/{post_id}",
                    headers=headers,
                    params={"tweet.fields": "public_metrics,created_at"},
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if "errors" in data:
                        return {}
                    
                    tweet_data = data.get("data", {})
                    metrics = tweet_data.get("public_metrics", {})
                    
                    return {
                        "post_id": post_id,
                        "platform": "twitter",
                        "impressions": metrics.get("impression_count", 0),
                        "engagements": (
                            metrics.get("like_count", 0) + 
                            metrics.get("retweet_count", 0) + 
                            metrics.get("reply_count", 0)
                        ),
                        "likes": metrics.get("like_count", 0),
                        "reposts": metrics.get("retweet_count", 0),
                        "replies": metrics.get("reply_count", 0),
                        "views": metrics.get("impression_count", 0),
                        "fetched_at": None
                    }
                
                return {}
                
        except Exception as e:
            logger.error("twitter_post_metrics_error", error=str(e))
            return {}
