"""
Content repurpose schemas
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.schemas.ai import Platform


class RepurposeContentRequest(BaseModel):
    """Request schema for content repurposing"""
    long_form_content: str = Field(..., min_length=100, max_length=50000, alias="longFormContent")
    platforms: List[Platform] = Field(..., min_items=1)
    number_of_posts: int = Field(default=5, ge=1, le=10, alias="numberOfPosts")
    
    class Config:
        populate_by_name = True


class RepurposeContentResponse(BaseModel):
    """Response schema for content repurposing"""
    success: bool = True
    data: List[Dict[str, Any]]
    message: str = "Content repurposed successfully"


class StrategistChatRequest(BaseModel):
    """Request schema for strategist chat"""
    message: str = Field(..., min_length=1, max_length=5000)
    history: List[Dict[str, str]] = Field(default_factory=list)


class StrategistChatResponse(BaseModel):
    """Response schema for strategist chat"""
    success: bool = True
    data: Dict[str, Any]
    message: Optional[str] = None
