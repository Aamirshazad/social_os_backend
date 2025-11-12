"""
Authentication Service - User authentication operations
"""
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

from app.models.user import User
from app.core.security import verify_password
from app.core.exceptions import AuthenticationError

logger = structlog.get_logger()


class AuthenticationService:
    """Service for user authentication operations"""
    
    @staticmethod
    async def authenticate_user(
        db: AsyncSession, 
        email: str, 
        password: str
    ) -> User:
        """
        Authenticate user with email and password
        
        Args:
            db: Async database session
            email: User email
            password: User password
        
        Returns:
            User object
        
        Raises:
            AuthenticationError: If credentials are invalid
        """
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if not user:
            logger.warning("authentication_failed", email=email, reason="user_not_found")
            raise AuthenticationError("Invalid email or password")
        
        if not verify_password(password, user.hashed_password):
            logger.warning("authentication_failed", email=email, reason="invalid_password")
            raise AuthenticationError("Invalid email or password")
        
        if not user.is_active:
            logger.warning("authentication_failed", email=email, reason="inactive_account")
            raise AuthenticationError("User account is inactive")
        
        logger.info("user_authenticated", user_id=str(user.id), email=email)
        return user
    
    @staticmethod
    async def verify_user_credentials(
        db: AsyncSession,
        user_id: str
    ) -> Optional[User]:
        """
        Verify user exists and is active
        
        Args:
            db: Async database session
            user_id: User ID
        
        Returns:
            User object if valid, None otherwise
        """
        try:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            
            if user and user.is_active:
                return user
            
            return None
            
        except Exception as e:
            logger.error("credential_verification_error", error=str(e), user_id=user_id)
            return None
