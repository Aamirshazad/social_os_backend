"""
Library Item model - Archived/published posts
"""
from sqlalchemy import Column, String, ARRAY, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class LibraryItem(BaseModel):
    """Library item model for archived posts"""
    
    __tablename__ = "post_library"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    original_post_id = Column(String(255), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    title = Column(String(200), nullable=False)
    topic = Column(String(500), nullable=False)
    post_type = Column(String(50), nullable=False, default="post")
    
    platforms = Column(ARRAY(String), nullable=False)
    content = Column(JSONB, nullable=False, default=dict)
    
    published_at = Column(DateTime, nullable=False)
    platform_data = Column(JSONB, nullable=True, default=dict)
    
    # Relationships
    workspace = relationship("Workspace")
    creator = relationship("User")
