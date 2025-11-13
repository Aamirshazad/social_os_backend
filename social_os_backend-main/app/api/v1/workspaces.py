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
from app.application.services.auth.authentication_service import AuthenticationService

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
        # Extract and verify token
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
        
        token = auth_header.split(" ")[1]
        supabase = AuthenticationService.get_supabase()
        user_response = supabase.auth.get_user(token)
        
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        user_id = str(user_response.user.id)
        
        # Get user's workspace from database
        from app.models.user import User
        user_result = await db.execute(
            select(User).where(User.id == user_id)
        )
        db_user = user_result.scalar_one_or_none()
        
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get workspace from database
        result = await db.execute(
            select(Workspace).where(Workspace.id == db_user.workspace_id)
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
        # Extract and verify token
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
        
        token = auth_header.split(" ")[1]
        supabase = AuthenticationService.get_supabase()
        user_response = supabase.auth.get_user(token)
        
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        user_id = str(user_response.user.id)
        
        # Get user and check admin role
        from app.models.user import User
        user_result = await db.execute(
            select(User).where(User.id == user_id)
        )
        db_user = user_result.scalar_one_or_none()
        
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check admin permission
        user_role = db_user.role.value if hasattr(db_user.role, 'value') else str(db_user.role)
        if user_role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get workspace from database
        result = await db.execute(
            select(Workspace).where(Workspace.id == db_user.workspace_id)
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
        
        logger.info("workspace_updated", workspace_id=str(workspace.id), updated_fields=list(update_fields.keys()), user_id=user_id)
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
        # Extract and verify token
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
        
        token = auth_header.split(" ")[1]
        supabase = AuthenticationService.get_supabase()
        user_response = supabase.auth.get_user(token)
        
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        user_id = str(user_response.user.id)
        
        # Get user and check admin role
        from app.models.user import User
        user_result = await db.execute(
            select(User).where(User.id == user_id)
        )
        db_user = user_result.scalar_one_or_none()
        
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check admin permission
        user_role = db_user.role.value if hasattr(db_user.role, 'value') else str(db_user.role)
        if user_role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get workspace from database
        result = await db.execute(
            select(Workspace).where(Workspace.id == db_user.workspace_id)
        )
        workspace = result.scalar_one_or_none()
        
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        # Deactivate workspace instead of hard delete
        workspace.is_active = False
        await db.commit()
        
        logger.info("workspace_deleted", workspace_id=str(workspace.id), user_id=user_id)
        return {"message": "Workspace deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("delete_workspace_error", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to delete workspace")
