"""
Token Service - JWT token operations
"""
from typing import Dict, Any, Optional
import structlog

from app.models.user import User
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.core.exceptions import AuthenticationError

logger = structlog.get_logger()


class TokenService:
    """Service for JWT token operations"""
    
    @staticmethod
    def create_tokens(user: User, workspace_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Create access and refresh tokens for user
        
        Args:
            user: User object
            workspace_id: Optional workspace ID
        
        Returns:
            Dictionary containing tokens
        """
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "workspace_id": workspace_id
        }
        
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        logger.info("tokens_created", user_id=str(user.id))
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
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
            New token pair
        
        Raises:
            AuthenticationError: If refresh token is invalid
        """
        try:
            payload = decode_token(refresh_token)
            
            # Verify token type
            if payload.get("type") != "refresh":
                raise AuthenticationError("Invalid token type")
            
            # Create new tokens
            token_data = {
                "sub": payload.get("sub"),
                "email": payload.get("email"),
                "workspace_id": payload.get("workspace_id")
            }
            
            access_token = create_access_token(token_data)
            new_refresh_token = create_refresh_token(token_data)
            
            logger.info("tokens_refreshed", user_id=payload.get("sub"))
            
            return {
                "access_token": access_token,
                "refresh_token": new_refresh_token,
                "token_type": "bearer"
            }
            
        except Exception as e:
            logger.warning("token_refresh_failed", error=str(e))
            raise AuthenticationError("Invalid refresh token")
