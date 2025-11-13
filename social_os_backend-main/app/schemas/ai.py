"""
AI service schemas
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from enum import Enum


class Platform(str, Enum):
    """Social media platforms"""
    TWITTER = "twitter"
    LINKEDIN = "linkedin"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    TIKTOK = "tiktok"
    YOUTUBE = "youtube"


class ContentType(str, Enum):
    """Content types"""
    ENGAGING = "engaging"
    EDUCATIONAL = "educational"
    PROMOTIONAL = "promotional"
    STORYTELLING = "storytelling"


class Tone(str, Enum):
    """Content tone"""
    PROFESSIONAL = "professional"
    CASUAL = "casual"
    HUMOROUS = "humorous"
    INSPIRATIONAL = "inspirational"
    URGENT = "urgent"
    FRIENDLY = "friendly"


class GenerateContentRequest(BaseModel):
    """Request schema for content generation"""
    topic: str = Field(..., min_length=3, max_length=500, description="Content topic")
    platforms: List[Platform] = Field(..., min_items=1, description="Target platforms")
    content_type: ContentType = Field(default=ContentType.ENGAGING, description="Type of content")
    tone: Tone = Field(default=Tone.PROFESSIONAL, description="Content tone")
    additional_context: Optional[str] = Field(None, max_length=2000, description="Additional context")


class PlatformContent(BaseModel):
    """Content for a specific platform"""
    platform: Platform
    text: str
    hashtags: List[str] = Field(default_factory=list)
    character_count: int
    suggestions: Optional[List[str]] = Field(default_factory=list)


class GenerateContentResponse(BaseModel):
    """Response schema for content generation"""
    success: bool = True
    data: Dict[str, Any]
    message: Optional[str] = None


class EngagementAnalysisRequest(BaseModel):
    """Request schema for engagement analysis"""
    content: str = Field(..., min_length=1)
    platform: Platform


class EngagementAnalysisResponse(BaseModel):
    """Response schema for engagement analysis"""
    score: Dict[str, float]
    suggestions: List[str]
    predicted_reach: Optional[int] = None


class ImageGenerationRequest(BaseModel):
    """Request schema for image generation"""
    prompt: str = Field(..., min_length=1, max_length=1000)
    style: Optional[str] = Field("realistic", description="Image style")
    size: Optional[str] = Field("1024x1024", description="Image size")


class ImageGenerationResponse(BaseModel):
    """Response schema for image generation"""
    image_url: str
    prompt: str
    revised_prompt: Optional[str] = None


class VideoGenerationRequest(BaseModel):
    """Request schema for video generation"""
    prompt: str = Field(..., min_length=1, max_length=1000)
    duration: Optional[int] = Field(5, ge=1, le=30, description="Duration in seconds")


class VideoGenerationResponse(BaseModel):
    """Response schema for video generation"""
    video_id: str
    status: str
    message: Optional[str] = None


class CampaignBriefRequest(BaseModel):
    """Request schema for campaign brief generation"""
    goals: str = Field(..., min_length=10)
    target_audience: str = Field(..., min_length=10)
    platforms: List[Platform]
    duration: Optional[str] = Field("1 week")


class CampaignBriefResponse(BaseModel):
    """Response schema for campaign brief"""
    brief: Dict[str, Any]
    content_calendar: List[Dict[str, Any]]
    kpis: List[str]
