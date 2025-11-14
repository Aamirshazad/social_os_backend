"""
Workspace Invites API endpoints - Using Supabase HTTP for all data operations
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timedelta
import secrets
import structlog

from app.core.auth_helper import verify_auth_and_get_user, require_admin_role
from app.core.supabase import get_supabase_service_client
from app.config import settings

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
    include_expired: bool = Query(False)
):
    """
    Get all pending invites for workspace
    
    Requires admin role
    """
    try:
        # Verify authentication and require admin role
        user_id, user_data = await require_admin_role(request)
        workspace_id = user_data["workspace_id"]
        
        # Query invites from Supabase
        supabase = get_supabase_service_client()
        response = supabase.table("workspace_invites").select("*").eq("workspace_id", workspace_id).execute()
        
        rows = getattr(response, "data", None) or []
        
        # Filter out expired invites if requested
        now = datetime.utcnow()
        if not include_expired:
            rows = [r for r in rows if r.get("expires_at") and datetime.fromisoformat(r["expires_at"].replace("Z", "+00:00")) > now]
        
        # Sort by created_at descending
        rows = sorted(rows, key=lambda r: r.get("created_at", ""), reverse=True)
        
        base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        
        return [
            {
                "id": row.get("id"),
                "email": row.get("email"),
                "token": row.get("token"),
                "role": row.get("role"),
                "invited_by": row.get("invited_by"),
                "expires_at": row.get("expires_at"),
                "created_at": row.get("created_at"),
                "invite_url": f"{base_url}/invite/{row.get('token')}"
            }
            for row in rows
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
    request: Request
):
    """
    Create a new workspace invitation
    
    Requires admin role
    """
    try:
        # Verify authentication and require admin role
        user_id, user_data = await require_admin_role(request)
        workspace_id = user_data["workspace_id"]
        
        # Validate role
        if invite_request.role not in ["admin", "editor", "viewer"]:
            raise HTTPException(status_code=400, detail="Invalid role value")
        
        # Generate token and calculate expiry
        token = secrets.token_urlsafe(32)
        expires_at = (datetime.utcnow() + timedelta(days=invite_request.expires_in_days)).isoformat()
        
        # Insert invite into Supabase
        supabase = get_supabase_service_client()
        payload = {
            "workspace_id": workspace_id,
            "email": invite_request.email,
            "token": token,
            "role": invite_request.role,
            "invited_by": user_id,
            "expires_at": expires_at,
        }
        
        response = supabase.table("workspace_invites").insert(payload).select("*").maybe_single().execute()
        
        error = getattr(response, "error", None)
        if error:
            logger.error("create_invite_error", error=str(error), workspace_id=workspace_id)
            raise HTTPException(status_code=500, detail="Failed to create invitation")
        
        row = getattr(response, "data", None)
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create invitation")
        
        logger.info("invite_created", invite_id=row.get("id"), email=invite_request.email, role=invite_request.role)
        
        base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        
        return {
            "id": row.get("id"),
            "email": row.get("email"),
            "token": row.get("token"),
            "role": row.get("role"),
            "invited_by": row.get("invited_by"),
            "expires_at": row.get("expires_at"),
            "created_at": row.get("created_at"),
            "invite_url": f"{base_url}/invite/{row.get('token')}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_invite_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create invitation"
        )

@router.get("/{token}")
async def validate_invite(
    token: str
):
    """Validate an invite token and return metadata (public endpoint)."""
    try:
        supabase = get_supabase_service_client()
        
        # Get invite by token
        invite_response = supabase.table("workspace_invites").select("*").eq("token", token).maybe_single().execute()
        invite_row = getattr(invite_response, "data", None)
        
        if not invite_row:
            raise HTTPException(status_code=404, detail="Invitation not found")
        
        # Get workspace details
        workspace_response = supabase.table("workspaces").select("name").eq("id", invite_row.get("workspace_id")).maybe_single().execute()
        workspace_row = getattr(workspace_response, "data", None)
        
        if not workspace_row:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        # Check if expired
        expires_at_str = invite_row.get("expires_at")
        is_expired = False
        if expires_at_str:
            expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
            is_expired = expires_at < datetime.utcnow()
        
        return {
            "workspace_id": invite_row.get("workspace_id"),
            "workspace_name": workspace_row.get("name"),
            "email": invite_row.get("email"),
            "role": invite_row.get("role"),
            "expires_at": invite_row.get("expires_at"),
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
    request: Request
):
    """
    Accept a workspace invitation
    """
    try:
        # Verify authentication and get user data
        user_id, user_data = await verify_auth_and_get_user(request)
        
        supabase = get_supabase_service_client()
        
        # Look up invite by token
        invite_response = supabase.table("workspace_invites").select("*").eq("token", token).maybe_single().execute()
        invite_row = getattr(invite_response, "data", None)
        
        if not invite_row:
            raise HTTPException(status_code=404, detail="Invitation not found")
        
        # Check if expired
        expires_at_str = invite_row.get("expires_at")
        if expires_at_str:
            expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
            if expires_at < datetime.utcnow():
                raise HTTPException(status_code=400, detail="Invitation has expired")
        
        if invite_row.get("is_accepted"):
            raise HTTPException(status_code=400, detail="Invitation has already been accepted")
        
        # Update user in Supabase: set workspace_id and role
        workspace_id = invite_row.get("workspace_id")
        role = invite_row.get("role")
        
        user_update_response = supabase.table("users").update({
            "workspace_id": workspace_id,
            "role": role
        }).eq("id", user_id).execute()
        
        user_error = getattr(user_update_response, "error", None)
        if user_error:
            logger.error("accept_invite_user_update_error", error=str(user_error), user_id=user_id)
            raise HTTPException(status_code=500, detail="Failed to update user")
        
        # Mark invite as accepted
        now = datetime.utcnow().isoformat()
        invite_update_response = supabase.table("workspace_invites").update({
            "is_accepted": True,
            "accepted_at": now,
            "accepted_by_user_id": user_id,
            "used_at": now
        }).eq("id", invite_row.get("id")).execute()
        
        invite_error = getattr(invite_update_response, "error", None)
        if invite_error:
            logger.error("accept_invite_update_error", error=str(invite_error), invite_id=invite_row.get("id"))
            raise HTTPException(status_code=500, detail="Failed to accept invitation")
        
        logger.info(
            "invite_accepted",
            user_id=user_id,
            workspace_id=workspace_id,
            role=role)
        
        return {
            "success": True,
            "message": "Invitation accepted",
            "workspace_id": workspace_id,
            "role": role,
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
    request: Request
):
    """Accept a workspace invitation using JSON body with token (alias)."""
    return await accept_invite(payload.token, request, db)

@router.delete("/{invite_id}", status_code=204)
async def revoke_invite(
    invite_id: str,
    request: Request
):
    """
    Revoke (delete) an invitation
    
    Requires admin role
    """
    try:
        # Verify authentication and require admin role
        user_id, user_data = await require_admin_role(request)
        workspace_id = user_data["workspace_id"]
        
        supabase = get_supabase_service_client()
        
        # Find invite belonging to this workspace
        invite_response = supabase.table("workspace_invites").select("*").eq("id", invite_id).eq("workspace_id", workspace_id).maybe_single().execute()
        invite_row = getattr(invite_response, "data", None)
        
        if not invite_row:
            raise HTTPException(status_code=404, detail="Invitation not found")
        
        # Delete the invite
        delete_response = supabase.table("workspace_invites").delete().eq("id", invite_id).execute()
        
        error = getattr(delete_response, "error", None)
        if error:
            logger.error("revoke_invite_error", error=str(error), invite_id=invite_id)
            raise HTTPException(status_code=500, detail="Failed to revoke invitation")
        
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
