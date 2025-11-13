"""
Posts API endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.dependencies import get_current_active_user, get_workspace_id
from app.schemas.post import (
    PostCreate,
    PostUpdate,
    PostResponse,
    PostStatus
)
from app.application.services.content.post_service import PostService
import structlog

logger = structlog.get_logger()
router = APIRouter()


@router.get("", response_model=List[PostResponse])
async def get_posts(
    status: Optional[PostStatus] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    workspace_id: str = Depends(get_workspace_id),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get all posts for the current workspace
    
    Query Parameters:
    - status: Filter by post status
    - limit: Maximum number of posts to return (1-100)
    - offset: Number of posts to skip
    """
    posts = PostService.get_all_posts(
        db=db,
        workspace_id=workspace_id,
        status=status,
        limit=limit,
        offset=offset
    )
    
    return posts


@router.post("", response_model=PostResponse, status_code=201)
async def create_post(
    post_data: PostCreate,
    current_user: dict = Depends(get_current_active_user),
    workspace_id: str = Depends(get_workspace_id),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Create a new post
    """
    post = PostService.create_post(
        db=db,
        post_data=post_data,
        user_id=current_user["id"],
        workspace_id=workspace_id
    )
    
    return post


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: str,
    workspace_id: str = Depends(get_workspace_id),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get a specific post by ID
    """
    post = PostService.get_post_by_id(
        db=db,
        post_id=post_id,
        workspace_id=workspace_id
    )
    
    return post


@router.put("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: str,
    post_data: PostUpdate,
    workspace_id: str = Depends(get_workspace_id),
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Update a post
    """
    post = PostService.update_post(
        db=db,
        post_id=post_id,
        post_data=post_data,
        workspace_id=workspace_id
    )
    
    return post


@router.delete("/{post_id}", status_code=204)
async def delete_post(
    post_id: str,
    workspace_id: str = Depends(get_workspace_id),
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Delete a post
    """
    PostService.delete_post(
        db=db,
        post_id=post_id,
        workspace_id=workspace_id
    )
    
    return None


@router.patch("/{post_id}/status", response_model=PostResponse)
async def update_post_status(
    post_id: str,
    status: PostStatus,
    workspace_id: str = Depends(get_workspace_id),
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Update post status
    """
    post = PostService.update_post_status(
        db=db,
        post_id=post_id,
        status=status,
        workspace_id=workspace_id
    )
    
    return post


@router.get("/scheduled/pending", response_model=List[PostResponse])
async def get_scheduled_posts(
    workspace_id: str = Depends(get_workspace_id),
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get posts that are scheduled and ready to be published
    """
    posts = PostService.get_scheduled_posts(
        db=db,
        workspace_id=workspace_id
    )
    
    return posts
