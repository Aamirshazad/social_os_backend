"""YouTube OAuth Handler - Handles OAuth authentication flow"""
from typing import Dict, Any, Optional

import httpx
import structlog

from app.infrastructure.external.platforms.base import BaseOAuthHandler

logger = structlog.get_logger()


class YouTubeOAuthHandler(BaseOAuthHandler):
    """Handles YouTube OAuth authentication (Google OAuth 2.0)"""

    def __init__(self) -> None:
        super().__init__("youtube")
        self.token_url = "https://oauth2.googleapis.com/token"

    async def exchange_code_for_token(
        self,
        code: str,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
        code_verifier: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Exchange authorization code for access & refresh tokens."""
        try:
            data = {
                "grant_type": "authorization_code",
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.token_url,
                    data=data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    timeout=30.0,
                )

            if response.status_code != 200:
                raise Exception(f"Failed to exchange code for token: {response.text}")

            data = response.json()
            access_token = data.get("access_token")
            if not access_token:
                raise Exception("YouTube token response missing access_token")

            return {
                "access_token": access_token,
                "refresh_token": data.get("refresh_token"),
                "token_type": data.get("token_type", "Bearer"),
                "expires_in": data.get("expires_in"),
                "scope": data.get("scope"),
            }
        except Exception as e:  # pragma: no cover - network error path
            self._handle_oauth_error(e, "token_exchange")

    async def refresh_access_token(
        self,
        refresh_token: str,
        client_id: str,
        client_secret: str,
    ) -> Dict[str, Any]:
        """Refresh YouTube access token using a refresh token."""
        try:
            data = {
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": client_id,
                "client_secret": client_secret,
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.token_url,
                    data=data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    timeout=30.0,
                )

            if response.status_code != 200:
                raise Exception(f"Failed to refresh token: {response.text}")

            data = response.json()
            access_token = data.get("access_token")
            if not access_token:
                raise Exception("YouTube refresh response missing access_token")

            return {
                "access_token": access_token,
                "refresh_token": data.get("refresh_token", refresh_token),
                "token_type": data.get("token_type", "Bearer"),
                "expires_in": data.get("expires_in"),
                "scope": data.get("scope"),
            }
        except Exception as e:  # pragma: no cover - network error path
            self._handle_oauth_error(e, "token_refresh")
