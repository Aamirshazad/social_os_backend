"""YouTube Publisher - High-level publishing interface"""
from typing import Dict, Any, Optional, List
import structlog
import httpx
import json
from uuid import uuid4

logger = structlog.get_logger()


class YouTubePublisher:
    """High-level YouTube publishing service using YouTube Data API."""

    def __init__(self) -> None:
        self.logger = logger.bind(service="youtube_publisher")
        self.upload_url = (
            "https://www.googleapis.com/upload/youtube/v3/videos"
            "?uploadType=multipart&part=snippet,status"
        )

    async def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[List[str]] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Publish a video to YouTube via multipart upload.

        This expects that `media_urls` contains at least one public video URL
        (e.g. from your media library). The backend will download the video
        and upload it to YouTube using `videos.insert`.
        """
        platform = "youtube"

        if not media_urls:
            return {
                "success": False,
                "platform": platform,
                "error": "No media URLs provided for YouTube video",
                "error_code": "youtube_missing_video_url",
            }

        video_url = media_urls[0]

        # Metadata
        title = kwargs.get("title") or kwargs.get("video_title") or "AI Generated Video"
        tags = kwargs.get("tags") or []
        privacy_status = kwargs.get("privacy_status", "private")

        snippet: Dict[str, Any] = {
            "title": title,
            "description": content,
            "categoryId": kwargs.get("category_id", "22"),  # People & Blogs
        }
        if tags:
            snippet["tags"] = tags

        status: Dict[str, Any] = {
            "privacyStatus": privacy_status,
        }

        metadata = {"snippet": snippet, "status": status}

        headers_base = {
            "Authorization": f"Bearer {access_token}",
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                # 1) Download video bytes from the given URL
                video_resp = await client.get(video_url)
                if video_resp.status_code != 200:
                    self.logger.error(
                        "youtube_video_fetch_error",
                        status_code=video_resp.status_code,
                        url=video_url,
                    )
                    return {
                        "success": False,
                        "platform": platform,
                        "error": f"Failed to fetch video from URL (status {video_resp.status_code})",
                        "error_code": "youtube_video_fetch_failed",
                    }

                video_bytes = video_resp.content

                # 2) Build multipart/related body
                boundary = f"===============youtube-{uuid4().hex}=="
                meta_json = json.dumps(metadata).encode("utf-8")

                # First part: JSON metadata
                parts: List[bytes] = []
                parts.append(f"--{boundary}\r\n".encode("utf-8"))
                parts.append(b"Content-Type: application/json; charset=UTF-8\r\n\r\n")
                parts.append(meta_json)
                parts.append(b"\r\n")

                # Second part: video bytes
                parts.append(f"--{boundary}\r\n".encode("utf-8"))
                parts.append(b"Content-Type: video/mp4\r\n\r\n")
                parts.append(video_bytes)
                parts.append(b"\r\n")
                parts.append(f"--{boundary}--\r\n".encode("utf-8"))

                body = b"".join(parts)

                headers = {
                    **headers_base,
                    "Content-Type": f"multipart/related; boundary={boundary}",
                }

                # 3) Upload to YouTube
                upload_resp = await client.post(
                    self.upload_url,
                    content=body,
                    headers=headers,
                )

            if upload_resp.status_code not in (200, 201):
                error_text = upload_resp.text
                err_body: Optional[Dict[str, Any]] = None
                try:
                    err_body = upload_resp.json()
                    error_info = (
                        err_body.get("error", {})
                        .get("errors", [{}])[0]
                        .get("message")
                    ) or err_body.get("error", {}).get("message")
                    if error_info:
                        error_text = error_info
                except Exception:  # pragma: no cover - best-effort parsing
                    err_body = None

                self.logger.error(
                    "youtube_upload_http_error",
                    status_code=upload_resp.status_code,
                    body=err_body or upload_resp.text,
                )
                return {
                    "success": False,
                    "platform": platform,
                    "error": f"YouTube API error: {error_text}",
                    "error_code": "youtube_upload_http_error",
                    "status_code": upload_resp.status_code,
                }

            data = upload_resp.json()
            video_id = data.get("id")
            self.logger.info("youtube_upload_success", video_id=video_id, response=data)

            return {
                "success": True,
                "platform": platform,
                "video_id": video_id,
                "data": data,
            }
        except Exception as e:  # pragma: no cover - network/runtime errors
            self.logger.error("youtube_upload_exception", error=str(e))
            return {
                "success": False,
                "platform": platform,
                "error": str(e),
                "error_code": "youtube_upload_exception",
            }
    
    async def delete_post(
        self,
        access_token: str,
        post_id: str
    ) -> bool:
        """Delete a video from YouTube"""
        return False
    
    async def get_post(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get video details from YouTube"""
        return {}
    
    async def verify_credentials(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Verify YouTube credentials"""
        return {"valid": False, "error": "YouTube integration not implemented"}
    
    async def get_user_profile(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Get user profile from YouTube"""
        raise Exception("YouTube integration not implemented")
    
    async def get_post_metrics(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get video analytics from YouTube"""
        return {}
