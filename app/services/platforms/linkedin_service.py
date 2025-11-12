"""
LinkedIn Platform Service
"""
from typing import Dict, Any, Optional, List
import httpx
import structlog
from app.services.platforms.base import BasePlatformService

logger = structlog.get_logger()


class LinkedInService(BasePlatformService):
    """LinkedIn platform integration"""
    
    def __init__(self):
        super().__init__("linkedin")
        self.api_base = "https://api.linkedin.com/v2"
    
    async def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[list] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Publish a LinkedIn post (UGC Post)
        
        Max characters: 3000 for posts, 1300 optimal
        """
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0"
            }
            
            # Get user's person URN
            person_urn = kwargs.get("person_urn")
            if not person_urn:
                person_urn = await self._get_person_urn(access_token)
            
            # Build post payload
            payload = {
                "author": person_urn,
                "lifecycleState": "PUBLISHED",
                "specificContent": {
                    "com.linkedin.ugc.ShareContent": {
                        "shareCommentary": {
                            "text": content
                        },
                        "shareMediaCategory": "NONE"
                    }
                },
                "visibility": {
                    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
                }
            }
            
            # Handle media if present
            if media_urls:
                media_assets = await self._upload_media(access_token, person_urn, media_urls)
                if media_assets:
                    payload["specificContent"]["com.linkedin.ugc.ShareContent"]["shareMediaCategory"] = "IMAGE"
                    payload["specificContent"]["com.linkedin.ugc.ShareContent"]["media"] = media_assets
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_base}/ugcPosts",
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code in [200, 201]:
                    post_id = response.headers.get("X-RestLi-Id", "")
                    
                    self.logger.info("linkedin_post_published", post_id=post_id)
                    
                    return {
                        "success": True,
                        "post_id": post_id,
                        "url": f"https://www.linkedin.com/feed/update/{post_id}",
                        "platform": self.platform_name
                    }
                else:
                    error_msg = response.json().get("message", response.text)
                    raise Exception(f"LinkedIn API error: {error_msg}")
                    
        except Exception as e:
            return self._handle_error(e, "publish_linkedin_post")
    
    async def delete_post(
        self,
        access_token: str,
        post_id: str
    ) -> bool:
        """Delete a LinkedIn post"""
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "X-Restli-Protocol-Version": "2.0.0"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.api_base}/ugcPosts/{post_id}",
                    headers=headers,
                    timeout=30.0
                )
                
                return response.status_code in [200, 204]
                
        except Exception as e:
            self.logger.error("delete_linkedin_post_error", error=str(e))
            return False
    
    async def get_post(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get LinkedIn post details"""
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "X-Restli-Protocol-Version": "2.0.0"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/ugcPosts/{post_id}",
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return response.json()
                return {}
                
        except Exception as e:
            self.logger.error("get_linkedin_post_error", error=str(e))
            return {}
    
    async def verify_credentials(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Verify LinkedIn credentials"""
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "X-Restli-Protocol-Version": "2.0.0"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/me",
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "valid": True,
                        "user_id": data.get("id"),
                        "name": f"{data.get('localizedFirstName', '')} {data.get('localizedLastName', '')}"
                    }
                
                return {"valid": False, "error": "Invalid credentials"}
                
        except Exception as e:
            return {"valid": False, "error": str(e)}
    
    async def _get_person_urn(self, access_token: str) -> str:
        """Get person URN for the authenticated user"""
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "X-Restli-Protocol-Version": "2.0.0"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/me",
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    user_id = response.json().get("id")
                    return f"urn:li:person:{user_id}"
                
                raise Exception("Failed to get person URN")
                
        except Exception as e:
            self.logger.error("get_person_urn_error", error=str(e))
            raise
    
    async def _upload_media(
        self,
        access_token: str,
        person_urn: str,
        media_urls: list
    ) -> list:
        """
        Upload media to LinkedIn
        
        Args:
            access_token: OAuth access token
            person_urn: Person URN
            media_urls: List of media URLs
        
        Returns:
            List of media asset objects
        """
        media_assets = []
        
        for media_url in media_urls:
            try:
                # Download media
                async with httpx.AsyncClient() as client:
                    media_response = await client.get(media_url, timeout=30.0)
                    if media_response.status_code != 200:
                        self.logger.error("media_download_failed", url=media_url)
                        continue
                    
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
                        continue
                    
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
                        media_assets.append({
                            "status": "READY",
                            "media": asset_urn
                        })
                        self.logger.info("linkedin_media_uploaded", asset=asset_urn)
                    else:
                        self.logger.error("media_upload_failed", status=upload_response.status_code)
                        
            except Exception as e:
                self.logger.error("linkedin_media_upload_error", error=str(e), url=media_url)
                continue
        
        return media_assets
    
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
                "grant_type": "authorization_code",
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://www.linkedin.com/oauth/v2/accessToken",
                    data=payload,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise Exception("Failed to exchange code for token")
                
                data = response.json()
                
                return {
                    "access_token": data["access_token"],
                    "token_type": data.get("token_type", "Bearer"),
                    "expires_in": data.get("expires_in", 5184000)  # 60 days default
                }
                
        except Exception as e:
            logger.error("linkedin_token_exchange_error", error=str(e))
            raise Exception(f"Token exchange failed: {str(e)}")
    
    async def refresh_access_token(
        self,
        refresh_token: str,
        client_id: str,
        client_secret: str
    ) -> Dict[str, Any]:
        """LinkedIn doesn't support refresh tokens - tokens are long-lived"""
        raise Exception("LinkedIn API does not support token refresh. Tokens are long-lived (60 days).")
    
    async def get_user_profile(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Get LinkedIn user profile"""
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "X-Restli-Protocol-Version": "2.0.0"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/me",
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "id": data["id"],
                        "username": f"{data.get('localizedFirstName', '')} {data.get('localizedLastName', '')}".strip(),
                        "name": f"{data.get('localizedFirstName', '')} {data.get('localizedLastName', '')}".strip(),
                        "profile_image_url": data.get("profilePicture", {}).get("displayImage")
                    }
                
                raise Exception("Failed to fetch user profile")
                
        except Exception as e:
            logger.error("linkedin_user_profile_error", error=str(e))
            raise Exception(f"Failed to get user profile: {str(e)}")
    
    async def upload_media(
        self,
        access_token: str,
        media_url: str,
        person_urn: str
    ) -> Dict[str, Any]:
        """Upload media to LinkedIn"""
        try:
            media_assets = await self._upload_media(access_token, person_urn, [media_url])
            
            if media_assets:
                return {
                    "success": True,
                    "media_urn": media_assets[0]["media"],
                    "platform": self.platform_name
                }
            else:
                return {"success": False, "error": "Failed to upload media"}
                
        except Exception as e:
            logger.error("linkedin_media_upload_error", error=str(e))
            return {"success": False, "error": str(e)}
    
    async def schedule_post(
        self,
        access_token: str,
        content: str,
        scheduled_time: int,
        media_urls: Optional[List[str]] = None,
        person_urn: Optional[str] = None
    ) -> Dict[str, Any]:
        """Schedule a LinkedIn post (creates as draft)"""
        try:
            if not person_urn:
                person_urn = await self._get_person_urn(access_token)
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0"
            }
            
            # Build post payload as draft
            payload = {
                "author": person_urn,
                "lifecycleState": "DRAFT",  # LinkedIn doesn't support scheduled posts directly
                "specificContent": {
                    "com.linkedin.ugc.ShareContent": {
                        "shareCommentary": {
                            "text": content
                        },
                        "shareMediaCategory": "NONE"
                    }
                },
                "visibility": {
                    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
                }
            }
            
            # Handle media if present
            if media_urls:
                media_assets = await self._upload_media(access_token, person_urn, media_urls)
                if media_assets:
                    payload["specificContent"]["com.linkedin.ugc.ShareContent"]["shareMediaCategory"] = "IMAGE"
                    payload["specificContent"]["com.linkedin.ugc.ShareContent"]["media"] = media_assets
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_base}/ugcPosts",
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code in [200, 201]:
                    post_id = response.headers.get("X-RestLi-Id", "")
                    return {
                        "success": True,
                        "post_id": post_id,
                        "platform": self.platform_name,
                        "status": "draft"  # LinkedIn doesn't support true scheduling
                    }
                else:
                    error_msg = response.json().get("message", response.text)
                    raise Exception(f"LinkedIn API error: {error_msg}")
                    
        except Exception as e:
            logger.error("linkedin_schedule_post_error", error=str(e))
            return {"success": False, "error": str(e)}
    
    async def get_post_metrics(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get LinkedIn post analytics"""
        try:
            headers = {
                "Authorization": f"Bearer {access_token}",
                "X-Restli-Protocol-Version": "2.0.0"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/socialMetadata/{post_id}?fields=totalShareStatistics",
                    headers=headers,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    stats = data.get("value", {}).get("totalShareStatistics", {})
                    
                    return {
                        "post_id": post_id,
                        "platform": "linkedin",
                        "impressions": stats.get("impressionCount", 0),
                        "engagements": (
                            stats.get("commentCount", 0) + 
                            stats.get("likeCount", 0) + 
                            stats.get("shareCount", 0)
                        ),
                        "comments": stats.get("commentCount", 0),
                        "likes": stats.get("likeCount", 0),
                        "shares": stats.get("shareCount", 0),
                        "fetched_at": None
                    }
                
                return {}
                
        except Exception as e:
            logger.error("linkedin_post_metrics_error", error=str(e))
            return {}
