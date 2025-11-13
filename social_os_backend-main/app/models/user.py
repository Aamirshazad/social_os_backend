"""
User model - Matches Supabase database schema
Note: User authentication is handled by Supabase, this model reflects the actual DB structure
"""
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class UserRole(enum.Enum):
    """User roles enum matching Supabase schema"""
    ADMIN = "admin"
    EDITOR = "editor" 
    VIEWER = "viewer"


class User(BaseModel):
    """User model matching Supabase schema"""
    
    __tablename__ = "users"
    
    # Note: id is UUID from Supabase Auth, not auto-generated
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    email = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.VIEWER)
    avatar_url = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="users")
    posts = relationship("Post", foreign_keys="Post.created_by", back_populates="creator")
    campaigns = relationship("Campaign", foreign_keys="Campaign.created_by", back_populates="creator")
    media_assets = relationship("MediaAsset", foreign_keys="MediaAsset.created_by", back_populates="creator")
