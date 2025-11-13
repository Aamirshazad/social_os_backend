"""
Token Service - JWT token operations
"""
from typing import Dict, Any, Optional
from datetime import datetime
import structlog

from app.models.user import User
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.core.exceptions import AuthenticationError

logger = structlog.get_logger()


class TokenService:
    """Service for JWT token operations"""
    
    @staticmethod
    def create_tokens(user, workspace_id: Optional[str] = None, role: Optional[str] = None) -> Dict[str, Any]:
        """
        Create access and refresh tokens for user
        
        Args:
            user: User object (can be Supabase user or SQLAlchemy User)
            workspace_id: Optional workspace ID
            role: User's role in workspace (admin, editor, viewer)
        
        Returns:
            Dictionary containing tokens and user info
        """
        # Handle both Supabase user objects and SQLAlchemy User objects
        user_id = getattr(user, 'id', None) or getattr(user, 'user_id', None)
        user_email = getattr(user, 'email', None)
        user_full_name = getattr(user, 'full_name', None)
        user_avatar = getattr(user, 'avatar_url', None)
        
        if not user_id:
            logger.error("no_user_id_found", user_object=str(user))
            raise ValueError("User ID not found in user object")
        
        # Create token payload with role
        token_data = {
            "sub": str(user_id),
            "email": user_email,
            "workspace_id": workspace_id,
            "role": role
        }
        
        logger.info("token_data_created", user_id=str(user_id), role=role, workspace_id=workspace_id)
        
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        logger.info("tokens_created", user_id=str(user_id), token_length=len(access_token) if access_token else 0)
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": str(user_id),
                "email": user_email,
                "full_name": user_full_name,
                "avatar_url": user_avatar
            },
            "workspace_id": workspace_id,
            "role": role
        }
    
    @staticmethod
    def verify_token(token: str) -> Dict[str, Any]:
        """
        Verify and decode JWT token
        
        Args:
            token: JWT token string
        
        Returns:
            Token payload
        
        Raises:
            AuthenticationError: If token is invalid
        """
        try:
            payload = decode_token(token)
            return payload
        except Exception as e:
            logger.warning("token_verification_failed", error=str(e))
            raise AuthenticationError("Invalid token")
    
    @staticmethod
    def refresh_tokens(refresh_token: str) -> Dict[str, Any]:
        """
        Create new tokens using refresh token
        
        Args:
            refresh_token: Refresh token string
        
        Returns:
            New token pair with role
        
        Raises:
            AuthenticationError: If refresh token is invalid
        """
        try:
            payload = decode_token(refresh_token)
            
            # Verify token type
            if payload.get("type") != "refresh":
                raise AuthenticationError("Invalid token type")
            
            # Create new tokens with role
            token_data = {
                "sub": payload.get("sub"),
                "email": payload.get("email"),
                "workspace_id": payload.get("workspace_id"),
                "role": payload.get("role")
            }
            
            access_token = create_access_token(token_data)
            new_refresh_token = create_refresh_token(token_data)
            
            logger.info("tokens_refreshed", user_id=payload.get("sub"), role=payload.get("role"))
            
            return {
                "access_token": access_token,
                "refresh_token": new_refresh_token,
                "token_type": "bearer"
            }
            
        except Exception as e:
            logger.warning("token_refresh_failed", error=str(e))
            raise AuthenticationError("Invalid refresh token")
    
    @staticmethod
    def is_token_expired(token: str, buffer_minutes: int = 5) -> bool:
        """
        Check if token is expired or will expire within buffer time
        
        Args:
            token: JWT token string
            buffer_minutes: Minutes before expiry to consider token as expired
        
        Returns:
            True if token is expired or will expire soon
        """
        try:
            payload = decode_token(token)
            exp_timestamp = payload.get("exp")
            
            if not exp_timestamp:
                return True
            
            # Convert to datetime
            exp_time = datetime.fromtimestamp(exp_timestamp)
            current_time = datetime.utcnow()
            
            # Check if token expires within buffer time
            buffer_time = current_time.timestamp() + (buffer_minutes * 60)
            return exp_timestamp <= buffer_time
            
        except Exception:
            # If we can't decode the token, consider it expired
            return True
