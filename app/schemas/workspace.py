"""
Workspace schemas
"""
from datetime import datetime
from pydantic import BaseModel


class WorkspaceBase(BaseModel):
    """Base workspace schema"""
    name: str
    slug: str


class WorkspaceResponse(WorkspaceBase):
    """Workspace response schema"""
    id: str
    owner_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
