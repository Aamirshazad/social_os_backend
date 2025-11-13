"""
Registration Service - User registration operations using Supabase
"""
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog
import uuid

from app.models.workspace import Workspace
from app.models.user import User, UserRole
from app.core.exceptions import DuplicateError
from app.application.services.auth.authentication_service import AuthenticationService

logger = structlog.get_logger()


class RegistrationService:
    """Service for user registration operations using Supabase"""
    
    @staticmethod
    async def create_user_and_workspace(
        db: AsyncSession,
        user_id: str,
        email: str,
        full_name: Optional[str] = None
    ) -> Optional[str]:
        """
        Create workspace and user record after Supabase registration
        
        Args:
            db: Async database session
            user_id: Supabase user ID
            email: User email
            full_name: User's full name
        
        Returns:
            Created workspace ID or None if failed
        """
        try:
            # Create workspace first
            workspace_name = f"{full_name}'s Workspace" if full_name else f"{email.split('@')[0]}'s Workspace"
            workspace = Workspace(
                name=workspace_name,
                description=f"Personal workspace for {full_name or email}",
                is_active=True
            )
            
            db.add(workspace)
            await db.flush()  # Get workspace ID
            
            # Create user record in database
            user = User(
                id=user_id,  # Use Supabase user ID
                workspace_id=workspace.id,
                email=email,
                full_name=full_name,
                role=UserRole.ADMIN,  # First user in workspace is admin
                is_active=True
            )
            
            db.add(user)
            await db.commit()
            await db.refresh(workspace)
            
            logger.info("user_and_workspace_created", 
                       workspace_id=str(workspace.id), 
                       user_id=user_id, 
                       email=email,
                       role="admin")
            return str(workspace.id)
            
        except Exception as e:
            logger.error("user_workspace_creation_failed", error=str(e), user_id=user_id, email=email)
            await db.rollback()
            return None
    
