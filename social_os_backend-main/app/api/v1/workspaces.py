"""
Workspace API - Matches Next.js pattern exactly
GET /api/workspace - Get workspace details
PATCH /api/workspace - Update workspace (admin)
DELETE /api/workspace - Delete workspace (admin)
"""
from typing import Optional, Dict, Any
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, ValidationError
import structlog

from app.database import get_async_db
from app.models.workspace import Workspace
from app.core.auth_helper import verify_auth_and_get_user, require_admin_role

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
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    GET /api/workspace
    Get current workspace details
    
    Authentication: Required
    Authorization: Any authenticated user
    """
    try:
        # Use centralized auth helper to verify token and get user/workspace
        user_id, user_data = await verify_auth_and_get_user(request, db)
        workspace_id = user_data["workspace_id"]

        # Get workspace from database
        result = await db.execute(
            select(Workspace).where(Workspace.id == workspace_id)
        )
        workspace = result.scalar_one_or_none()

        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")

        # Transform to response format
        workspace_data = {
            "id": str(workspace.id),
            "name": workspace.name,
            "description": workspace.description,
            "logo_url": workspace.logo_url,
            "max_users": workspace.max_users,
            "settings": workspace.settings,
            "is_active": workspace.is_active,
            "created_at": workspace.created_at.isoformat(),
            "updated_at": workspace.updated_at.isoformat()
        }

        logger.info("workspace_fetched", workspace_id=str(workspace.id), user_id=user_id)
        return workspace_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_workspace_error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get workspace")


@router.patch("/workspace")
async def update_workspace(
    request: Request,
    update_data: UpdateWorkspaceRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    PATCH /api/workspace
    Update workspace settings (admin only)
    
    Authentication: Required
    Authorization: Admin role only
    """
    try:
        # Use auth helper to ensure admin role and get workspace context
        admin_id, admin_data = await require_admin_role(request, db)
        workspace_id = admin_data["workspace_id"]

        # Get workspace from database
        result = await db.execute(
            select(Workspace).where(Workspace.id == workspace_id)
        )
        workspace = result.scalar_one_or_none()

        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")

        # Update fields
        update_fields = update_data.dict(exclude_unset=True)
        for field, value in update_fields.items():
            setattr(workspace, field, value)

        await db.commit()
        await db.refresh(workspace)

        # Transform to response format
        workspace_data = {
            "id": str(workspace.id),
            "name": workspace.name,
            "description": workspace.description,
            "logo_url": workspace.logo_url,
            "max_users": workspace.max_users,
            "settings": workspace.settings,
            "is_active": workspace.is_active,
            "created_at": workspace.created_at.isoformat(),
            "updated_at": workspace.updated_at.isoformat()
        }

        logger.info(
            "workspace_updated",
            workspace_id=str(workspace.id),
            updated_fields=list(update_fields.keys()),
            user_id=admin_id,
        )
        return workspace_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error("update_workspace_error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to update workspace")


@router.delete("/workspace")
async def delete_workspace(
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    DELETE /api/workspace
    Delete/deactivate workspace (admin only)
    
    Authentication: Required
    Authorization: Admin role only
    """
    try:
        # Use auth helper to ensure admin role and get workspace context
        admin_id, admin_data = await require_admin_role(request, db)
        workspace_id = admin_data["workspace_id"]

        # Get workspace from database
        result = await db.execute(
            select(Workspace).where(Workspace.id == workspace_id)
        )
        workspace = result.scalar_one_or_none()

        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")

        # Deactivate workspace instead of hard delete
        workspace.is_active = False
        await db.commit()

        logger.info("workspace_deleted", workspace_id=str(workspace.id), user_id=admin_id)
        return {"message": "Workspace deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("delete_workspace_error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to delete workspace")
