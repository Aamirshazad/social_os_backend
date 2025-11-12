"""
Authentication API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import LoginRequest, Token, RefreshTokenRequest, RegisterRequest
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService
from app.services.workspace_service import WorkspaceService
from app.core.security import decode_token
from app.core.exceptions import AuthenticationError, DuplicateError
import structlog

logger = structlog.get_logger()
router = APIRouter()


@router.post("/register", response_model=Token)
async def register(
    register_data: RegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Register a new user
    
    Creates user account and returns JWT tokens
    """
    try:
        # Create user
        user = AuthService.create_user(
            db=db,
            email=register_data.email,
            password=register_data.password,
            full_name=register_data.full_name
        )
        
        # Get user's workspace
        workspaces = WorkspaceService.get_user_workspaces(db, str(user.id))
        workspace_id = str(workspaces[0].id) if workspaces else None
        
        # Create tokens
        tokens = AuthService.create_tokens(user, workspace_id)
        
        logger.info("user_registered", email=register_data.email, user_id=str(user.id))
        
        return tokens
        
    except DuplicateError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except Exception as e:
        logger.error("register_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login endpoint
    
    Authenticates user and returns JWT tokens
    """
    try:
        # Authenticate user
        user = AuthService.authenticate_user(
            db=db,
            email=login_data.email,
            password=login_data.password
        )
        
        # Get user's workspace
        workspaces = WorkspaceService.get_user_workspaces(db, str(user.id))
        workspace_id = str(workspaces[0].id) if workspaces else None
        
        # Create tokens
        tokens = AuthService.create_tokens(user, workspace_id)
        
        logger.info("user_logged_in", email=login_data.email, user_id=str(user.id))
        
        return tokens
        
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except Exception as e:
        logger.error("login_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token
    """
    try:
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
        
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
        
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.post("/logout")
async def logout():
    """
    Logout endpoint
    
    In a JWT-based system, logout is typically handled client-side
    by removing the token. This endpoint is for compatibility.
    """
    return {"message": "Successfully logged out"}
