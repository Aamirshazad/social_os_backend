"""
Repurpose Agent - Specialized agent for content repurposing and reproduction
"""
from typing import Dict, Any, List
import json
import re
import structlog
from .base_agent import BaseAgent
from app.schemas.ai import Platform

logger = structlog.get_logger()

# Platform character limits and specifications
PLATFORM_SPECS = {
    Platform.TWITTER: "280 characters max, casual but informative, use hashtags wisely",
    Platform.LINKEDIN: "1300 characters max, professional tone, value-driven content",
    Platform.FACEBOOK: "500 characters optimal, engaging and community-focused",
    Platform.INSTAGRAM: "2200 characters max, visual-first, use emojis and hashtags",
    Platform.TIKTOK: "150 characters caption, trend-focused, fun and energetic",
    Platform.YOUTUBE: "5000 characters max, detailed descriptions, SEO-optimized",
}


class RepurposeAgent(BaseAgent):
    """AI agent specialized in content repurposing and reproduction"""
    
    def __init__(self):
        super().__init__("repurpose_agent")
    
    async def process(
        self,
        long_form_content: str,
        platforms: List[Platform],
        number_of_posts: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Repurpose long-form content into multiple social media posts
        
        Args:
            long_form_content: Original long-form content
            platforms: Target platforms
            number_of_posts: Number of posts to generate
        
        Returns:
            List of repurposed posts with platform-specific content
        """
        try:
            prompt = self._build_repurpose_prompt(
                long_form_content, platforms, number_of_posts
            )
            
            self.logger.info("repurposing_content", 
                           content_length=len(long_form_content),
                           platforms=[p.value for p in platforms],
                           posts_count=number_of_posts)
            
            response_text = await self._generate_response(prompt)
            posts = self._parse_repurpose_response(response_text)
            
            return posts
            
        except Exception as e:
            self.logger.error("content_repurpose_error", error=str(e))
            raise
    
    async def reproduce_content_style(
        self,
        reference_content: str,
        new_topic: str,
        platforms: List[Platform]
    ) -> Dict[str, Any]:
        """
        Reproduce content style from reference content for a new topic
        
        Args:
            reference_content: Reference content to mimic style
            new_topic: New topic to write about
            platforms: Target platforms
        
        Returns:
            New content matching the reference style
        """
        try:
            prompt = self._build_style_reproduction_prompt(
                reference_content, new_topic, platforms
            )
            
            self.logger.info("reproducing_content_style", 
                           new_topic=new_topic[:50],
                           platforms=[p.value for p in platforms])
            
            response_text = await self._generate_response(prompt)
            content = self._parse_style_response(response_text, platforms)
            
            return content
            
        except Exception as e:
            self.logger.error("style_reproduction_error", error=str(e))
            raise
    
    async def extract_key_points(
        self,
        long_form_content: str,
        max_points: int = 10
    ) -> List[str]:
        """
        Extract key points from long-form content
        
        Args:
            long_form_content: Original content
            max_points: Maximum number of key points
        
        Returns:
            List of key points
        """
        try:
            prompt = self._build_extraction_prompt(long_form_content, max_points)
            response_text = await self._generate_response(prompt)
            return self._parse_key_points_response(response_text)
            
        except Exception as e:
            self.logger.error("key_points_extraction_error", error=str(e))
            raise
    
    async def create_content_variations(
        self,
        base_content: str,
        platform: Platform,
        variation_count: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Create multiple variations of the same content for A/B testing
        
        Args:
            base_content: Base content to create variations from
            platform: Target platform
            variation_count: Number of variations to create
        
        Returns:
            List of content variations
        """
        try:
            prompt = self._build_variation_prompt(base_content, platform, variation_count)
            response_text = await self._generate_response(prompt)
            return self._parse_variations_response(response_text)
            
        except Exception as e:
            self.logger.error("content_variations_error", error=str(e))
            raise
    
    def _build_repurpose_prompt(
        self,
        long_form_content: str,
        platforms: List[Platform],
        number_of_posts: int
    ) -> str:
        """Build repurposing prompt"""
        
        platform_details = "\n".join([
            f"- {platform.value}: {PLATFORM_SPECS.get(platform, 'Standard format')}"
            for platform in platforms
        ])
        
        return f"""
You are an expert social media strategist. Your task is to repurpose the following long-form content into {number_of_posts} distinct, engaging social media posts.

**Long-form Content:**
{long_form_content}

**Target Platforms:**
{platform_details}

Create {number_of_posts} unique posts. Each post should:
1. Focus on a different angle, key point, or insight from the content
2. Be tailored for the specified platforms
3. Include engaging hooks and calls-to-action
4. Have a clear, specific topic/focus
5. Include image and video suggestions

Return the response as a JSON array of {number_of_posts} post objects. Each object must have:
- "topic": A brief description of the post's focus
- "platforms": Array of platform names ({', '.join([p.value for p in platforms])})
- "content": Object with keys for each platform ({', '.join([p.value for p in platforms])}) plus "imageSuggestion" and "videoSuggestion"

Do not include any markdown formatting or explanatory text outside of the JSON array.
"""
    
    def _build_style_reproduction_prompt(
        self,
        reference_content: str,
        new_topic: str,
        platforms: List[Platform]
    ) -> str:
        """Build style reproduction prompt"""
        
        platform_list = ', '.join([p.value for p in platforms])
        
        return f"""
Analyze the writing style, tone, and structure of this reference content:

**Reference Content:**
{reference_content}

Now create new content about "{new_topic}" that matches the exact same style, tone, and structure.

**Target Platforms:** {platform_list}

Return as JSON with keys for each platform ({platform_list}) plus "imageSuggestion" and "videoSuggestion".
Maintain the same voice, personality, and approach as the reference content.
"""
    
    def _build_extraction_prompt(self, content: str, max_points: int) -> str:
        """Build key points extraction prompt"""
        
        return f"""
Extract the {max_points} most important key points from this content:

{content}

Return as a JSON array of strings, each representing one key point.
Focus on actionable insights, main arguments, and valuable takeaways.
"""
    
    def _build_variation_prompt(
        self,
        base_content: str,
        platform: Platform,
        variation_count: int
    ) -> str:
        """Build content variation prompt"""
        
        return f"""
Create {variation_count} different variations of this {platform.value} content for A/B testing:

**Base Content:**
{base_content}

Each variation should:
1. Convey the same core message
2. Use different hooks, angles, or approaches
3. Be optimized for {platform.value}
4. Have distinct personality/tone variations

Return as JSON array of {variation_count} objects, each with:
- "variation_type": Description of the approach (e.g., "emotional", "data-driven", "humorous")
- "content": The actual content text
- "hook": The opening hook used
- "cta": The call-to-action used
"""
    
    def _parse_repurpose_response(self, response: str) -> List[Dict[str, Any]]:
        """Parse repurposing response"""
        try:
            # Extract JSON array from response
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                posts = json.loads(json_match.group())
                return posts
            
            # Fallback
            return []
            
        except Exception as e:
            self.logger.error("parse_repurpose_error", error=str(e))
            return []
    
    def _parse_style_response(self, response: str, platforms: List[Platform]) -> Dict[str, Any]:
        """Parse style reproduction response"""
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            
            # Fallback
            return {p.value: {"text": response[:500]} for p in platforms}
            
        except Exception as e:
            self.logger.error("parse_style_error", error=str(e))
            return {p.value: {"text": response[:500]} for p in platforms}
    
    def _parse_key_points_response(self, response: str) -> List[str]:
        """Parse key points extraction response"""
        try:
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            
            # Fallback: split by lines and clean
            points = [line.strip() for line in response.split('\n') if line.strip()]
            return points[:10]  # Limit to 10 points
            
        except Exception as e:
            self.logger.error("parse_key_points_error", error=str(e))
            return []
    
    def _parse_variations_response(self, response: str) -> List[Dict[str, Any]]:
        """Parse content variations response"""
        try:
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            
            # Fallback
            return []
            
        except Exception as e:
            self.logger.error("parse_variations_error", error=str(e))
            return []
