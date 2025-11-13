"""
Analytics API endpoints - Post and platform analytics
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta

from app.database import get_async_db
from app.core.auth_helper import verify_auth_and_get_user
from app.application.services.analytics import MetricsService
import structlog

logger = structlog.get_logger()
router = APIRouter()


@router.get("/overview")
async def get_analytics_overview(
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get analytics overview for workspace
    
    Returns post counts, platform distribution, and trends
    """
    overview = MetricsService.get_overview(
        db=db,
        workspace_id=workspace_id,
        days=days
    )
    
    return {
        "success": True,
        "data": overview
    }


@router.get("/posts/performance")
async def get_post_performance(
    limit: int = Query(10, ge=1, le=50),
    platform: Optional[str] = None,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get top performing posts
    
    Query Parameters:
    - limit: Number of posts to return
    - platform: Filter by platform
    """
    performance = MetricsService.get_top_performing_posts(
        db=db,
        workspace_id=workspace_id,
        limit=limit,
        platform=platform
    )
    
    return {
        "success": True,
        "data": performance
    }


@router.get("/platforms/distribution")
async def get_platform_distribution(
    days: int = Query(30, ge=1, le=365),
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get post distribution across platforms
    """
    distribution = MetricsService.get_platform_performance(
        db=db,
        workspace_id=workspace_id,
        days=days
    )
    
    return {
        "success": True,
        "data": distribution
    }


@router.get("/activity/timeline")
async def get_activity_timeline(
    days: int = Query(30, ge=1, le=365),
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get posting activity timeline
    
    Returns daily post counts for the specified period
    """
    timeline = MetricsService.get_overview(
        db=db,
        workspace_id=workspace_id,
        days=days
    )
    
    return {
        "success": True,
        "data": timeline
    }


@router.get("/campaigns/performance")
async def get_campaign_performance(
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get performance metrics for all campaigns
    """
    performance = MetricsService.get_overview(
        db=db,
        workspace_id=workspace_id
    )
    
    return {
        "success": True,
        "data": performance
    }
