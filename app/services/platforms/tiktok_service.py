"""
TikTok Platform Service
"""
from typing import Dict, Any, Optional, List
import httpx
import structlog
from app.services.platforms.base import BasePlatformService

logger = structlog.get_logger()


class TikTokService(BasePlatformService):
    """TikTok platform integration"""
    
    def __init__(self):
        super().__init__("tiktok")
        self.api_base = "https://open.tiktokapis.com/v2"
    
    async def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[list] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Publish a TikTok video
        
        Note: TikTok requires video content. Text-only posts are not supported.
        Max caption: 150 characters (2200 with more characters feature)
        Video requirements: MP4, MOV, duration 3s-60s (up to 10 min for some accounts)
        """
        try:
            if not media_urls or len(media_urls) == 0:
                raise Exception("TikTok requires a video file")
            
            video_url = media_urls[0]
            
            # TikTok Content Posting API v2
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            # Get video upload URL first
            init_payload = {
                "post_info": {
                    "title": content[:150],  # Max 150 chars
                    "privacy_level": kwargs.get("privacy_level", "PUBLIC_TO_EVERYONE"),
                    "disable_duet": kwargs.get("disable_duet", False),
                    "disable_comment": kwargs.get("disable_comment", False),
                    "disable_stitch": kwargs.get("disable_stitch", False),
                    "video_cover_timestamp_ms": kwargs.get("cover_timestamp", 1000)
                },
                "source_info": {
                    "source": "FILE_UPLOAD",
                    "video_size": kwargs.get("video_size", 0),
                    "chunk_size": kwargs.get("chunk_size", 10485760),  # 10MB chunks
                    "total_chunk_count": 1
                }
            }
            
            async with httpx.AsyncClient() as client:
                # Step 1: Initialize upload
                init_response = await client.post(
                    f"{self.api_base}/post/publish/inbox/video/init/",
                    headers=headers,
                    json=init_payload,
                    timeout=30.0
                )
                
                if init_response.status_code == 200:
                    init_data = init_response.json()
                    
                    if init_data.get("error"):
                        error = init_data["error"]
                        raise Exception(f"TikTok API error: {error.get('message')}")
                    
                    data = init_data.get("data", {})
                    publish_id = data.get("publish_id")
                    upload_url = data.get("upload_url")
                    
                    # Step 2: Upload video file
                    # Note: Actual file upload would happen here
                    # For now, return the publish_id for tracking
                    
                    self.logger.info("tiktok_video_upload_initiated", publish_id=publish_id)
                    
                    return {
                        "success": True,
                        "post_id": publish_id,
                        "upload_url": upload_url,
                        "message": "Video upload initiated. Complete upload to publish.",
                        "platform": self.platform_name,
                        "status": "processing"
                    }
                else:
                    error_msg = init_response.json().get("error", {}).get("message", init_response.text)
                    raise Exception(f"TikTok API error: {error_msg}")
                    
        except Exception as e:
            return self._handle_error(e, "publish_tiktok_video")
    
    async def check_publish_status(
        self,
        access_token: str,
        publish_id: str
    ) -> Dict[str, Any]:
        """
        Check the status of a TikTok video publish
        
        Args:
            access_token: OAuth access token
            publish_id: Publish ID from initiation
        
        Returns:
            Status information
        """
        try:
            headers = {"Authorization": f"Bearer {access_token}"}
            
            payload = {
                "publish_id": publish_id
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_base}/post/publish/status/fetch/",
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("error"):
                        return {"status": "failed", "error": data["error"]}
                    
                    status_data = data.get("data", {})
                    
                    return {
                        "status": status_data.get("status"),  # PROCESSING, PUBLISH_COMPLETE, FAILED
                        "publish_id": publish_id,
                        "uploaded_bytes": status_data.get("uploaded_bytes", 0),
                        "fail_reason": status_data.get("fail_reason")
                    }
                
                return {"status": "unknown", "error": "Failed to fetch status"}
                
        except Exception as e:
            self.logger.error("check_tiktok_status_error", error=str(e))
            return {"status": "error", "error": str(e)}
    
    async def delete_post(
        self,
        access_token: str,
        post_id: str
    ) -> bool:
        """
        Delete a TikTok video
        
        Note: TikTok's delete API might be limited based on permissions
        """
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "video_id": post_id
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_base}/post/publish/video/delete/",
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("error") is None
                
                return False
                
        except Exception as e:
            self.logger.error("delete_tiktok_video_error", error=str(e))
            return False
    
    async def get_post(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """
        Get TikTok video details
        
        Uses TikTok's video query API
        """
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "filters": {
                    "video_ids": [post_id]
                }
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_base}/post/publish/video/list/",
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("error"):
                        return {}
                    
                    videos = data.get("data", {}).get("videos", [])
                    if videos:
                        return videos[0]
                
                return {}
                
        except Exception as e:
            self.logger.error("get_tiktok_video_error", error=str(e))
            return {}
    
    async def verify_credentials(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Verify TikTok credentials and get user info"""
        try:
            headers = {"Authorization": f"Bearer {access_token}"}
            
            async with httpx.AsyncClient() as client:
                # Get user info
                response = await client.get(
                    f"{self.api_base}/user/info/",
                    headers=headers,
                    params={"fields": "open_id,union_id,avatar_url,display_name"},
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("error"):
                        return {"valid": False, "error": data["error"].get("message")}
                    
                    user_data = data.get("data", {}).get("user", {})
                    
                    return {
                        "valid": True,
                        "user_id": user_data.get("open_id"),
                        "display_name": user_data.get("display_name"),
                        "avatar_url": user_data.get("avatar_url")
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
            payload = {
                "client_key": client_id,
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_base}/oauth/token/",
                    data=payload,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise Exception("Failed to exchange code for token")
                
                data = response.json()
                
                if data.get("error"):
                    raise Exception(f"TikTok OAuth error: {data['error_description']}")
                
                return {
                    "access_token": data["access_token"],
                    "refresh_token": data.get("refresh_token"),
                    "token_type": data.get("token_type", "Bearer"),
                    "expires_in": data.get("expires_in", 7200)
                }
                
        except Exception as e:
            logger.error("tiktok_token_exchange_error", error=str(e))
            raise Exception(f"Token exchange failed: {str(e)}")
    
    async def refresh_access_token(
        self,
        refresh_token: str,
        client_id: str,
        client_secret: str
    ) -> Dict[str, Any]:
        """Refresh TikTok access token"""
        try:
            payload = {
                "client_key": client_id,
                "client_secret": client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_base}/oauth/token/",
                    data=payload,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise Exception("Failed to refresh token")
                
                data = response.json()
                
                if data.get("error"):
                    raise Exception(f"TikTok refresh error: {data['error_description']}")
                
                return {
                    "access_token": data["access_token"],
                    "refresh_token": data.get("refresh_token", refresh_token),
                    "token_type": data.get("token_type", "Bearer"),
                    "expires_in": data.get("expires_in", 7200)
                }
                
        except Exception as e:
            logger.error("tiktok_token_refresh_error", error=str(e))
            raise Exception(f"Token refresh failed: {str(e)}")
    
    async def get_user_profile(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Get TikTok user profile"""
        try:
            headers = {"Authorization": f"Bearer {access_token}"}
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/user/info/",
                    headers=headers,
                    params={"fields": "open_id,union_id,avatar_url,display_name"},
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("error"):
                        raise Exception(f"TikTok API error: {data['error']['message']}")
                    
                    user_data = data.get("data", {}).get("user", {})
                    
                    return {
                        "id": user_data.get("open_id"),
                        "username": user_data.get("display_name"),
                        "name": user_data.get("display_name"),
                        "profile_image_url": user_data.get("avatar_url")
                    }
                
                raise Exception("Failed to fetch user profile")
                
        except Exception as e:
            logger.error("tiktok_user_profile_error", error=str(e))
            raise Exception(f"Failed to get user profile: {str(e)}")
    
    async def upload_media(
        self,
        access_token: str,
        media_url: str
    ) -> Dict[str, Any]:
        """Upload media to TikTok (returns URL for posting)"""
        try:
            # TikTok requires complex video upload process
            # For now, return the media URL for processing
            return {
                "success": True,
                "media_url": media_url,
                "platform": self.platform_name,
                "message": "Media prepared for TikTok upload"
            }
                
        except Exception as e:
            logger.error("tiktok_media_upload_error", error=str(e))
            return {"success": False, "error": str(e)}
    
    async def schedule_post(
        self,
        access_token: str,
        content: str,
        scheduled_time: int,
        media_urls: List[str]
    ) -> Dict[str, Any]:
        """TikTok doesn't support scheduled posting via API"""
        try:
            return {
                "success": False,
                "error": "TikTok does not support scheduled posting via API",
                "platform": self.platform_name,
                "message": "Use TikTok Creator Studio for scheduling"
            }
                    
        except Exception as e:
            logger.error("tiktok_schedule_post_error", error=str(e))
            return {"success": False, "error": str(e)}
    
    async def get_post_metrics(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get TikTok video analytics"""
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "filters": {
                    "video_ids": [post_id]
                },
                "fields": ["like_count", "comment_count", "share_count", "view_count"]
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_base}/video/query/",
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("error"):
                        return {}
                    
                    videos = data.get("data", {}).get("videos", [])
                    if videos:
                        video = videos[0]
                        return {
                            "post_id": post_id,
                            "platform": "tiktok",
                            "impressions": video.get("view_count", 0),
                            "views": video.get("view_count", 0),
                            "engagements": (
                                video.get("like_count", 0) + 
                                video.get("comment_count", 0) + 
                                video.get("share_count", 0)
                            ),
                            "likes": video.get("like_count", 0),
                            "comments": video.get("comment_count", 0),
                            "shares": video.get("share_count", 0),
                            "fetched_at": None
                        }
                
                return {}
                
        except Exception as e:
            logger.error("tiktok_post_metrics_error", error=str(e))
            return {}
