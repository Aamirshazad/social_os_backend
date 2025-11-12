"""
Strategist Agent - Specialized agent for content strategy and conversational planning
"""
from typing import Dict, Any, List, Optional
import json
import re
import structlog
from .base_agent import BaseAgent
from app.schemas.ai import Platform

logger = structlog.get_logger()


class StrategistAgent(BaseAgent):
    """AI agent specialized in content strategy and conversational planning"""
    
    def __init__(self):
        super().__init__("strategist_agent")
    
    async def process(
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
            Chat response with potential content generation parameters
        """
        try:
            prompt = self._build_strategist_prompt(message, history)
            
            self.logger.info("processing_strategist_chat", 
                           message_length=len(message),
                           has_history=bool(history))
            
            response_text = await self._generate_response(prompt)
            return self._parse_strategist_response(response_text)
            
        except Exception as e:
            self.logger.error("strategist_chat_error", error=str(e))
            raise
    
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
            target_audience: Target audience description
            platforms: Target platforms
            content_pillars: Main content themes
            posting_frequency: How often to post
        
        Returns:
            Detailed content strategy
        """
        try:
            prompt = self._build_strategy_prompt(
                business_goals, target_audience, platforms, content_pillars, posting_frequency
            )
            
            response_text = await self._generate_response(prompt)
            return self._parse_strategy_response(response_text)
            
        except Exception as e:
            self.logger.error("content_strategy_error", error=str(e))
            raise
    
    async def analyze_competitor_content(
        self,
        competitor_content: List[str],
        our_brand_voice: str,
        platforms: List[Platform]
    ) -> Dict[str, Any]:
        """
        Analyze competitor content and suggest differentiation strategies
        
        Args:
            competitor_content: List of competitor content examples
            our_brand_voice: Our brand voice description
            platforms: Target platforms
        
        Returns:
            Competitor analysis and differentiation recommendations
        """
        try:
            prompt = self._build_competitor_analysis_prompt(
                competitor_content, our_brand_voice, platforms
            )
            
            response_text = await self._generate_response(prompt)
            return self._parse_competitor_response(response_text)
            
        except Exception as e:
            self.logger.error("competitor_analysis_error", error=str(e))
            raise
    
    async def optimize_posting_schedule(
        self,
        audience_demographics: Dict[str, Any],
        platforms: List[Platform],
        content_types: List[str],
        timezone: str
    ) -> Dict[str, Any]:
        """
        Optimize posting schedule based on audience and platform data
        
        Args:
            audience_demographics: Audience data (age, location, interests)
            platforms: Target platforms
            content_types: Types of content to post
            timezone: Target timezone
        
        Returns:
            Optimized posting schedule recommendations
        """
        try:
            prompt = self._build_schedule_optimization_prompt(
                audience_demographics, platforms, content_types, timezone
            )
            
            response_text = await self._generate_response(prompt)
            return self._parse_schedule_response(response_text)
            
        except Exception as e:
            self.logger.error("schedule_optimization_error", error=str(e))
            raise
    
    async def generate_content_calendar(
        self,
        strategy: Dict[str, Any],
        duration_days: int,
        special_events: Optional[List[Dict[str, str]]] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate a detailed content calendar
        
        Args:
            strategy: Content strategy details
            duration_days: Calendar duration in days
            special_events: Special events/holidays to include
        
        Returns:
            Content calendar with daily post suggestions
        """
        try:
            prompt = self._build_calendar_prompt(strategy, duration_days, special_events)
            response_text = await self._generate_response(prompt)
            return self._parse_calendar_response(response_text)
            
        except Exception as e:
            self.logger.error("content_calendar_error", error=str(e))
            raise
    
    def _build_strategist_prompt(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]]
    ) -> str:
        """Build content strategist chat prompt"""
        
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
        
        return full_prompt
    
    def _build_strategy_prompt(
        self,
        business_goals: str,
        target_audience: str,
        platforms: List[Platform],
        content_pillars: List[str],
        posting_frequency: str
    ) -> str:
        """Build content strategy prompt"""
        
        platform_list = ', '.join([p.value for p in platforms])
        pillars_list = ', '.join(content_pillars)
        
        return f"""
Create a comprehensive social media content strategy:

**Business Goals:** {business_goals}
**Target Audience:** {target_audience}
**Platforms:** {platform_list}
**Content Pillars:** {pillars_list}
**Posting Frequency:** {posting_frequency}

Include:
1. Executive summary
2. Platform-specific strategies
3. Content mix recommendations (% per pillar)
4. Engagement tactics
5. Success metrics and KPIs
6. Content guidelines and brand voice
7. Hashtag strategies per platform
8. Community management approach

Return as structured JSON.
"""
    
    def _build_competitor_analysis_prompt(
        self,
        competitor_content: List[str],
        our_brand_voice: str,
        platforms: List[Platform]
    ) -> str:
        """Build competitor analysis prompt"""
        
        content_examples = '\n\n'.join([f"Example {i+1}: {content}" for i, content in enumerate(competitor_content)])
        platform_list = ', '.join([p.value for p in platforms])
        
        return f"""
Analyze competitor content and suggest differentiation strategies:

**Competitor Content Examples:**
{content_examples}

**Our Brand Voice:** {our_brand_voice}
**Our Platforms:** {platform_list}

Analyze:
1. Common themes and approaches in competitor content
2. Content gaps and opportunities
3. Tone and style patterns
4. Engagement strategies they use
5. How we can differentiate while staying true to our brand voice

Return as JSON with:
- "competitor_analysis": Key findings about competitors
- "opportunities": Content gaps we can fill
- "differentiation_strategies": How to stand out
- "content_recommendations": Specific content ideas
- "tone_positioning": How to position our unique voice
"""
    
    def _build_schedule_optimization_prompt(
        self,
        audience_demographics: Dict[str, Any],
        platforms: List[Platform],
        content_types: List[str],
        timezone: str
    ) -> str:
        """Build schedule optimization prompt"""
        
        demographics_text = json.dumps(audience_demographics, indent=2)
        platform_list = ', '.join([p.value for p in platforms])
        content_list = ', '.join(content_types)
        
        return f"""
Optimize posting schedule based on audience and platform data:

**Audience Demographics:**
{demographics_text}

**Platforms:** {platform_list}
**Content Types:** {content_list}
**Timezone:** {timezone}

Provide:
1. Best posting times for each platform
2. Optimal posting frequency per platform
3. Content type scheduling (when to post what)
4. Day-of-week recommendations
5. Seasonal considerations

Return as JSON with detailed scheduling recommendations.
"""
    
    def _build_calendar_prompt(
        self,
        strategy: Dict[str, Any],
        duration_days: int,
        special_events: Optional[List[Dict[str, str]]]
    ) -> str:
        """Build content calendar prompt"""
        
        strategy_text = json.dumps(strategy, indent=2)
        events_text = json.dumps(special_events or [], indent=2) if special_events else "None"
        
        return f"""
Generate a {duration_days}-day content calendar:

**Strategy:**
{strategy_text}

**Special Events:**
{events_text}

Create daily content suggestions including:
1. Date and day of week
2. Platform(s) to post on
3. Content type and topic
4. Suggested post text/caption
5. Visual suggestions
6. Hashtags
7. Optimal posting time
8. Content pillar alignment

Return as JSON array of daily content plans.
"""
    
    def _parse_strategist_response(self, response: str) -> Dict[str, Any]:
        """Parse strategist chat response"""
        try:
            # Check if response contains JSON parameters (user confirmed)
            json_match = re.search(r'```json\n([\s\S]*?)\n```', response)
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
            return {"response": response}
            
        except Exception as e:
            self.logger.error("parse_strategist_error", error=str(e))
            return {"response": "I'm here to help you create amazing content! What would you like to post about?"}
    
    def _parse_strategy_response(self, response: str) -> Dict[str, Any]:
        """Parse content strategy response"""
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            
            # Fallback
            return {
                "executive_summary": response[:500],
                "platform_strategies": {},
                "content_mix": {},
                "success_metrics": []
            }
            
        except Exception as e:
            self.logger.error("parse_strategy_error", error=str(e))
            return {"executive_summary": "", "platform_strategies": {}, "content_mix": {}, "success_metrics": []}
    
    def _parse_competitor_response(self, response: str) -> Dict[str, Any]:
        """Parse competitor analysis response"""
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            
            # Fallback
            return {
                "competitor_analysis": response[:300],
                "opportunities": [],
                "differentiation_strategies": [],
                "content_recommendations": [],
                "tone_positioning": ""
            }
            
        except Exception as e:
            self.logger.error("parse_competitor_error", error=str(e))
            return {"competitor_analysis": "", "opportunities": [], "differentiation_strategies": [], "content_recommendations": [], "tone_positioning": ""}
    
    def _parse_schedule_response(self, response: str) -> Dict[str, Any]:
        """Parse schedule optimization response"""
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            
            # Fallback
            return {
                "posting_times": {},
                "frequency_recommendations": {},
                "content_scheduling": {},
                "weekly_schedule": {}
            }
            
        except Exception as e:
            self.logger.error("parse_schedule_error", error=str(e))
            return {"posting_times": {}, "frequency_recommendations": {}, "content_scheduling": {}, "weekly_schedule": {}}
    
    def _parse_calendar_response(self, response: str) -> List[Dict[str, Any]]:
        """Parse content calendar response"""
        try:
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            
            # Fallback
            return []
            
        except Exception as e:
            self.logger.error("parse_calendar_error", error=str(e))
            return []
