"""
Analytics API endpoints - Post and platform analytics
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.database import get_db
from app.dependencies import get_current_active_user, get_workspace_id
from app.services.analytics_service import AnalyticsService
import structlog

logger = structlog.get_logger()
router = APIRouter()


@router.get("/overview")
async def get_analytics_overview(
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get analytics overview for workspace
    
    Returns post counts, platform distribution, and trends
    """
    overview = AnalyticsService.get_overview(
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
    db: Session = Depends(get_db)
):
    """
    Get top performing posts
    
    Query Parameters:
    - limit: Number of posts to return
    - platform: Filter by platform
    """
    performance = AnalyticsService.get_top_posts(
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
    db: Session = Depends(get_db)
):
    """
    Get post distribution across platforms
    """
    distribution = AnalyticsService.get_platform_distribution(
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
    db: Session = Depends(get_db)
):
    """
    Get posting activity timeline
    
    Returns daily post counts for the specified period
    """
    timeline = AnalyticsService.get_activity_timeline(
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
    db: Session = Depends(get_db)
):
    """
    Get performance metrics for all campaigns
    """
    performance = AnalyticsService.get_campaign_performance(
        db=db,
        workspace_id=workspace_id
    )
    
    return {
        "success": True,
        "data": performance
    }
