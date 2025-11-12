"""
Twitter/X Platform Service
"""
from typing import Dict, Any, Optional, List
import httpx
import structlog
from app.services.platforms.base import BasePlatformService

logger = structlog.get_logger()


class TwitterService(BasePlatformService):
    """Twitter/X platform integration"""
    
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
        
        Twitter API v2 endpoint: POST /tweets
        Max characters: 280 (or 4000 for Premium)
        """
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            payload = {"text": content}
            
            # Handle media if present
            if media_urls:
                # Media must be uploaded first via media upload endpoint
                media_ids = await self._upload_media(access_token, media_urls)
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
    
    async def _upload_media(
        self,
        access_token: str,
        media_urls: list
    ) -> list:
        """
        Upload media to Twitter using Media Upload API
        Supports both simple and chunked upload
        
        Args:
            access_token: OAuth access token
            media_urls: List of media URLs to download and upload
        
        Returns:
            List of media IDs
        """
        media_ids = []
        
        for media_url in media_urls:
            try:
                # Download media from URL
                async with httpx.AsyncClient() as client:
                    media_response = await client.get(media_url, timeout=30.0)
                    if media_response.status_code != 200:
                        self.logger.error("media_download_failed", url=media_url)
                        continue
                    
                    media_data = media_response.content
                    media_type = media_response.headers.get("content-type", "image/jpeg")
                    media_size = len(media_data)
                
                # Determine if we need chunked upload (>5MB)
                if media_size > 5 * 1024 * 1024:
                    media_id = await self._chunked_upload(access_token, media_data, media_type)
                else:
                    media_id = await self._simple_upload(access_token, media_data, media_type)
                
                if media_id:
                    media_ids.append(media_id)
                    
            except Exception as e:
                self.logger.error("media_upload_error", error=str(e), url=media_url)
                continue
        
        return media_ids
    
    async def _simple_upload(
        self,
        access_token: str,
        media_data: bytes,
        media_type: str
    ) -> Optional[str]:
        """
        Simple media upload for files under 5MB
        
        Args:
            access_token: OAuth access token
            media_data: Raw media bytes
            media_type: MIME type
        
        Returns:
            Media ID or None
        """
        try:
            import base64
            
            headers = {
                "Authorization": f"Bearer {access_token}"
            }
            
            # Encode media as base64
            media_b64 = base64.b64encode(media_data).decode('utf-8')
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://upload.twitter.com/1.1/media/upload.json",
                    headers=headers,
                    data={
                        "media_data": media_b64,
                        "media_category": self._get_media_category(media_type)
                    },
                    timeout=60.0
                )
                
                if response.status_code in [200, 201]:
                    data = response.json()
                    return str(data.get("media_id_string"))
                else:
                    self.logger.error("simple_upload_failed", status=response.status_code)
                    return None
                    
        except Exception as e:
            self.logger.error("simple_upload_error", error=str(e))
            return None
    
    async def _chunked_upload(
        self,
        access_token: str,
        media_data: bytes,
        media_type: str
    ) -> Optional[str]:
        """
        Chunked media upload for files over 5MB
        
        Args:
            access_token: OAuth access token
            media_data: Raw media bytes
            media_type: MIME type
        
        Returns:
            Media ID or None
        """
        try:
            import base64
            
            headers = {
                "Authorization": f"Bearer {access_token}"
            }
            
            media_size = len(media_data)
            chunk_size = 5 * 1024 * 1024  # 5MB chunks
            
            async with httpx.AsyncClient() as client:
                # INIT
                init_response = await client.post(
                    "https://upload.twitter.com/1.1/media/upload.json",
                    headers=headers,
                    data={
                        "command": "INIT",
                        "total_bytes": media_size,
                        "media_type": media_type,
                        "media_category": self._get_media_category(media_type)
                    },
                    timeout=30.0
                )
                
                if init_response.status_code not in [200, 201, 202]:
                    self.logger.error("chunked_init_failed", status=init_response.status_code)
                    return None
                
                media_id = init_response.json().get("media_id_string")
                
                # APPEND chunks
                segment_index = 0
                for i in range(0, media_size, chunk_size):
                    chunk = media_data[i:i + chunk_size]
                    chunk_b64 = base64.b64encode(chunk).decode('utf-8')
                    
                    append_response = await client.post(
                        "https://upload.twitter.com/1.1/media/upload.json",
                        headers=headers,
                        data={
                            "command": "APPEND",
                            "media_id": media_id,
                            "media_data": chunk_b64,
                            "segment_index": segment_index
                        },
                        timeout=60.0
                    )
                    
                    if append_response.status_code not in [200, 201, 204]:
                        self.logger.error("chunked_append_failed", segment=segment_index)
                        return None
                    
                    segment_index += 1
                
                # FINALIZE
                finalize_response = await client.post(
                    "https://upload.twitter.com/1.1/media/upload.json",
                    headers=headers,
                    data={
                        "command": "FINALIZE",
                        "media_id": media_id
                    },
                    timeout=30.0
                )
                
                if finalize_response.status_code in [200, 201]:
                    return media_id
                else:
                    self.logger.error("chunked_finalize_failed", status=finalize_response.status_code)
                    return None
                    
        except Exception as e:
            self.logger.error("chunked_upload_error", error=str(e))
            return None
    
    def _get_media_category(self, media_type: str) -> str:
        """
        Determine Twitter media category from MIME type
        
        Args:
            media_type: MIME type
        
        Returns:
            Twitter media category
        """
        if media_type.startswith("video/") or media_type == "application/mp4":
            return "tweet_video"
        elif media_type.startswith("image/gif"):
            return "tweet_gif"
        else:
            return "tweet_image"
    
    async def exchange_code_for_token(
        self,
        code: str,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
        code_verifier: str = None
    ) -> Dict[str, Any]:
        """Exchange authorization code for access token"""
        try:
            payload = {
                "grant_type": "authorization_code",
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri
            }
            
            if code_verifier:
                payload["code_verifier"] = code_verifier
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.twitter.com/2/oauth2/token",
                    data=payload,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise Exception("Failed to exchange code for token")
                
                data = response.json()
                
                if "error" in data:
                    raise Exception(f"Twitter OAuth error: {data['error_description']}")
                
                return {
                    "access_token": data["access_token"],
                    "refresh_token": data.get("refresh_token"),
                    "token_type": data.get("token_type", "Bearer"),
                    "expires_in": data.get("expires_in", 7200),
                    "scope": data.get("scope")
                }
                
        except Exception as e:
            logger.error("twitter_token_exchange_error", error=str(e))
            raise Exception(f"Token exchange failed: {str(e)}")
    
    async def refresh_access_token(
        self,
        refresh_token: str,
        client_id: str,
        client_secret: str
    ) -> Dict[str, Any]:
        """Refresh Twitter access token"""
        try:
            payload = {
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": client_id,
                "client_secret": client_secret
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.twitter.com/2/oauth2/token",
                    data=payload,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise Exception("Failed to refresh token")
                
                data = response.json()
                
                if "error" in data:
                    raise Exception(f"Twitter refresh error: {data['error_description']}")
                
                return {
                    "access_token": data["access_token"],
                    "refresh_token": data.get("refresh_token", refresh_token),
                    "token_type": data.get("token_type", "Bearer"),
                    "expires_in": data.get("expires_in", 7200),
                    "scope": data.get("scope")
                }
                
        except Exception as e:
            logger.error("twitter_token_refresh_error", error=str(e))
            raise Exception(f"Token refresh failed: {str(e)}")
    
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
    
    async def upload_media(
        self,
        access_token: str,
        media_url: str
    ) -> Dict[str, Any]:
        """Upload media to Twitter"""
        try:
            media_ids = await self._upload_media(access_token, [media_url])
            
            if media_ids:
                return {
                    "success": True,
                    "media_id": media_ids[0],
                    "platform": self.platform_name
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
        try:
            return {
                "success": False,
                "error": "Twitter API v2 does not support scheduled posting",
                "platform": self.platform_name,
                "message": "Use Twitter's native scheduler or post immediately"
            }
                    
        except Exception as e:
            logger.error("twitter_schedule_post_error", error=str(e))
            return {"success": False, "error": str(e)}
    
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
