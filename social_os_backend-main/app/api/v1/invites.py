"""
Workspace Invites API endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

from app.database import get_async_db
from app.core.auth_helper import verify_auth_and_get_user, require_admin_role
from app.models.workspace_invite import WorkspaceInvite
from app.models.workspace import Workspace
from app.models.user import User
from app.models.enums import UserRole
# TODO: InviteService and ActivityService need to be implemented
# from app.application.services.invite_service import InviteService
# from app.application.services.activity_service import ActivityService
import structlog

logger = structlog.get_logger()
router = APIRouter()


class CreateInviteRequest(BaseModel):
    """Request schema for creating an invite"""
    email: Optional[EmailStr] = None
    role: str = Field(..., pattern="^(admin|editor|viewer)$")
    expires_in_days: int = Field(default=7, ge=1, le=365)


class InviteResponse(BaseModel):
    """Response schema for invite"""
    id: str
    email: Optional[str]
    token: str
    role: str
    invited_by: str
    expires_at: str
    created_at: str
    invite_url: str
    
    class Config:
        from_attributes = True


class AcceptInviteRequest(BaseModel):
    """Request schema for accepting an invite via JSON body"""
    token: str


@router.get("", response_model=List[InviteResponse])
async def get_invites(
    request: Request,
    include_expired: bool = Query(False),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get all pending invites for workspace
    
    Requires admin role
    """
    try:
        # Verify authentication and require admin role
        user_id, user_data = await require_admin_role(request, db)
        workspace_id = user_data["workspace_id"]
        
        # Query invites from database (async)
        query = select(WorkspaceInvite).filter(
            WorkspaceInvite.workspace_id == workspace_id
        )
        
        # Filter out expired invites if requested
        if not include_expired:
            query = query.filter(WorkspaceInvite.expires_at > datetime.utcnow())
        
        result = await db.execute(query.order_by(WorkspaceInvite.created_at.desc()))
        invites = result.scalars().all()
        
        # Add invite URL to each
        from app.config import settings
        base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        
        return [
            {
                "id": str(invite.id),
                "email": invite.email,
                "token": invite.token,
                "role": invite.role,
                "invited_by": str(invite.invited_by),
                "expires_at": invite.expires_at.isoformat() if invite.expires_at else None,
                "created_at": invite.created_at.isoformat(),
                "invite_url": f"{base_url}/invite/{invite.token}"
            }
            for invite in invites
        ]
    except Exception as e:
        logger.error("get_invites_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve invites"
        )


@router.post("", response_model=InviteResponse, status_code=201)
async def create_invite(
    invite_request: CreateInviteRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Create a new workspace invitation
    
    Requires admin role
    """
    try:
        # Verify authentication and require admin role
        user_id, user_data = await require_admin_role(request, db)
        workspace_id = user_data["workspace_id"]
        
        from app.config import settings
        
        # Use WorkspaceInvite helpers and enum for role/expiry
        try:
            invite_role = UserRole(invite_request.role)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid role value")

        invite = WorkspaceInvite(
            workspace_id=workspace_id,
            email=invite_request.email,
            token=WorkspaceInvite.generate_token(),
            role=invite_role,
            invited_by=user_id,
            expires_at=WorkspaceInvite.calculate_expiry(invite_request.expires_in_days),
        )
        
        db.add(invite)
        await db.commit()
        await db.refresh(invite)
        
        logger.info("invite_created", invite_id=str(invite.id), email=invite_request.email, role=invite_request.role)
        
        base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        
        return {
            "id": str(invite.id),
            "email": invite.email,
            "token": invite.token,
            "role": invite.role,
            "invited_by": str(invite.invited_by),
            "expires_at": invite.expires_at.isoformat() if invite.expires_at else None,
            "created_at": invite.created_at.isoformat(),
            "invite_url": f"{base_url}/invite/{invite.token}"
        }
    except Exception as e:
        logger.error("create_invite_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create invitation"
        )


@router.get("/{token}")
async def validate_invite(
    token: str,
    db: AsyncSession = Depends(get_async_db)
):
    """Validate an invite token and return metadata (public endpoint)."""
    try:
        result = await db.execute(
            select(WorkspaceInvite, Workspace)
            .join(Workspace, WorkspaceInvite.workspace_id == Workspace.id)
            .where(WorkspaceInvite.token == token)
        )
        row = result.first()
        if not row:
            raise HTTPException(status_code=404, detail="Invitation not found")

        invite, workspace = row

        is_expired = invite.is_expired()

        return {
            "workspace_id": str(invite.workspace_id),
            "workspace_name": workspace.name,
            "email": invite.email,
            "role": invite.role.value if hasattr(invite.role, "value") else str(invite.role),
            "expires_at": invite.expires_at.isoformat() if invite.expires_at else None,
            "is_expired": is_expired,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("validate_invite_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate invitation"
        )


@router.post("/{token}/accept")
async def accept_invite(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Accept a workspace invitation
    """
    try:
        # Verify authentication and get user data
        user_id, user_data = await verify_auth_and_get_user(request, db)
        
        # Look up invite by token
        result = await db.execute(
            select(WorkspaceInvite).where(WorkspaceInvite.token == token)
        )
        invite = result.scalar_one_or_none()
        
        if not invite:
            raise HTTPException(status_code=404, detail="Invitation not found")
        
        if invite.is_expired():
            raise HTTPException(status_code=400, detail="Invitation has expired")
        
        if invite.is_accepted:
            raise HTTPException(status_code=400, detail="Invitation has already been accepted")
        
        # Assign user to workspace and role
        user_result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found in database")
        
        # Update user's workspace and role to match invite
        user.workspace_id = invite.workspace_id
        user.role = invite.role
        
        # Mark invite as accepted
        invite.is_accepted = True
        invite.accepted_at = datetime.utcnow()
        invite.accepted_by_user_id = user.id
        invite.used_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(user)
        await db.refresh(invite)
        
        logger.info(
            "invite_accepted",
            user_id=user_id,
            workspace_id=str(invite.workspace_id),
            role=invite.role.value if hasattr(invite.role, "value") else str(invite.role),
        )
        
        return {
            "success": True,
            "message": "Invitation accepted",
            "workspace_id": str(invite.workspace_id),
            "role": invite.role.value if hasattr(invite.role, "value") else str(invite.role),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("accept_invite_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/accept")
async def accept_invite_body(
    payload: AcceptInviteRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """Accept a workspace invitation using JSON body with token (alias)."""
    return await accept_invite(payload.token, request, db)


@router.delete("/{invite_id}", status_code=204)
async def revoke_invite(
    invite_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Revoke (delete) an invitation
    
    Requires admin role
    """
    try:
        # Verify authentication and require admin role
        user_id, user_data = await require_admin_role(request, db)
        workspace_id = user_data["workspace_id"]
        
        # Find invite belonging to this workspace
        result = await db.execute(
            select(WorkspaceInvite).where(
                WorkspaceInvite.id == invite_id,
                WorkspaceInvite.workspace_id == workspace_id,
            )
        )
        invite = result.scalar_one_or_none()
        
        if not invite:
            raise HTTPException(status_code=404, detail="Invitation not found")
        
        await db.delete(invite)
        await db.commit()
        
        logger.info("invite_revoked", invite_id=invite_id, workspace_id=workspace_id)
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("revoke_invite_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
