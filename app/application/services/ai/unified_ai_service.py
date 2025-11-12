"""
Unified AI Service - Single interface for all AI-related operations
Replaces the old GeminiService with a coordinated agent approach
"""
from typing import Dict, Any, List, Optional
import structlog
from app.infrastructure.agents import (
    ContentAgent,
    ImageAgent,
    StrategistAgent,
    RepurposeAgent,
    AgentCoordinator
)
from app.schemas.ai import Platform, ContentType, Tone
from app.core.exceptions import ExternalAPIError

logger = structlog.get_logger()


class UnifiedAIService:
    """
    Unified AI service that coordinates all AI agents for content creation,
    image generation, repurposing, and strategic planning
    """
    
    def __init__(self):
        self.coordinator = AgentCoordinator()
        self.content_agent = ContentAgent()
        self.image_agent = ImageAgent()
        self.strategist_agent = StrategistAgent()
        self.repurpose_agent = RepurposeAgent()
        self.logger = logger.bind(service="unified_ai_service")
    
    # Content Generation Methods
    async def generate_content(
        self,
        topic: str,
        platforms: List[Platform],
        content_type: ContentType,
        tone: Tone,
        additional_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate social media content using the content agent
        
        Args:
            topic: Content topic
            platforms: Target platforms
            content_type: Type of content
            tone: Content tone
            additional_context: Additional context
        
        Returns:
            Generated content for each platform
        """
        try:
            return await self.content_agent.process(
                topic=topic,
                platforms=platforms,
                content_type=content_type,
                tone=tone,
                additional_context=additional_context
            )
        except Exception as e:
            self.logger.error("content_generation_error", error=str(e))
            raise ExternalAPIError("AI Service", f"Failed to generate content: {str(e)}")
    
    async def generate_complete_package(
        self,
        topic: str,
        platforms: List[Platform],
        content_type: ContentType,
        tone: Tone,
        include_images: bool = True,
        include_strategy: bool = False,
        additional_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate a complete content package with text, images, and strategy
        
        Args:
            topic: Content topic
            platforms: Target platforms
            content_type: Content type
            tone: Content tone
            include_images: Include image suggestions
            include_strategy: Include strategic recommendations
            additional_context: Additional context
        
        Returns:
            Complete content package
        """
        try:
            return await self.coordinator.generate_complete_content_package(
                topic=topic,
                platforms=platforms,
                content_type=content_type,
                tone=tone,
                include_images=include_images,
                include_strategy=include_strategy,
                additional_context=additional_context
            )
        except Exception as e:
            self.logger.error("complete_package_error", error=str(e))
            raise ExternalAPIError("AI Service", f"Failed to generate complete package: {str(e)}")
    
    # Content Repurposing Methods
    async def repurpose_content(
        self,
        long_form_content: str,
        platforms: List[Platform],
        number_of_posts: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Repurpose long-form content into multiple social media posts
        
        Args:
            long_form_content: Original content
            platforms: Target platforms
            number_of_posts: Number of posts to create
        
        Returns:
            List of repurposed posts
        """
        try:
            return await self.repurpose_agent.process(
                long_form_content=long_form_content,
                platforms=platforms,
                number_of_posts=number_of_posts
            )
        except Exception as e:
            self.logger.error("content_repurpose_error", error=str(e))
            raise ExternalAPIError("AI Service", f"Failed to repurpose content: {str(e)}")
    
    async def repurpose_with_visuals(
        self,
        long_form_content: str,
        platforms: List[Platform],
        number_of_posts: int = 5,
        include_images: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Repurpose content and generate visuals for each post
        
        Args:
            long_form_content: Original content
            platforms: Target platforms
            number_of_posts: Number of posts to create
            include_images: Include image suggestions
        
        Returns:
            List of repurposed posts with visuals
        """
        try:
            return await self.coordinator.repurpose_with_visuals(
                long_form_content=long_form_content,
                platforms=platforms,
                number_of_posts=number_of_posts,
                include_images=include_images
            )
        except Exception as e:
            self.logger.error("repurpose_with_visuals_error", error=str(e))
            raise ExternalAPIError("AI Service", f"Failed to repurpose with visuals: {str(e)}")
    
    # Image Generation Methods
    async def generate_image_suggestions(
        self,
        content: str,
        platform: Platform,
        style: Optional[str] = None,
        brand_colors: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Generate image suggestions for content
        
        Args:
            content: Content text
            platform: Target platform
            style: Image style preference
            brand_colors: Brand color palette
        
        Returns:
            Image suggestions and prompts
        """
        try:
            return await self.image_agent.process(
                content=content,
                platform=platform,
                style=style,
                brand_colors=brand_colors
            )
        except Exception as e:
            self.logger.error("image_suggestions_error", error=str(e))
            raise ExternalAPIError("AI Service", f"Failed to generate image suggestions: {str(e)}")
    
    async def improve_image_prompt(
        self,
        original_prompt: str,
        platform: Platform,
        enhancement_focus: Optional[str] = None
    ) -> str:
        """
        Improve an image generation prompt
        
        Args:
            original_prompt: Original prompt
            platform: Target platform
            enhancement_focus: Focus area for improvement
        
        Returns:
            Improved prompt
        """
        try:
            return await self.image_agent.improve_image_prompt(
                original_prompt=original_prompt,
                platform=platform,
                enhancement_focus=enhancement_focus
            )
        except Exception as e:
            self.logger.error("prompt_improvement_error", error=str(e))
            raise ExternalAPIError("AI Service", f"Failed to improve prompt: {str(e)}")
    
    async def generate_visual_concepts(
        self,
        topic: str,
        platforms: List[Platform],
        concept_count: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Generate multiple visual concepts for a topic
        
        Args:
            topic: Content topic
            platforms: Target platforms
            concept_count: Number of concepts
        
        Returns:
            List of visual concepts
        """
        try:
            return await self.image_agent.generate_visual_concepts(
                topic=topic,
                platforms=platforms,
                concept_count=concept_count
            )
        except Exception as e:
            self.logger.error("visual_concepts_error", error=str(e))
            raise ExternalAPIError("AI Service", f"Failed to generate visual concepts: {str(e)}")
    
    async def generate_image(
        self,
        prompt: str,
        size: Optional[str] = "1024x1024",
        style: Optional[str] = "natural"
    ) -> Dict[str, Any]:
        """
        Generate an image using AI (placeholder for actual image generation API)
        
        Args:
            prompt: Image generation prompt
            size: Image size (e.g., "1024x1024")
            style: Image style preference
        
        Returns:
            Generated image information
        """
        try:
            # This is a placeholder implementation
            # In a real implementation, you would integrate with DALL-E, Midjourney, or similar
            self.logger.info("image_generation_requested", 
                           prompt=prompt[:50],
                           size=size,
                           style=style)
            
            # For now, return a mock response
            return {
                "image_url": "https://placeholder.com/generated-image.jpg",
                "revised_prompt": f"Enhanced: {prompt}",
                "size": size,
                "style": style
            }
            
        except Exception as e:
            self.logger.error("image_generation_error", error=str(e))
            raise ExternalAPIError("AI Service", f"Failed to generate image: {str(e)}")
    
    async def edit_image(
        self,
        image: bytes,
        prompt: str
    ) -> Dict[str, Any]:
        """
        Edit an image using AI (placeholder for actual image editing API)
        
        Args:
            image: Image bytes
            prompt: Editing instructions
        
        Returns:
            Edited image information
        """
        try:
            # This is a placeholder implementation
            # In a real implementation, you would integrate with image editing APIs
            self.logger.info("image_editing_requested", 
                           prompt=prompt[:50],
                           image_size=len(image))
            
            # For now, return a mock response
            return {
                "edited_image_url": "https://placeholder.com/edited-image.jpg",
                "original_size": len(image),
                "edit_prompt": prompt
            }
            
        except Exception as e:
            self.logger.error("image_editing_error", error=str(e))
            raise ExternalAPIError("AI Service", f"Failed to edit image: {str(e)}")
    
    async def improve_prompt(self, prompt: str) -> str:
        """
        Improve a prompt for better AI generation
        
        Args:
            prompt: Original prompt
        
        Returns:
            Improved prompt
        """
        try:
            # Use the image agent's prompt improvement capability
            # Default to Instagram platform for general prompt improvement
            improved = await self.image_agent.improve_image_prompt(
                original_prompt=prompt,
                platform=Platform.INSTAGRAM,
                enhancement_focus="clarity and detail"
            )
            
            self.logger.info("prompt_improved", 
                           original_length=len(prompt),
                           improved_length=len(improved))
            
            return improved
            
        except Exception as e:
            self.logger.error("prompt_improvement_error", error=str(e))
            raise ExternalAPIError("AI Service", f"Failed to improve prompt: {str(e)}")
    
    async def _generate(self, prompt: str) -> str:
        """
        Direct text generation method for simple prompts
        
        Args:
            prompt: Input prompt
        
        Returns:
            Generated text response
        """
        try:
            # Use the content agent's base generation capability
            response = await self.content_agent._generate_response(prompt)
            
            self.logger.info("direct_generation", 
                           prompt_length=len(prompt),
                           response_length=len(response))
            
            return response
            
        except Exception as e:
            self.logger.error("direct_generation_error", error=str(e))
            raise ExternalAPIError("AI Service", f"Failed to generate response: {str(e)}")
    
    # Strategy and Chat Methods
    async def content_strategist_chat(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Handle content strategist chat conversations
        
        Args:
            message: User message
            history: Conversation history
        
        Returns:
            Chat response with potential parameters
        """
        try:
            return await self.strategist_agent.process(
                message=message,
                history=history
            )
        except Exception as e:
            self.logger.error("strategist_chat_error", error=str(e))
            raise ExternalAPIError("AI Service", f"Failed to process chat: {str(e)}")
    
    async def create_content_strategy(
        self,
        business_goals: str,
        target_audience: str,
        platforms: List[Platform],
        content_pillars: List[str],
        posting_frequency: str
    ) -> Dict[str, Any]:
        """
        Create a comprehensive content strategy
        
        Args:
            business_goals: Business objectives
            target_audience: Target audience
            platforms: Target platforms
            content_pillars: Content themes
            posting_frequency: Posting frequency
        
        Returns:
            Detailed content strategy
        """
        try:
            return await self.strategist_agent.create_content_strategy(
                business_goals=business_goals,
                target_audience=target_audience,
                platforms=platforms,
                content_pillars=content_pillars,
                posting_frequency=posting_frequency
            )
        except Exception as e:
            self.logger.error("content_strategy_error", error=str(e))
            raise ExternalAPIError("AI Service", f"Failed to create strategy: {str(e)}")
    
    # Advanced Coordination Methods
    async def create_content_series(
        self,
        main_topic: str,
        series_length: int,
        platforms: List[Platform],
        content_type: ContentType,
        tone: Tone
    ) -> List[Dict[str, Any]]:
        """
        Create a series of related content posts
        
        Args:
            main_topic: Main topic
            series_length: Number of posts
            platforms: Target platforms
            content_type: Content type
            tone: Content tone
        
        Returns:
            List of series posts
        """
        try:
            return await self.coordinator.create_content_series(
                main_topic=main_topic,
                series_length=series_length,
                platforms=platforms,
                content_type=content_type,
                tone=tone
            )
        except Exception as e:
            self.logger.error("content_series_error", error=str(e))
            raise ExternalAPIError("AI Service", f"Failed to create content series: {str(e)}")
    
    async def optimize_existing_content(
        self,
        existing_content: str,
        target_platform: Platform,
        optimization_goals: List[str]
    ) -> Dict[str, Any]:
        """
        Optimize existing content for better performance
        
        Args:
            existing_content: Content to optimize
            target_platform: Target platform
            optimization_goals: Optimization goals
        
        Returns:
            Optimized content with recommendations
        """
        try:
            return await self.coordinator.optimize_existing_content(
                existing_content=existing_content,
                target_platform=target_platform,
                optimization_goals=optimization_goals
            )
        except Exception as e:
            self.logger.error("content_optimization_error", error=str(e))
            raise ExternalAPIError("AI Service", f"Failed to optimize content: {str(e)}")
    
    # Analysis Methods
    async def analyze_engagement(
        self,
        content: str,
        platform: Platform
    ) -> Dict[str, Any]:
        """
        Analyze content for engagement potential
        
        Args:
            content: Content to analyze
            platform: Target platform
        
        Returns:
            Engagement analysis
        """
        try:
            return await self.content_agent.analyze_engagement(
                content=content,
                platform=platform
            )
        except Exception as e:
            self.logger.error("engagement_analysis_error", error=str(e))
            raise ExternalAPIError("AI Service", f"Failed to analyze engagement: {str(e)}")
    
    async def generate_campaign_brief(
        self,
        goals: str,
        target_audience: str,
        platforms: List[Platform],
        duration: Optional[str] = "1 week"
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive campaign brief
        
        Args:
            goals: Campaign goals
            target_audience: Target audience
            platforms: Target platforms
            duration: Campaign duration
        
        Returns:
            Campaign brief
        """
        try:
            return await self.content_agent.generate_campaign_brief(
                goals=goals,
                target_audience=target_audience,
                platforms=platforms,
                duration=duration or "1 week"
            )
        except Exception as e:
            self.logger.error("campaign_brief_error", error=str(e))
            raise ExternalAPIError("AI Service", f"Failed to generate campaign brief: {str(e)}")


# Global service instance
unified_ai_service = UnifiedAIService()
