"""
Registration Service - User registration operations
"""
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

from app.models.user import User
from app.models.workspace import Workspace
from app.core.security import get_password_hash
from app.core.exceptions import DuplicateError

logger = structlog.get_logger()


class RegistrationService:
    """Service for user registration operations"""
    
    @staticmethod
    async def create_user(
        db: AsyncSession,
        email: str,
        password: str,
        full_name: str
    ) -> User:
        """
        Create a new user account
        
        Args:
            db: Async database session
            email: User email
            password: User password
            full_name: User's full name
        
        Returns:
            Created User object
        
        Raises:
            DuplicateError: If user with email already exists
        """
        # Check if user already exists
        result = await db.execute(select(User).where(User.email == email))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            logger.warning("user_registration_failed", email=email, reason="email_exists")
            raise DuplicateError(f"User with email {email} already exists")
        
        # Create new user
        hashed_password = get_password_hash(password)
        user = User(
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            is_active=True
        )
        
        db.add(user)
        await db.flush()  # Get the user ID
        
        # Create default workspace for user
        workspace = Workspace(
            name=f"{full_name}'s Workspace",
            owner_id=user.id,
            is_default=True
        )
        
        db.add(workspace)
        await db.commit()
        await db.refresh(user)
        
        logger.info("user_created", user_id=str(user.id), email=email)
        return user
    
    @staticmethod
    async def get_user_by_email(
        db: AsyncSession,
        email: str
    ) -> Optional[User]:
        """
        Get user by email address
        
        Args:
            db: Async database session
            email: User email
        
        Returns:
            User object if found, None otherwise
        """
        try:
            result = await db.execute(select(User).where(User.email == email))
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error("get_user_by_email_error", error=str(e), email=email)
            return None
    
    @staticmethod
    async def get_user_by_id(
        db: AsyncSession,
        user_id: str
    ) -> Optional[User]:
        """
        Get user by ID
        
        Args:
            db: Async database session
            user_id: User ID
        
        Returns:
            User object if found, None otherwise
        """
        try:
            result = await db.execute(select(User).where(User.id == user_id))
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error("get_user_by_id_error", error=str(e), user_id=user_id)
            return None
