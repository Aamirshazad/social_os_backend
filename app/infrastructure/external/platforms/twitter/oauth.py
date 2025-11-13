"""
Twitter OAuth Handler - Handles OAuth authentication flow
"""
from typing import Dict, Any, Optional
import httpx
import structlog
from ..base import BaseOAuthHandler

logger = structlog.get_logger()


class TwitterOAuthHandler(BaseOAuthHandler):
    """Handles Twitter OAuth authentication"""
    
    def __init__(self):
        super().__init__("twitter")
        self.token_url = "https://api.twitter.com/2/oauth2/token"
    
    async def exchange_code_for_token(
        self,
        code: str,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
        code_verifier: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Exchange authorization code for access token
        
        Args:
            code: Authorization code
            client_id: Twitter client ID
            client_secret: Twitter client secret
            redirect_uri: Redirect URI
            code_verifier: PKCE code verifier (optional)
        
        Returns:
            Token response with access_token, refresh_token, etc.
        """
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
                    self.token_url,
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
            self._handle_oauth_error(e, "token_exchange")
    
    async def refresh_access_token(
        self,
        refresh_token: str,
        client_id: str,
        client_secret: str
    ) -> Dict[str, Any]:
        """
        Refresh Twitter access token
        
        Args:
            refresh_token: Refresh token
            client_id: Twitter client ID
            client_secret: Twitter client secret
        
        Returns:
            New token response
        """
        try:
            payload = {
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": client_id,
                "client_secret": client_secret
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.token_url,
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
            self._handle_oauth_error(e, "token_refresh")
