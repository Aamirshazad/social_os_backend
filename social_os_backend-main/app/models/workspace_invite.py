"""
Workspace Invite model - Matches Supabase workspace_invites table
"""
from datetime import datetime, timedelta
import secrets

from typing import TYPE_CHECKING

from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel
from app.models.enums import UserRole


class WorkspaceInvite(BaseModel):
    """Workspace invite model matching Supabase schema"""
    
    __tablename__ = "workspace_invites"
    
    # Core fields
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    email = Column(String(255), nullable=False)
    invited_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.VIEWER)
    token = Column(String(255), nullable=False, unique=True, index=True)
    
    # Invitation lifecycle
    is_accepted = Column(Boolean, nullable=False, default=False)
    accepted_at = Column(DateTime, nullable=True)
    accepted_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    
    # Relationships
    workspace = relationship("Workspace")
    inviter = relationship("User", foreign_keys=[invited_by])
    accepted_by = relationship("User", foreign_keys=[accepted_by_user_id])

    if TYPE_CHECKING:
        # Hint instance attribute types for static type checking
        is_accepted: bool
    
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
    
    def is_accepted_flag(self) -> bool:
        """Check if invite was accepted (using explicit flag)"""
        return bool(self.is_accepted)
