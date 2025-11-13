"""
LinkedIn Media Uploader - Handles media upload operations
"""
from typing import List
import httpx
import structlog

logger = structlog.get_logger()


class LinkedInMediaUploader:
    """Handles LinkedIn media upload operations"""
    
    def __init__(self):
        self.api_base = "https://api.linkedin.com/v2"
        self.logger = logger.bind(service="linkedin_media_uploader")
    
    async def upload_multiple(
        self,
        access_token: str,
        person_urn: str,
        media_urls: List[str]
    ) -> List[dict]:
        """
        Upload multiple media files to LinkedIn
        
        Args:
            access_token: OAuth access token
            person_urn: Person URN
            media_urls: List of media URLs to download and upload
        
        Returns:
            List of media asset objects
        """
        media_assets = []
        
        for media_url in media_urls:
            try:
                asset = await self.upload_single(access_token, person_urn, media_url)
                if asset:
                    media_assets.append(asset)
                    
            except Exception as e:
                self.logger.error("linkedin_media_upload_error", error=str(e), url=media_url)
                continue
        
        return media_assets
    
    async def upload_single(
        self,
        access_token: str,
        person_urn: str,
        media_url: str
    ) -> dict:
        """
        Upload a single media file to LinkedIn
        
        Args:
            access_token: OAuth access token
            person_urn: Person URN
            media_url: Media URL to download and upload
        
        Returns:
            Media asset object or None
        """
        try:
            # Download media
            async with httpx.AsyncClient() as client:
                media_response = await client.get(media_url, timeout=30.0)
                if media_response.status_code != 200:
                    self.logger.error("media_download_failed", url=media_url)
                    return None
                
                media_data = media_response.content
            
            # Register upload
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0"
            }
            
            register_payload = {
                "registerUploadRequest": {
                    "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
                    "owner": person_urn,
                    "serviceRelationships": [{
                        "relationshipType": "OWNER",
                        "identifier": "urn:li:userGeneratedContent"
                    }]
                }
            }
            
            async with httpx.AsyncClient() as client:
                register_response = await client.post(
                    f"{self.api_base}/assets?action=registerUpload",
                    headers=headers,
                    json=register_payload,
                    timeout=30.0
                )
                
                if register_response.status_code not in [200, 201]:
                    self.logger.error("media_register_failed", status=register_response.status_code)
                    return None
                
                register_data = register_response.json()
                upload_url = register_data["value"]["uploadMechanism"]["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]["uploadUrl"]
                asset_urn = register_data["value"]["asset"]
                
                # Upload media
                upload_response = await client.put(
                    upload_url,
                    headers={"Authorization": f"Bearer {access_token}"},
                    content=media_data,
                    timeout=60.0
                )
                
                if upload_response.status_code in [200, 201]:
                    self.logger.info("linkedin_media_uploaded", asset=asset_urn)
                    return {
                        "status": "READY",
                        "media": asset_urn
                    }
                else:
                    self.logger.error("media_upload_failed", status=upload_response.status_code)
                    return None
                    
        except Exception as e:
            self.logger.error("upload_single_error", error=str(e), url=media_url)
            return None
