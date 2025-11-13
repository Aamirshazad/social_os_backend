"""
Content Agent - Specialized agent for social media content generation
"""
from typing import Dict, Any, List, Optional
import json
import re
import structlog
from .base_agent import BaseAgent
from app.schemas.ai import Platform, ContentType, Tone

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


class ContentAgent(BaseAgent):
    """AI agent specialized in social media content generation"""
    
    def __init__(self):
        super().__init__("content_agent")
    
    async def process(
        self,
        topic: str,
        platforms: List[Platform],
        content_type: ContentType,
        tone: Tone,
        additional_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate social media content for specified platforms
        
        Args:
            topic: Content topic
            platforms: Target platforms
            content_type: Type of content (engaging, educational, promotional, storytelling)
            tone: Content tone
            additional_context: Additional context
        
        Returns:
            Generated content with platform-specific text, image and video suggestions
        """
        try:
            prompt = self._build_content_prompt(
                topic, platforms, content_type, tone, additional_context
            )
            
            self.logger.info("generating_content", 
                           topic=topic[:50], 
                           platforms=[p.value for p in platforms])
            
            response_text = await self._generate_response(prompt)
            content = self._parse_content_response(response_text, platforms)
            
            return content
            
        except Exception as e:
            self.logger.error("content_generation_error", error=str(e), topic=topic[:50])
            raise
    
    async def generate_campaign_brief(
        self,
        goals: str,
        target_audience: str,
        platforms: List[Platform],
        duration: str
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive campaign brief
        
        Args:
            goals: Campaign goals
            target_audience: Target audience description
            platforms: Target platforms
            duration: Campaign duration
        
        Returns:
            Campaign brief with strategy and content calendar
        """
        try:
            prompt = self._build_campaign_prompt(goals, target_audience, platforms, duration)
            response_text = await self._generate_response(prompt)
            return self._parse_campaign_response(response_text)
            
        except Exception as e:
            self.logger.error("campaign_brief_error", error=str(e))
            raise
    
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
            Engagement analysis with score and suggestions
        """
        try:
            prompt = self._build_engagement_prompt(content, platform)
            response_text = await self._generate_response(prompt)
            return self._parse_engagement_response(response_text)
            
        except Exception as e:
            self.logger.error("engagement_analysis_error", error=str(e))
            raise
    
    def _build_content_prompt(
        self,
        topic: str,
        platforms: List[Platform],
        content_type: ContentType,
        tone: Tone,
        additional_context: Optional[str] = None
    ) -> str:
        """Build comprehensive content generation prompt"""
        
        platform_details = "\n".join([
            f"- {platform.value}: {PLATFORM_SPECS.get(platform, 'Standard format')}"
            for platform in platforms
        ])
        
        context_text = f"\n\nAdditional Context: {additional_context}" if additional_context else ""
        
        prompt = f"""
You are an expert AI social agent named Agent OS. Your task is to generate content for a social media post based on the provided topic. Your main task is to generate video content suggestions.

**Topic:** {topic}
**Content Type:** {content_type.value}
**Tone:** {tone.value}{context_text}

**Target Platforms:**
{platform_details}

Please generate the following:
1. Content tailored for each selected platform.
2. A creative suggestion for a compelling image to accompany the post.
3. A creative suggestion for a short, engaging video (e.g., Reel, Short, TikTok) related to the post.

Return the response as a single JSON object. Do not include the original topic. Do not include any markdown formatting or explanatory text outside of the JSON object.
The JSON object must have the following keys: "imageSuggestion", "videoSuggestion", and a key for each platform: {', '.join([p.value for p in platforms])}.

Each platform content should be optimized for that platform's character limit and style.
"""
        
        return prompt
    
    def _build_campaign_prompt(
        self,
        goals: str,
        target_audience: str,
        platforms: List[Platform],
        duration: str
    ) -> str:
        """Build campaign brief generation prompt"""
        
        return f"""
Create a comprehensive social media campaign brief:

Goals: {goals}
Target Audience: {target_audience}
Platforms: {', '.join([p.value for p in platforms])}
Duration: {duration}

Include:
1. Executive summary
2. Content strategy
3. Content calendar (daily posts)
4. KPIs and success metrics
5. Platform-specific tactics

Format response as structured JSON.
"""
    
    def _build_engagement_prompt(self, content: str, platform: Platform) -> str:
        """Build engagement analysis prompt"""
        
        return f"""
Analyze this {platform.value} post for engagement potential:

"{content}"

Provide:
1. Engagement score (0-100) for: clarity, emotion, call_to_action, relevance
2. 3-5 specific suggestions to improve engagement
3. Predicted reach estimate (low/medium/high)

Format response as JSON.
"""
    
    def _parse_content_response(self, response: str, platforms: List[Platform]) -> Dict[str, Any]:
        """Parse content generation response"""
        try:
            # Try to extract JSON from response
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            
            # Fallback: create structured response
            content = {}
            for platform in platforms:
                content[platform.value] = {
                    "text": response[:500],  # Truncate for safety
                    "hashtags": [],
                    "character_count": len(response[:500])
                }
            return content
            
        except Exception as e:
            self.logger.error("parse_content_error", error=str(e))
            # Return fallback structure
            return {p.value: {"text": response[:500], "hashtags": []} for p in platforms}
    
    def _parse_campaign_response(self, response: str) -> Dict[str, Any]:
        """Parse campaign brief response"""
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            
            # Fallback
            return {
                "brief": {"summary": response[:500]},
                "content_calendar": [],
                "kpis": ["Engagement rate", "Reach", "Conversions"]
            }
        except Exception as e:
            self.logger.error("parse_campaign_error", error=str(e))
            return {"brief": {}, "content_calendar": [], "kpis": []}
    
    def _parse_engagement_response(self, response: str) -> Dict[str, Any]:
        """Parse engagement analysis response"""
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            
            # Fallback
            return {
                "score": {"overall": 70, "clarity": 75, "emotion": 65, "cta": 70},
                "suggestions": ["Add a clear call to action", "Use more emotional language"],
                "predicted_reach": "medium"
            }
        except Exception as e:
            self.logger.error("parse_engagement_error", error=str(e))
            return {"score": {}, "suggestions": [], "predicted_reach": "unknown"}
