"""
Metrics Service - Analytics and metrics collection
"""
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from collections import defaultdict
import structlog

from app.models.post import Post
from app.models.campaign import Campaign

logger = structlog.get_logger()


class MetricsService:
    """Service for analytics metrics collection and calculation"""
    
    @staticmethod
    def get_overview(
        db: Session,
        workspace_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get analytics overview for workspace
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            days: Number of days to analyze
        
        Returns:
            Analytics overview data
        """
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Get post metrics
            posts_query = db.query(Post).filter(
                and_(
                    Post.workspace_id == workspace_id,
                    Post.created_at >= start_date,
                    Post.created_at <= end_date
                )
            )
            
            total_posts = posts_query.count()
            published_posts = posts_query.filter(Post.status == "published").count()
            
            # Get engagement metrics
            engagement_data = db.query(
                func.sum(Post.likes_count).label("total_likes"),
                func.sum(Post.comments_count).label("total_comments"),
                func.sum(Post.shares_count).label("total_shares"),
                func.sum(Post.impressions_count).label("total_impressions")
            ).filter(
                and_(
                    Post.workspace_id == workspace_id,
                    Post.created_at >= start_date,
                    Post.status == "published"
                )
            ).first()
            
            total_engagement = (
                (engagement_data.total_likes or 0) +
                (engagement_data.total_comments or 0) +
                (engagement_data.total_shares or 0)
            )
            
            # Calculate engagement rate
            engagement_rate = 0
            if engagement_data.total_impressions and engagement_data.total_impressions > 0:
                engagement_rate = (total_engagement / engagement_data.total_impressions) * 100
            
            logger.info("analytics_overview_generated", 
                       workspace_id=workspace_id, 
                       total_posts=total_posts)
            
            return {
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "days": days
                },
                "posts": {
                    "total": total_posts,
                    "published": published_posts,
                    "draft": total_posts - published_posts
                },
                "engagement": {
                    "total_likes": engagement_data.total_likes or 0,
                    "total_comments": engagement_data.total_comments or 0,
                    "total_shares": engagement_data.total_shares or 0,
                    "total_impressions": engagement_data.total_impressions or 0,
                    "engagement_rate": round(engagement_rate, 2)
                }
            }
            
        except Exception as e:
            logger.error("analytics_overview_error", error=str(e), workspace_id=workspace_id)
            return {"error": "Failed to generate analytics overview"}
    
    @staticmethod
    def get_platform_performance(
        db: Session,
        workspace_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get platform-specific performance metrics
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            days: Number of days to analyze
        
        Returns:
            Platform performance data
        """
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Get platform metrics
            platform_data = db.query(
                Post.platform,
                func.count(Post.id).label("post_count"),
                func.sum(Post.likes_count).label("total_likes"),
                func.sum(Post.comments_count).label("total_comments"),
                func.sum(Post.shares_count).label("total_shares"),
                func.sum(Post.impressions_count).label("total_impressions")
            ).filter(
                and_(
                    Post.workspace_id == workspace_id,
                    Post.created_at >= start_date,
                    Post.status == "published"
                )
            ).group_by(Post.platform).all()
            
            platforms = {}
            for data in platform_data:
                total_engagement = (
                    (data.total_likes or 0) +
                    (data.total_comments or 0) +
                    (data.total_shares or 0)
                )
                
                engagement_rate = 0
                if data.total_impressions and data.total_impressions > 0:
                    engagement_rate = (total_engagement / data.total_impressions) * 100
                
                platforms[data.platform] = {
                    "posts": data.post_count,
                    "likes": data.total_likes or 0,
                    "comments": data.total_comments or 0,
                    "shares": data.total_shares or 0,
                    "impressions": data.total_impressions or 0,
                    "engagement_rate": round(engagement_rate, 2)
                }
            
            return {
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "days": days
                },
                "platforms": platforms
            }
            
        except Exception as e:
            logger.error("platform_performance_error", error=str(e), workspace_id=workspace_id)
            return {"error": "Failed to generate platform performance data"}
    
    @staticmethod
    def get_top_performing_posts(
        db: Session,
        workspace_id: str,
        limit: int = 10,
        days: int = 30,
        platform: str = None
    ) -> List[Dict[str, Any]]:
        """
        Get top performing posts by engagement
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            limit: Number of posts to return
            days: Number of days to analyze
            platform: Optional platform filter
        
        Returns:
            List of top performing posts
        """
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Calculate engagement score and get top posts
            query_filters = [
                Post.workspace_id == workspace_id,
                Post.created_at >= start_date,
                Post.status == "published"
            ]
            
            # Add platform filter if specified
            if platform:
                query_filters.append(Post.platforms.any(platform))
            
            posts = db.query(Post).filter(and_(*query_filters)).all()
            
            # Calculate engagement scores
            post_scores = []
            for post in posts:
                engagement_score = (
                    (post.likes_count or 0) +
                    (post.comments_count or 0) +
                    (post.shares_count or 0)
                )
                
                post_scores.append({
                    "id": str(post.id),
                    "content": post.content[:100] + "..." if len(post.content) > 100 else post.content,
                    "platforms": post.platforms or [],
                    "created_at": post.created_at.isoformat(),
                    "likes": post.likes_count or 0,
                    "comments": post.comments_count or 0,
                    "shares": post.shares_count or 0,
                    "impressions": post.impressions_count or 0,
                    "engagement_score": engagement_score
                })
            
            # Sort by engagement score and return top posts
            top_posts = sorted(post_scores, key=lambda x: x["engagement_score"], reverse=True)[:limit]
            
            return top_posts
            
        except Exception as e:
            logger.error("top_posts_error", error=str(e), workspace_id=workspace_id)
            return []
