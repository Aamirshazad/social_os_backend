"""
Campaign model
"""
from sqlalchemy import Column, String, ARRAY, ForeignKey, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Campaign(BaseModel):
    """Campaign model for organizing posts"""
    
    __tablename__ = "campaigns"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    name = Column(String(200), nullable=False)
    goals = Column(ARRAY(String), nullable=False)
    platforms = Column(ARRAY(String), nullable=False)
    
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    
    target_audience = Column(String(500), nullable=True)
    budget = Column(Float, nullable=True)
    status = Column(String(50), nullable=False, default="active")
    
    # Relationships
    workspace = relationship("Workspace")
    creator = relationship("User")
