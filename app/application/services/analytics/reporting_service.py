"""
Reporting Service - Generate analytics reports
"""
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import structlog

from .metrics_service import MetricsService

logger = structlog.get_logger()


class ReportingService:
    """Service for generating analytics reports"""
    
    @staticmethod
    def generate_performance_report(
        db: Session,
        workspace_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Generate comprehensive performance report
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            days: Number of days to analyze
        
        Returns:
            Comprehensive performance report
        """
        try:
            # Get overview metrics
            overview = MetricsService.get_overview(db, workspace_id, days)
            
            # Get platform performance
            platform_performance = MetricsService.get_platform_performance(db, workspace_id, days)
            
            # Get top performing posts
            top_posts = MetricsService.get_top_performing_posts(db, workspace_id, 5, days)
            
            # Generate insights
            insights = ReportingService._generate_insights(overview, platform_performance, top_posts)
            
            report = {
                "report_type": "performance",
                "generated_at": datetime.utcnow().isoformat(),
                "workspace_id": workspace_id,
                "period": overview.get("period", {}),
                "overview": overview,
                "platform_performance": platform_performance,
                "top_posts": top_posts,
                "insights": insights
            }
            
            logger.info("performance_report_generated", workspace_id=workspace_id)
            return report
            
        except Exception as e:
            logger.error("performance_report_error", error=str(e), workspace_id=workspace_id)
            return {"error": "Failed to generate performance report"}
    
    @staticmethod
    def _generate_insights(
        overview: Dict[str, Any],
        platform_performance: Dict[str, Any],
        top_posts: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Generate insights from analytics data
        
        Args:
            overview: Overview metrics
            platform_performance: Platform performance data
            top_posts: Top performing posts
        
        Returns:
            List of insights
        """
        insights = []
        
        try:
            # Posting frequency insight
            posts_data = overview.get("posts", {})
            total_posts = posts_data.get("total", 0)
            period_days = overview.get("period", {}).get("days", 30)
            
            if total_posts > 0:
                avg_posts_per_day = total_posts / period_days
                if avg_posts_per_day < 1:
                    insights.append("Consider increasing posting frequency to improve engagement")
                elif avg_posts_per_day > 3:
                    insights.append("High posting frequency - monitor for audience fatigue")
            
            # Engagement rate insight
            engagement_data = overview.get("engagement", {})
            engagement_rate = engagement_data.get("engagement_rate", 0)
            
            if engagement_rate < 1:
                insights.append("Low engagement rate - consider improving content quality or posting times")
            elif engagement_rate > 5:
                insights.append("Excellent engagement rate - current strategy is working well")
            
            # Platform performance insight
            platforms = platform_performance.get("platforms", {})
            if platforms:
                best_platform = max(platforms.items(), key=lambda x: x[1].get("engagement_rate", 0))
                insights.append(f"{best_platform[0].title()} shows the best engagement rate - consider focusing more content there")
            
            # Top posts insight
            if top_posts:
                top_post = top_posts[0]
                insights.append(f"Your top post on {top_post['platform']} achieved {top_post['engagement_score']} total engagements")
            
        except Exception as e:
            logger.error("insights_generation_error", error=str(e))
            insights.append("Unable to generate detailed insights at this time")
        
        return insights
