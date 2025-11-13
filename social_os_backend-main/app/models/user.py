"""
User model - Matches Supabase database schema
Note: User authentication is handled by Supabase, this model reflects the actual DB structure
"""
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel
from app.models.enums import UserRole


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
    ab_tests = relationship("ABTest", foreign_keys="ABTest.created_by", back_populates="creator")
    requested_approvals = relationship("Approval", foreign_keys="Approval.requested_by", back_populates="requester")
    approved_approvals = relationship("Approval", foreign_keys="Approval.approved_by", back_populates="approver")
    post_content_changes = relationship("PostContent", foreign_keys="PostContent.changed_by", back_populates="changed_by_user")
    library_posts = relationship("PostLibrary", foreign_keys="PostLibrary.created_by", back_populates="creator")
    credential_audit_logs = relationship("CredentialAuditLog", foreign_keys="CredentialAuditLog.user_id", back_populates="user")
    audit_logs = relationship("AuditLog", foreign_keys="AuditLog.user_id", back_populates="user")
    content_threads = relationship("ContentThread", foreign_keys="ContentThread.created_by", back_populates="creator")
