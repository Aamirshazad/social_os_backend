"""
Analytics Service - Post and platform analytics
"""
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from collections import defaultdict
import structlog

from app.models.post import Post
from app.models.campaign import Campaign
from app.models.library import LibraryItem

logger = structlog.get_logger()


class AnalyticsService:
    """Service for analytics and reporting"""
    
    @staticmethod
    def get_overview(
        db: Session,
        workspace_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get analytics overview
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            days: Number of days to analyze
        
        Returns:
            Overview statistics
        """
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Total posts
        total_posts = db.query(Post).filter(
            Post.workspace_id == workspace_id
        ).count()
        
        # Published posts in period
        published_posts = db.query(Post).filter(
            and_(
                Post.workspace_id == workspace_id,
                Post.status == "published",
                Post.created_at >= start_date
            )
        ).count()
        
        # Scheduled posts
        scheduled_posts = db.query(Post).filter(
            and_(
                Post.workspace_id == workspace_id,
                Post.status == "scheduled"
            )
        ).count()
        
        # Draft posts
        draft_posts = db.query(Post).filter(
            and_(
                Post.workspace_id == workspace_id,
                Post.status == "draft"
            )
        ).count()
        
        # Library items
        library_count = db.query(LibraryItem).filter(
            LibraryItem.workspace_id == workspace_id
        ).count()
        
        # Active campaigns
        active_campaigns = db.query(Campaign).filter(
            and_(
                Campaign.workspace_id == workspace_id,
                Campaign.status == "active"
            )
        ).count()
        
        return {
            "total_posts": total_posts,
            "published_posts": published_posts,
            "scheduled_posts": scheduled_posts,
            "draft_posts": draft_posts,
            "library_items": library_count,
            "active_campaigns": active_campaigns,
            "period_days": days
        }
    
    @staticmethod
    def get_top_posts(
        db: Session,
        workspace_id: str,
        limit: int = 10,
        platform: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get top performing posts
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            limit: Number of posts to return
            platform: Optional platform filter
        
        Returns:
            List of top posts
        """
        query = db.query(Post).filter(
            and_(
                Post.workspace_id == workspace_id,
                Post.status == "published"
            )
        )
        
        if platform:
            query = query.filter(Post.platforms.contains([platform]))
        
        posts = query.order_by(
            Post.published_at.desc()
        ).limit(limit).all()
        
        return [
            {
                "id": str(post.id),
                "topic": post.topic,
                "platforms": post.platforms,
                "published_at": post.published_at.isoformat() if post.published_at else None,
                "engagement_score": post.engagement_score
            }
            for post in posts
        ]
    
    @staticmethod
    def get_platform_distribution(
        db: Session,
        workspace_id: str,
        days: int = 30
    ) -> Dict[str, int]:
        """
        Get post distribution across platforms
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            days: Number of days to analyze
        
        Returns:
            Dictionary of platform counts
        """
        start_date = datetime.utcnow() - timedelta(days=days)
        
        posts = db.query(Post).filter(
            and_(
                Post.workspace_id == workspace_id,
                Post.created_at >= start_date
            )
        ).all()
        
        platform_counts = defaultdict(int)
        for post in posts:
            for platform in post.platforms:
                platform_counts[platform] += 1
        
        return dict(platform_counts)
    
    @staticmethod
    def get_activity_timeline(
        db: Session,
        workspace_id: str,
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get posting activity timeline
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            days: Number of days to analyze
        
        Returns:
            List of daily activity data
        """
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Query posts grouped by date
        results = db.query(
            func.date(Post.created_at).label('date'),
            func.count(Post.id).label('count')
        ).filter(
            and_(
                Post.workspace_id == workspace_id,
                Post.created_at >= start_date
            )
        ).group_by(
            func.date(Post.created_at)
        ).order_by(
            func.date(Post.created_at)
        ).all()
        
        timeline = [
            {
                "date": str(result.date),
                "count": result.count
            }
            for result in results
        ]
        
        return timeline
    
    @staticmethod
    def get_campaign_performance(
        db: Session,
        workspace_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get performance metrics for all campaigns
        
        Args:
            db: Database session
            workspace_id: Workspace ID
        
        Returns:
            List of campaign performance data
        """
        campaigns = db.query(Campaign).filter(
            Campaign.workspace_id == workspace_id
        ).all()
        
        performance = []
        for campaign in campaigns:
            # Get post counts for campaign
            total_posts = db.query(Post).filter(
                and_(
                    Post.workspace_id == workspace_id,
                    Post.campaign_id == str(campaign.id)
                )
            ).count()
            
            published_posts = db.query(Post).filter(
                and_(
                    Post.workspace_id == workspace_id,
                    Post.campaign_id == str(campaign.id),
                    Post.status == "published"
                )
            ).count()
            
            performance.append({
                "campaign_id": str(campaign.id),
                "campaign_name": campaign.name,
                "status": campaign.status,
                "total_posts": total_posts,
                "published_posts": published_posts,
                "platforms": campaign.platforms,
                "start_date": campaign.start_date.isoformat() if campaign.start_date else None,
                "end_date": campaign.end_date.isoformat() if campaign.end_date else None
            })
        
        return performance
