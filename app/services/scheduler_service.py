"""
Scheduler Service - Post scheduling and automated publishing
"""
from typing import Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime
import asyncio
import structlog

logger = structlog.get_logger()


class SchedulerService:
    """Service for scheduling posts"""
    
    @staticmethod
    async def queue_scheduled_post(
        post_id: str,
        scheduled_time: datetime
    ) -> None:
        """
        Queue a post for scheduled publishing
        
        Args:
            post_id: Post ID
            scheduled_time: Time to publish
        
        Note: In production, this should use Celery or similar task queue
        """
        logger.info(
            "post_queued",
            post_id=post_id,
            scheduled_time=scheduled_time.isoformat()
        )
        
        # Calculate delay
        now = datetime.utcnow()
        delay = (scheduled_time - now).total_seconds()
        
        if delay > 0:
            # In production, use Celery:
            # publish_post_task.apply_async(args=[post_id], countdown=delay)
            logger.info("scheduled_task_created", post_id=post_id, delay_seconds=delay)
        else:
            logger.warning("scheduled_time_in_past", post_id=post_id)
    
    @staticmethod
    def get_queue_status(
        db: Session,
        workspace_id: str
    ) -> Dict[str, Any]:
        """
        Get scheduler queue status
        
        Args:
            db: Database session
            workspace_id: Workspace ID
        
        Returns:
            Queue status information
        """
        from app.models.post import Post
        
        # Count scheduled posts
        scheduled_count = db.query(Post).filter(
            Post.workspace_id == workspace_id,
            Post.status == "scheduled"
        ).count()
        
        # Get next scheduled post
        next_post = db.query(Post).filter(
            Post.workspace_id == workspace_id,
            Post.status == "scheduled",
            Post.scheduled_at.isnot(None)
        ).order_by(Post.scheduled_at).first()
        
        return {
            "scheduled_posts": scheduled_count,
            "next_scheduled": {
                "post_id": str(next_post.id) if next_post else None,
                "scheduled_time": next_post.scheduled_at.isoformat() if next_post and next_post.scheduled_at else None
            } if next_post else None,
            "queue_active": True
        }
    
    @staticmethod
    async def process_scheduled_posts(db: Session) -> int:
        """
        Process posts that are due for publishing
        
        This should be called periodically (e.g., every minute)
        by a background worker
        
        Args:
            db: Database session
        
        Returns:
            Number of posts processed
        """
        from app.models.post import Post
        from app.services.publishing_service import PublishingService
        
        # Find posts due for publishing
        now = datetime.utcnow()
        due_posts = db.query(Post).filter(
            Post.status == "scheduled",
            Post.scheduled_at <= now
        ).all()
        
        processed = 0
        for post in due_posts:
            try:
                # Publish to all platforms
                content_by_platform = post.content or {}
                
                # Extract media URLs from content if present
                media_urls = []
                if isinstance(post.content, dict):
                    if post.content.get('generatedImage'):
                        media_urls.append(post.content.get('generatedImage'))
                    if post.content.get('generatedVideoUrl'):
                        media_urls.append(post.content.get('generatedVideoUrl'))
                
                results = await PublishingService.publish_to_multiple_platforms(
                    db=db,
                    workspace_id=str(post.workspace_id),
                    platforms=post.platforms,
                    content_by_platform=content_by_platform,
                    media_urls=media_urls if media_urls else None
                )
                
                # Update post status
                post.status = "published"
                post.published_at = datetime.utcnow()
                db.commit()
                
                processed += 1
                
                logger.info(
                    "scheduled_post_published",
                    post_id=str(post.id),
                    platforms=post.platforms
                )
                
            except Exception as e:
                logger.error(
                    "scheduled_post_publish_error",
                    post_id=str(post.id),
                    error=str(e)
                )
                # Mark as failed
                post.status = "failed"
                db.commit()
        
        return processed
