"""TikTok Publisher - High-level publishing interface"""
from typing import Dict, Any, Optional, List
import structlog
import httpx

logger = structlog.get_logger()


class TikTokPublisher:
    """High-level TikTok publishing service using TikTok Content Posting API."""

    def __init__(self) -> None:
        self.logger = logger.bind(service="tiktok_publisher")
        # Direct Post init endpoint (Content Posting API)
        self.direct_post_init_url = "https://open.tiktokapis.com/v2/post/publish/video/init/"

    async def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[List[str]] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Publish a video to TikTok via Direct Post using PULL_FROM_URL.

        This expects that `media_urls` contains at least one public video URL that
        TikTok can pull from. The OAuth token must have the `video.publish` scope
        and the app must be approved for Content Posting.
        """
        platform = "tiktok"

        if not media_urls:
            return {
                "success": False,
                "platform": platform,
                "error": "No media URLs provided for TikTok post",
                "error_code": "tiktok_missing_video_url",
            }

        video_url = media_urls[0]

        # Map kwargs to TikTok post_info fields with safe defaults
        privacy_level = kwargs.get("privacy_level", "PUBLIC_TO_EVERYONE")
        disable_duet = bool(kwargs.get("disable_duet", False))
        disable_comment = bool(kwargs.get("disable_comment", False))
        disable_stitch = bool(kwargs.get("disable_stitch", False))
        is_aigc = bool(kwargs.get("is_aigc", True))

        payload: Dict[str, Any] = {
            "post_info": {
                "title": content[:2200],  # TikTok caption limit
                "privacy_level": privacy_level,
                "disable_duet": disable_duet,
                "disable_comment": disable_comment,
                "disable_stitch": disable_stitch,
                "is_aigc": is_aigc,
            },
            "source_info": {
                "source": "PULL_FROM_URL",
                "video_url": video_url,
            },
        }

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json; charset=UTF-8",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.direct_post_init_url,
                    json=payload,
                    headers=headers,
                )

            if response.status_code != 200:
                # Try to extract a structured error from TikTok
                error_text = response.text
                try:
                    body = response.json()
                    error_text = body.get("message") or body.get("error", {}).get("message", error_text)
                except Exception:  # pragma: no cover - best-effort parsing
                    body = None

                self.logger.error(
                    "tiktok_direct_post_http_error",
                    status_code=response.status_code,
                    body=body or response.text,
                )
                return {
                    "success": False,
                    "platform": platform,
                    "error": f"TikTok API error: {error_text}",
                    "error_code": "tiktok_direct_post_http_error",
                    "status_code": response.status_code,
                }

            data = response.json()
            self.logger.info("tiktok_direct_post_success", response=data)

            # TikTok returns a structure with post/publish information; surface it
            return {
                "success": True,
                "platform": platform,
                "data": data,
            }
        except Exception as e:  # pragma: no cover - network/runtime errors
            self.logger.error("tiktok_direct_post_exception", error=str(e))
            return {
                "success": False,
                "platform": platform,
                "error": str(e),
                "error_code": "tiktok_direct_post_exception",
            }
    
    async def delete_post(
        self,
        access_token: str,
        post_id: str
    ) -> bool:
        """Delete a video from TikTok"""
        return False
    
    async def get_post(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get video details from TikTok"""
        return {}
    
    async def verify_credentials(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Verify TikTok credentials"""
        return {"valid": False, "error": "TikTok integration not implemented"}
    
    async def get_user_profile(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Get user profile from TikTok"""
        raise Exception("TikTok integration not implemented")
    
    async def get_post_metrics(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get video analytics from TikTok"""
        return {}
