"""
Credential model for storing OAuth tokens
"""
from sqlalchemy import Column, String, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Credential(BaseModel):
    """Credential model for OAuth tokens"""
    
    __tablename__ = "credentials"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    platform = Column(String(50), nullable=False)
    
    # Encrypted OAuth tokens
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(String(50), nullable=True)
    
    # Platform-specific data
    platform_user_id = Column(String(255), nullable=True)
    platform_username = Column(String(255), nullable=True)
    scopes = Column(JSONB, nullable=True)
    additional_data = Column(JSONB, nullable=True)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="credentials")
