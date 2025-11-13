"""
Workspace Members API endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_async_db
from app.core.auth_helper import verify_auth_and_get_user, require_admin_role
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
    request: Request,
    role: Optional[str] = Query(None, pattern="^(admin|editor|viewer)$"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get all members in the workspace
    
    Query Parameters:
    - role: Filter by role (optional)
    """
    # Verify authentication and get user data
    user_id, user_data = await verify_auth_and_get_user(request, db)
    workspace_id = user_data["workspace_id"]
    
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
