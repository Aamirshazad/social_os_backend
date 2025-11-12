"""
Workspace Service - Workspace management operations
"""
from typing import List, Optional
from sqlalchemy.orm import Session
import structlog

from app.models.workspace import Workspace
from app.core.exceptions import NotFoundError, AuthorizationError

logger = structlog.get_logger()


class WorkspaceService:
    """Service for workspace operations"""
    
    @staticmethod
    def get_workspace_by_id(db: Session, workspace_id: str) -> Workspace:
        """
        Get workspace by ID
        
        Args:
            db: Database session
            workspace_id: Workspace ID
        
        Returns:
            Workspace object
        
        Raises:
            NotFoundError: If workspace not found
        """
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not workspace:
            raise NotFoundError("Workspace")
        return workspace
    
    @staticmethod
    def get_user_workspaces(db: Session, user_id: str) -> List[Workspace]:
        """
        Get all workspaces for a user
        
        Args:
            db: Database session
            user_id: User ID
        
        Returns:
            List of workspaces
        """
        workspaces = db.query(Workspace).filter(
            Workspace.owner_id == user_id,
            Workspace.is_active == True
        ).all()
        
        return workspaces
    
    @staticmethod
    def create_workspace(
        db: Session,
        name: str,
        slug: str,
        owner_id: str
    ) -> Workspace:
        """
        Create a new workspace
        
        Args:
            db: Database session
            name: Workspace name
            slug: Workspace slug
            owner_id: Owner user ID
        
        Returns:
            Created workspace
        """
        workspace = Workspace(
            name=name,
            slug=slug,
            owner_id=owner_id,
            is_active=True
        )
        
        db.add(workspace)
        db.commit()
        db.refresh(workspace)
        
        logger.info("workspace_created", workspace_id=str(workspace.id), owner_id=owner_id)
        return workspace
    
    @staticmethod
    def verify_workspace_access(
        db: Session,
        workspace_id: str,
        user_id: str
    ) -> bool:
        """
        Verify user has access to workspace
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            user_id: User ID
        
        Returns:
            True if user has access
        
        Raises:
            AuthorizationError: If user doesn't have access
        """
        workspace = WorkspaceService.get_workspace_by_id(db, workspace_id)
        
        if str(workspace.owner_id) != user_id:
            raise AuthorizationError("You don't have access to this workspace")
        
        return True
