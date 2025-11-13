"""
Post Media model - Matches Next.js schema exactly
Links posts to media assets with positioning and captions
"""
from sqlalchemy import Column, String, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class PostMedia(BaseModel):
    """Post media model matching Next.js schema"""
    
    __tablename__ = "post_media"
    
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id"), nullable=False)
    media_asset_id = Column(UUID(as_uuid=True), ForeignKey("media_assets.id"), nullable=False)
    position_order = Column(Integer, default=0)
    usage_caption = Column(String, nullable=True)
    
    # Relationships
    post = relationship("Post", back_populates="media")
    media_asset = relationship("MediaAsset", back_populates="post_media")
