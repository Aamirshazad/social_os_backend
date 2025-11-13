"""
AI API Router - Unified endpoints for all AI-related operations
"""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict, Any, List, Optional
import structlog

from app.application.services.ai import unified_ai_service
from app.schemas.ai import (
    ContentGenerationRequest,
    ContentGenerationResponse,
    RepurposeRequest,
    RepurposeResponse,
    ChatRequest,
    ChatResponse,
    ImageGenerationRequest,
    ImageGenerationResponse,
    StrategyRequest,
    StrategyResponse,
    Platform,
    ContentType,
    Tone
)
from app.core.exceptions import ExternalAPIError

logger = structlog.get_logger()
router = APIRouter()


@router.post("/generate-content", response_model=ContentGenerationResponse)
async def generate_content(request: ContentGenerationRequest):
    """
    Generate social media content for specified platforms
    """
    try:
        result = await unified_ai_service.generate_content(
            topic=request.topic,
            platforms=request.platforms,
            content_type=request.content_type,
            tone=request.tone,
            additional_context=request.additional_context
        )
        
        return ContentGenerationResponse(
            success=True,
            content=result,
            topic=request.topic,
            platforms=[p.value for p in request.platforms]
        )
        
    except ExternalAPIError as e:
        logger.error("ai_generation_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error("unexpected_ai_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate content"
        )


@router.post("/generate-complete-package")
async def generate_complete_package(
    topic: str,
    platforms: List[Platform],
    content_type: ContentType,
    tone: Tone,
    include_images: bool = True,
    include_strategy: bool = False,
    additional_context: Optional[str] = None
):
    """
    Generate a complete content package with text, images, and strategy
    """
    try:
        result = await unified_ai_service.generate_complete_package(
            topic=topic,
            platforms=platforms,
            content_type=content_type,
            tone=tone,
            include_images=include_images,
            include_strategy=include_strategy,
            additional_context=additional_context
        )
        
        return {
            "success": True,
            "package": result
        }
        
    except ExternalAPIError as e:
        logger.error("complete_package_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error("unexpected_package_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate complete package"
        )


@router.post("/repurpose-content", response_model=RepurposeResponse)
async def repurpose_content(request: RepurposeRequest):
    """
    Repurpose long-form content into multiple social media posts
    """
    try:
        if request.include_visuals:
            result = await unified_ai_service.repurpose_with_visuals(
                long_form_content=request.content,
                platforms=request.platforms,
                number_of_posts=request.number_of_posts,
                include_images=True
            )
        else:
            result = await unified_ai_service.repurpose_content(
                long_form_content=request.content,
                platforms=request.platforms,
                number_of_posts=request.number_of_posts
            )
        
        return RepurposeResponse(
            success=True,
            posts=result,
            original_content_length=len(request.content),
            posts_generated=len(result)
        )
        
    except ExternalAPIError as e:
        logger.error("repurpose_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error("unexpected_repurpose_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to repurpose content"
        )


@router.post("/generate-images", response_model=ImageGenerationResponse)
async def generate_images(request: ImageGenerationRequest):
    """
    Generate image suggestions and prompts for content
    """
    try:
        result = await unified_ai_service.generate_image_suggestions(
            content=request.content,
            platform=request.platform,
            style=request.style,
            brand_colors=request.brand_colors
        )
        
        return ImageGenerationResponse(
            success=True,
            suggestions=result,
            platform=request.platform.value
        )
        
    except ExternalAPIError as e:
        logger.error("image_generation_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error("unexpected_image_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate image suggestions"
        )


@router.post("/improve-image-prompt")
async def improve_image_prompt(
    original_prompt: str,
    platform: Platform,
    enhancement_focus: Optional[str] = None
):
    """
    Improve an image generation prompt for better results
    """
    try:
        improved_prompt = await unified_ai_service.improve_image_prompt(
            original_prompt=original_prompt,
            platform=platform,
            enhancement_focus=enhancement_focus
        )
        
        return {
            "success": True,
            "original_prompt": original_prompt,
            "improved_prompt": improved_prompt,
            "platform": platform.value
        }
        
    except ExternalAPIError as e:
        logger.error("prompt_improvement_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error("unexpected_prompt_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to improve prompt"
        )


