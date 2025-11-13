"""
Workspace Invite model - Pending invitations
"""
from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
import secrets

from app.models.base import BaseModel


class WorkspaceInvite(BaseModel):
    """Workspace invite model"""
    
    __tablename__ = "workspace_invites"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    email = Column(String(255), nullable=True)
    token = Column(String(255), nullable=False, unique=True, index=True)
    role = Column(String(50), nullable=False, default="editor")
    invited_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    
    # Relationships
    workspace = relationship("Workspace")
    inviter = relationship("User", foreign_keys=[invited_by])
    
    @staticmethod
    def generate_token() -> str:
        """Generate a secure random token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def calculate_expiry(days: int = 7) -> datetime:
        """Calculate expiration date"""
        return datetime.utcnow() + timedelta(days=days)
    
    def is_expired(self) -> bool:
        """Check if invite is expired"""
        return datetime.utcnow() > self.expires_at
    
    def is_accepted(self) -> bool:
        """Check if invite was accepted"""
        return self.accepted_at is not None
