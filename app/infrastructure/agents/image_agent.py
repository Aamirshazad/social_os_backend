"""
Image Agent - Specialized agent for image generation and visual content suggestions
"""
from typing import Dict, Any, List, Optional
import json
import re
import structlog
from .base_agent import BaseAgent
from app.schemas.ai import Platform

logger = structlog.get_logger()


class ImageAgent(BaseAgent):
    """AI agent specialized in image generation and visual content suggestions"""
    
    def __init__(self):
        super().__init__("image_agent")
    
    async def process(
        self,
        content: str,
        platform: Platform,
        style: Optional[str] = None,
        brand_colors: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Generate image suggestions and prompts for content
        
        Args:
            content: Content text to create images for
            platform: Target platform
            style: Image style preference
            brand_colors: Brand color palette
        
        Returns:
            Image suggestions and generation prompts
        """
        try:
            prompt = self._build_image_prompt(content, platform, style, brand_colors)
            
            self.logger.info("generating_image_suggestions", 
                           platform=platform.value,
                           content_length=len(content))
            
            response_text = await self._generate_response(prompt)
            suggestions = self._parse_image_response(response_text)
            
            return suggestions
            
        except Exception as e:
            self.logger.error("image_generation_error", error=str(e))
            raise
    
    async def improve_image_prompt(
        self,
        original_prompt: str,
        platform: Platform,
        enhancement_focus: Optional[str] = None
    ) -> str:
        """
        Improve an image generation prompt for better results
        
        Args:
            original_prompt: Original image prompt
            platform: Target platform
            enhancement_focus: Specific area to enhance (e.g., "lighting", "composition")
        
        Returns:
            Improved image prompt
        """
        try:
            prompt = self._build_prompt_improvement_request(
                original_prompt, platform, enhancement_focus
            )
            
            response_text = await self._generate_response(prompt)
            return response_text.strip()
            
        except Exception as e:
            self.logger.error("prompt_improvement_error", error=str(e))
            raise
    
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
            concept_count: Number of concepts to generate
        
        Returns:
            List of visual concepts with descriptions and prompts
        """
        try:
            prompt = self._build_visual_concepts_prompt(topic, platforms, concept_count)
            response_text = await self._generate_response(prompt)
            return self._parse_visual_concepts_response(response_text)
            
        except Exception as e:
            self.logger.error("visual_concepts_error", error=str(e))
            raise
    
    async def create_brand_consistent_suggestions(
        self,
        content: str,
        brand_guidelines: Dict[str, Any],
        platform: Platform
    ) -> Dict[str, Any]:
        """
        Create image suggestions that align with brand guidelines
        
        Args:
            content: Content text
            brand_guidelines: Brand guidelines (colors, fonts, style, etc.)
            platform: Target platform
        
        Returns:
            Brand-consistent image suggestions
        """
        try:
            prompt = self._build_brand_consistent_prompt(content, brand_guidelines, platform)
            response_text = await self._generate_response(prompt)
            return self._parse_brand_response(response_text)
            
        except Exception as e:
            self.logger.error("brand_consistent_error", error=str(e))
            raise
    
    async def analyze_image_performance(
        self,
        image_description: str,
        platform: Platform,
        target_audience: str
    ) -> Dict[str, Any]:
        """
        Analyze potential performance of an image concept
        
        Args:
            image_description: Description of the image
            platform: Target platform
            target_audience: Target audience description
        
        Returns:
            Performance analysis and recommendations
        """
        try:
            prompt = self._build_performance_analysis_prompt(
                image_description, platform, target_audience
            )
            response_text = await self._generate_response(prompt)
            return self._parse_performance_response(response_text)
            
        except Exception as e:
            self.logger.error("image_performance_analysis_error", error=str(e))
            raise
    
    def _build_image_prompt(
        self,
        content: str,
        platform: Platform,
        style: Optional[str],
        brand_colors: Optional[List[str]]
    ) -> str:
        """Build image generation prompt"""
        
        style_text = f"\nPreferred Style: {style}" if style else ""
        colors_text = f"\nBrand Colors: {', '.join(brand_colors)}" if brand_colors else ""
        
        return f"""
Create compelling image suggestions for this {platform.value} content:

**Content:** {content}
**Platform:** {platform.value}{style_text}{colors_text}

Generate:
1. 3 different image concepts that would work well with this content
2. Detailed AI image generation prompts for each concept
3. Platform-specific optimization suggestions (dimensions, style, etc.)
4. Alternative visual approaches (infographic, photo, illustration, etc.)

Consider {platform.value}'s visual best practices and audience preferences.

Return as JSON with:
- "concepts": Array of 3 image concepts
- "prompts": Array of detailed generation prompts
- "platform_specs": Platform-specific recommendations
- "alternatives": Alternative visual approaches
"""
    
    def _build_prompt_improvement_request(
        self,
        original_prompt: str,
        platform: Platform,
        enhancement_focus: Optional[str]
    ) -> str:
        """Build prompt improvement request"""
        
        focus_text = f"\nFocus on improving: {enhancement_focus}" if enhancement_focus else ""
        
        return f"""
Improve this image generation prompt for {platform.value}:

**Original Prompt:** {original_prompt}{focus_text}

Make it more detailed, specific, and effective while maintaining the original intent.
Consider {platform.value}'s visual requirements and best practices.
Include specific details about lighting, composition, colors, and style.

Return only the improved prompt, no explanation.
"""
    
    def _build_visual_concepts_prompt(
        self,
        topic: str,
        platforms: List[Platform],
        concept_count: int
    ) -> str:
        """Build visual concepts generation prompt"""
        
        platform_list = ', '.join([p.value for p in platforms])
        
        return f"""
Generate {concept_count} diverse visual concepts for the topic: "{topic}"

**Target Platforms:** {platform_list}

Each concept should:
1. Be visually distinct and creative
2. Work well across the specified platforms
3. Appeal to social media audiences
4. Be feasible to create or source

Return as JSON array of {concept_count} objects with:
- "concept_name": Brief name for the concept
- "description": Detailed visual description
- "generation_prompt": AI image generation prompt
- "platform_suitability": Which platforms this works best for
- "visual_style": Style category (photo, illustration, graphic, etc.)
"""
    
    def _build_brand_consistent_prompt(
        self,
        content: str,
        brand_guidelines: Dict[str, Any],
        platform: Platform
    ) -> str:
        """Build brand-consistent image prompt"""
        
        guidelines_text = json.dumps(brand_guidelines, indent=2)
        
        return f"""
Create brand-consistent image suggestions for this content:

**Content:** {content}
**Platform:** {platform.value}
**Brand Guidelines:**
{guidelines_text}

Generate image concepts that strictly adhere to the brand guidelines.
Include specific instructions for maintaining brand consistency.

Return as JSON with:
- "primary_concept": Main brand-aligned image concept
- "generation_prompt": Detailed prompt including brand elements
- "brand_compliance": How this maintains brand consistency
- "alternatives": 2 alternative brand-consistent approaches
"""
    
    def _build_performance_analysis_prompt(
        self,
        image_description: str,
        platform: Platform,
        target_audience: str
    ) -> str:
        """Build image performance analysis prompt"""
        
        return f"""
Analyze the potential performance of this image concept:

**Image Description:** {image_description}
**Platform:** {platform.value}
**Target Audience:** {target_audience}

Evaluate:
1. Visual appeal for the target audience
2. Platform algorithm favorability
3. Engagement potential (likes, shares, comments)
4. Accessibility and inclusivity
5. Trend alignment

Return as JSON with:
- "performance_score": Overall score (0-100)
- "strengths": What works well
- "weaknesses": Areas for improvement
- "recommendations": Specific improvement suggestions
- "audience_fit": How well it matches the target audience
"""
    
    def _parse_image_response(self, response: str) -> Dict[str, Any]:
        """Parse image generation response"""
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            
            # Fallback
            return {
                "concepts": ["Modern, clean design", "Vibrant, eye-catching visual", "Minimalist approach"],
                "prompts": [response[:200]],
                "platform_specs": {"dimensions": "1080x1080", "style": "modern"},
                "alternatives": ["Photo", "Illustration", "Infographic"]
            }
            
        except Exception as e:
            self.logger.error("parse_image_error", error=str(e))
            return {"concepts": [], "prompts": [], "platform_specs": {}, "alternatives": []}
    
    def _parse_visual_concepts_response(self, response: str) -> List[Dict[str, Any]]:
        """Parse visual concepts response"""
        try:
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            
            # Fallback
            return []
            
        except Exception as e:
            self.logger.error("parse_visual_concepts_error", error=str(e))
            return []
    
    def _parse_brand_response(self, response: str) -> Dict[str, Any]:
        """Parse brand-consistent response"""
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            
            # Fallback
            return {
                "primary_concept": "Brand-aligned visual concept",
                "generation_prompt": response[:200],
                "brand_compliance": "Maintains brand colors and style",
                "alternatives": []
            }
            
        except Exception as e:
            self.logger.error("parse_brand_error", error=str(e))
            return {"primary_concept": "", "generation_prompt": "", "brand_compliance": "", "alternatives": []}
    
    def _parse_performance_response(self, response: str) -> Dict[str, Any]:
        """Parse performance analysis response"""
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            
            # Fallback
            return {
                "performance_score": 75,
                "strengths": ["Visually appealing", "Platform appropriate"],
                "weaknesses": ["Could be more engaging"],
                "recommendations": ["Add more visual interest", "Consider trending elements"],
                "audience_fit": "Good match for target audience"
            }
            
        except Exception as e:
            self.logger.error("parse_performance_error", error=str(e))
            return {"performance_score": 0, "strengths": [], "weaknesses": [], "recommendations": [], "audience_fit": ""}
