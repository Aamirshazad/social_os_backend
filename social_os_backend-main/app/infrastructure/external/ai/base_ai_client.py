"""
Base AI Client - Abstract base class for AI services
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import structlog

logger = structlog.get_logger()


class BaseAIClient(ABC):
    """Abstract base class for AI service clients"""
    
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.logger = logger.bind(ai_service=service_name)
    
    @abstractmethod
    async def generate_content(
        self,
        topic: str,
        platforms: List[str],
        content_type: str,
        tone: str,
        additional_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate social media content"""
        pass
    
    @abstractmethod
    async def repurpose_content(
        self,
        long_form_content: str,
        platforms: List[str],
        number_of_posts: int = 5
    ) -> List[Dict[str, Any]]:
        """Repurpose long-form content into multiple posts"""
        pass
    
    @abstractmethod
    async def content_strategist_chat(
        self,
        message: str,
        history: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Handle content strategist chat conversations"""
        pass
    
    def _handle_api_error(self, error: Exception, operation: str) -> None:
        """Handle API errors consistently"""
        self.logger.error(f"{operation}_error", error=str(error))
        
        error_msg = str(error)
        if 'API key' in error_msg or '401' in error_msg or 'Unauthorized' in error_msg:
            raise Exception(f"Invalid or missing API key for {self.service_name}")
        elif '429' in error_msg or 'rate limit' in error_msg.lower():
            raise Exception(f"{self.service_name} API rate limit exceeded. Please try again later.")
        else:
            raise Exception(f"Failed to {operation} with {self.service_name}. Please try again.")
