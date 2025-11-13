"""
Post Platforms model - Matches Next.js schema exactly
Tracks platform-specific post data and metrics
"""
from sqlalchemy import Column, String, ForeignKey, DateTime, Integer, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel
from app.models.enums import PlatformType


class PostPlatforms(BaseModel):
    """Post platforms model matching Next.js schema"""
    
    __tablename__ = "post_platforms"
    
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id"), nullable=False)
    platform = Column(Enum(PlatformType), nullable=False)
    platform_post_id = Column(String, nullable=True)
    platform_status = Column(String, nullable=True)
    platform_error_message = Column(String, nullable=True)
    platform_impressions = Column(Integer, default=0)
    platform_engagement = Column(Integer, default=0)
    platform_reach = Column(Integer, default=0)
    posted_at = Column(DateTime(timezone=True), nullable=True)
    error_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    post = relationship("Post", back_populates="platform_posts")
