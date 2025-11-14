"""
Metrics Service - Analytics and metrics collection via Supabase HTTP
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import structlog

from app.core.supabase import get_supabase_service_client

logger = structlog.get_logger()


class MetricsService:
    """Service for analytics metrics collection and calculation"""
    
    @staticmethod
    def get_overview(
        db: Any,
        workspace_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get analytics overview for workspace
        
        Args:
            db: Database session (unused, kept for compatibility)
            workspace_id: Workspace ID
            days: Number of days to analyze
        
        Returns:
            Analytics overview data
        """
        try:
            supabase = get_supabase_service_client()
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Get all posts in date range
            response = (
                supabase.table("posts")
                .select("*")
                .eq("workspace_id", workspace_id)
                .gte("created_at", start_date.isoformat())
                .lte("created_at", end_date.isoformat())
                .execute()
            )
            
            posts = getattr(response, "data", None) or []
            total_posts = len(posts)
            published_posts = len([p for p in posts if p.get("status") == "published"])
            
            # Calculate engagement metrics from published posts
            total_likes = 0
            total_comments = 0
            total_shares = 0
            total_impressions = 0
            
            for post in posts:
                if post.get("status") == "published":
                    total_likes += post.get("likes_count", 0) or 0
                    total_comments += post.get("comments_count", 0) or 0
                    total_shares += post.get("shares_count", 0) or 0
                    total_impressions += post.get("impressions_count", 0) or 0
            
            total_engagement = total_likes + total_comments + total_shares
            
            # Calculate engagement rate
            engagement_rate = 0
            if total_impressions > 0:
                engagement_rate = (total_engagement / total_impressions) * 100
            
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
                    "total_likes": total_likes,
                    "total_comments": total_comments,
                    "total_shares": total_shares,
                    "total_impressions": total_impressions,
                    "engagement_rate": round(engagement_rate, 2)
                }
            }
            
        except Exception as e:
            logger.error("analytics_overview_error", error=str(e), workspace_id=workspace_id)
            return {"error": "Failed to generate analytics overview"}
    
    @staticmethod
    def get_platform_performance(
        db: Any,
        workspace_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get platform-specific performance metrics
        
        Args:
            db: Database session (unused, kept for compatibility)
            workspace_id: Workspace ID
            days: Number of days to analyze
        
        Returns:
            Platform performance data
        """
        try:
            supabase = get_supabase_service_client()
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Get published posts in date range
            response = (
                supabase.table("posts")
                .select("*")
                .eq("workspace_id", workspace_id)
                .eq("status", "published")
                .gte("created_at", start_date.isoformat())
                .execute()
            )
            
            posts = getattr(response, "data", None) or []
            
            # Group by platform and calculate metrics
            platform_metrics = defaultdict(lambda: {
                "posts": 0,
                "likes": 0,
                "comments": 0,
                "shares": 0,
                "impressions": 0
            })
            
            for post in posts:
                platform = post.get("platform")
                if platform:
                    platform_metrics[platform]["posts"] += 1
                    platform_metrics[platform]["likes"] += post.get("likes_count", 0) or 0
                    platform_metrics[platform]["comments"] += post.get("comments_count", 0) or 0
                    platform_metrics[platform]["shares"] += post.get("shares_count", 0) or 0
                    platform_metrics[platform]["impressions"] += post.get("impressions_count", 0) or 0
            
            # Calculate engagement rates
            platforms = {}
            for platform, metrics in platform_metrics.items():
                total_engagement = metrics["likes"] + metrics["comments"] + metrics["shares"]
                engagement_rate = 0
                if metrics["impressions"] > 0:
                    engagement_rate = (total_engagement / metrics["impressions"]) * 100
                
                platforms[platform] = {
                    **metrics,
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
        db: Any,
        workspace_id: str,
        limit: int = 10,
        days: int = 30,
        platform: str = None
    ) -> List[Dict[str, Any]]:
        """
        Get top performing posts by engagement
        
        Args:
            db: Database session (unused, kept for compatibility)
            workspace_id: Workspace ID
            limit: Number of posts to return
            days: Number of days to analyze
            platform: Optional platform filter
        
        Returns:
            List of top performing posts
        """
        try:
            supabase = get_supabase_service_client()
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Build query
            query = (
                supabase.table("posts")
                .select("*")
                .eq("workspace_id", workspace_id)
                .eq("status", "published")
                .gte("created_at", start_date.isoformat())
            )
            
            if platform:
                query = query.eq("platform", platform)
            
            response = query.execute()
            posts = getattr(response, "data", None) or []
            
            # Calculate engagement scores
            post_scores = []
            for post in posts:
                engagement_score = (
                    (post.get("likes_count", 0) or 0) +
                    (post.get("comments_count", 0) or 0) +
                    (post.get("shares_count", 0) or 0)
                )
                
                content = post.get("content", "")
                post_scores.append({
                    "id": post.get("id"),
                    "content": content[:100] + "..." if len(content) > 100 else content,
                    "platform": post.get("platform"),
                    "created_at": post.get("created_at"),
                    "likes": post.get("likes_count", 0) or 0,
                    "comments": post.get("comments_count", 0) or 0,
                    "shares": post.get("shares_count", 0) or 0,
                    "impressions": post.get("impressions_count", 0) or 0,
                    "engagement_score": engagement_score
                })
            
            # Sort by engagement score and return top posts
            top_posts = sorted(post_scores, key=lambda x: x["engagement_score"], reverse=True)[:limit]
            
            return top_posts
            
        except Exception as e:
            logger.error("top_posts_error", error=str(e), workspace_id=workspace_id)
            return []
