"""
Authentication Service - User authentication and session management
"""
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import structlog

from app.models.user import User
from app.models.workspace import Workspace
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token
from app.core.exceptions import AuthenticationError, NotFoundError, DuplicateError
from app.config import settings

logger = structlog.get_logger()


class AuthService:
    """Service for authentication operations"""
    
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> User:
        """
        Authenticate user with email and password
        
        Args:
            db: Database session
            email: User email
            password: User password
        
        Returns:
            User object
        
        Raises:
            AuthenticationError: If credentials are invalid
        """
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            raise AuthenticationError("Invalid email or password")
        
        if not verify_password(password, user.hashed_password):
            raise AuthenticationError("Invalid email or password")
        
        if not user.is_active:
            raise AuthenticationError("User account is inactive")
        
        logger.info("user_authenticated", email=email, user_id=str(user.id))
        return user
    
    @staticmethod
    def create_user(
        db: Session,
        email: str,
        password: str,
        full_name: Optional[str] = None
    ) -> User:
        """
        Create a new user
        
        Args:
            db: Database session
            email: User email
            password: User password
            full_name: User full name
        
        Returns:
            Created user
        
        Raises:
            DuplicateError: If user already exists
        """
        # Check if user exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            raise DuplicateError("User with this email")
        
        # Create user
        user = User(
            email=email,
            hashed_password=get_password_hash(password),
            full_name=full_name,
            is_active=True
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create default workspace
        workspace = Workspace(
            name=f"{email}'s Workspace",
            slug=f"workspace-{user.id}",
            owner_id=user.id,
            is_active=True
        )
        
        db.add(workspace)
        db.commit()
        
        logger.info("user_created", email=email, user_id=str(user.id))
        return user
    
    @staticmethod
    def create_tokens(user: User, workspace_id: Optional[str] = None) -> Dict[str, str]:
        """
        Create access and refresh tokens for user
        
        Args:
            user: User object
            workspace_id: Optional workspace ID
        
        Returns:
            Dictionary with access_token and refresh_token
        """
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "workspace_id": workspace_id
        }
        
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> User:
        """
        Get user by ID
        
        Args:
            db: Database session
            user_id: User ID
        
        Returns:
            User object
        
        Raises:
            NotFoundError: If user not found
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundError("User")
        return user
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """
        Get user by email
        
        Args:
            db: Database session
            email: User email
        
        Returns:
            User object or None
        """
        return db.query(User).filter(User.email == email).first()
