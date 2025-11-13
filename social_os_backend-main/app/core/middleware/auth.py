"""
Authentication Middleware - Matches Next.js pattern exactly
Handles Supabase auth verification and request context creation
"""
from typing import Optional, Dict, Any
from datetime import datetime
import uuid
from fastapi import Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

from app.database import get_async_db
from app.models.user import User
from app.models.workspace import Workspace
from app.models.enums import UserRole
from app.core.middleware.request_context import RequestContext
from app.core.middleware.response_handler import UnauthorizedError, ForbiddenError
from app.application.services.auth.authentication_service import AuthenticationService

logger = structlog.get_logger()


async def get_auth_user(request: Request) -> Dict[str, Any]:
    """
    Get authenticated user from Supabase session
    Matches Next.js getAuthUser() function
    """
    try:
        # Extract token from Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise UnauthorizedError("Missing or invalid authorization header")
        
        token = auth_header.split(" ")[1]
        
        # Verify token with Supabase using the library directly
        supabase = AuthenticationService.get_supabase()
        
        # Get user from token (matches Next.js pattern)
        user_response = supabase.auth.get_user(token)
        
        if not user_response.user:
            raise UnauthorizedError("Invalid or expired token")
        
        return {
            "id": str(user_response.user.id),
            "email": user_response.user.email,
            "user_metadata": user_response.user.user_metadata
        }
        
    except Exception as e:
        logger.error("auth_user_verification_failed", error=str(e))
        raise UnauthorizedError("Authentication failed")


async def get_user_workspace(user_id: str, db: AsyncSession) -> Dict[str, Any]:
    """
    Get user's workspace info and role from database
    Matches Next.js getUserWorkspace() function
    """
    try:
        # Query user with workspace relationship
        result = await db.execute(
            select(User, Workspace)
            .join(Workspace, User.workspace_id == Workspace.id)
            .where(User.id == user_id)
        )
        
        user_workspace = result.first()
        if not user_workspace:
            raise UnauthorizedError("User not found")
        
        user, workspace = user_workspace
        
        if not user.is_active:
            raise ForbiddenError("User account is inactive")
        
        if not workspace.is_active:
            raise ForbiddenError("Workspace is inactive")
        
        return {
            "user": {
                "id": str(user.id),
                "workspace_id": str(user.workspace_id),
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role.value if hasattr(user.role, 'value') else str(user.role),
                "avatar_url": user.avatar_url,
                "phone": user.phone,
                "is_active": user.is_active,
                "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
                "created_at": user.created_at.isoformat(),
                "updated_at": user.updated_at.isoformat()
            },
            "workspace": {
                "id": str(workspace.id),
                "name": workspace.name,
                "description": workspace.description,
                "logo_url": workspace.logo_url,
                "max_users": workspace.max_users,
                "is_active": workspace.is_active,
                "created_at": workspace.created_at.isoformat(),
                "updated_at": workspace.updated_at.isoformat()
            }
        }
        
    except Exception as e:
        logger.error("user_workspace_query_failed", error=str(e), user_id=user_id)
        raise UnauthorizedError("Failed to get user workspace")


async def create_request_context(
    request: Request,
    db: AsyncSession = Depends(get_async_db)
) -> RequestContext:
    """
    Create request context with auth info
    Matches Next.js createRequestContext() function
    """
    # Generate request ID
    request_id = f"req_{int(datetime.now().timestamp())}_{str(uuid.uuid4())[:8]}"
    
    # Extract request metadata
    ip_address = request.headers.get("x-forwarded-for") or request.headers.get("x-real-ip") or "unknown"
    user_agent = request.headers.get("user-agent") or "unknown"
    
    # Get authenticated user
    auth_user = await get_auth_user(request)
    
    # Get user workspace data
    user_workspace_data = await get_user_workspace(auth_user["id"], db)
    
    user_data = user_workspace_data["user"]
    workspace_data = user_workspace_data["workspace"]
    
    return RequestContext(
        userId=user_data["id"],
        userEmail=user_data["email"],
        userRole=UserRole(user_data["role"]),
        workspaceId=workspace_data["id"],
        user=user_data,
        workspace=workspace_data,
        requestId=request_id,
        timestamp=datetime.now(),
        ipAddress=ip_address,
        userAgent=user_agent
    )


def require_admin(context: RequestContext) -> None:
    """
    Check if user has admin role
    Matches Next.js requireAdmin() function
    """
    if context.userRole != UserRole.ADMIN:
        raise ForbiddenError("Admin role required")


def require_editor(context: RequestContext) -> None:
    """
    Check if user has editor or admin role
    Matches Next.js requireEditor() function
    """
    if context.userRole not in [UserRole.ADMIN, UserRole.EDITOR]:
        raise ForbiddenError("Editor or Admin role required")


def require_role(context: RequestContext, *roles: UserRole) -> None:
    """
    Check multiple permission requirements
    Matches Next.js requireRole() function
    """
    if context.userRole not in roles:
        role_names = [role.value for role in roles]
        raise ForbiddenError(f"One of roles required: {', '.join(role_names)}")


def extract_request_metadata(request: Request) -> Dict[str, str]:
    """
    Extract request metadata
    Matches Next.js extractRequestMetadata() function
    """
    ip = request.headers.get('x-forwarded-for') or request.headers.get('x-real-ip') or 'unknown'
    user_agent = request.headers.get('user-agent') or 'unknown'
    
    return {"ip": ip, "userAgent": user_agent}


def generate_request_id() -> str:
    """
    Generate request ID
    Matches Next.js generateRequestId() function
    """
    return f"req_{int(datetime.now().timestamp())}_{str(uuid.uuid4())[:8]}"


# Dependency for getting current user (simplified version)
async def get_current_user(request: Request, db: AsyncSession = Depends(get_async_db)) -> Dict[str, Any]:
    """
    Simplified dependency for getting current user
    """
    context = await create_request_context(request, db)
    return context.user
