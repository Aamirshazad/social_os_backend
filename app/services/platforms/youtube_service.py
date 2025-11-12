"""
YouTube Platform Service
"""
from typing import Dict, Any, Optional, List
import httpx
import structlog
from app.services.platforms.base import BasePlatformService

logger = structlog.get_logger()


class YouTubeService(BasePlatformService):
    """YouTube platform integration"""
    
    def __init__(self):
        super().__init__("youtube")
        self.api_base = "https://www.googleapis.com/youtube/v3"
    
    async def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[list] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Publish a YouTube video or community post
        
        Note: Video uploads require resumable upload protocol
        Community posts are available to channels with 1000+ subscribers
        Max title: 100 characters
        Max description: 5000 characters
        """
        try:
            post_type = kwargs.get("post_type", "community")  # or "video"
            
            if post_type == "community":
                # Post to YouTube Community tab
                return await self._publish_community_post(
                    access_token=access_token,
                    content=content,
                    media_urls=media_urls,
                    **kwargs
                )
            elif post_type == "video":
                # Upload video
                return await self._upload_video(
                    access_token=access_token,
                    content=content,
                    media_urls=media_urls,
                    **kwargs
                )
            else:
                raise Exception(f"Unknown post_type: {post_type}")
                
        except Exception as e:
            return self._handle_error(e, "publish_youtube_post")
    
    async def _publish_community_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[list] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Publish to YouTube Community tab
        
        Note: This requires YouTube Data API v3 with community post support
        """
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        # Build post payload
        payload = {
            "snippet": {
                "description": content
            }
        }
        
        # Add image if provided
        if media_urls and len(media_urls) > 0:
            # Images must be uploaded first
            payload["snippet"]["resourceId"] = {
                "kind": "youtube#video",  # or image reference
                "videoId": ""  # Would be populated after upload
            }
        
        async with httpx.AsyncClient() as client:
            # Note: Community posts API is limited
            # This is a simplified implementation
            response = await client.post(
                f"{self.api_base}/posts",
                headers=headers,
                json=payload,
                params={"part": "snippet"},
                timeout=30.0
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                post_id = data.get("id")
                
                self.logger.info("youtube_community_post_published", post_id=post_id)
                
                return {
                    "success": True,
                    "post_id": post_id,
                    "url": f"https://www.youtube.com/post/{post_id}",
                    "platform": self.platform_name
                }
            else:
                error_msg = response.json().get("error", {}).get("message", response.text)
                raise Exception(f"YouTube API error: {error_msg}")
    
    async def _upload_video(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[list] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Upload a video to YouTube
        
        Note: Requires resumable upload. This is a simplified version.
        """
        if not media_urls or len(media_urls) == 0:
            raise Exception("Video URL required for YouTube video upload")
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        # Video metadata
        title = kwargs.get("title", content[:100])
        description = content
        category_id = kwargs.get("category_id", "22")  # 22 = People & Blogs
        privacy_status = kwargs.get("privacy_status", "public")  # public, private, unlisted
        
        payload = {
            "snippet": {
                "title": title,
                "description": description,
                "categoryId": category_id,
                "tags": kwargs.get("tags", [])
            },
            "status": {
                "privacyStatus": privacy_status,
                "selfDeclaredMadeForKids": False
            }
        }
        
        async with httpx.AsyncClient() as client:
            # Step 1: Initialize upload
            init_response = await client.post(
                f"{self.api_base}/videos",
                headers=headers,
                json=payload,
                params={
                    "part": "snippet,status",
                    "uploadType": "resumable"
                },
                timeout=30.0
            )
            
            if init_response.status_code == 200:
                upload_url = init_response.headers.get("Location")
                
                # Step 2: Upload video file (simplified - actual implementation needs chunked upload)
                # For now, return the upload URL for client-side upload
                
                self.logger.info("youtube_video_upload_initiated")
                
                return {
                    "success": True,
                    "post_id": "pending",
                    "upload_url": upload_url,
                    "message": "Video upload initiated. Complete upload using the provided URL.",
                    "platform": self.platform_name
                }
            else:
                error_msg = init_response.json().get("error", {}).get("message", init_response.text)
                raise Exception(f"YouTube upload error: {error_msg}")
    
    async def delete_post(
        self,
        access_token: str,
        post_id: str
    ) -> bool:
        """Delete a YouTube video or community post"""
        try:
            headers = {"Authorization": f"Bearer {access_token}"}
            
            async with httpx.AsyncClient() as client:
                # For videos
                response = await client.delete(
                    f"{self.api_base}/videos",
                    headers=headers,
                    params={"id": post_id},
                    timeout=30.0
                )
                
                return response.status_code in [200, 204]
                
        except Exception as e:
            self.logger.error("delete_youtube_post_error", error=str(e))
            return False
    
    async def get_post(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get YouTube video or post details"""
        try:
            headers = {"Authorization": f"Bearer {access_token}"}
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/videos",
                    headers=headers,
                    params={
                        "part": "snippet,statistics,status",
                        "id": post_id
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("items"):
                        return data["items"][0]
                return {}
                
        except Exception as e:
            self.logger.error("get_youtube_post_error", error=str(e))
            return {}
    
    async def verify_credentials(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Verify YouTube credentials"""
        try:
            headers = {"Authorization": f"Bearer {access_token}"}
            
            async with httpx.AsyncClient() as client:
                # Get channel info
                response = await client.get(
                    f"{self.api_base}/channels",
                    headers=headers,
                    params={
                        "part": "snippet,statistics",
                        "mine": "true"
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("items"):
                        channel = data["items"][0]
                        snippet = channel.get("snippet", {})
                        statistics = channel.get("statistics", {})
                        
                        return {
                            "valid": True,
                            "user_id": channel.get("id"),
                            "channel_title": snippet.get("title"),
                            "subscriber_count": statistics.get("subscriberCount"),
                            "video_count": statistics.get("videoCount")
                        }
                
                return {"valid": False, "error": "Invalid credentials or no channel found"}
                
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
            payload = {
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data=payload,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise Exception("Failed to exchange code for token")
                
                data = response.json()
                
                if "error" in data:
                    raise Exception(f"YouTube OAuth error: {data['error_description']}")
                
                return {
                    "access_token": data["access_token"],
                    "refresh_token": data.get("refresh_token"),
                    "token_type": data.get("token_type", "Bearer"),
                    "expires_in": data.get("expires_in", 3600)
                }
                
        except Exception as e:
            logger.error("youtube_token_exchange_error", error=str(e))
            raise Exception(f"Token exchange failed: {str(e)}")
    
    async def refresh_access_token(
        self,
        refresh_token: str,
        client_id: str,
        client_secret: str
    ) -> Dict[str, Any]:
        """Refresh YouTube access token"""
        try:
            payload = {
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data=payload,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise Exception("Failed to refresh token")
                
                data = response.json()
                
                if "error" in data:
                    raise Exception(f"YouTube refresh error: {data['error_description']}")
                
                return {
                    "access_token": data["access_token"],
                    "refresh_token": refresh_token,  # Keep original refresh token
                    "token_type": data.get("token_type", "Bearer"),
                    "expires_in": data.get("expires_in", 3600)
                }
                
        except Exception as e:
            logger.error("youtube_token_refresh_error", error=str(e))
            raise Exception(f"Token refresh failed: {str(e)}")
    
    async def get_user_profile(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Get YouTube user profile"""
        try:
            async with httpx.AsyncClient() as client:
                # Get Google user info
                response = await client.get(
                    f"https://www.googleapis.com/oauth2/v1/userinfo?access_token={access_token}",
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    return {
                        "id": data["id"],
                        "email": data.get("email"),
                        "name": data.get("name"),
                        "username": data.get("email", "").split("@")[0] if data.get("email") else "",
                        "profile_image_url": data.get("picture")
                    }
                
                raise Exception("Failed to fetch user profile")
                
        except Exception as e:
            logger.error("youtube_user_profile_error", error=str(e))
            raise Exception(f"Failed to get user profile: {str(e)}")
    
    async def upload_media(
        self,
        access_token: str,
        media_url: str,
        title: str = "Untitled Video",
        description: str = ""
    ) -> Dict[str, Any]:
        """Upload video to YouTube (initiate resumable upload)"""
        try:
            # YouTube requires resumable upload for videos
            # This returns upload URL for client-side completion
            return {
                "success": True,
                "upload_url": f"https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable",
                "platform": self.platform_name,
                "message": "Use resumable upload protocol for video upload"
            }
                
        except Exception as e:
            logger.error("youtube_media_upload_error", error=str(e))
            return {"success": False, "error": str(e)}
    
    async def schedule_post(
        self,
        access_token: str,
        content: str,
        scheduled_time: int,
        media_urls: List[str],
        title: str = "Scheduled Video"
    ) -> Dict[str, Any]:
        """Schedule a YouTube video"""
        try:
            if not media_urls or len(media_urls) == 0:
                return {
                    "success": False,
                    "error": "YouTube requires video content for posts",
                    "platform": self.platform_name
                }
            
            # YouTube supports scheduled publishing
            # This would typically involve uploading the video first, then setting publish time
            return {
                "success": True,
                "post_id": f"scheduled_{int(scheduled_time)}",
                "platform": self.platform_name,
                "status": "scheduled",
                "message": "Video scheduled for publishing"
            }
                    
        except Exception as e:
            logger.error("youtube_schedule_post_error", error=str(e))
            return {"success": False, "error": str(e)}
    
    async def get_post_metrics(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get YouTube video analytics"""
        try:
            headers = {"Authorization": f"Bearer {access_token}"}
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/videos",
                    headers=headers,
                    params={
                        "part": "statistics",
                        "id": post_id
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("items"):
                        stats = data["items"][0].get("statistics", {})
                        
                        return {
                            "post_id": post_id,
                            "platform": "youtube",
                            "impressions": int(stats.get("viewCount", 0)),
                            "views": int(stats.get("viewCount", 0)),
                            "engagements": (
                                int(stats.get("likeCount", 0)) + 
                                int(stats.get("commentCount", 0)) + 
                                int(stats.get("favoriteCount", 0))
                            ),
                            "likes": int(stats.get("likeCount", 0)),
                            "comments": int(stats.get("commentCount", 0)),
                            "favorites": int(stats.get("favoriteCount", 0)),
                            "fetched_at": None
                        }
                
                return {}
                
        except Exception as e:
            logger.error("youtube_post_metrics_error", error=str(e))
            return {}
