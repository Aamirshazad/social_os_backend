"""
Scheduler API endpoints - Post scheduling and queue management
"""
from typing import List
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from datetime import datetime

from app.database import get_async_db
from app.dependencies import get_current_active_user, get_workspace_id
from app.application.services.publishing.scheduler_service import SchedulerService
from app.application.services.content.post_service import PostService
import structlog

logger = structlog.get_logger()
router = APIRouter()


class SchedulePostRequest(BaseModel):
    """Request schema for scheduling a post"""
    post_id: str
    scheduled_time: datetime = Field(..., description="UTC datetime to publish")
    platforms: List[str] = Field(..., min_items=1)


@router.get("/pending")
async def get_pending_scheduled_posts(
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all pending scheduled posts
    
    Returns posts that are scheduled but not yet published
    """
    pending_posts = PostService.get_scheduled_posts(
        db=db,
        workspace_id=workspace_id
    )
    
    return {
        "success": True,
        "data": {
            "posts": [PostService.transformFromDB(p) for p in pending_posts],
            "total": len(pending_posts)
        }
    }


@router.post("/schedule")
async def schedule_post(
    request: SchedulePostRequest,
    background_tasks: BackgroundTasks,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Schedule a post for future publishing
    
    The post will be automatically published at the scheduled time
    """
    # Get post
    post = PostService.get_post_by_id(
        db=db,
        post_id=request.post_id,
        workspace_id=workspace_id
    )
    
    # Update post with schedule
    updated_post = PostService.update_post(
        db=db,
        post_id=request.post_id,
        workspace_id=workspace_id,
        post_data={
            "scheduled_time": request.scheduled_time,
            "status": "scheduled",
            "platforms": request.platforms
        }
    )
    
    # Add to background task queue
    background_tasks.add_task(
        SchedulerService.queue_scheduled_post,
        post_id=request.post_id,
        scheduled_time=request.scheduled_time
    )
    
    logger.info(
        "post_scheduled",
        post_id=request.post_id,
        scheduled_time=request.scheduled_time.isoformat()
    )
    
    return {
        "success": True,
        "data": PostService.transformFromDB(updated_post),
        "message": "Post scheduled successfully"
    }


@router.delete("/{post_id}/cancel")
async def cancel_scheduled_post(
    post_id: str,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Cancel a scheduled post
    
    Changes status back to draft
    """
    from app.schemas.post import PostStatus
    
    updated_post = PostService.update_post_status(
        db=db,
        post_id=post_id,
        workspace_id=workspace_id,
        status=PostStatus.DRAFT
    )
    
    logger.info("scheduled_post_cancelled", post_id=post_id)
    
    return {
        "success": True,
        "data": PostService.transformFromDB(updated_post),
        "message": "Scheduled post cancelled"
    }


@router.get("/queue/status")
async def get_queue_status(
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get scheduler queue status
    
    Returns information about pending and processing posts
    """
    status = SchedulerService.get_queue_status(
        db=db,
        workspace_id=workspace_id
    )
    
    return {
        "success": True,
        "data": status
    }
