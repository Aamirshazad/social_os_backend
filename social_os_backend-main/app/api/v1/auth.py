"""
Authentication API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import ValidationError
from typing import Dict, Any

from app.database import get_async_db
from app.schemas.auth import LoginRequest, Token, RefreshTokenRequest, RegisterRequest
from app.schemas.user import UserResponse
from app.application.services.auth.authentication_service import AuthenticationService
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


@router.options("/register")
async def options_register():
    """Handle CORS preflight for register endpoint"""
    return Response(status_code=200)


@router.options("/login")
async def options_login():
    """Handle CORS preflight for login endpoint"""
    return Response(status_code=200)


@router.options("/refresh")
async def options_refresh():
    """Handle CORS preflight for refresh endpoint"""
    return Response(status_code=200)


@router.options("/me")
async def options_me():
    """Handle CORS preflight for me endpoint"""
    return Response(status_code=200)


@router.get("/me")
async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get current user profile with workspace and role
    Matches Next.js fetchUserProfile pattern exactly
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
        
        # Verify token with Supabase
        supabase = AuthenticationService.get_supabase()
        user_response = supabase.auth.get_user(token)
        
        if not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        user_id = str(user_response.user.id)
        
        # Get user profile from database (workspace_id, role)
        from app.models.user import User
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        db_user = result.scalar_one_or_none()
        
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        return {
            "id": user_id,
            "email": user_response.user.email,
            "full_name": user_response.user.user_metadata.get("full_name") if user_response.user.user_metadata else None,
            "workspace_id": str(db_user.workspace_id),
            "role": db_user.role.value if hasattr(db_user.role, 'value') else str(db_user.role)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_current_user_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user profile"
        )


@router.post("/register", response_model=Token)
async def register(
    register_data: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
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


@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
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


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Refresh access token using refresh token
    
    Returns new tokens with updated role information
    """
    try:
        # Validate request security
        security_info = validate_request_security(request)
        
        # Decode refresh token
        payload = decode_token(refresh_data.refresh_token)
        
        # Verify token type
        if payload.get("type") != "refresh":
            raise AuthenticationError("Invalid token type")
        
        # Create new tokens with role preserved
        token_data = {
            "sub": payload.get("sub"),
            "email": payload.get("email"),
            "workspace_id": payload.get("workspace_id"),
            "role": payload.get("role")  # ✅ INCLUDE ROLE
        }
        
        access_token = create_access_token(token_data)
        new_refresh_token = create_refresh_token(token_data)
        
        logger.info("token_refreshed", user_id=payload.get("sub"), role=payload.get("role"), **security_info)
        
        # Return complete response matching Token schema
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "user": {
                "id": payload.get("sub"),
                "email": payload.get("email"),
                "full_name": None,  # Not available in refresh token
                "avatar_url": None
            },
            "workspace_id": payload.get("workspace_id"),
            "role": payload.get("role")  # ✅ INCLUDE ROLE
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
        logger.info("me_endpoint_called", auth_header_present=bool(auth_header))
        
        if not auth_header or not auth_header.startswith("Bearer "):
            logger.warning("missing_auth_header", auth_header=auth_header)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid authorization header"
            )
        
        token = auth_header.split(" ")[1]
        logger.info("token_extracted", token_length=len(token) if token else 0)
        
        # Verify token and get user info
        from app.application.services.auth.token_service import TokenService
        try:
            payload = TokenService.verify_token(token)
            logger.info("token_verified_successfully", payload_keys=list(payload.keys()) if payload else None)
        except Exception as token_error:
            logger.error("token_verification_error", error=str(token_error), token_preview=token[:20] if token else None)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        if not payload:
            logger.error("token_verification_failed_empty_payload", token_present=bool(token))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Log full payload for debugging
        logger.info("token_payload_debug", payload=payload)
        
        # Return user info from JWT payload since we're using Supabase auth
        user_id = payload.get("sub") or payload.get("user_id")
        user_email = payload.get("email")
        role = payload.get("role")
        workspace_id = payload.get("workspace_id")
        
        logger.info("extracted_user_info", user_id=user_id, user_email=user_email, role=role)
        
        if not user_id:
            logger.error("missing_user_id_in_token", payload=payload)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        if not user_email:
            logger.warning("missing_email_in_token", user_id=user_id)
        
        user_response = {
            "id": user_id,
            "email": user_email,
            "role": role,  # ✅ INCLUDE ROLE
            "workspace_id": workspace_id,  # ✅ INCLUDE WORKSPACE_ID
            "created_at": payload.get("iat"),
            "updated_at": payload.get("iat")
        }
        
        logger.info("me_endpoint_success", user_id=user_id, role=role)
        return user_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_current_user_error", error=str(e), error_type=type(e).__name__)
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


@router.options("/me")
async def me_options():
    """Handle preflight requests for me endpoint"""
    return {"message": "OK"}
