"""
Analytics API endpoints - Post and platform analytics
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
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
    request: Request,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get analytics overview for workspace
    
    Returns post counts, platform distribution, and trends
    """
    try:
        # Verify authentication and get user data
        user_id, user_data = await verify_auth_and_get_user(request, db)
        workspace_id = user_data["workspace_id"]
        
        overview = MetricsService.get_overview(
            db=db,
            workspace_id=workspace_id,
            days=days
        )
        
        return {
            "success": True,
            "data": overview
        }
        
    except Exception as e:
        logger.error("get_analytics_overview_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/posts/performance")
async def get_post_performance(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
    limit: int = Query(10, ge=1, le=50),
    platform: Optional[str] = None
):
    """
    Get top performing posts
    
    Query Parameters:
    - limit: Number of posts to return
    - platform: Filter by platform
    """
    try:
        # Verify authentication and get user data
        user_id, user_data = await verify_auth_and_get_user(request, db)
        workspace_id = user_data["workspace_id"]
        
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
        
    except Exception as e:
        logger.error("get_post_performance_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/platforms/distribution")
async def get_platform_distribution(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
    days: int = Query(30, ge=1, le=365)
):
    """
    Get post distribution across platforms
    """
    try:
        # Verify authentication and get user data
        user_id, user_data = await verify_auth_and_get_user(request, db)
        workspace_id = user_data["workspace_id"]
        
        distribution = MetricsService.get_platform_performance(
            db=db,
            workspace_id=workspace_id,
            days=days
        )
        
        return {
            "success": True,
            "data": distribution
        }
        
    except Exception as e:
        logger.error("get_platform_distribution_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/activity/timeline")
async def get_activity_timeline(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
    days: int = Query(30, ge=1, le=365)
):
    """
    Get posting activity timeline
    
    Returns daily post counts for the specified period
    """
    try:
        # Verify authentication and get user data
        user_id, user_data = await verify_auth_and_get_user(request, db)
        workspace_id = user_data["workspace_id"]
        
        timeline = MetricsService.get_overview(
            db=db,
            workspace_id=workspace_id,
            days=days
        )
        
        return {
            "success": True,
            "data": timeline
        }
        
    except Exception as e:
        logger.error("get_activity_timeline_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/campaigns/performance")
async def get_campaign_performance(
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get performance metrics for all campaigns
    """
    try:
        # Verify authentication and get user data
        user_id, user_data = await verify_auth_and_get_user(request, db)
        workspace_id = user_data["workspace_id"]
        
        performance = MetricsService.get_overview(
            db=db,
            workspace_id=workspace_id
        )
        
        return {
            "success": True,
            "data": performance
        }
        
    except Exception as e:
        logger.error("get_campaign_performance_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
