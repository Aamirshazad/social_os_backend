"""
Post Library and Platform models - Matches Supabase database schema
"""
from sqlalchemy import Column, String, Integer, DateTime, Text, ARRAY, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey
import enum

from app.models.base import BaseModel


class Platform(enum.Enum):
    """Social media platform enum"""
    TWITTER = "twitter"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"
    TIKTOK = "tiktok"
    YOUTUBE = "youtube"


class PostLibrary(BaseModel):
    """Post library model matching Supabase schema"""
    
    __tablename__ = "post_library"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    original_post_id = Column(UUID(as_uuid=True), nullable=True)
    title = Column(String, nullable=True)
    topic = Column(String, nullable=True)
    post_type = Column(String, nullable=True)
    platforms = Column(ARRAY(String), nullable=True)
    content = Column(JSONB, nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=False)
    platform_data = Column(JSONB, nullable=True)
    metrics = Column(JSONB, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="post_library")
    creator = relationship("User", back_populates="library_posts")
