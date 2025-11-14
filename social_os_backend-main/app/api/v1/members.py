"""
Workspace Members API endpoints - Using Supabase HTTP for all data operations
"""
from typing import List, Optional
from fastapi import APIRouter, Query, Request, HTTPException, status
from pydantic import BaseModel

from app.core.auth_helper import verify_auth_and_get_user, require_admin_role
from app.core.supabase import get_supabase_service_client
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
    role: Optional[str] = Query(None, pattern="^(admin|editor|viewer)$")
):
    """
    Get all members in the workspace
    
    Query Parameters:
    - role: Filter by role (optional)
    """
    try:
        # Verify authentication and get user data
        user_id, user_data = await verify_auth_and_get_user(request)
        workspace_id = user_data["workspace_id"]

        # Query members from Supabase
        supabase = get_supabase_service_client()
        response = supabase.table("users").select("*").eq("workspace_id", workspace_id).eq("is_active", True).execute()
        
        rows = getattr(response, "data", None) or []
        
        # Optional role filter
        if role:
            if role not in ["admin", "editor", "viewer"]:
                raise HTTPException(status_code=400, detail="Invalid role value")
            rows = [r for r in rows if r.get("role") == role]
        
        # Sort by created_at
        rows = sorted(rows, key=lambda r: r.get("created_at", ""))

        return [
            {
                "id": row.get("id"),
                "email": row.get("email"),
                "full_name": row.get("full_name"),
                "avatar_url": row.get("avatar_url"),
                "role": row.get("role"),
                "created_at": row.get("created_at"),
                "workspace_id": row.get("workspace_id"),
            }
            for row in rows
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_members_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve members")


@router.delete("/{member_id}", status_code=204)
async def remove_member(
    member_id: str,
    request: Request
):
    """Remove a member from the workspace (admin only). Performs a soft delete via is_active flag."""
    try:
        admin_id, admin_data = await require_admin_role(request)
        workspace_id = admin_data["workspace_id"]

        supabase = get_supabase_service_client()

        # Find the member in this workspace
        member_response = supabase.table("users").select("*").eq("id", member_id).eq("workspace_id", workspace_id).maybe_single().execute()
        member_row = getattr(member_response, "data", None)

        if not member_row:
            raise HTTPException(status_code=404, detail="Member not found")

        member_role_value = member_row.get("role")

        # Prevent removing the last active admin in workspace
        if member_role_value == "admin":
            admins_response = supabase.table("users").select("id").eq("workspace_id", workspace_id).eq("is_active", True).eq("role", "admin").execute()
            admins = getattr(admins_response, "data", None) or []
            if len(admins) <= 1:
                raise HTTPException(status_code=400, detail="Cannot remove the last admin in workspace")

        # Soft delete: set is_active to False
        update_response = supabase.table("users").update({"is_active": False}).eq("id", member_id).execute()
        
        error = getattr(update_response, "error", None)
        if error:
            logger.error("remove_member_error", error=str(error), member_id=member_id)
            raise HTTPException(status_code=500, detail="Failed to remove member")

        logger.info("member_removed", member_id=member_id, workspace_id=workspace_id)
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error("remove_member_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to remove member")


@router.put("/{member_id}/role", response_model=MemberResponse)
async def update_member_role(
    member_id: str,
    payload: UpdateMemberRoleRequest,
    request: Request
):
    """Update a member's role in the workspace (admin only)."""
    try:
        admin_id, admin_data = await require_admin_role(request)
        workspace_id = admin_data["workspace_id"]

        # Validate new role
        if payload.role not in ["admin", "editor", "viewer"]:
            raise HTTPException(status_code=400, detail="Invalid role value")

        supabase = get_supabase_service_client()

        # Find the member in this workspace
        member_response = supabase.table("users").select("*").eq("id", member_id).eq("workspace_id", workspace_id).maybe_single().execute()
        member_row = getattr(member_response, "data", None)

        if not member_row:
            raise HTTPException(status_code=404, detail="Member not found")

        current_role_value = member_row.get("role")

        # Prevent demoting the last active admin
        if current_role_value == "admin" and payload.role != "admin":
            admins_response = supabase.table("users").select("id").eq("workspace_id", workspace_id).eq("is_active", True).eq("role", "admin").execute()
            admins = getattr(admins_response, "data", None) or []
            if len(admins) <= 1:
                raise HTTPException(status_code=400, detail="Cannot demote the last admin in workspace")

        # Update member role
        update_response = supabase.table("users").update({"role": payload.role}).eq("id", member_id).select("*").maybe_single().execute()
        
        error = getattr(update_response, "error", None)
        if error:
            logger.error("update_member_role_error", error=str(error), member_id=member_id)
            raise HTTPException(status_code=500, detail="Failed to update member role")

        updated_row = getattr(update_response, "data", None)
        if not updated_row:
            raise HTTPException(status_code=500, detail="Failed to update member role")

        logger.info("member_role_updated", member_id=member_id, workspace_id=workspace_id, new_role=payload.role)

        return {
            "id": updated_row.get("id"),
            "email": updated_row.get("email"),
            "full_name": updated_row.get("full_name"),
            "avatar_url": updated_row.get("avatar_url"),
            "role": updated_row.get("role"),
            "created_at": updated_row.get("created_at"),
            "workspace_id": updated_row.get("workspace_id"),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("update_member_role_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update member role")
