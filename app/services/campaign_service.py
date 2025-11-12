"""
Campaign Service - Campaign management operations
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
import uuid
import structlog

from app.models.campaign import Campaign
from app.models.post import Post
from app.core.exceptions import NotFoundError

logger = structlog.get_logger()


class CampaignService:
    """Service for campaign operations"""
    
    @staticmethod
    def get_campaigns(
        db: Session,
        workspace_id: str,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Campaign]:
        """Get all campaigns for workspace"""
        query = db.query(Campaign).filter(
            Campaign.workspace_id == workspace_id
        )
        
        if status:
            query = query.filter(Campaign.status == status)
        
        campaigns = query.order_by(
            Campaign.created_at.desc()
        ).offset(offset).limit(limit).all()
        
        return campaigns
    
    @staticmethod
    def get_campaign_by_id(
        db: Session,
        campaign_id: str,
        workspace_id: str
    ) -> Campaign:
        """Get campaign by ID"""
        campaign = db.query(Campaign).filter(
            Campaign.id == campaign_id,
            Campaign.workspace_id == workspace_id
        ).first()
        
        if not campaign:
            raise NotFoundError("Campaign")
        
        return campaign
    
    @staticmethod
    def create_campaign(
        db: Session,
        workspace_id: str,
        user_id: str,
        campaign_data: Any
    ) -> Campaign:
        """Create a new campaign"""
        campaign = Campaign(
            id=uuid.uuid4(),
            workspace_id=workspace_id,
            created_by=user_id,
            name=campaign_data.name,
            goals=campaign_data.goals,
            platforms=campaign_data.platforms,
            start_date=campaign_data.start_date,
            end_date=campaign_data.end_date,
            target_audience=campaign_data.target_audience,
            budget=campaign_data.budget,
            status=campaign_data.status
        )
        
        db.add(campaign)
        db.commit()
        db.refresh(campaign)
        
        logger.info("campaign_created", campaign_id=str(campaign.id))
        
        return campaign
    
    @staticmethod
    def update_campaign(
        db: Session,
        campaign_id: str,
        workspace_id: str,
        campaign_data: Any
    ) -> Campaign:
        """Update a campaign"""
        campaign = CampaignService.get_campaign_by_id(db, campaign_id, workspace_id)
        
        update_data = campaign_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(campaign, field, value)
        
        db.commit()
        db.refresh(campaign)
        
        return campaign
    
    @staticmethod
    def delete_campaign(
        db: Session,
        campaign_id: str,
        workspace_id: str
    ) -> None:
        """Delete a campaign"""
        campaign = CampaignService.get_campaign_by_id(db, campaign_id, workspace_id)
        
        db.delete(campaign)
        db.commit()
        
        logger.info("campaign_deleted", campaign_id=campaign_id)
    
    @staticmethod
    def get_campaign_stats(
        db: Session,
        campaign_id: str,
        workspace_id: str
    ) -> Dict[str, Any]:
        """Get campaign statistics"""
        # Verify campaign exists
        campaign = CampaignService.get_campaign_by_id(db, campaign_id, workspace_id)
        
        # Get post counts
        total_posts = db.query(Post).filter(
            Post.workspace_id == workspace_id,
            Post.campaign_id == campaign_id
        ).count()
        
        published_posts = db.query(Post).filter(
            Post.workspace_id == workspace_id,
            Post.campaign_id == campaign_id,
            Post.status == "published"
        ).count()
        
        scheduled_posts = db.query(Post).filter(
            Post.workspace_id == workspace_id,
            Post.campaign_id == campaign_id,
            Post.status == "scheduled"
        ).count()
        
        return {
            "campaign_id": campaign_id,
            "campaign_name": campaign.name,
            "total_posts": total_posts,
            "published_posts": published_posts,
            "scheduled_posts": scheduled_posts,
            "platforms": campaign.platforms,
            "status": campaign.status
        }
