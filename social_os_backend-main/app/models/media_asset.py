"""
Media Asset model - Matches Supabase database schema
"""
from sqlalchemy import Column, String, Integer, BigInteger, Boolean, DateTime, Text, ARRAY, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey

from app.models.base import BaseModel
from app.models.enums import MediaType, MediaSource


class MediaAsset(BaseModel):
    """Media asset model matching Supabase schema"""
    
    __tablename__ = "media_assets"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    type = Column(Enum(MediaType), nullable=False)
    source = Column(Enum(MediaSource), nullable=False)
    file_url = Column(String, nullable=False)
    thumbnail_url = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    tags = Column(ARRAY(Text), default=[])
    alt_text = Column(String, nullable=True)
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="media_assets")
    creator = relationship("User", foreign_keys=[created_by], back_populates="media_assets")
    post_media = relationship("PostMedia", back_populates="media_asset")
