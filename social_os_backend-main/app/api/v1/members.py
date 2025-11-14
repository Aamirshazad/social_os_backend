"""
Workspace Members API endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_async_db
from app.core.auth_helper import verify_auth_and_get_user, require_admin_role
from app.models.user import User
from app.models.enums import UserRole
import structlog

logger = structlog.get_logger()
router = APIRouter()


class MemberResponse(BaseModel):
    """Response schema for workspace member"""
    id: str
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    role: str
    created_at: str
    workspace_id: str
    
    class Config:
        from_attributes = True


class UpdateMemberRoleRequest(BaseModel):
    """Request schema for updating a member's role"""
    role: str


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

    # Base query: all active users in this workspace
    query = select(User).where(
        User.workspace_id == workspace_id,
        User.is_active == True  # noqa: E712
    )

    # Optional role filter
    if role:
        try:
            role_enum = UserRole(role)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid role value")
        query = query.where(User.role == role_enum)

    result = await db.execute(query.order_by(User.created_at))
    members = result.scalars().all()

    return [
        {
            "id": str(member.id),
            "email": member.email,
            "full_name": member.full_name,
            "avatar_url": member.avatar_url,
            "role": member.role.value if hasattr(member.role, "value") else str(member.role),
            "created_at": member.created_at.isoformat(),
            "workspace_id": str(member.workspace_id),
        }
        for member in members
    ]


@router.delete("/{member_id}", status_code=204)
async def remove_member(
    member_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """Remove a member from the workspace (admin only). Performs a soft delete via is_active flag."""
    admin_id, admin_data = await require_admin_role(request, db)
    workspace_id = admin_data["workspace_id"]

    # Find the member in this workspace
    result = await db.execute(
        select(User).where(
            User.id == member_id,
            User.workspace_id == workspace_id,
        )
    )
    member = result.scalar_one_or_none()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    member_role_value = member.role.value if hasattr(member.role, "value") else str(member.role)

    # Prevent removing the last active admin in workspace
    if member_role_value == "admin":
        admins_result = await db.execute(
            select(User).where(
                User.workspace_id == workspace_id,
                User.is_active == True,  # noqa: E712
                User.role == UserRole.ADMIN,
            )
        )
        admins = admins_result.scalars().all()
        if len(admins) <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove the last admin in workspace")

    member.is_active = False
    await db.commit()

    return None


@router.put("/{member_id}/role", response_model=MemberResponse)
async def update_member_role(
    member_id: str,
    payload: UpdateMemberRoleRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """Update a member's role in the workspace (admin only)."""
    admin_id, admin_data = await require_admin_role(request, db)
    workspace_id = admin_data["workspace_id"]

    try:
        new_role = UserRole(payload.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role value")

    result = await db.execute(
        select(User).where(
            User.id == member_id,
            User.workspace_id == workspace_id,
        )
    )
    member = result.scalar_one_or_none()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    current_role_value = member.role.value if hasattr(member.role, "value") else str(member.role)

    # Prevent demoting the last active admin
    if current_role_value == "admin" and new_role != UserRole.ADMIN:
        admins_result = await db.execute(
            select(User).where(
                User.workspace_id == workspace_id,
                User.is_active == True,  # noqa: E712
                User.role == UserRole.ADMIN,
            )
        )
        admins = admins_result.scalars().all()
        if len(admins) <= 1:
            raise HTTPException(status_code=400, detail="Cannot demote the last admin in workspace")

    member.role = new_role
    await db.commit()
    await db.refresh(member)

    return {
        "id": str(member.id),
        "email": member.email,
        "full_name": member.full_name,
        "avatar_url": member.avatar_url,
        "role": member.role.value if hasattr(member.role, "value") else str(member.role),
        "created_at": member.created_at.isoformat(),
        "workspace_id": str(member.workspace_id),
    }
