"""
Content Thread Model - Chat conversation threads
"""
from sqlalchemy import Column, String, Text, DateTime, Boolean, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.models.base import BaseModel


class ContentThread(BaseModel):
    """Content thread for storing chat conversations"""
    
    __tablename__ = "content_threads"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    title = Column(String(255), nullable=False, default="New Chat")
    messages = Column(JSON, nullable=False, default=list)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="content_threads")
    creator = relationship("User")
    
    def __repr__(self):
        return f"<ContentThread {self.id}: {self.title}>"
    
    @property
    def is_deleted(self) -> bool:
        """Check if thread is soft deleted"""
        return self.deleted_at is not None
    
    def soft_delete(self):
        """Soft delete the thread"""
        self.deleted_at = datetime.utcnow()
    
    def restore(self):
        """Restore soft deleted thread"""
        self.deleted_at = None
