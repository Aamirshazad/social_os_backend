"""
Facebook OAuth Handler - Handles OAuth authentication flow
"""
from typing import Dict, Any
import httpx
import structlog
from ..base import BaseOAuthHandler

logger = structlog.get_logger()


class FacebookOAuthHandler(BaseOAuthHandler):
    """Handles Facebook OAuth authentication"""
    
    def __init__(self):
        super().__init__("facebook")
        self.api_base = "https://graph.facebook.com/v18.0"
    
    async def exchange_code_for_token(
        self,
        code: str,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
        code_verifier: str = None
    ) -> Dict[str, Any]:
        """
        Exchange authorization code for access token
        
        Args:
            code: Authorization code
            client_id: Facebook client ID
            client_secret: Facebook client secret
            redirect_uri: Redirect URI
            code_verifier: Not used by Facebook
        
        Returns:
            Token response with access_token
        """
        try:
            # Step 1: Get short-lived token
            params = {
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "code": code
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/oauth/access_token",
                    params=params,
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise Exception("Failed to get short-lived token")
                
                short_lived_data = response.json()
                
                # Step 2: Exchange for long-lived token
                long_lived_params = {
                    "grant_type": "fb_exchange_token",
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "fb_exchange_token": short_lived_data["access_token"]
                }
                
                long_lived_response = await client.get(
                    f"{self.api_base}/oauth/access_token",
                    params=long_lived_params,
                    timeout=30.0
                )
                
                if long_lived_response.status_code != 200:
                    raise Exception("Failed to extend token to long-lived")
                
                long_lived_data = long_lived_response.json()
                
                return {
                    "access_token": long_lived_data["access_token"],
                    "token_type": "Bearer",
                    "expires_in": long_lived_data.get("expires_in", 5184000)  # 60 days
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
        Refresh Facebook access token
        
        Args:
            refresh_token: Current access token to extend
            client_id: Facebook client ID
            client_secret: Facebook client secret
        
        Returns:
            New token response
        """
        try:
            params = {
                "grant_type": "fb_extend_token",
                "client_id": client_id,
                "client_secret": client_secret,
                "fb_exchange_token": refresh_token
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/oauth/access_token",
                    params=params,
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise Exception("Failed to refresh token")
                
                data = response.json()
                
                return {
                    "access_token": data["access_token"],
                    "token_type": "Bearer",
                    "expires_in": data.get("expires_in", 5184000)  # 60 days
                }
                
        except Exception as e:
            self._handle_oauth_error(e, "token_refresh")
