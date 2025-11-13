"""
Post model
"""
from sqlalchemy import Column, String, ARRAY, Text, ForeignKey, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from typing import List, Optional
import uuid

from app.models.base import BaseModel


class Post(BaseModel):
    """Post model for social media posts"""
    
    __tablename__ = "posts"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    topic = Column(String(500), nullable=False)
    platforms = Column(ARRAY(String), nullable=False)
    content = Column(JSONB, nullable=False, default=dict)
    
    status = Column(String(50), nullable=False, default="draft")
    
    scheduled_at = Column(DateTime, nullable=True)
    published_at = Column(DateTime, nullable=True)
    
    campaign_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Engagement metrics
    likes_count = Column(Integer, nullable=True, default=0)
    comments_count = Column(Integer, nullable=True, default=0)
    shares_count = Column(Integer, nullable=True, default=0)
    impressions_count = Column(Integer, nullable=True, default=0)
    
    engagement_score = Column(JSONB, nullable=True)
    engagement_suggestions = Column(ARRAY(String), nullable=True)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="posts")
    creator = relationship("User", foreign_keys=[created_by])
