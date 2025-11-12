"""
Scheduler Service - Content scheduling and automation
"""
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import structlog

from app.models.post import Post
from .publisher_service import PublisherService

logger = structlog.get_logger()


class SchedulerService:
    """Service for content scheduling and automation"""
    
    @staticmethod
    async def process_scheduled_posts(db: Session) -> Dict[str, Any]:
        """
        Process posts scheduled for publication
        
        Args:
            db: Database session
        
        Returns:
            Processing results
        """
        try:
            # Get posts scheduled for now or earlier
            now = datetime.utcnow()
            scheduled_posts = db.query(Post).filter(
                Post.status == "scheduled",
                Post.scheduled_for <= now
            ).all()
            
            if not scheduled_posts:
                return {
                    "success": True,
                    "processed": 0,
                    "message": "No posts scheduled for publication"
                }
            
            results = []
            successful = 0
            failed = 0
            
            for post in scheduled_posts:
                try:
                    # Publish the post
                    result = await PublisherService.publish_to_platform(
                        db=db,
                        workspace_id=post.workspace_id,
                        platform=post.platform,
                        content=post.content,
                        media_urls=post.media_urls
                    )
                    
                    if result.get("success"):
                        # Update post status to published
                        post.status = "published"
                        post.published_at = now
                        post.platform_post_id = result.get("post_id")
                        successful += 1
                        
                        logger.info("scheduled_post_published", 
                                   post_id=str(post.id), 
                                   platform=post.platform)
                    else:
                        # Mark as failed
                        post.status = "failed"
                        post.error_message = result.get("error", "Unknown error")
                        failed += 1
                        
                        logger.error("scheduled_post_failed", 
                                    post_id=str(post.id), 
                                    error=result.get("error"))
                    
                    results.append({
                        "post_id": str(post.id),
                        "platform": post.platform,
                        "success": result.get("success", False),
                        "error": result.get("error")
                    })
                    
                except Exception as e:
                    post.status = "failed"
                    post.error_message = str(e)
                    failed += 1
                    
                    logger.error("scheduled_post_exception", 
                                post_id=str(post.id), 
                                error=str(e))
                    
                    results.append({
                        "post_id": str(post.id),
                        "platform": post.platform,
                        "success": False,
                        "error": str(e)
                    })
            
            # Commit all changes
            db.commit()
            
            return {
                "success": True,
                "processed": len(scheduled_posts),
                "successful": successful,
                "failed": failed,
                "results": results
            }
            
        except Exception as e:
            db.rollback()
            logger.error("process_scheduled_posts_error", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    def get_upcoming_posts(
        db: Session,
        workspace_id: str,
        hours: int = 24
    ) -> List[Post]:
        """
        Get posts scheduled for the next N hours
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            hours: Number of hours to look ahead
        
        Returns:
            List of upcoming scheduled posts
        """
        try:
            now = datetime.utcnow()
            future_time = now + timedelta(hours=hours)
            
            posts = db.query(Post).filter(
                Post.workspace_id == workspace_id,
                Post.status == "scheduled",
                Post.scheduled_for >= now,
                Post.scheduled_for <= future_time
            ).order_by(Post.scheduled_for).all()
            
            return posts
            
        except Exception as e:
            logger.error("get_upcoming_posts_error", error=str(e))
            return []
    
    @staticmethod
    def reschedule_post(
        db: Session,
        post_id: str,
        workspace_id: str,
        new_scheduled_time: datetime
    ) -> Dict[str, Any]:
        """
        Reschedule a post
        
        Args:
            db: Database session
            post_id: Post ID
            workspace_id: Workspace ID
            new_scheduled_time: New scheduled time
        
        Returns:
            Rescheduling result
        """
        try:
            post = db.query(Post).filter(
                Post.id == post_id,
                Post.workspace_id == workspace_id,
                Post.status == "scheduled"
            ).first()
            
            if not post:
                return {
                    "success": False,
                    "error": "Scheduled post not found"
                }
            
            post.scheduled_for = new_scheduled_time
            db.commit()
            
            logger.info("post_rescheduled", 
                       post_id=post_id, 
                       new_time=new_scheduled_time.isoformat())
            
            return {
                "success": True,
                "message": "Post rescheduled successfully",
                "new_scheduled_time": new_scheduled_time.isoformat()
            }
            
        except Exception as e:
            db.rollback()
            logger.error("reschedule_post_error", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    def cancel_scheduled_post(
        db: Session,
        post_id: str,
        workspace_id: str
    ) -> Dict[str, Any]:
        """
        Cancel a scheduled post
        
        Args:
            db: Database session
            post_id: Post ID
            workspace_id: Workspace ID
        
        Returns:
            Cancellation result
        """
        try:
            post = db.query(Post).filter(
                Post.id == post_id,
                Post.workspace_id == workspace_id,
                Post.status == "scheduled"
            ).first()
            
            if not post:
                return {
                    "success": False,
                    "error": "Scheduled post not found"
                }
            
            post.status = "draft"
            post.scheduled_for = None
            db.commit()
            
            logger.info("scheduled_post_cancelled", post_id=post_id)
            
            return {
                "success": True,
                "message": "Scheduled post cancelled and reverted to draft"
            }
            
        except Exception as e:
            db.rollback()
            logger.error("cancel_scheduled_post_error", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }
