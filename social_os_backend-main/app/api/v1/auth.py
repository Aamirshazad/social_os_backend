"""
Authentication API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import ValidationError
from typing import Dict, Any

from app.database import get_db, get_async_db
from app.schemas.auth import LoginRequest, Token, RefreshTokenRequest, RegisterRequest
from app.schemas.user import UserResponse
from app.application.services.auth import AuthenticationService, RegistrationService, TokenService
from app.application.services.workspace import WorkspaceService
from app.core.security import decode_token, create_access_token, create_refresh_token
from app.core.exceptions import AuthenticationError, DuplicateError
import structlog

logger = structlog.get_logger()
router = APIRouter()


def validate_request_security(request: Request) -> Dict[str, Any]:
    """
    Basic request information logging (minimal restrictions)
    
    Args:
        request: FastAPI request object
    
    Returns:
        Dictionary with basic request information
    """
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    # Basic request information (no restrictions, just logging)
    security_info = {
        "client_ip": client_ip,
        "user_agent": user_agent
    }
    
    return security_info


@router.post("/register", response_model=Token)
async def register(
    register_data: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Register a new user
    
    Creates user account and returns JWT tokens
    """
    try:
        # Validate request security
        security_info = validate_request_security(request)
        
        # Create user
        user = await RegistrationService.create_user(
            db=db,
            email=register_data.email,
            password=register_data.password,
            full_name=register_data.full_name
        )
        
        # Get user's workspace
        workspaces = await WorkspaceService.get_user_workspaces_async(db, str(user.id))
        workspace_id = str(workspaces[0].id) if workspaces else None
        
        # Create tokens
        tokens = TokenService.create_tokens(user, workspace_id)
        
        logger.info("user_registered", email=register_data.email, user_id=str(user.id), **security_info)
        
        return tokens
        
    except DuplicateError as e:
        logger.warning("registration_duplicate", email=register_data.email, **security_info)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except ValidationError as e:
        logger.warning("registration_validation_error", errors=e.errors(), **security_info)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.errors()
        )
    except ValueError as e:
        logger.warning("registration_value_error", error=str(e), **security_info)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error("register_error", error=str(e), **security_info)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    request: Request
):
    """
    Login endpoint
    
    Authenticates user and returns JWT tokens
    """
    try:
        # Validate request security
        security_info = validate_request_security(request)
        
        # Authenticate user using Supabase
        user = await AuthenticationService.authenticate_user(
            email=login_data.email,
            password=login_data.password
        )
        
        # For now, use a default workspace (can be enhanced later with Supabase)
        workspace_id = None
        
        # Create tokens
        tokens = TokenService.create_tokens(user, workspace_id)
        
        logger.info("user_logged_in", email=login_data.email, user_id=str(user.id), **security_info)
        
        return tokens
        
    except AuthenticationError as e:
        logger.warning("login_authentication_error", email=login_data.email, error=str(e), **security_info)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except ValidationError as e:
        logger.warning("login_validation_error", errors=e.errors(), **security_info)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.errors()
        )
    except ValueError as e:
        logger.warning("login_value_error", error=str(e), **security_info)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error("login_error", error=str(e), **security_info)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Refresh access token using refresh token
    """
    try:
        # Validate request security
        security_info = validate_request_security(request)
        
        # Decode refresh token
        payload = decode_token(refresh_data.refresh_token)
        
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
        
        logger.info("token_refreshed", user_id=payload.get("sub"), **security_info)
        
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
        
    except AuthenticationError as e:
        logger.warning("refresh_authentication_error", error=str(e), **security_info)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except ValidationError as e:
        logger.warning("refresh_validation_error", errors=e.errors(), **security_info)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.errors()
        )
    except ValueError as e:
        logger.warning("refresh_value_error", error=str(e), **security_info)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error("refresh_error", error=str(e), **security_info)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


@router.get("/me")
async def get_current_user(request: Request):
    """
    Get current user endpoint
    
    Returns the current authenticated user's information
    """
    try:
        # Extract token from Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid authorization header"
            )
        
        token = auth_header.split(" ")[1]
        
        # Verify token and get user info
        from app.application.services.auth.token_service import TokenService
        payload = TokenService.verify_token(token)
        
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        # For now, return user info from JWT payload since we're using Supabase auth
        user_id = payload.get("sub")
        user_email = payload.get("email")
        
        if not user_id or not user_email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        
        return {
            "id": user_id,
            "email": user_email,
            "created_at": payload.get("iat"),
            "updated_at": payload.get("iat")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_current_user_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get current user"
        )


@router.post("/logout")
async def logout(request: Request):
    """
    Logout endpoint
    
    Logs out the current user by invalidating their session
    """
    try:
        # In a real implementation, you would:
        # 1. Extract the JWT token from the request
        # 2. Add it to a blacklist/revocation list
        # 3. Clear any server-side sessions
        
        logger.info("user_logged_out")
        
    except Exception as e:
        logger.error("logout_error", error=str(e))
    
    return {"message": "Successfully logged out"}


@router.options("/login")
async def login_options():
    """Handle preflight requests for login endpoint"""
    return {"message": "OK"}


@router.options("/register")
async def register_options():
    """Handle preflight requests for register endpoint"""
    return {"message": "OK"}


@router.options("/refresh")
async def refresh_options():
    """Handle preflight requests for refresh endpoint"""
    return {"message": "OK"}


@router.options("/logout")
async def logout_options():
    """Handle preflight requests for logout endpoint"""
    return {"message": "OK"}
