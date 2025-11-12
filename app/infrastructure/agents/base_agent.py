"""
Base Agent - Abstract base class for all AI agents
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import structlog
from google import genai
from app.config import settings
from app.core.exceptions import ExternalAPIError

logger = structlog.get_logger()


class BaseAgent(ABC):
    """Abstract base class for AI agents"""
    
    def __init__(self, agent_name: str):
        self.agent_name = agent_name
        self.logger = logger.bind(agent=agent_name)
        self.model_name = "gemini-2.0-flash-exp"
        
        # Initialize Gemini client
        self.client = None
        if settings.GEMINI_API_KEY:
            self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        self.generation_config = {
            "temperature": 0.9,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 8192,
        }
    
    def _validate_client(self) -> None:
        """Validate that the AI client is properly configured"""
        if not self.client:
            raise ExternalAPIError("Gemini", "GEMINI_API_KEY environment variable is not set")
    
    async def _generate_response(self, prompt: str) -> str:
        """
        Generate response from AI model
        
        Args:
            prompt: Input prompt
            
        Returns:
            Generated response text
        """
        self._validate_client()
        
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=self.generation_config
            )
            return response.text
            
        except Exception as e:
            self._handle_api_error(e, "generate_response")
    
    def _handle_api_error(self, error: Exception, operation: str) -> None:
        """Handle API errors consistently"""
        self.logger.error(f"{operation}_error", error=str(error))
        
        error_msg = str(error)
        if 'API key' in error_msg or '401' in error_msg or 'Unauthorized' in error_msg:
            raise ExternalAPIError("Gemini", "Invalid or missing API key. Please check your GEMINI_API_KEY")
        elif '429' in error_msg or 'rate limit' in error_msg.lower():
            raise ExternalAPIError("Gemini", "API rate limit exceeded. Please try again later.")
        else:
            raise ExternalAPIError("Gemini", f"Failed to {operation}. Please try again.")
    
    @abstractmethod
    async def process(self, *args, **kwargs) -> Dict[str, Any]:
        """Main processing method for the agent"""
        pass
