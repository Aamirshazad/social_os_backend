"""
Workspace Member model - User membership in workspaces
"""
from sqlalchemy import Column, String, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class MemberRole(str, enum.Enum):
    """Member roles in workspace"""
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


class WorkspaceMember(BaseModel):
    """Workspace member model"""
    
    __tablename__ = "workspace_members"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role = Column(SQLEnum(MemberRole), nullable=False, default=MemberRole.EDITOR)
    
    # Relationships
    workspace = relationship("Workspace")
    user = relationship("User")
