"""
Workspace Service - Workspace management operations
"""
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import structlog

from app.models.workspace import Workspace
from app.models.user import User
from app.core.exceptions import NotFoundError, DuplicateError

logger = structlog.get_logger()


class WorkspaceService:
    """Service for workspace management operations"""
    
    @staticmethod
    async def get_user_workspaces_async(
        db: AsyncSession,
        user_id: str
    ) -> List[Workspace]:
        """
        Get all workspaces for a user (async version)
        
        Args:
            db: Async database session
            user_id: User ID
        
        Returns:
            List of user's workspaces
        """
        try:
            result = await db.execute(
                select(Workspace).where(Workspace.owner_id == user_id)
            )
            workspaces = result.scalars().all()
            return list(workspaces)
            
        except Exception as e:
            logger.error("get_user_workspaces_error", error=str(e), user_id=user_id)
            return []
    
    @staticmethod
    def create_workspace(
        db: Session,
        owner_id: str,
        name: str,
        description: Optional[str] = None,
        is_default: bool = False
    ) -> Workspace:
        """
        Create a new workspace
        
        Args:
            db: Database session
            owner_id: Owner user ID
            name: Workspace name
            description: Optional description
            is_default: Whether this is the default workspace
        
        Returns:
            Created Workspace object
        """
        try:
            # Check if workspace name already exists for user
            existing = db.query(Workspace).filter(
                and_(
                    Workspace.owner_id == owner_id,
                    Workspace.name == name
                )
            ).first()
            
            if existing:
                raise DuplicateError(f"Workspace '{name}' already exists")
            
            # If this is set as default, unset other defaults
            if is_default:
                db.query(Workspace).filter(
                    and_(
                        Workspace.owner_id == owner_id,
                        Workspace.is_default == True
                    )
                ).update({"is_default": False})
            
            workspace = Workspace(
                owner_id=owner_id,
                name=name,
                description=description,
                is_default=is_default
            )
            
            db.add(workspace)
            db.commit()
            db.refresh(workspace)
            
            logger.info("workspace_created", 
                       workspace_id=str(workspace.id), 
                       name=name, 
                       owner_id=owner_id)
            
            return workspace
            
        except Exception as e:
            db.rollback()
            logger.error("workspace_creation_error", error=str(e))
            raise
    
    @staticmethod
    def get_workspace(
        db: Session,
        workspace_id: str,
        user_id: str
    ) -> Workspace:
        """
        Get workspace by ID (with user ownership check)
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            user_id: User ID (for ownership verification)
        
        Returns:
            Workspace object
        
        Raises:
            NotFoundError: If workspace not found or user doesn't have access
        """
        workspace = db.query(Workspace).filter(
            and_(
                Workspace.id == workspace_id,
                Workspace.owner_id == user_id
            )
        ).first()
        
        if not workspace:
            raise NotFoundError(f"Workspace {workspace_id} not found or access denied")
        
        return workspace
    
    @staticmethod
    def get_user_workspaces(
        db: Session,
        user_id: str
    ) -> List[Workspace]:
        """
        Get all workspaces for a user
        
        Args:
            db: Database session
            user_id: User ID
        
        Returns:
            List of user's workspaces
        """
        try:
            workspaces = db.query(Workspace).filter(
                Workspace.owner_id == user_id
            ).order_by(Workspace.is_default.desc(), Workspace.created_at).all()
            
            return workspaces
            
        except Exception as e:
            logger.error("get_user_workspaces_error", error=str(e), user_id=user_id)
            return []
    
    @staticmethod
    def update_workspace(
        db: Session,
        workspace_id: str,
        user_id: str,
        **updates
    ) -> Workspace:
        """
        Update workspace
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            user_id: User ID (for ownership verification)
            **updates: Fields to update
        
        Returns:
            Updated Workspace object
        
        Raises:
            NotFoundError: If workspace not found
        """
        workspace = WorkspaceService.get_workspace(db, workspace_id, user_id)
        
        # Handle default workspace logic
        if updates.get("is_default") == True:
            # Unset other defaults for this user
            db.query(Workspace).filter(
                and_(
                    Workspace.owner_id == user_id,
                    Workspace.id != workspace_id,
                    Workspace.is_default == True
                )
            ).update({"is_default": False})
        
        # Apply updates
        for field, value in updates.items():
            if hasattr(workspace, field):
                setattr(workspace, field, value)
        
        db.commit()
        db.refresh(workspace)
        
        logger.info("workspace_updated", 
                   workspace_id=workspace_id, 
                   updates=list(updates.keys()))
        
        return workspace
    
    @staticmethod
    def delete_workspace(
        db: Session,
        workspace_id: str,
        user_id: str
    ) -> bool:
        """
        Delete workspace
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            user_id: User ID (for ownership verification)
        
        Returns:
            True if deleted successfully
        
        Raises:
            NotFoundError: If workspace not found
        """
        workspace = WorkspaceService.get_workspace(db, workspace_id, user_id)
        
        # Don't allow deletion of default workspace if it's the only one
        if workspace.is_default:
            user_workspace_count = db.query(Workspace).filter(
                Workspace.owner_id == user_id
            ).count()
            
            if user_workspace_count == 1:
                raise ValueError("Cannot delete the only workspace")
        
        db.delete(workspace)
        db.commit()
        
        logger.info("workspace_deleted", workspace_id=workspace_id)
        return True
    
    @staticmethod
    def get_default_workspace(
        db: Session,
        user_id: str
    ) -> Optional[Workspace]:
        """
        Get user's default workspace
        
        Args:
            db: Database session
            user_id: User ID
        
        Returns:
            Default workspace or None
        """
        try:
            workspace = db.query(Workspace).filter(
                and_(
                    Workspace.owner_id == user_id,
                    Workspace.is_default == True
                )
            ).first()
            
            return workspace
            
        except Exception as e:
            logger.error("get_default_workspace_error", error=str(e), user_id=user_id)
            return None
