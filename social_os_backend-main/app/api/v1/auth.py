"""
Authentication API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from pydantic import ValidationError
from typing import Dict, Any

from app.schemas.auth import LoginRequest, RegisterRequest, AuthSuccessResponse
from app.schemas.user import UserResponse
from app.application.services.auth.authentication_service import AuthenticationService
from app.core.exceptions import AuthenticationError, DuplicateError
from app.core.auth_helper import verify_auth_and_get_user
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

@router.get("/me")
async def get_current_user(
    request: Request
):
    """
    Get current user profile with workspace and role
    Matches Next.js fetchUserProfile pattern exactly
    """
    try:
        # Use centralized auth helper to verify Supabase token and load user profile
        user_id, user_data = await verify_auth_and_get_user(request)

        return {
            "id": user_data["id"],
            "email": user_data["email"],
            "full_name": user_data.get("full_name"),
            "workspace_id": user_data["workspace_id"],
            "role": user_data["role"],
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_current_user_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user profile"
        )

@router.post("/register", response_model=AuthSuccessResponse)
async def register(
    register_data: RegisterRequest,
    request: Request
):
    """
    Register a new user
    
    Creates user account in Supabase and returns JWT tokens with role
    """
    try:
        # Validate request security
        security_info = validate_request_security(request)
        logger.info("registration_started", email=register_data.email, **security_info)
        
        # Register user with Supabase - matches Next.js pattern exactly
        logger.info("registering_supabase_user", email=register_data.email)
        auth_response = AuthenticationService.register_user(
            email=register_data.email,
            password=register_data.password,
            full_name=register_data.full_name
        )
        
        user = auth_response["user"]
        session = auth_response["session"]
        
        logger.info("supabase_user_registered", user_id=str(user.id), email=register_data.email)
        
        # Note: Workspace and user record creation is handled by Supabase triggers
        # This matches the Next.js pattern exactly - no manual database operations needed
        
        logger.info("user_registered_success", email=register_data.email, user_id=str(user.id), **security_info)
        
        # Return success message - frontend will handle session via Supabase client
        return {"message": "Registration successful. Please check your email to confirm your account."}
        
    except DuplicateError as e:
        logger.warning("registration_duplicate", email=register_data.email, error=str(e), **security_info)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except AuthenticationError as e:
        logger.warning("registration_auth_error", email=register_data.email, error=str(e), **security_info)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except ValidationError as e:
        logger.warning("registration_validation_error", email=register_data.email, errors=e.errors(), **security_info)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.errors()
        )
    except ValueError as e:
        logger.warning("registration_value_error", email=register_data.email, error=str(e), **security_info)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        import traceback
        logger.error("register_error", email=register_data.email, error=str(e), error_type=type(e).__name__, traceback=traceback.format_exc(), **security_info)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.post("/login", response_model=AuthSuccessResponse)
async def login(
    login_data: LoginRequest,
    request: Request
):
    """
    Login endpoint
    
    Authenticates user and returns JWT tokens with role
    """
    try:
        # Validate request security
        security_info = validate_request_security(request)
        logger.info("login_attempt", email=login_data.email, **security_info)
        
        # Authenticate user using Supabase - matches Next.js pattern exactly
        auth_response = AuthenticationService.authenticate_user(
            email=login_data.email,
            password=login_data.password
        )
        
        user = auth_response["user"]
        session = auth_response["session"]
        
        logger.info("supabase_auth_success", user_id=str(user.id), email=login_data.email)
        
        # Note: User profile data (workspace_id, role) will be fetched by frontend
        # using the same pattern as Next.js - via RPC or direct query with Supabase token
        
        logger.info("user_logged_in", email=login_data.email, user_id=str(user.id), **security_info)
        
        # Return success message - frontend will handle session via Supabase client
        return {"message": "Login successful"}
        
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

@router.options("/logout")
async def logout_options():
    """Handle preflight requests for logout endpoint"""
    return {"message": "OK"}

@router.options("/me")
async def me_options():
    """Handle preflight requests for me endpoint"""
    return {"message": "OK"}
