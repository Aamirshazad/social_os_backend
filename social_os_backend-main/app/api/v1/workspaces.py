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
from app.core.middleware.auth import create_request_context, require_admin
from app.core.middleware.response_handler import success_response, error_response, validation_error_response
from app.core.middleware.request_context import RequestContext

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
        # Create request context (handles authentication)
        context = await create_request_context(request, db)
        
        # Get workspace from database
        result = await db.execute(
            select(Workspace).where(Workspace.id == context.workspaceId)
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
        
        logger.info("workspace_fetched", workspace_id=context.workspaceId, request_id=context.requestId)
        return success_response(workspace_data)
        
    except HTTPException:
        raise
    except ValidationError as e:
        return validation_error_response(e, context.requestId if 'context' in locals() else None)
    except Exception as e:
        logger.error("get_workspace_error", error=str(e))
        return error_response(e, context.requestId if 'context' in locals() else None)


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
        # Create request context (handles authentication)
        context = await create_request_context(request, db)
        
        # Check admin permission
        require_admin(context)
        
        # Get workspace from database
        result = await db.execute(
            select(Workspace).where(Workspace.id == context.workspaceId)
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
        
        logger.info("workspace_updated", workspace_id=context.workspaceId, updated_fields=list(update_fields.keys()), request_id=context.requestId)
        return success_response(workspace_data)
        
    except HTTPException:
        raise
    except ValidationError as e:
        return validation_error_response(e, context.requestId if 'context' in locals() else None)
    except Exception as e:
        logger.error("update_workspace_error", error=str(e))
        return error_response(e, context.requestId if 'context' in locals() else None)


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
        # Create request context (handles authentication)
        context = await create_request_context(request, db)
        
        # Check admin permission
        require_admin(context)
        
        # Get workspace from database
        result = await db.execute(
            select(Workspace).where(Workspace.id == context.workspaceId)
        )
        workspace = result.scalar_one_or_none()
        
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        # Deactivate workspace instead of hard delete
        workspace.is_active = False
        await db.commit()
        
        logger.info("workspace_deleted", workspace_id=context.workspaceId, request_id=context.requestId)
        return success_response({"message": "Workspace deleted successfully"})
        
    except HTTPException:
        raise
    except ValidationError as e:
        return validation_error_response(e, context.requestId if 'context' in locals() else None)
    except Exception as e:
        logger.error("delete_workspace_error", error=str(e))
        return error_response(e, context.requestId if 'context' in locals() else None)
