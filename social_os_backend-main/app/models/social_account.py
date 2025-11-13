"""
Social Account model - Matches Supabase database schema
"""
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey

from app.models.base import BaseModel
from app.models.enums import PlatformType


class SocialAccount(BaseModel):
    """Social account model matching Supabase schema"""
    
    __tablename__ = "social_accounts"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    platform = Column(Enum(PlatformType), nullable=False)
    credentials_encrypted = Column(Text, nullable=False)
    refresh_token_encrypted = Column(String, nullable=True)
    username = Column(String, nullable=True)
    account_id = Column(String, nullable=True)
    account_name = Column(String, nullable=True)
    profile_picture_url = Column(String, nullable=True)
    is_connected = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    connected_at = Column(DateTime(timezone=True), nullable=True)
    last_verified_at = Column(DateTime(timezone=True), nullable=True)
    access_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    last_refreshed_at = Column(DateTime(timezone=True), nullable=True)
    refresh_error_count = Column(Integer, default=0)
    last_error_message = Column(Text, nullable=True)
    platform_user_id = Column(String, nullable=True)
    page_id = Column(String, nullable=True)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="social_accounts")
