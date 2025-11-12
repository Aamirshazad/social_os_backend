"""
OpenAI Service for DALL-E image generation
"""
from typing import Optional
from openai import AsyncOpenAI
import structlog

from app.config import settings
from app.core.exceptions import ExternalAPIError

logger = structlog.get_logger()


class OpenAIService:
    """Service for interacting with OpenAI API"""
    
    def __init__(self):
        self.client = None
        if settings.OPENAI_API_KEY:
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    async def generate_image(
        self,
        prompt: str,
        size: str = "1024x1024",
        quality: str = "standard",
        style: str = "vivid"
    ) -> dict:
        """
        Generate an image using DALL-E
        
        Args:
            prompt: Image description
            size: Image size (1024x1024, 1792x1024, 1024x1792)
            quality: Image quality (standard, hd)
            style: Image style (vivid, natural)
        
        Returns:
            Dict with image_url and revised_prompt
        """
        if not self.client:
            raise ExternalAPIError("OpenAI", "API not configured")
        
        try:
            response = await self.client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size=size,
                quality=quality,
                style=style,
                n=1
            )
            
            image_data = response.data[0]
            
            return {
                "image_url": image_data.url,
                "revised_prompt": image_data.revised_prompt
            }
            
        except Exception as e:
            logger.error("openai_image_generation_error", error=str(e))
            raise ExternalAPIError("OpenAI", str(e))
    
    async def edit_image(
        self,
        image: bytes,
        prompt: str,
        mask: Optional[bytes] = None,
        size: str = "1024x1024"
    ) -> dict:
        """
        Edit an image using DALL-E
        
        Args:
            image: Original image bytes
            prompt: Edit instruction
            mask: Optional mask image bytes
            size: Output size
        
        Returns:
            Dict with edited image_url
        """
        if not self.client:
            raise ExternalAPIError("OpenAI", "API not configured")
        
        try:
            # Note: DALL-E 3 doesn't support image editing yet
            # This is a placeholder for when it becomes available
            # For now, use DALL-E 2
            
            response = await self.client.images.edit(
                image=image,
                mask=mask,
                prompt=prompt,
                n=1,
                size=size
            )
            
            return {
                "image_url": response.data[0].url
            }
            
        except Exception as e:
            logger.error("openai_image_edit_error", error=str(e))
            raise ExternalAPIError("OpenAI", str(e))
    
    async def create_variation(
        self,
        image: bytes,
        n: int = 1,
        size: str = "1024x1024"
    ) -> dict:
        """
        Create variations of an image
        
        Args:
            image: Original image bytes
            n: Number of variations (1-10)
            size: Output size
        
        Returns:
            Dict with variation image URLs
        """
        if not self.client:
            raise ExternalAPIError("OpenAI", "API not configured")
        
        try:
            response = await self.client.images.create_variation(
                image=image,
                n=n,
                size=size
            )
            
            return {
                "images": [img.url for img in response.data]
            }
            
        except Exception as e:
            logger.error("openai_variation_error", error=str(e))
            raise ExternalAPIError("OpenAI", str(e))


# Global service instance
openai_service = OpenAIService()
