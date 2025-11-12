"""
Campaign API endpoints - Campaign management
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from datetime import datetime

from app.database import get_db
from app.dependencies import get_current_active_user, get_workspace_id
from app.services.campaign_service import CampaignService
import structlog

logger = structlog.get_logger()
router = APIRouter()


class CampaignCreate(BaseModel):
    """Request schema for creating a campaign"""
    name: str = Field(..., min_length=1, max_length=200)
    goals: List[str] = Field(..., min_items=1)
    platforms: List[str] = Field(..., min_items=1)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    target_audience: Optional[str] = None
    budget: Optional[float] = None
    status: str = Field(default="active")


class CampaignUpdate(BaseModel):
    """Request schema for updating a campaign"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    goals: Optional[List[str]] = None
    platforms: Optional[List[str]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    target_audience: Optional[str] = None
    budget: Optional[float] = None
    status: Optional[str] = None


class CampaignResponse(BaseModel):
    """Response schema for campaign"""
    id: str
    workspace_id: str
    name: str
    goals: List[str]
    platforms: List[str]
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    target_audience: Optional[str]
    budget: Optional[float]
    status: str
    created_by: str
    created_at: datetime
    
    class Config:
        from_attributes = True


@router.get("", response_model=List[CampaignResponse])
async def get_campaigns(
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all campaigns for workspace
    
    Query Parameters:
    - status: Filter by status (active, completed, paused)
    - limit: Maximum number of campaigns (1-100)
    - offset: Number of campaigns to skip
    """
    campaigns = CampaignService.get_campaigns(
        db=db,
        workspace_id=workspace_id,
        status=status,
        limit=limit,
        offset=offset
    )
    
    return campaigns


@router.post("", response_model=CampaignResponse, status_code=201)
async def create_campaign(
    campaign_data: CampaignCreate,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a new campaign
    """
    campaign = CampaignService.create_campaign(
        db=db,
        workspace_id=workspace_id,
        user_id=current_user["id"],
        campaign_data=campaign_data
    )
    
    logger.info("campaign_created", campaign_id=str(campaign.id))
    
    return campaign


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: str,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific campaign by ID
    """
    campaign = CampaignService.get_campaign_by_id(
        db=db,
        campaign_id=campaign_id,
        workspace_id=workspace_id
    )
    
    return campaign


@router.put("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: str,
    campaign_data: CampaignUpdate,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update a campaign
    """
    campaign = CampaignService.update_campaign(
        db=db,
        campaign_id=campaign_id,
        workspace_id=workspace_id,
        campaign_data=campaign_data
    )
    
    logger.info("campaign_updated", campaign_id=campaign_id)
    
    return campaign


@router.delete("/{campaign_id}", status_code=204)
async def delete_campaign(
    campaign_id: str,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete a campaign
    """
    CampaignService.delete_campaign(
        db=db,
        campaign_id=campaign_id,
        workspace_id=workspace_id
    )
    
    logger.info("campaign_deleted", campaign_id=campaign_id)
    
    return None


@router.get("/{campaign_id}/posts")
async def get_campaign_posts(
    campaign_id: str,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all posts for a campaign
    """
    from app.services.post_service import PostService
    
    posts = PostService.get_posts_by_campaign(
        db=db,
        campaign_id=campaign_id,
        workspace_id=workspace_id
    )
    
    return {
        "success": True,
        "data": {
            "campaign_id": campaign_id,
            "posts": [PostService.transformFromDB(p) for p in posts],
            "total": len(posts)
        }
    }


@router.get("/{campaign_id}/stats")
async def get_campaign_stats(
    campaign_id: str,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get campaign statistics
    """
    stats = CampaignService.get_campaign_stats(
        db=db,
        campaign_id=campaign_id,
        workspace_id=workspace_id
    )
    
    return {
        "success": True,
        "data": stats
    }
