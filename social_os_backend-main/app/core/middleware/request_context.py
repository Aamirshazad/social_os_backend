"""
Request Context - Matches Next.js pattern exactly
"""
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel

from app.models.enums import UserRole


class RequestContext(BaseModel):
    """Request context matching Next.js pattern"""
    
    # User information
    userId: str
    userEmail: str
    userRole: UserRole
    workspaceId: str
    
    # User object (full user data)
    user: Dict[str, Any]
    
    # Workspace object (full workspace data)  
    workspace: Dict[str, Any]
    
    # Request metadata
    requestId: str
    timestamp: datetime
    ipAddress: Optional[str] = None
    userAgent: Optional[str] = None
    
    class Config:
        use_enum_values = True
