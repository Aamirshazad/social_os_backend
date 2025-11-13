"""
Dependency injection functions for FastAPI
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import decode_token
from app.core.exceptions import AuthenticationError
import structlog

logger = structlog.get_logger()

# Security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> dict:
    """
    Get the current authenticated user from JWT token
    
    Args:
        credentials: HTTP Bearer token
        db: Database session
    
    Returns:
        User information from token
    
    Raises:
        AuthenticationError: If token is invalid or user not found
    """
    token = credentials.credentials
    
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise AuthenticationError("Invalid token: missing user ID")
        
        # Verify token type
        token_type = payload.get("type")
        if token_type != "access":
            raise AuthenticationError("Invalid token type")
        
        # Here you would typically fetch the user from the database
        # For now, return the payload
        return {
            "id": user_id,
            "email": payload.get("email"),
            "workspace_id": payload.get("workspace_id"),
        }
        
    except AuthenticationError:
        raise
    except Exception as e:
        logger.error("token_validation_error", error=str(e))
        raise AuthenticationError("Could not validate credentials")


async def get_current_active_user(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Get the current active user
    
    Args:
        current_user: Current user from token
    
    Returns:
        Active user information
    
    Raises:
        AuthenticationError: If user is inactive
    """
    # Add logic to check if user is active
    # if not current_user.get("is_active"):
    #     raise AuthenticationError("Inactive user")
    
    return current_user


async def get_workspace_id(
    current_user: dict = Depends(get_current_active_user)
) -> str:
    """
    Get the current user's workspace ID
    
    Args:
        current_user: Current user from token
    
    Returns:
        Workspace ID
    
    Raises:
        AuthenticationError: If workspace ID is missing
    """
    workspace_id = current_user.get("workspace_id")
    if not workspace_id:
        raise AuthenticationError("No workspace associated with user")
    
    return workspace_id


def require_role(*required_roles: str):
    """
    Dependency to require specific roles
    
    Args:
        required_roles: List of required roles
    
    Returns:
        Dependency function
    """
    async def role_checker(current_user: dict = Depends(get_current_active_user)):
        user_role = current_user.get("role", "user")
        if user_role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    
    return role_checker
