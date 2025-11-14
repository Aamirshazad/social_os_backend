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
        
        # TODO: Implement WorkspaceInvite.generate_token() and calculate_expiry()
        # For now, create a simple invite placeholder
        import uuid
        import secrets
        from datetime import timedelta
        
        invite = WorkspaceInvite(
            workspace_id=workspace_id,
            email=invite_request.email,
            token=secrets.token_urlsafe(32),
            role=invite_request.role,
            invited_by=user_id,
            expires_at=datetime.utcnow() + timedelta(days=invite_request.expires_in_days)
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
        
        # TODO: Implement InviteService.accept_invite
        # For now, return a placeholder response
        # member = InviteService.accept_invite(
        #     db=db,
        #     token=token,
        #     user_id=user_id
        # )
        
        logger.info("invite_accept_placeholder", user_id=user_id, token=token)
        
        return {
            "success": True,
            "message": "Invite acceptance service not yet implemented",
            "workspace_id": user_data["workspace_id"],
            "role": "viewer"
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
    try:
        # Verify authentication and require admin role
        user_id, user_data = await require_admin_role(request, db)
        workspace_id = user_data["workspace_id"]
        
        # TODO: Implement InviteService.revoke_invite and ActivityService.log_activity
        # For now, return a placeholder response
        # InviteService.revoke_invite(
        #     db=db,
        #     invite_id=invite_id,
        #     workspace_id=workspace_id
        # )
        
        # Log activity
        # ActivityService.log_activity(
        #     db=db,
        #     workspace_id=workspace_id,
        #     user_id=user_id,
        #     action="invite_revoked",
        #     entity_type="invite",
        #     entity_id=invite_id
        # )
        
        logger.info("invite_revoke_placeholder", invite_id=invite_id, workspace_id=workspace_id)
        
        return None
        
    except Exception as e:
        logger.error("revoke_invite_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
