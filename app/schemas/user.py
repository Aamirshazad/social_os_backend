"""
User schemas
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """Schema for user creation"""
    password: str


class UserResponse(UserBase):
    """Schema for user response"""
    id: str
    is_active: bool = True
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """Schema for user update"""
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
