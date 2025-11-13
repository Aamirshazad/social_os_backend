"""
Workspace Invites API endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr, Field

from app.database import get_async_db
from app.core.auth_helper import verify_auth_and_get_user, require_admin_role
from app.models.workspace_invite import WorkspaceInvite
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


@router.get("", response_model=List[InviteResponse])
async def get_invites(
    include_expired: bool = Query(False),
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(require_role("admin")),  # ✅ REQUIRE ADMIN ROLE
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get all pending invites for workspace
    
    Requires admin role
    """
    try:
        # Query invites from database
        query = db.query(WorkspaceInvite).filter(
            WorkspaceInvite.workspace_id == workspace_id
        )
        
        # Filter out expired invites if requested
        if not include_expired:
            from datetime import datetime
            query = query.filter(WorkspaceInvite.expires_at > datetime.utcnow())
        
        invites = query.order_by(WorkspaceInvite.created_at.desc()).all()
        
        # Add invite URL to each
        from app.config import settings
        base_url = settings.FRONTEND_URL
        
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
        logger.error("get_invites_error", error=str(e), workspace_id=workspace_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve invites"
        )


@router.post("", response_model=InviteResponse, status_code=201)
async def create_invite(
    request: CreateInviteRequest,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(require_role("admin")),  # ✅ REQUIRE ADMIN ROLE
    db: AsyncSession = Depends(get_async_db)
):
    """
    Create a new workspace invitation
    
    Requires admin role
    """
    try:
        from app.config import settings
        
        # Create invite
        invite = WorkspaceInvite(
            workspace_id=workspace_id,
            email=request.email,
            token=WorkspaceInvite.generate_token(),
            role=request.role,
            invited_by=user_id,
            expires_at=WorkspaceInvite.calculate_expiry(request.expires_in_days)
        )
        
        db.add(invite)
        db.commit()
        db.refresh(invite)
        
        logger.info("invite_created", invite_id=str(invite.id), email=request.email, role=request.role)
        
        return {
            "id": str(invite.id),
            "email": invite.email,
            "token": invite.token,
            "role": invite.role,
            "invited_by": str(invite.invited_by),
            "expires_at": invite.expires_at.isoformat() if invite.expires_at else None,
            "created_at": invite.created_at.isoformat(),
            "invite_url": f"{settings.FRONTEND_URL}/invite/{invite.token}"
        }
    except Exception as e:
        logger.error("create_invite_error", error=str(e), workspace_id=workspace_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create invitation"
        )


@router.post("/{token}/accept")
async def accept_invite(
    token: str,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Accept a workspace invitation
    """
    try:
        member = InviteService.accept_invite(
            db=db,
            token=token,
            user_id=user_id
        )
        
        logger.info("invite_accepted", user_id=user_id)
        
        return {
            "success": True,
            "message": "Invitation accepted successfully",
            "workspace_id": str(member.workspace_id),
            "role": member.role.value
        }
        
    except Exception as e:
        logger.error("accept_invite_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


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
    InviteService.revoke_invite(
        db=db,
        invite_id=invite_id,
        workspace_id=workspace_id
    )
    
    # Log activity
    ActivityService.log_activity(
        db=db,
        workspace_id=workspace_id,
        user_id=user_id,
        action="invite_revoked",
        entity_type="invite",
        entity_id=invite_id
    )
    
    logger.info("invite_revoked", invite_id=invite_id)
    
    return None
