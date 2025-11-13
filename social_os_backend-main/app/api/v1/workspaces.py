"""
Workspace API endpoints
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.dependencies import get_current_active_user
from app.application.services.workspace.workspace_service import WorkspaceService
from app.schemas.workspace import WorkspaceResponse
import structlog

logger = structlog.get_logger()
router = APIRouter()


@router.get("", response_model=List[WorkspaceResponse])
async def get_workspaces(
    current_user: dict = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get all workspaces for the current user
    """
    workspaces = WorkspaceService.get_user_workspaces(
        db=db,
        user_id=current_user["id"]
    )
    
    return workspaces


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get a specific workspace by ID
    """
    # Verify access
    WorkspaceService.verify_workspace_access(
        db=db,
        workspace_id=workspace_id,
        user_id=current_user["id"]
    )
    
    workspace = WorkspaceService.get_workspace_by_id(db, workspace_id)
    
    return workspace
