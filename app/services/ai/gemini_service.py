"""
Google Gemini AI Service
"""
from typing import List, Dict, Any, Optional
import google.generativeai as genai
import structlog
import json
import re

from app.config import settings
from app.core.exceptions import ExternalAPIError
from app.schemas.ai import Platform, ContentType, Tone

logger = structlog.get_logger()

# Configure Gemini
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

# Platform character limits and specifications
PLATFORM_SPECS = {
    Platform.TWITTER: "280 characters max, casual but informative, use hashtags wisely",
    Platform.LINKEDIN: "1300 characters max, professional tone, value-driven content",
    Platform.FACEBOOK: "500 characters optimal, engaging and community-focused",
    Platform.INSTAGRAM: "2200 characters max, visual-first, use emojis and hashtags",
    Platform.TIKTOK: "150 characters caption, trend-focused, fun and energetic",
    Platform.YOUTUBE: "5000 characters max, detailed descriptions, SEO-optimized",
}


class GeminiService:
    """Service for interacting with Google Gemini AI matching original implementation"""
    
    def __init__(self):
        self.model_name = "gemini-2.0-flash-exp"  # Match original model
        self.model = None
        if settings.GEMINI_API_KEY:
            try:
                self.model = genai.GenerativeModel(
                    self.model_name,
                    generation_config={
                        "temperature": 0.9,
                        "top_p": 0.95,
                        "top_k": 40,
                        "max_output_tokens": 8192,
                    }
                )
            except Exception as e:
                logger.error("gemini_init_error", error=str(e))
    
    async def generate_content(
        self,
        topic: str,
        platforms: List[Platform],
        content_type: ContentType,
        tone: Tone,
        additional_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate social media content using Gemini
        Matches original Next.js aiService.generateSocialMediaContent implementation
        
        Args:
            topic: Content topic
            platforms: Target platforms
            content_type: Type of content (engaging, educational, promotional, storytelling)
            tone: Content tone
            additional_context: Additional context
        
        Returns:
            PostContent with platform-specific text, imageSuggestion, videoSuggestion
        """
        if not self.model:
            raise ExternalAPIError("Gemini", "GEMINI_API_KEY environment variable is not set")
        
        try:
            # Build prompt matching original implementation
            prompt = self._build_content_prompt(
                topic, platforms, content_type, tone, additional_context
            )
            
            logger.info("generating_content", topic=topic[:50], platforms=[p.value for p in platforms])
            
            # Generate content
            response = self.model.generate_content(prompt)
            response_text = response.text
            
            # Parse response to extract JSON
            content = self._parse_content_response(response_text, platforms)
            
            return content
            
        except Exception as e:
            logger.error("gemini_generation_error", error=str(e), topic=topic[:50])
            
            # Check for specific error types
            error_msg = str(e)
            if 'API key' in error_msg or '401' in error_msg or 'Unauthorized' in error_msg:
                raise ExternalAPIError("Gemini", "Invalid or missing API key. Please check your GEMINI_API_KEY")
            elif '429' in error_msg or 'rate limit' in error_msg.lower():
                raise ExternalAPIError("Gemini", "API rate limit exceeded. Please try again later.")
            else:
                raise ExternalAPIError("Gemini", "Failed to generate content. Please try again.")
    
    async def analyze_engagement(self, content: str, platform: Platform) -> Dict[str, Any]:
        """
        Analyze content for engagement potential
        
        Args:
            content: Content to analyze
            platform: Target platform
        
        Returns:
            Engagement analysis with score and suggestions
        """
        if not self.model:
            raise ExternalAPIError("Gemini", "API not configured")
        
        try:
            prompt = f"""
            Analyze this {platform.value} post for engagement potential:
            
            "{content}"
            
            Provide:
            1. Engagement score (0-100) for: clarity, emotion, call_to_action, relevance
            2. 3-5 specific suggestions to improve engagement
            3. Predicted reach estimate (low/medium/high)
            
            Format response as JSON.
            """
            
            response = await self._generate(prompt)
            return self._parse_engagement_response(response)
            
        except Exception as e:
            logger.error("gemini_analysis_error", error=str(e))
            raise ExternalAPIError("Gemini", str(e))
    
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
        if not self.model:
            raise ExternalAPIError("Gemini", "API not configured")
        
        try:
            prompt = f"""
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
            
            response = await self._generate(prompt)
            return self._parse_campaign_response(response)
            
        except Exception as e:
            logger.error("gemini_campaign_error", error=str(e))
            raise ExternalAPIError("Gemini", str(e))
    
    async def improve_prompt(self, original_prompt: str) -> str:
        """
        Improve a prompt for better AI generation
        
        Args:
            original_prompt: Original prompt
        
        Returns:
            Improved prompt
        """
        if not self.model:
            raise ExternalAPIError("Gemini", "API not configured")
        
        try:
            prompt = f"""
            Improve this prompt for AI image/content generation:
            
            "{original_prompt}"
            
            Make it more detailed, specific, and effective while maintaining the original intent.
            Return only the improved prompt, no explanation.
            """
            
            response = await self._generate(prompt)
            return response.strip()
            
        except Exception as e:
            logger.error("gemini_prompt_improvement_error", error=str(e))
            raise ExternalAPIError("Gemini", str(e))
    
    async def _generate(self, prompt: str) -> str:
        """
        Generate content from Gemini
        
        Args:
            prompt: Prompt text
        
        Returns:
            Generated text
        """
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error("gemini_api_error", error=str(e))
            raise
    
    def _build_content_prompt(
        self,
        topic: str,
        platforms: List[Platform],
        content_type: ContentType,
        tone: Tone,
        additional_context: Optional[str] = None
    ) -> str:
        """Build a comprehensive prompt matching original implementation"""
        
        # Get platform details
        platform_details = "\n".join([
            f"- {platform.value}: {PLATFORM_SPECS.get(platform, 'Standard format')}"
            for platform in platforms
        ])
        
        context_text = f"\n\nAdditional Context: {additional_context}" if additional_context else ""
        
        prompt = f"""
You are an expert AI social agent your name is Agent OS. Your task is to generate content for a social media post based on the provided topic. Your main task is to generate video content suggestions.

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
    
    def _parse_content_response(self, response: str, platforms: List[Platform]) -> Dict[str, Any]:
        """Parse content generation response"""
        import json
        import re
        
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
            logger.error("parse_error", error=str(e))
            # Return fallback structure
            return {p.value: {"text": response[:500], "hashtags": []} for p in platforms}
    
    def _parse_engagement_response(self, response: str) -> Dict[str, Any]:
        """Parse engagement analysis response"""
        import json
        import re
        
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
            logger.error("parse_engagement_error", error=str(e))
            return {"score": {}, "suggestions": [], "predicted_reach": "unknown"}
    
    def _parse_campaign_response(self, response: str) -> Dict[str, Any]:
        """Parse campaign brief response"""
        import json
        import re
        
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
            logger.error("parse_campaign_error", error=str(e))
            return {"brief": {}, "content_calendar": [], "kpis": []}


    async def repurpose_content(
        self,
        long_form_content: str,
        platforms: List[Platform],
        number_of_posts: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Repurpose long-form content into multiple social media posts
        Matches original aiService.repurposeContent
        """
        if not self.model:
            raise ExternalAPIError("Gemini", "GEMINI_API_KEY environment variable is not set")
        
        platform_details = "\n".join([
            f"- {platform.value}: {PLATFORM_SPECS.get(platform, 'Standard format')}"
            for platform in platforms
        ])
        
        prompt = f"""
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
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text
            
            # Parse JSON array
            json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
            if json_match:
                posts = json.loads(json_match.group())
                return posts
            
            # Fallback
            return []
            
        except Exception as e:
            logger.error("gemini_repurpose_error", error=str(e))
            raise ExternalAPIError("Gemini", "Failed to repurpose content. Please try again.")
    
    async def content_strategist_chat(
        self,
        message: str,
        history: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Content Strategist Chat - Conversational AI for gathering content strategy info
        Matches original aiService.contentStrategistChat
        """
        if not self.model:
            raise ExternalAPIError("Gemini", "GEMINI_API_KEY environment variable is not set")
        
        platforms_list = ', '.join([p.value for p in Platform])
        
        system_instruction = f"""You are 'Cortext AI', an expert social media strategist. Your goal is to help users create social media content by gathering the necessary information through conversation.

**Available Platforms:** {platforms_list}
**Content Types:** engaging, educational, promotional, storytelling
**Tones:** professional, casual, humorous, inspirational, urgent, friendly

**Your Process:**
1. Start by asking what the user wants to promote or talk about (this will be the TOPIC)
2. Guide the conversation to gather:
   - A clear **topic** (what they want to post about)
   - Target **platforms** (from the available list above)
   - **Content type** (engaging, educational, promotional, or storytelling)
   - **Tone** (professional, casual, humorous, inspirational, urgent, or friendly)

3. Once you have ALL required information, summarize the plan using this EXACT format:
   
   **Summary:**
   - **Topic:** [the topic]
   - **Platforms:** [platform1, platform2, etc.]
   - **Content Type:** [contentType]
   - **Tone:** [tone]
   
   Then ask: "Ready to generate your content? (yes/no)"

4. When the user confirms (yes/ready/go/proceed), respond with ONLY this JSON:
   ```json
   {{
     "topic": "extracted topic here",
     "platforms": ["platform1", "platform2"],
     "contentType": "engaging|educational|promotional|storytelling",
     "tone": "professional|casual|humorous|inspirational|urgent|friendly"
   }}
   ```

**CRITICAL RULES:**
- Be conversational and friendly
- Ask ONE question at a time
- Only show the JSON when user explicitly confirms
- Validate platforms against the available list
- Ensure contentType and tone match the allowed values"""
        
        # Build conversation context
        conversation_history = history or []
        context_messages = "\n\n".join([
            f"{msg.get('role', 'user').title()}: {msg.get('content', '')}"
            for msg in conversation_history
        ])
        
        full_prompt = f"{system_instruction}\n\n"
        if context_messages:
            full_prompt += f"**Conversation History:**\n{context_messages}\n\n"
        full_prompt += f"**Current User Message:**\n{message}"
        
        try:
            response = self.model.generate_content(full_prompt)
            response_text = response.text
            
            # Check if response contains JSON parameters (user confirmed)
            json_match = re.search(r'```json\n([\s\S]*?)\n```', response_text)
            if json_match and json_match.group(1):
                try:
                    parameters = json.loads(json_match.group(1))
                    # Validate parameters
                    if all(k in parameters for k in ['topic', 'platforms', 'contentType', 'tone']):
                        return {
                            "response": "Perfect! Generating your content now...",
                            "readyToGenerate": True,
                            "parameters": parameters
                        }
                except json.JSONDecodeError:
                    pass
            
            # Regular conversation response
            return {"response": response_text}
            
        except Exception as e:
            logger.error("gemini_chat_error", error=str(e))
            
            error_msg = str(e)
            if 'API key' in error_msg or 'GEMINI_API_KEY' in error_msg:
                raise ExternalAPIError("Gemini", error_msg)
            
            raise ExternalAPIError("Gemini", f"Failed to generate chat response: {error_msg}")


# Global service instance
gemini_service = GeminiService()
