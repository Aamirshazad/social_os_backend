"""
Workspace Members API endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.dependencies import get_current_active_user, get_workspace_id
from app.models.workspace_member import WorkspaceMember
import structlog

logger = structlog.get_logger()
router = APIRouter()


class MemberResponse(BaseModel):
    """Response schema for workspace member"""
    id: str
    workspace_id: str
    user_id: str
    role: str
    created_at: str
    
    class Config:
        from_attributes = True


@router.get("", response_model=List[MemberResponse])
async def get_members(
    role: Optional[str] = Query(None, pattern="^(admin|editor|viewer)$"),
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all members in the workspace
    
    Query Parameters:
    - role: Filter by role (optional)
    """
    query = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id
    )
    
    if role:
        query = query.filter(WorkspaceMember.role == role)
    
    members = query.order_by(WorkspaceMember.created_at).all()
    
    return [
        {
            **member.__dict__,
            "created_at": member.created_at.isoformat(),
            "role": member.role.value
        }
        for member in members
    ]
