"""
Authentication schemas
"""
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class Token(BaseModel):
    """JWT token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Data stored in JWT token"""
    sub: str  # user_id
    email: Optional[str] = None
    workspace_id: Optional[str] = None


class RegisterRequest(BaseModel):
    """Registration request"""
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    """Login request"""
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    """Refresh token request"""
    refresh_token: str
