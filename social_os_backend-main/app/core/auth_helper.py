"""
Authentication Helper - Centralized auth functions for all endpoints
Replaces old middleware and dependencies with simple Supabase auth
"""
from typing import Dict, Any, Tuple
from fastapi import Request, HTTPException
import structlog

from app.application.services.auth.authentication_service import AuthenticationService
from app.core.supabase import get_supabase_service_client

logger = structlog.get_logger()


async def verify_auth_and_get_user(request: Request) -> Tuple[str, Dict[str, Any]]:
    """
    Verify Supabase token and get user data from database
    
    Args:
        request: FastAPI request object
        
    Returns:
        Tuple of (user_id, user_data) where user_data contains workspace_id and role
        
    Raises:
        HTTPException: If authentication fails
    """
    try:
        # Extract token from Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=401, 
                detail="Missing or invalid authorization header"
            )
        
        token = auth_header.split(" ")[1]
        
        # Verify token with Supabase
        supabase = AuthenticationService.get_supabase()
        user_response = supabase.auth.get_user(token)

        # Handle case where Supabase client returns None or user is missing
        if user_response is None or user_response.user is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired token"
            )

        user = user_response.user
        user_id = str(user.id)
        
        # Get user data from database
        supabase_service = get_supabase_service_client()
        response = supabase_service.table("users").select(
            "workspace_id, role, is_active, full_name"
        ).eq("id", user_id).maybe_single().execute()

        db_user = getattr(response, "data", None)

        if not db_user:
            raise HTTPException(
                status_code=404, 
                detail="User not found in database"
            )
        
        user_data = {
            "id": user_id,
            "email": user.email,
            "workspace_id": str(db_user.get("workspace_id")),
            "role": db_user.get("role"),
            "is_active": db_user.get("is_active"),
            "full_name": db_user.get("full_name"),
        }
        
        return user_id, user_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("auth_verification_failed", error=str(e))
        raise HTTPException(
            status_code=500, 
            detail="Authentication verification failed"
        )


async def require_admin_role(request: Request) -> Tuple[str, Dict[str, Any]]:
    """
    Verify authentication and require admin role
    
    Args:
        request: FastAPI request object
        
    Returns:
        Tuple of (user_id, user_data)
        
    Raises:
        HTTPException: If authentication fails or user is not admin
    """
    user_id, user_data = await verify_auth_and_get_user(request)
    
    if user_data["role"] != "admin":
        raise HTTPException(
            status_code=403, 
            detail="Admin access required"
        )
    
    return user_id, user_data


async def require_editor_or_admin_role(request: Request) -> Tuple[str, Dict[str, Any]]:
    """
    Verify authentication and require editor or admin role
    
    Args:
        request: FastAPI request object
        
    Returns:
        Tuple of (user_id, user_data)
        
    Raises:
        HTTPException: If authentication fails or user doesn't have required role
    """
    user_id, user_data = await verify_auth_and_get_user(request)
    
    if user_data["role"] not in ["admin", "editor"]:
        raise HTTPException(
            status_code=403, 
            detail="Editor or admin access required"
        )
    
    return user_id, user_data
