"""
Twitter Media Uploader - Handles media upload operations
"""
from typing import List, Optional
import httpx
import structlog
import base64

logger = structlog.get_logger()


class TwitterMediaUploader:
    """Handles Twitter media upload operations"""
    
    def __init__(self):
        self.upload_base = "https://upload.twitter.com/1.1/media"
        self.logger = logger.bind(service="twitter_media_uploader")
    
    async def upload_multiple(
        self,
        access_token: str,
        media_urls: List[str]
    ) -> List[str]:
        """
        Upload multiple media files to Twitter
        
        Args:
            access_token: OAuth access token
            media_urls: List of media URLs to download and upload
        
        Returns:
            List of media IDs
        """
        media_ids = []
        
        for media_url in media_urls:
            try:
                media_id = await self.upload_single(access_token, media_url)
                if media_id:
                    media_ids.append(media_id)
                    
            except Exception as e:
                self.logger.error("media_upload_error", error=str(e), url=media_url)
                continue
        
        return media_ids
    
    async def upload_single(
        self,
        access_token: str,
        media_url: str
    ) -> Optional[str]:
        """
        Upload a single media file to Twitter
        
        Args:
            access_token: OAuth access token
            media_url: Media URL to download and upload
        
        Returns:
            Media ID or None
        """
        try:
            # Download media from URL
            async with httpx.AsyncClient() as client:
                media_response = await client.get(media_url, timeout=30.0)
                if media_response.status_code != 200:
                    self.logger.error("media_download_failed", url=media_url)
                    return None
                
                media_data = media_response.content
                media_type = media_response.headers.get("content-type", "image/jpeg")
                media_size = len(media_data)
            
            # Determine upload method based on size
            if media_size > 5 * 1024 * 1024:  # 5MB
                return await self._chunked_upload(access_token, media_data, media_type)
            else:
                return await self._simple_upload(access_token, media_data, media_type)
                
        except Exception as e:
            self.logger.error("upload_single_error", error=str(e), url=media_url)
            return None
    
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
            headers = {"Authorization": f"Bearer {access_token}"}
            
            # Encode media as base64
            media_b64 = base64.b64encode(media_data).decode('utf-8')
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.upload_base}/upload.json",
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
            headers = {"Authorization": f"Bearer {access_token}"}
            media_size = len(media_data)
            chunk_size = 5 * 1024 * 1024  # 5MB chunks
            
            async with httpx.AsyncClient() as client:
                # INIT phase
                media_id = await self._init_chunked_upload(
                    client, headers, media_size, media_type
                )
                if not media_id:
                    return None
                
                # APPEND phase
                success = await self._append_chunks(
                    client, headers, media_id, media_data, chunk_size
                )
                if not success:
                    return None
                
                # FINALIZE phase
                return await self._finalize_chunked_upload(
                    client, headers, media_id
                )
                    
        except Exception as e:
            self.logger.error("chunked_upload_error", error=str(e))
            return None
    
    async def _init_chunked_upload(
        self,
        client: httpx.AsyncClient,
        headers: dict,
        media_size: int,
        media_type: str
    ) -> Optional[str]:
        """Initialize chunked upload"""
        response = await client.post(
            f"{self.upload_base}/upload.json",
            headers=headers,
            data={
                "command": "INIT",
                "total_bytes": media_size,
                "media_type": media_type,
                "media_category": self._get_media_category(media_type)
            },
            timeout=30.0
        )
        
        if response.status_code not in [200, 201, 202]:
            self.logger.error("chunked_init_failed", status=response.status_code)
            return None
        
        return response.json().get("media_id_string")
    
    async def _append_chunks(
        self,
        client: httpx.AsyncClient,
        headers: dict,
        media_id: str,
        media_data: bytes,
        chunk_size: int
    ) -> bool:
        """Append data chunks"""
        media_size = len(media_data)
        segment_index = 0
        
        for i in range(0, media_size, chunk_size):
            chunk = media_data[i:i + chunk_size]
            chunk_b64 = base64.b64encode(chunk).decode('utf-8')
            
            response = await client.post(
                f"{self.upload_base}/upload.json",
                headers=headers,
                data={
                    "command": "APPEND",
                    "media_id": media_id,
                    "media_data": chunk_b64,
                    "segment_index": segment_index
                },
                timeout=60.0
            )
            
            if response.status_code not in [200, 201, 204]:
                self.logger.error("chunked_append_failed", segment=segment_index)
                return False
            
            segment_index += 1
        
        return True
    
    async def _finalize_chunked_upload(
        self,
        client: httpx.AsyncClient,
        headers: dict,
        media_id: str
    ) -> Optional[str]:
        """Finalize chunked upload"""
        response = await client.post(
            f"{self.upload_base}/upload.json",
            headers=headers,
            data={
                "command": "FINALIZE",
                "media_id": media_id
            },
            timeout=30.0
        )
        
        if response.status_code in [200, 201]:
            return media_id
        else:
            self.logger.error("chunked_finalize_failed", status=response.status_code)
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
