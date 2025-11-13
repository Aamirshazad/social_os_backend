"""
Campaign model - Matches Supabase database schema
"""
from sqlalchemy import Column, String, Text, ARRAY, ForeignKey, DateTime, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Campaign(BaseModel):
    """Campaign model matching Supabase schema"""
    
    __tablename__ = "campaigns"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    goal = Column(Text, nullable=True)
    status = Column(String, default='active')
    color = Column(Text, default='#3B82F6')
    icon = Column(String, nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    content_themes = Column(ARRAY(String), nullable=True)
    target_audience = Column(JSONB, default={})
    performance_targets = Column(JSONB, default={})
    budget_hours = Column(Integer, default=0)
    tags = Column(ARRAY(String), nullable=True)
    assigned_to = Column(ARRAY(String), nullable=True)
    is_archived = Column(Boolean, default=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    campaign_type = Column(Text, nullable=True)
    goals = Column(ARRAY(Text), default=[])
    archived = Column(Boolean, default=False)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="campaigns")
    creator = relationship("User", foreign_keys=[created_by], back_populates="campaigns")
    posts = relationship("Post", back_populates="campaign")
    ab_tests = relationship("ABTest", back_populates="campaign")
    analytics = relationship("CampaignAnalytics", back_populates="campaign")
