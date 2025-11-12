"""
Base Platform Client - Abstract base class for all social media platforms
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
import structlog

logger = structlog.get_logger()


class BasePlatformClient(ABC):
    """Abstract base class for social media platform clients"""
    
    def __init__(self, platform_name: str):
        self.platform_name = platform_name
        self.logger = logger.bind(platform=platform_name)
    
    @abstractmethod
    async def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[List[str]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Publish a post to the platform"""
        pass
    
    @abstractmethod
    async def delete_post(
        self,
        access_token: str,
        post_id: str
    ) -> bool:
        """Delete a post from the platform"""
        pass
    
    @abstractmethod
    async def get_post(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """Get post details from the platform"""
        pass
    
    @abstractmethod
    async def verify_credentials(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Verify platform credentials"""
        pass
    
    @abstractmethod
    async def get_user_profile(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """Get user profile information"""
        pass
    
    def _handle_error(self, error: Exception, operation: str) -> Dict[str, Any]:
        """Handle and log errors consistently"""
        self.logger.error(f"{operation}_error", error=str(error))
        return {
            "success": False,
            "error": str(error),
            "platform": self.platform_name
        }
