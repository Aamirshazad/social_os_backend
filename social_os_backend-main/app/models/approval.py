"""
Approval model - Matches Supabase database schema
"""
from sqlalchemy import Column, Text, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey
import enum

from app.models.base import BaseModel


class ApprovalStatus(enum.Enum):
    """Approval status enum"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Approval(BaseModel):
    """Approval model matching Supabase schema"""
    
    __tablename__ = "approvals"
    
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id"), nullable=False)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    requested_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING)
    comment = Column(Text, nullable=True)
    
    # Relationships
    post = relationship("Post", back_populates="approvals")
    workspace = relationship("Workspace", back_populates="approvals")
    requester = relationship("User", foreign_keys=[requested_by], back_populates="requested_approvals")
    approver = relationship("User", foreign_keys=[approved_by], back_populates="approved_approvals")
