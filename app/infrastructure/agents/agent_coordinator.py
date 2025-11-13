"""
Agent Coordinator - Orchestrates multiple AI agents for complex tasks
"""
from typing import Dict, Any, List, Optional
import structlog
from .content_agent import ContentAgent
from .image_agent import ImageAgent
from .strategist_agent import StrategistAgent
from .repurpose_agent import RepurposeAgent
from app.schemas.ai import Platform, ContentType, Tone

logger = structlog.get_logger()


class AgentCoordinator:
    """Coordinates multiple AI agents to handle complex content creation workflows"""
    
    def __init__(self):
        self.content_agent = ContentAgent()
        self.image_agent = ImageAgent()
        self.strategist_agent = StrategistAgent()
        self.repurpose_agent = RepurposeAgent()
        self.logger = logger.bind(service="agent_coordinator")
    
    async def generate_complete_content_package(
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
        Generate a complete content package using multiple agents
        
        Args:
            topic: Content topic
            platforms: Target platforms
            content_type: Content type
            tone: Content tone
            include_images: Whether to generate image suggestions
            include_strategy: Whether to include strategic recommendations
            additional_context: Additional context
        
        Returns:
            Complete content package with text, images, and strategy
        """
        try:
            self.logger.info("generating_complete_package", 
                           topic=topic[:50],
                           platforms=[p.value for p in platforms])
            
            # Generate base content
            content_result = await self.content_agent.process(
                topic=topic,
                platforms=platforms,
                content_type=content_type,
                tone=tone,
                additional_context=additional_context
            )
            
            package = {
                "content": content_result,
                "topic": topic,
                "platforms": [p.value for p in platforms],
                "content_type": content_type.value,
                "tone": tone.value
            }
            
            # Add image suggestions if requested
            if include_images:
                image_suggestions = {}
                for platform in platforms:
                    platform_content = content_result.get(platform.value, {})
                    if isinstance(platform_content, dict) and "text" in platform_content:
                        content_text = platform_content["text"]
                    else:
                        content_text = str(platform_content)
                    
                    image_result = await self.image_agent.process(
                        content=content_text,
                        platform=platform
                    )
                    image_suggestions[platform.value] = image_result
                
                package["images"] = image_suggestions
            
            # Add strategic recommendations if requested
            if include_strategy:
                # Analyze engagement potential for each platform
                engagement_analysis = {}
                for platform in platforms:
                    platform_content = content_result.get(platform.value, {})
                    if isinstance(platform_content, dict) and "text" in platform_content:
                        content_text = platform_content["text"]
                    else:
                        content_text = str(platform_content)
                    
                    analysis = await self.content_agent.analyze_engagement(
                        content=content_text,
                        platform=platform
                    )
                    engagement_analysis[platform.value] = analysis
                
                package["strategy"] = {
                    "engagement_analysis": engagement_analysis,
                    "recommendations": await self._generate_strategic_recommendations(
                        content_result, platforms, content_type, tone
                    )
                }
            
            return package
            
        except Exception as e:
            self.logger.error("complete_package_error", error=str(e))
            raise
    
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
            include_images: Whether to generate image suggestions
        
        Returns:
            List of repurposed posts with visual suggestions
        """
        try:
            self.logger.info("repurposing_with_visuals", 
                           content_length=len(long_form_content),
                           posts_count=number_of_posts)
            
            # Repurpose content
            repurposed_posts = await self.repurpose_agent.process(
                long_form_content=long_form_content,
                platforms=platforms,
                number_of_posts=number_of_posts
            )
            
            # Add visual suggestions to each post
            if include_images:
                for post in repurposed_posts:
                    post_content = post.get("content", {})
                    post["visuals"] = {}
                    
                    for platform in platforms:
                        platform_content = post_content.get(platform.value, "")
                        if platform_content:
                            visual_suggestions = await self.image_agent.process(
                                content=platform_content,
                                platform=platform
                            )
                            post["visuals"][platform.value] = visual_suggestions
            
            return repurposed_posts
            
        except Exception as e:
            self.logger.error("repurpose_with_visuals_error", error=str(e))
            raise
    
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
            main_topic: Main topic for the series
            series_length: Number of posts in series
            platforms: Target platforms
            content_type: Content type
            tone: Content tone
        
        Returns:
            List of related content posts forming a series
        """
        try:
            self.logger.info("creating_content_series", 
                           topic=main_topic[:50],
                           series_length=series_length)
            
            # First, break down the main topic into subtopics
            subtopics = await self._generate_series_subtopics(
                main_topic, series_length, content_type
            )
            
            series_posts = []
            for i, subtopic in enumerate(subtopics):
                # Generate content for each subtopic
                post_content = await self.content_agent.process(
                    topic=subtopic,
                    platforms=platforms,
                    content_type=content_type,
                    tone=tone,
                    additional_context=f"Part {i+1} of {series_length} in series about {main_topic}"
                )
                
                # Generate images for the post
                post_images = {}
                for platform in platforms:
                    platform_content = post_content.get(platform.value, {})
                    if isinstance(platform_content, dict) and "text" in platform_content:
                        content_text = platform_content["text"]
                    else:
                        content_text = str(platform_content)
                    
                    image_result = await self.image_agent.process(
                        content=content_text,
                        platform=platform
                    )
                    post_images[platform.value] = image_result
                
                series_posts.append({
                    "series_position": i + 1,
                    "total_posts": series_length,
                    "subtopic": subtopic,
                    "content": post_content,
                    "images": post_images,
                    "series_context": f"Part {i+1}: {subtopic}"
                })
            
            return series_posts
            
        except Exception as e:
            self.logger.error("content_series_error", error=str(e))
            raise
    
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
            optimization_goals: What to optimize for (engagement, reach, etc.)
        
        Returns:
            Optimized content with recommendations
        """
        try:
            self.logger.info("optimizing_content", 
                           platform=target_platform.value,
                           goals=optimization_goals)
            
            # Analyze current content
            engagement_analysis = await self.content_agent.analyze_engagement(
                content=existing_content,
                platform=target_platform
            )
            
            # Create variations for A/B testing
            variations = await self.repurpose_agent.create_content_variations(
                base_content=existing_content,
                platform=target_platform,
                variation_count=3
            )
            
            # Generate improved visuals
            visual_suggestions = await self.image_agent.process(
                content=existing_content,
                platform=target_platform
            )
            
            # Analyze visual performance
            visual_analysis = await self.image_agent.analyze_image_performance(
                image_description=visual_suggestions.get("concepts", [""])[0],
                platform=target_platform,
                target_audience="general social media audience"
            )
            
            return {
                "original_content": existing_content,
                "analysis": engagement_analysis,
                "variations": variations,
                "visual_suggestions": visual_suggestions,
                "visual_analysis": visual_analysis,
                "optimization_recommendations": await self._generate_optimization_recommendations(
                    engagement_analysis, visual_analysis, optimization_goals
                )
            }
            
        except Exception as e:
            self.logger.error("content_optimization_error", error=str(e))
            raise
    
    async def _generate_series_subtopics(
        self,
        main_topic: str,
        series_length: int,
        content_type: ContentType
    ) -> List[str]:
        """Generate subtopics for a content series"""
        try:
            prompt = f"""
Break down this main topic into {series_length} related subtopics for a {content_type.value} content series:

Main Topic: {main_topic}

Create {series_length} specific, actionable subtopics that:
1. Build upon each other logically
2. Cover different aspects of the main topic
3. Are suitable for {content_type.value} content
4. Can each stand alone as individual posts

Return as a JSON array of {series_length} strings, each being a subtopic.
"""
            
            response = await self.content_agent._generate_response(prompt)
            
            # Parse the response
            import json
            import re
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                subtopics = json.loads(json_match.group())
                return subtopics[:series_length]  # Ensure we don't exceed requested length
            
            # Fallback: create generic subtopics
            return [f"{main_topic} - Part {i+1}" for i in range(series_length)]
            
        except Exception as e:
            self.logger.error("generate_subtopics_error", error=str(e))
            return [f"{main_topic} - Part {i+1}" for i in range(series_length)]
    
    async def _generate_strategic_recommendations(
        self,
        content_result: Dict[str, Any],
        platforms: List[Platform],
        content_type: ContentType,
        tone: Tone
    ) -> List[str]:
        """Generate strategic recommendations for the content"""
        try:
            recommendations = []
            
            # Platform-specific recommendations
            for platform in platforms:
                platform_content = content_result.get(platform.value, {})
                if isinstance(platform_content, dict) and "text" in platform_content:
                    content_length = len(platform_content["text"])
                    
                    if platform == Platform.TWITTER and content_length > 250:
                        recommendations.append(f"Consider shortening {platform.value} content for better engagement")
                    elif platform == Platform.LINKEDIN and content_length < 100:
                        recommendations.append(f"Consider expanding {platform.value} content for more professional depth")
            
            # Content type recommendations
            if content_type == ContentType.PROMOTIONAL:
                recommendations.append("Include clear call-to-action in promotional content")
                recommendations.append("Consider adding social proof or testimonials")
            elif content_type == ContentType.EDUCATIONAL:
                recommendations.append("Break down complex information into digestible points")
                recommendations.append("Consider creating follow-up content for deeper topics")
            
            # Tone recommendations
            if tone == Tone.PROFESSIONAL:
                recommendations.append("Maintain consistent professional language across platforms")
            elif tone == Tone.CASUAL:
                recommendations.append("Use platform-appropriate casual language and emojis")
            
            return recommendations
            
        except Exception as e:
            self.logger.error("strategic_recommendations_error", error=str(e))
            return ["Monitor engagement and adjust strategy based on performance"]
    
    async def _generate_optimization_recommendations(
        self,
        engagement_analysis: Dict[str, Any],
        visual_analysis: Dict[str, Any],
        optimization_goals: List[str]
    ) -> List[str]:
        """Generate optimization recommendations"""
        try:
            recommendations = []
            
            # Based on engagement analysis
            engagement_score = engagement_analysis.get("score", {}).get("overall", 0)
            if engagement_score < 70:
                recommendations.extend(engagement_analysis.get("suggestions", []))
            
            # Based on visual analysis
            visual_score = visual_analysis.get("performance_score", 0)
            if visual_score < 70:
                recommendations.extend(visual_analysis.get("recommendations", []))
            
            # Based on optimization goals
            for goal in optimization_goals:
                if goal.lower() == "engagement":
                    recommendations.append("Add interactive elements like questions or polls")
                elif goal.lower() == "reach":
                    recommendations.append("Use trending hashtags and optimal posting times")
                elif goal.lower() == "conversions":
                    recommendations.append("Include clear and compelling call-to-action")
            
            return list(set(recommendations))  # Remove duplicates
            
        except Exception as e:
            self.logger.error("optimization_recommendations_error", error=str(e))
            return ["Monitor performance and iterate based on results"]
