"""
Post Library API endpoints - Archive and manage published posts
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import datetime

from app.database import get_db
from app.dependencies import get_current_active_user, get_workspace_id
from app.application.services.content import LibraryService
import structlog

logger = structlog.get_logger()
router = APIRouter()


class ArchivePostRequest(BaseModel):
    """Request schema for archiving a post to library"""
    post_id: str
    title: str = Field(..., min_length=1, max_length=200)
    topic: str
    platforms: List[str]
    content: dict
    platform_results: List[dict] = Field(default_factory=list)


class LibraryItemResponse(BaseModel):
    """Response schema for library item"""
    id: str
    workspace_id: str
    original_post_id: str
    title: str
    topic: str
    post_type: str
    platforms: List[str]
    content: dict
    published_at: datetime
    platform_data: dict
    created_by: str
    
    class Config:
        from_attributes = True


@router.get("", response_model=List[LibraryItemResponse])
async def get_library_posts(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    platform: Optional[str] = None,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all archived posts from library
    
    Query Parameters:
    - limit: Maximum number of items (1-100)
    - offset: Number of items to skip
    - platform: Filter by platform
    """
    items = LibraryService.get_library_items(
        db=db,
        workspace_id=workspace_id,
        limit=limit,
        offset=offset,
        platform_filter=platform
    )
    
    return items


@router.post("", response_model=LibraryItemResponse, status_code=201)
async def archive_post_to_library(
    request: ArchivePostRequest,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Archive a published post to library
    
    Stores the post with all its platform-specific data and results
    """
    library_item = LibraryService.create_library_item(
        db=db,
        workspace_id=workspace_id,
        user_id=current_user["id"],
        post_id=request.post_id,
        title=request.title,
        topic=request.topic,
        platforms=request.platforms,
        content=request.content,
        platform_results=request.platform_results
    )
    
    logger.info(
        "post_archived",
        library_id=str(library_item.id),
        workspace_id=workspace_id
    )
    
    return library_item


@router.get("/{library_id}", response_model=LibraryItemResponse)
async def get_library_item(
    library_id: str,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific library item by ID
    """
    item = LibraryService.get_library_item_by_id(
        db=db,
        library_id=library_id,
        workspace_id=workspace_id
    )
    
    return item


@router.delete("/{library_id}", status_code=204)
async def delete_library_item(
    library_id: str,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete a library item
    """
    LibraryService.delete_library_item(
        db=db,
        library_id=library_id,
        workspace_id=workspace_id
    )
    
    logger.info("library_item_deleted", library_id=library_id)
    
    return None


@router.get("/stats/summary")
async def get_library_stats(
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get library statistics summary
    
    Returns counts by platform, total posts, etc.
    """
    stats = LibraryService.get_library_stats(
        db=db,
        workspace_id=workspace_id
    )
    
    return {
        "success": True,
        "data": stats
    }
