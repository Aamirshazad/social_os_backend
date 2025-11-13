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
    ab_tests = relationship("ABTest", back_populates="workspace")
    approvals = relationship("Approval", back_populates="workspace")
    post_analytics = relationship("PostAnalytics", back_populates="workspace")
    campaign_analytics = relationship("CampaignAnalytics", back_populates="workspace")
    post_library = relationship("PostLibrary", back_populates="workspace")
    oauth_states = relationship("OAuthState", back_populates="workspace")
    credential_audit_logs = relationship("CredentialAuditLog", back_populates="workspace")
    content_threads = relationship("ContentThread", back_populates="workspace")
    activity_logs = relationship("ActivityLog", back_populates="workspace")
    audit_logs = relationship("AuditLog", back_populates="workspace")
