"""
Base OAuth Handler for social media platforms
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import structlog

logger = structlog.get_logger()


class BaseOAuthHandler(ABC):
    """Abstract base class for OAuth handling"""
    
    def __init__(self, platform_name: str):
        self.platform_name = platform_name
        self.logger = logger.bind(platform=platform_name)
    
    @abstractmethod
    async def exchange_code_for_token(
        self,
        code: str,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
        code_verifier: Optional[str] = None
    ) -> Dict[str, Any]:
        """Exchange authorization code for access token"""
        pass
    
    @abstractmethod
    async def refresh_access_token(
        self,
        refresh_token: str,
        client_id: str,
        client_secret: str
    ) -> Dict[str, Any]:
        """Refresh access token using refresh token"""
        pass
    
    def _handle_oauth_error(self, error: Exception, operation: str) -> None:
        """Handle OAuth errors consistently"""
        self.logger.error(f"oauth_{operation}_error", error=str(error))
        raise Exception(f"{operation.title()} failed: {str(error)}")
