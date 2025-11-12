"""
AI API endpoints
"""
from fastapi import APIRouter, Depends, File, UploadFile, Form
from typing import List
from pydantic import BaseModel

from app.dependencies import get_current_active_user
from app.core.exceptions import ExternalAPIError
from app.schemas.ai import (
    GenerateContentRequest,
    GenerateContentResponse,
    EngagementAnalysisRequest,
    EngagementAnalysisResponse,
    ImageGenerationRequest,
    ImageGenerationResponse,
    VideoGenerationRequest,
    VideoGenerationResponse,
    CampaignBriefRequest,
    CampaignBriefResponse
)
from app.application.services.ai import unified_ai_service
import structlog

logger = structlog.get_logger()
router = APIRouter()


@router.post("/content/generate")
async def generate_content(
    request: GenerateContentRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Generate social media content for multiple platforms
    
    Uses Gemini AI to create platform-optimized content based on the topic and parameters.
    Matches original Next.js /api/ai/content/generate endpoint.
    """
    try:
        content = await unified_ai_service.generate_content(
            topic=request.topic,
            platforms=request.platforms,
            content_type=request.content_type,
            tone=request.tone,
            additional_context=request.additional_context
        )
        
        logger.info(
            "content_generated",
            user_id=current_user["id"],
            topic=request.topic,
            platforms=[p.value for p in request.platforms]
        )
        
        # Return in original format: {success, data, message}
        return {
            "success": True,
            "data": content,
            "message": "Content generated successfully"
        }
    except ExternalAPIError as e:
        logger.error("content_generation_error", error=str(e))
        return {
            "success": False,
            "error": str(e).replace("Gemini: ", ""),
        }


@router.post("/content/engagement", response_model=EngagementAnalysisResponse)
async def analyze_engagement(
    request: EngagementAnalysisRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Analyze content for engagement potential
    
    Provides engagement score and suggestions for improvement.
    """
    try:
        analysis = await unified_ai_service.analyze_engagement(
            content=request.content,
            platform=request.platform
        )
        
        logger.info(
            "engagement_analyzed",
            user_id=current_user["id"],
            platform=request.platform.value
        )
        
        return analysis
    except ExternalAPIError as e:
        logger.error("engagement_analysis_error", error=str(e))
        raise
    except Exception as e:
        logger.error("engagement_analysis_unexpected_error", error=str(e))
        raise ExternalAPIError("AI Service", f"Failed to analyze engagement: {str(e)}")


@router.post("/media/image/generate", response_model=ImageGenerationResponse)
async def generate_image(
    request: ImageGenerationRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Generate an image using AI
    
    Creates a unique image based on the prompt.
    """
    try:
        result = await unified_ai_service.generate_image(
            prompt=request.prompt,
            size=request.size,
            style=request.style
        )
        
        logger.info(
            "image_generated",
            user_id=current_user["id"],
            prompt=request.prompt[:50]
        )
        
        return {
            "image_url": result["image_url"],
            "prompt": request.prompt,
            "revised_prompt": result.get("revised_prompt")
        }
    except ExternalAPIError as e:
        logger.error("image_generation_error", error=str(e))
        raise
    except Exception as e:
        logger.error("image_generation_unexpected_error", error=str(e))
        raise ExternalAPIError("AI Service", f"Failed to generate image: {str(e)}")


@router.post("/media/image/edit")
async def edit_image(
    image: UploadFile = File(...),
    prompt: str = Form(""),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Edit an image using AI
    
    Uploads an image and applies AI-based editing based on the prompt.
    """
    try:
        image_bytes = await image.read()
        
        result = await unified_ai_service.edit_image(
            image=image_bytes,
            prompt=prompt
        )
        
        logger.info(
            "image_edited",
            user_id=current_user["id"]
        )
        
        return result
    except ExternalAPIError as e:
        logger.error("image_editing_error", error=str(e))
        raise
    except Exception as e:
        logger.error("image_editing_unexpected_error", error=str(e))
        raise ExternalAPIError("AI Service", f"Failed to edit image: {str(e)}")


@router.post("/media/video/generate", response_model=VideoGenerationResponse)
async def generate_video(
    request: VideoGenerationRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Generate a video (placeholder for future video generation API)
    
    Note: This is a placeholder. Actual video generation would require
    integration with services like Runway, Pika, or similar.
    """
    # This is a placeholder response
    return {
        "video_id": "placeholder_video_id",
        "status": "processing",
        "message": "Video generation initiated. Check status endpoint for updates."
    }


@router.get("/media/video/{video_id}/status")
async def get_video_status(
    video_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get video generation status
    """
    try:
        # Placeholder response
        logger.info(
            "video_status_checked",
            user_id=current_user["id"],
            video_id=video_id
        )
        
        return {
            "video_id": video_id,
            "status": "completed",
            "video_url": "https://example.com/video.mp4"
        }
    except Exception as e:
        logger.error("video_status_error", error=str(e))
        return {
            "video_id": video_id,
            "status": "error",
            "error": str(e)
        }


@router.post("/campaigns/brief", response_model=CampaignBriefResponse)
async def generate_campaign_brief(
    request: CampaignBriefRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Generate a comprehensive campaign brief
    
    Creates a detailed campaign strategy with content calendar and KPIs.
    """
    try:
        brief = await unified_ai_service.generate_campaign_brief(
            goals=request.goals,
            target_audience=request.target_audience,
            platforms=request.platforms,
            duration=request.duration or "1 week"
        )
        
        logger.info(
            "campaign_brief_generated",
            user_id=current_user["id"]
        )
        
        return brief
    except ExternalAPIError as e:
        logger.error("campaign_brief_error", error=str(e))
        raise
    except Exception as e:
        logger.error("campaign_brief_unexpected_error", error=str(e))
        raise ExternalAPIError("AI Service", f"Failed to generate campaign brief: {str(e)}")


class CampaignIdeasRequest(BaseModel):
    topic: str
    platforms: List[str]

@router.post("/campaigns/ideas")
async def generate_campaign_ideas(
    request: CampaignIdeasRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Generate campaign ideas based on a topic
    """
    try:
        # Use Gemini to generate ideas
        prompt = f"Generate 5 creative social media campaign ideas for: {request.topic} on platforms: {', '.join(request.platforms)}"
        
        ideas = await unified_ai_service._generate(prompt)
        
        logger.info(
            "campaign_ideas_generated",
            user_id=current_user["id"],
            topic=request.topic[:50]
        )
        
        return {
            "success": True,
            "data": {
                "topic": request.topic,
                "ideas": ideas,
                "platforms": request.platforms
            }
        }
    except Exception as e:
        logger.error("campaign_ideas_error", error=str(e))
        return {
            "success": False,
            "error": str(e)
        }


class PromptImprovementRequest(BaseModel):
    prompt: str

@router.post("/prompts/improve")
async def improve_prompt(
    request: PromptImprovementRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Improve a prompt for better AI generation
    """
    try:
        improved = await unified_ai_service.improve_prompt(request.prompt)
        
        logger.info(
            "prompt_improved",
            user_id=current_user["id"],
            original_length=len(request.prompt)
        )
        
        return {
            "success": True,
            "data": {
                "original": request.prompt,
                "improved": improved
            }
        }
    except Exception as e:
        logger.error("prompt_improvement_error", error=str(e))
        return {
            "success": False,
            "error": str(e)
        }


class RepurposeContentRequest(BaseModel):
    long_form_content: str
    platforms: List[str]
    number_of_posts: int = 5

@router.post("/content/repurpose")
async def repurpose_content(
    request: RepurposeContentRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Repurpose long-form content into multiple social media posts
    Matches original /api/ai/content/repurpose endpoint
    """
    try:
        # Convert string platforms to Platform enum
        from app.schemas.ai import Platform
        platform_enums = [Platform(p) for p in request.platforms]
        
        posts = await unified_ai_service.repurpose_content(
            long_form_content=request.long_form_content,
            platforms=platform_enums,
            number_of_posts=request.number_of_posts
        )
        
        logger.info(
            "content_repurposed",
            user_id=current_user["id"],
            num_posts=len(posts)
        )
        
        return {
            "success": True,
            "data": posts,
            "message": "Content repurposed successfully"
        }
    except Exception as e:
        logger.error("content_repurpose_error", error=str(e))
        return {
            "success": False,
            "error": str(e)
        }


class StrategistChatRequest(BaseModel):
    message: str
    history: List[dict] = []

@router.post("/content/strategist/chat")
async def strategist_chat(
    request: StrategistChatRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Chat with AI content strategist - Cortext AI
    
    Conversational AI that guides users through content strategy
    Matches original /api/ai/content/strategist/chat endpoint
    """
    try:
        result = await unified_ai_service.content_strategist_chat(
            message=request.message,
            history=request.history
        )
        
        logger.info(
            "strategist_chat",
            user_id=current_user["id"],
            ready_to_generate=result.get("readyToGenerate", False)
        )
        
        return {
            "success": True,
            "data": result,
            "message": None
        }
    except Exception as e:
        logger.error("strategist_chat_error", error=str(e))
        return {
            "success": False,
            "error": str(e)
        }
