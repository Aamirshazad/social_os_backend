"""
Post model - Matches Supabase database schema
"""
from sqlalchemy import Column, String, ARRAY, Text, ForeignKey, DateTime, Integer, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.models.base import BaseModel
from app.models.enums import PostStatus


class Post(BaseModel):
    """Post model matching Supabase schema"""
    
    __tablename__ = "posts"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=True)
    title = Column(String, nullable=True)
    topic = Column(Text, nullable=False)
    post_type = Column(String, default='post')
    platforms = Column(ARRAY(String), nullable=True)
    content = Column(JSONB, nullable=False, default={})
    platform_templates = Column(JSONB, default={})
    status = Column(Enum(PostStatus), default=PostStatus.DRAFT)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    engagement_score = Column(Integer, nullable=True)
    engagement_suggestions = Column(ARRAY(String), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="posts")
    creator = relationship("User", foreign_keys=[created_by], back_populates="posts")
    campaign = relationship("Campaign", back_populates="posts")
    ab_test_variants = relationship("ABTestVariant", back_populates="post")
    approvals = relationship("Approval", back_populates="post")
    analytics = relationship("PostAnalytics", back_populates="post")
    content_versions = relationship("PostContent", back_populates="post")
    media = relationship("PostMedia", back_populates="post")
    platform_posts = relationship("PostPlatforms", back_populates="post")
