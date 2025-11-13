"""
Credential Audit Log model - Matches Next.js schema exactly
Tracks credential-related operations for security auditing
"""
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class CredentialAuditLog(BaseModel):
    """Credential audit log model matching Next.js schema"""
    
    __tablename__ = "credential_audit_log"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    credential_type = Column(String, nullable=False)
    status = Column(String, nullable=False)
    error_message = Column(String, nullable=True)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="credential_audit_logs")
    user = relationship("User", back_populates="credential_audit_logs")
