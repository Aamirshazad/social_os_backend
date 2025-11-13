"""
Workspace model
"""
from sqlalchemy import Column, String, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Workspace(BaseModel):
    """Workspace model"""
    
    __tablename__ = "workspaces"
    
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="workspaces")
    posts = relationship("Post", back_populates="workspace")
    credentials = relationship("Credential", back_populates="workspace")
