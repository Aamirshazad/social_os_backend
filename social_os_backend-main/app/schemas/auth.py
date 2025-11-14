"""
Authentication schemas
"""
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, validator
import re


class AuthSuccessResponse(BaseModel):
    """Simple success response for auth endpoints following Next.js pattern"""
    message: str


class RegisterRequest(BaseModel):
    """Registration request"""
    email: EmailStr
    password: str = Field(
        ..., 
        min_length=6, 
        max_length=128,
        description="Password must be 6-128 characters"
    )
    full_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Full name must be 1-100 characters")
    
    @validator('password')
    def validate_password(cls, v):
        """Validate password strength - basic requirements"""
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        if len(v) > 128:
            raise ValueError('Password must be no more than 128 characters long')
        return v
    
    @validator('full_name')
    def validate_full_name(cls, v):
        """Validate full name"""
        if v is not None:
            v = v.strip()
            if len(v) == 0:
                raise ValueError('Full name cannot be empty')
            if len(v) > 100:
                raise ValueError('Full name must be no more than 100 characters')
            # Check for valid characters (letters, spaces, hyphens, apostrophes)
            if not re.match(r"^[a-zA-Z\s\-']+$", v):
                raise ValueError('Full name can only contain letters, spaces, hyphens, and apostrophes')
        return v
    
    @validator('email')
    def validate_email(cls, v):
        """Additional email validation"""
        email_str = str(v)
        if len(email_str) > 254:
            raise ValueError('Email address is too long')
        # Check for common disposable email domains
        disposable_domains = ['10minutemail.com', 'tempmail.org', 'guerrillamail.com']
        domain = email_str.split('@')[1].lower()
        if domain in disposable_domains:
            raise ValueError('Disposable email addresses are not allowed')
        return v


class LoginRequest(BaseModel):
    """Login request"""
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128, description="Password is required")
    
    @validator('password')
    def validate_password_not_empty(cls, v):
        """Validate password is not empty"""
        if not v or not v.strip():
            raise ValueError('Password cannot be empty')
        return v
