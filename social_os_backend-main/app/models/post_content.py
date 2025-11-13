"""
Post Content and Media models - Matches Supabase database schema
"""
from sqlalchemy import Column, String, Integer, Boolean, Text, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey

from app.models.base import BaseModel


class PostContent(BaseModel):
    """Post content model matching Supabase schema"""
    
    __tablename__ = "post_content"
    
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id"), nullable=False)
    text_content = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    hashtags = Column(ARRAY(String), nullable=True)
    mentions = Column(ARRAY(String), nullable=True)
    call_to_action = Column(String, nullable=True)
    version_number = Column(Integer, nullable=False)
    change_summary = Column(Text, nullable=True)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    is_current = Column(Boolean, default=False)
    
    # Relationships
    post = relationship("Post", back_populates="content_versions")
    changed_by_user = relationship("User", back_populates="post_content_changes")


