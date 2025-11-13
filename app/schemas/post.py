"""
Post schemas
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class PostStatus(str, Enum):
    """Post status enum"""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    FAILED = "failed"


class Platform(str, Enum):
    """Social platform enum"""
    TWITTER = "twitter"
    LINKEDIN = "linkedin"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    TIKTOK = "tiktok"
    YOUTUBE = "youtube"


class PostBase(BaseModel):
    """Base post schema"""
    topic: str = Field(..., min_length=1, max_length=500)
    platforms: List[Platform]
    content: Dict[str, Any] = Field(default_factory=dict)
    status: PostStatus = PostStatus.DRAFT
    scheduled_at: Optional[datetime] = None
    campaign_id: Optional[str] = None


class PostCreate(PostBase):
    """Schema for creating a post"""
    pass


class PostUpdate(BaseModel):
    """Schema for updating a post"""
    topic: Optional[str] = Field(None, min_length=1, max_length=500)
    platforms: Optional[List[Platform]] = None
    content: Optional[Dict[str, Any]] = None
    status: Optional[PostStatus] = None
    scheduled_at: Optional[datetime] = None
    campaign_id: Optional[str] = None


class PostResponse(PostBase):
    """Schema for post response"""
    id: str
    workspace_id: str
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    engagement_score: Optional[Dict[str, Any]] = None
    engagement_suggestions: Optional[List[str]] = None
    
    class Config:
        from_attributes = True
