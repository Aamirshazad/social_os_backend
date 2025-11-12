"""
Workspace Invites API endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field

from app.database import get_db
from app.dependencies import get_current_active_user, get_workspace_id
from app.services.invite_service import InviteService
from app.services.activity_service import ActivityService
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
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all pending invites for workspace
    
    Requires admin role
    """
    invites = InviteService.get_workspace_invites(
        db=db,
        workspace_id=workspace_id,
        include_expired=include_expired
    )
    
    # Add invite URL to each
    from app.config import settings
    base_url = settings.FRONTEND_URL
    
    return [
        {
            **invite.__dict__,
            "expires_at": invite.expires_at.isoformat(),
            "created_at": invite.created_at.isoformat(),
            "invite_url": f"{base_url}/invite/{invite.token}"
        }
        for invite in invites
    ]


@router.post("", response_model=InviteResponse, status_code=201)
async def create_invite(
    request: CreateInviteRequest,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a new workspace invitation
    
    Requires admin role
    """
    invite = InviteService.create_invite(
        db=db,
        workspace_id=workspace_id,
        invited_by=current_user["id"],
        role=request.role,
        email=request.email,
        expires_in_days=request.expires_in_days
    )
    
    # Log activity
    ActivityService.log_activity(
        db=db,
        workspace_id=workspace_id,
        user_id=current_user["id"],
        action="invite_created",
        entity_type="invite",
        entity_id=str(invite.id),
        details={"role": request.role, "email": request.email}
    )
    
    logger.info("invite_created", invite_id=str(invite.id))
    
    from app.config import settings
    
    return {
        **invite.__dict__,
        "expires_at": invite.expires_at.isoformat(),
        "created_at": invite.created_at.isoformat(),
        "invite_url": f"{settings.FRONTEND_URL}/invite/{invite.token}"
    }


@router.post("/{token}/accept")
async def accept_invite(
    token: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Accept a workspace invitation
    """
    try:
        member = InviteService.accept_invite(
            db=db,
            token=token,
            user_id=current_user["id"]
        )
        
        logger.info("invite_accepted", user_id=current_user["id"])
        
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
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
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
        user_id=current_user["id"],
        action="invite_revoked",
        entity_type="invite",
        entity_id=invite_id
    )
    
    logger.info("invite_revoked", invite_id=invite_id)
    
    return None
