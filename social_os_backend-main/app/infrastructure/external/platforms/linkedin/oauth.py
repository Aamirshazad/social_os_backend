"""
LinkedIn OAuth Handler - Handles OAuth authentication flow
"""
from typing import Dict, Any
import httpx
import structlog
from ..base import BaseOAuthHandler

logger = structlog.get_logger()


class LinkedInOAuthHandler(BaseOAuthHandler):
    """Handles LinkedIn OAuth authentication"""
    
    def __init__(self):
        super().__init__("linkedin")
        self.token_url = "https://www.linkedin.com/oauth/v2/accessToken"
    
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
            client_id: LinkedIn client ID
            client_secret: LinkedIn client secret
            redirect_uri: Redirect URI
            code_verifier: Not used by LinkedIn
        
        Returns:
            Token response with access_token
        """
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
                    self.token_url,
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
            self._handle_oauth_error(e, "token_exchange")
    
    async def refresh_access_token(
        self,
        refresh_token: str,
        client_id: str,
        client_secret: str
    ) -> Dict[str, Any]:
        """
        LinkedIn doesn't support refresh tokens - tokens are long-lived
        
        Args:
            refresh_token: Not used
            client_id: Not used
            client_secret: Not used
        
        Raises:
            Exception: LinkedIn doesn't support token refresh
        """
        raise Exception("LinkedIn API does not support token refresh. Tokens are long-lived (60 days).")