@router.post("/visual-concepts")
async def generate_visual_concepts(
    topic: str,
    platforms: List[Platform],
    concept_count: int = 5
):
    """
    Generate multiple visual concepts for a topic
    """
    try:
        concepts = await unified_ai_service.generate_visual_concepts(
            topic=topic,
            platforms=platforms,
            concept_count=concept_count
        )
        
        return {
            "success": True,
            "topic": topic,
            "concepts": concepts,
            "platforms": [p.value for p in platforms]
        }
        
    except ExternalAPIError as e:
        logger.error("visual_concepts_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error("unexpected_concepts_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate visual concepts"
        )


@router.post("/strategist-chat", response_model=ChatResponse)
async def strategist_chat(request: ChatRequest):
    """
    Content strategist chat for gathering content requirements
    """
    try:
        result = await unified_ai_service.content_strategist_chat(
            message=request.message,
            history=request.history
        )
        
        return ChatResponse(
            success=True,
            response=result.get("response", ""),
            ready_to_generate=result.get("readyToGenerate", False),
            parameters=result.get("parameters")
        )
        
    except ExternalAPIError as e:
        logger.error("strategist_chat_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error("unexpected_chat_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process chat"
        )


@router.post("/create-strategy", response_model=StrategyResponse)
async def create_strategy(request: StrategyRequest):
    """
    Create a comprehensive content strategy
    """
    try:
        result = await unified_ai_service.create_content_strategy(
            business_goals=request.business_goals,
            target_audience=request.target_audience,
            platforms=request.platforms,
            content_pillars=request.content_pillars,
            posting_frequency=request.posting_frequency
        )
        
        return StrategyResponse(
            success=True,
            strategy=result
        )
        
    except ExternalAPIError as e:
        logger.error("strategy_creation_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error("unexpected_strategy_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create strategy"
        )


@router.post("/content-series")
async def create_content_series(
    main_topic: str,
    series_length: int,
    platforms: List[Platform],
    content_type: ContentType,
    tone: Tone
):
    """
    Create a series of related content posts
    """
    try:
        series = await unified_ai_service.create_content_series(
            main_topic=main_topic,
            series_length=series_length,
            platforms=platforms,
            content_type=content_type,
            tone=tone
        )
        
        return {
            "success": True,
            "main_topic": main_topic,
            "series_length": series_length,
            "posts": series
        }
        
    except ExternalAPIError as e:
        logger.error("content_series_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error("unexpected_series_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create content series"
        )


@router.post("/optimize-content")
async def optimize_content(
    existing_content: str,
    target_platform: Platform,
    optimization_goals: List[str]
):
    """
    Optimize existing content for better performance
    """
    try:
        result = await unified_ai_service.optimize_existing_content(
            existing_content=existing_content,
            target_platform=target_platform,
            optimization_goals=optimization_goals
        )
        
        return {
            "success": True,
            "optimization": result
        }
        
    except ExternalAPIError as e:
        logger.error("content_optimization_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error("unexpected_optimization_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to optimize content"
        )


@router.post("/analyze-engagement")
async def analyze_engagement(
    content: str,
    platform: Platform
):
    """
    Analyze content for engagement potential
    """
    try:
        analysis = await unified_ai_service.analyze_engagement(
            content=content,
            platform=platform
        )
        
        return {
            "success": True,
            "analysis": analysis,
            "platform": platform.value
        }
        
    except ExternalAPIError as e:
        logger.error("engagement_analysis_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error("unexpected_analysis_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze engagement"
        )


@router.post("/campaign-brief")
async def generate_campaign_brief(
    goals: str,
    target_audience: str,
    platforms: List[Platform],
    duration: str
):
    """
    Generate a comprehensive campaign brief
    """
    try:
        brief = await unified_ai_service.generate_campaign_brief(
            goals=goals,
            target_audience=target_audience,
            platforms=platforms,
            duration=duration
        )
        
        return {
            "success": True,
            "brief": brief,
            "platforms": [p.value for p in platforms]
        }
        
    except ExternalAPIError as e:
        logger.error("campaign_brief_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error("unexpected_brief_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate campaign brief"
        )
