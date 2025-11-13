"""
Thread schemas for API requests/responses
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """Chat message schema"""
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1)
    timestamp: str


class CreateThreadRequest(BaseModel):
    """Request schema for creating a thread"""
    title: str = Field(default="New Chat", max_length=255)


class UpdateThreadTitleRequest(BaseModel):
    """Request schema for updating thread title"""
    title: str = Field(..., min_length=1, max_length=255)


class AddMessageRequest(BaseModel):
    """Request schema for adding a message"""
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=10000)


class UpdateMessagesRequest(BaseModel):
    """Request schema for updating all messages"""
    messages: List[ChatMessage]


class ThreadResponse(BaseModel):
    """Response schema for thread"""
    id: str
    workspace_id: str
    title: str
    messages: List[Dict[str, Any]]
    created_by: str
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ThreadListResponse(BaseModel):
    """Response schema for thread list"""
    items: List[ThreadResponse]
    total: int
    limit: int
    offset: int
