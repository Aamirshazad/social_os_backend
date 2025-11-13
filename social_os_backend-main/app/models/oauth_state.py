"""
OAuth State and Credential Audit models - Matches Supabase database schema
"""
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Enum
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


class OAuthState(BaseModel):
    """OAuth state model matching Supabase schema"""
    
    __tablename__ = "oauth_states"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    platform = Column(Enum(Platform), nullable=False)
    state = Column(String, nullable=False, unique=True)
    code_challenge = Column(String, nullable=True)
    code_challenge_method = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    is_used = Column(Boolean, default=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="oauth_states")


# CredentialAuditLog moved to credential_audit_log.py
