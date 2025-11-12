"""
Base Platform Service - Abstract base class for all platform integrations
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import structlog

logger = structlog.get_logger()


class BasePlatformService(ABC):
    """Abstract base class for platform services"""
    
    def __init__(self, platform_name: str):
        self.platform_name = platform_name
        self.logger = logger.bind(platform=platform_name)
    
    @abstractmethod
    async def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: Optional[list] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Publish a post to the platform
        
        Args:
            access_token: OAuth access token
            content: Post content/text
            media_urls: List of media URLs to attach
            **kwargs: Additional platform-specific parameters
        
        Returns:
            Dict with post_id, url, and success status
        """
        pass
    
    @abstractmethod
    async def delete_post(
        self,
        access_token: str,
        post_id: str
    ) -> bool:
        """
        Delete a post from the platform
        
        Args:
            access_token: OAuth access token
            post_id: Platform post ID
        
        Returns:
            True if successful
        """
        pass
    
    @abstractmethod
    async def get_post(
        self,
        access_token: str,
        post_id: str
    ) -> Dict[str, Any]:
        """
        Get post details
        
        Args:
            access_token: OAuth access token
            post_id: Platform post ID
        
        Returns:
            Post details
        """
        pass
    
    @abstractmethod
    async def verify_credentials(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """
        Verify credentials and get account info
        
        Args:
            access_token: OAuth access token
        
        Returns:
            Account information
        """
        pass
    
    def _handle_error(self, error: Exception, operation: str) -> Dict[str, Any]:
        """
        Handle and log errors
        
        Args:
            error: The exception
            operation: Operation name
        
        Returns:
            Error response dict
        """
        self.logger.error(
            f"{operation}_error",
            error=str(error),
            error_type=type(error).__name__
        )
        
        return {
            "success": False,
            "error": str(error),
            "platform": self.platform_name
        }
