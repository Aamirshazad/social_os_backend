"""
Post Library API endpoints - Archive and manage published posts
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from datetime import datetime

from app.database import get_async_db
from app.core.auth_helper import verify_auth_and_get_user, require_editor_or_admin_role
from app.application.services.content import LibraryService
from fastapi import Request, HTTPException, status
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


class PostLibraryResponse(BaseModel):
    """Response schema for post library item"""
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


@router.get("", response_model=List[PostLibraryResponse])
async def get_library_posts(
    request: Request,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    platform: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get all archived posts from library
    
    Query Parameters:
    - limit: Maximum number of items (1-100)
    - offset: Number of items to skip
    - platform: Filter by platform
    """
    try:
        # Verify authentication and get user data
        user_id, user_data = await verify_auth_and_get_user(request, db)
        workspace_id = user_data["workspace_id"]
        
        items = LibraryService.get_library_items(
            db=db,
            workspace_id=workspace_id,
            limit=limit,
            offset=offset,
            platform_filter=platform
        )
        
        return items
        
    except Exception as e:
        logger.error("get_library_posts_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("", response_model=PostLibraryResponse, status_code=201)
async def archive_post_to_library(
    archive_request: ArchivePostRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Archive a published post to library
    
    Stores the post with all its platform-specific data and results
    """
    try:
        # Verify authentication and get user data
        user_id, user_data = await verify_auth_and_get_user(request, db)
        workspace_id = user_data["workspace_id"]
        
        # Require editor or admin role
        await require_editor_or_admin_role(user_data)
        
        library_item = LibraryService.create_library_item(
            db=db,
            workspace_id=workspace_id,
            user_id=user_id,
            post_id=archive_request.post_id,
            title=archive_request.title,
            topic=archive_request.topic,
            platforms=archive_request.platforms,
            content=archive_request.content,
            platform_results=archive_request.platform_results
        )
        
        logger.info(
            "post_archived",
            library_id=str(library_item.id),
            workspace_id=workspace_id
        )
        
        return library_item
        
    except Exception as e:
        logger.error("archive_post_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{library_id}", response_model=PostLibraryResponse)
async def get_library_item(
    library_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get a specific library item by ID
    """
    try:
        # Verify authentication and get user data
        user_id, user_data = await verify_auth_and_get_user(request, db)
        workspace_id = user_data["workspace_id"]
        
        item = LibraryService.get_library_item_by_id(
            db=db,
            library_id=library_id,
            workspace_id=workspace_id
        )
        
        return item
        
    except Exception as e:
        logger.error("get_library_item_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/{library_id}", status_code=204)
async def delete_library_item(
    library_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Delete a library item
    """
    try:
        # Verify authentication and get user data
        user_id, user_data = await verify_auth_and_get_user(request, db)
        workspace_id = user_data["workspace_id"]
        
        # Require editor or admin role
        await require_editor_or_admin_role(user_data)
        
        LibraryService.delete_library_item(
            db=db,
            library_id=library_id,
            workspace_id=workspace_id
        )
        
        logger.info("library_item_deleted", library_id=library_id)
        
        return None
        
    except Exception as e:
        logger.error("delete_library_item_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/stats/summary")
async def get_library_stats(
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get library statistics summary
    
    Returns counts by platform, total posts, etc.
    """
    try:
        # Verify authentication and get user data
        user_id, user_data = await verify_auth_and_get_user(request, db)
        workspace_id = user_data["workspace_id"]
        
        stats = LibraryService.get_library_stats(
            db=db,
            workspace_id=workspace_id
        )
        
        return {
            "success": True,
            "data": stats
        }
        
    except Exception as e:
        logger.error("get_library_stats_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
