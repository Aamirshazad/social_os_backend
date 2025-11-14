"""
Workspace API - Matches Next.js pattern exactly
GET /api/workspace - Get workspace details
PATCH /api/workspace - Update workspace (admin)
DELETE /api/workspace - Delete workspace (admin)

All operations use Supabase HTTP for data access.
"""
from typing import Optional, Dict, Any
from fastapi import APIRouter, Request, HTTPException, Depends, status
from pydantic import BaseModel
import structlog

from app.core.auth_helper import verify_auth_and_get_user, require_admin_role
from app.core.supabase import get_supabase_service_client

logger = structlog.get_logger()
router = APIRouter()

class UpdateWorkspaceRequest(BaseModel):
    """Workspace update request schema"""
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    max_users: Optional[int] = None
    settings: Optional[Dict[str, Any]] = None

@router.get("/workspace")
async def get_workspace(
    request: Request
):
    """
    GET /api/workspace
    Get current workspace details
    
    Authentication: Required
    Authorization: Any authenticated user
    """
    try:
        # Use centralized auth helper to verify token and get user/workspace
        user_id, user_data = await verify_auth_and_get_user(request)
        workspace_id = user_data["workspace_id"]

        # Get workspace from Supabase
        supabase = get_supabase_service_client()
        response = supabase.table("workspaces").select("*").eq("id", workspace_id).maybe_single().execute()
        
        workspace_row = getattr(response, "data", None)
        if not workspace_row:
            raise HTTPException(status_code=404, detail="Workspace not found")

        # Transform to response format
        workspace_data = {
            "id": workspace_row.get("id"),
            "name": workspace_row.get("name"),
            "description": workspace_row.get("description"),
            "logo_url": workspace_row.get("logo_url"),
            "max_users": workspace_row.get("max_users"),
            "settings": workspace_row.get("settings"),
            "is_active": workspace_row.get("is_active"),
            "created_at": workspace_row.get("created_at"),
            "updated_at": workspace_row.get("updated_at")
        }

        logger.info("workspace_fetched", workspace_id=workspace_id, user_id=user_id)
        return workspace_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_workspace_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get workspace")

@router.patch("/workspace")
async def update_workspace(
    request: Request,
    update_data: UpdateWorkspaceRequest
):
    """
    PATCH /api/workspace
    Update workspace settings (admin only)
    
    Authentication: Required
    Authorization: Admin role only
    """
    try:
        # Use auth helper to ensure admin role and get workspace context
        admin_id, admin_data = await require_admin_role(request)
        workspace_id = admin_data["workspace_id"]

        supabase = get_supabase_service_client()

        # Get workspace from Supabase
        get_response = supabase.table("workspaces").select("*").eq("id", workspace_id).maybe_single().execute()
        workspace_row = getattr(get_response, "data", None)

        if not workspace_row:
            raise HTTPException(status_code=404, detail="Workspace not found")

        # Update fields
        update_fields = update_data.dict(exclude_unset=True)
        if not update_fields:
            # No fields to update, return current workspace
            workspace_data = {
                "id": workspace_row.get("id"),
                "name": workspace_row.get("name"),
                "description": workspace_row.get("description"),
                "logo_url": workspace_row.get("logo_url"),
                "max_users": workspace_row.get("max_users"),
                "settings": workspace_row.get("settings"),
                "is_active": workspace_row.get("is_active"),
                "created_at": workspace_row.get("created_at"),
                "updated_at": workspace_row.get("updated_at")
            }
            return workspace_data

        # Update in Supabase
        update_response = supabase.table("workspaces").update(update_fields).eq("id", workspace_id).select("*").maybe_single().execute()
        
        error = getattr(update_response, "error", None)
        if error:
            logger.error("update_workspace_error", error=str(error), workspace_id=workspace_id)
            raise HTTPException(status_code=500, detail="Failed to update workspace")

        updated_row = getattr(update_response, "data", None)
        if not updated_row:
            raise HTTPException(status_code=500, detail="Failed to update workspace")

        # Transform to response format
        workspace_data = {
            "id": updated_row.get("id"),
            "name": updated_row.get("name"),
            "description": updated_row.get("description"),
            "logo_url": updated_row.get("logo_url"),
            "max_users": updated_row.get("max_users"),
            "settings": updated_row.get("settings"),
            "is_active": updated_row.get("is_active"),
            "created_at": updated_row.get("created_at"),
            "updated_at": updated_row.get("updated_at")
        }

        logger.info(
            "workspace_updated",
            workspace_id=workspace_id,
            updated_fields=list(update_fields.keys()),
            user_id=admin_id)
        return workspace_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error("update_workspace_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update workspace")

@router.delete("/workspace")
async def delete_workspace(
    request: Request
):
    """
    DELETE /api/workspace
    Delete/deactivate workspace (admin only)
    
    Authentication: Required
    Authorization: Admin role only
    """
    try:
        # Use auth helper to ensure admin role and get workspace context
        admin_id, admin_data = await require_admin_role(request)
        workspace_id = admin_data["workspace_id"]

        supabase = get_supabase_service_client()

        # Get workspace from Supabase
        get_response = supabase.table("workspaces").select("*").eq("id", workspace_id).maybe_single().execute()
        workspace_row = getattr(get_response, "data", None)

        if not workspace_row:
            raise HTTPException(status_code=404, detail="Workspace not found")

        # Deactivate workspace instead of hard delete
        update_response = supabase.table("workspaces").update({"is_active": False}).eq("id", workspace_id).execute()
        
        error = getattr(update_response, "error", None)
        if error:
            logger.error("delete_workspace_error", error=str(error), workspace_id=workspace_id)
            raise HTTPException(status_code=500, detail="Failed to delete workspace")

        logger.info("workspace_deleted", workspace_id=workspace_id, user_id=admin_id)
        return {"message": "Workspace deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("delete_workspace_error", error=str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete workspace")
