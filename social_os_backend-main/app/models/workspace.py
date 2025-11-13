"""
Workspace model - Matches Supabase database schema
"""
from sqlalchemy import Column, String, Boolean, Integer
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Workspace(BaseModel):
    """Workspace model matching Supabase schema"""
    
    __tablename__ = "workspaces"
    
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
    max_users = Column(Integer, default=10)
    settings = Column(JSONB, default={})
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    users = relationship("User", back_populates="workspace")
    posts = relationship("Post", back_populates="workspace")
    campaigns = relationship("Campaign", back_populates="workspace")
    media_assets = relationship("MediaAsset", back_populates="workspace")
    social_accounts = relationship("SocialAccount", back_populates="workspace")
    workspace_invites = relationship("WorkspaceInvite", back_populates="workspace")
