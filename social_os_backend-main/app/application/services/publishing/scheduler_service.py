"""
Scheduler Service - Content scheduling and automation via Supabase HTTP
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import structlog

from app.core.supabase import get_supabase_service_client
from .publisher_service import PublisherService

logger = structlog.get_logger()


class SchedulerService:
    """Service for content scheduling and automation"""
    
    @staticmethod
    async def process_scheduled_posts(db: Any) -> Dict[str, Any]:
        """
        Process posts scheduled for publication
        
        Args:
            db: Database session (unused, kept for compatibility)
        
        Returns:
            Processing results
        """
        try:
            supabase = get_supabase_service_client()
            now = datetime.utcnow()
            
            # Get posts scheduled for now or earlier
            response = (
                supabase.table("posts")
                .select("*")
                .eq("status", "scheduled")
                .lte("scheduled_for", now.isoformat())
                .execute()
            )
            
            scheduled_posts = getattr(response, "data", None) or []
            
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
                        workspace_id=post.get("workspace_id"),
                        platform=post.get("platform"),
                        content=post.get("content"),
                        media_urls=post.get("media_urls")
                    )
                    
                    if result.get("success"):
                        # Update post status to published
                        supabase.table("posts").update({
                            "status": "published",
                            "published_at": now.isoformat(),
                            "platform_post_id": result.get("post_id")
                        }).eq("id", post.get("id")).execute()
                        
                        successful += 1
                        
                        logger.info("scheduled_post_published", 
                                   post_id=post.get("id"), 
                                   platform=post.get("platform"))
                    else:
                        # Mark as failed
                        supabase.table("posts").update({
                            "status": "failed",
                            "error_message": result.get("error", "Unknown error")
                        }).eq("id", post.get("id")).execute()
                        
                        failed += 1
                        
                        logger.error("scheduled_post_failed", 
                                    post_id=post.get("id"), 
                                    error=result.get("error"))
                    
                    results.append({
                        "post_id": post.get("id"),
                        "platform": post.get("platform"),
                        "success": result.get("success", False),
                        "error": result.get("error")
                    })
                    
                except Exception as e:
                    supabase.table("posts").update({
                        "status": "failed",
                        "error_message": str(e)
                    }).eq("id", post.get("id")).execute()
                    
                    failed += 1
                    
                    logger.error("scheduled_post_exception", 
                                post_id=post.get("id"), 
                                error=str(e))
                    
                    results.append({
                        "post_id": post.get("id"),
                        "platform": post.get("platform"),
                        "success": False,
                        "error": str(e)
                    })
            
            return {
                "success": True,
                "processed": len(scheduled_posts),
                "successful": successful,
                "failed": failed,
                "results": results
            }
            
        except Exception as e:
            logger.error("process_scheduled_posts_error", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    def get_upcoming_posts(
        db: Any,
        workspace_id: str,
        hours: int = 24
    ) -> List[Dict[str, Any]]:
        """
        Get posts scheduled for the next N hours
        
        Args:
            db: Database session (unused, kept for compatibility)
            workspace_id: Workspace ID
            hours: Number of hours to look ahead
        
        Returns:
            List of upcoming scheduled posts
        """
        try:
            supabase = get_supabase_service_client()
            now = datetime.utcnow()
            future_time = now + timedelta(hours=hours)
            
            response = (
                supabase.table("posts")
                .select("*")
                .eq("workspace_id", workspace_id)
                .eq("status", "scheduled")
                .gte("scheduled_for", now.isoformat())
                .lte("scheduled_for", future_time.isoformat())
                .order("scheduled_for")
                .execute()
            )
            
            posts = getattr(response, "data", None) or []
            return posts
            
        except Exception as e:
            logger.error("get_upcoming_posts_error", error=str(e))
            return []
    
    @staticmethod
    def reschedule_post(
        db: Any,
        post_id: str,
        workspace_id: str,
        new_scheduled_time: datetime
    ) -> Dict[str, Any]:
        """
        Reschedule a post
        
        Args:
            db: Database session (unused, kept for compatibility)
            post_id: Post ID
            workspace_id: Workspace ID
            new_scheduled_time: New scheduled time
        
        Returns:
            Rescheduling result
        """
        try:
            supabase = get_supabase_service_client()
            
            # Check if post exists and is scheduled
            check_response = (
                supabase.table("posts")
                .select("id")
                .eq("id", post_id)
                .eq("workspace_id", workspace_id)
                .eq("status", "scheduled")
                .maybe_single()
                .execute()
            )
            
            if not getattr(check_response, "data", None):
                return {
                    "success": False,
                    "error": "Scheduled post not found"
                }
            
            # Update scheduled time
            response = (
                supabase.table("posts")
                .update({"scheduled_for": new_scheduled_time.isoformat()})
                .eq("id", post_id)
                .eq("workspace_id", workspace_id)
                .execute()
            )
            
            error = getattr(response, "error", None)
            if error:
                raise Exception(str(error))
            
            logger.info("post_rescheduled", 
                       post_id=post_id, 
                       new_time=new_scheduled_time.isoformat())
            
            return {
                "success": True,
                "message": "Post rescheduled successfully",
                "new_scheduled_time": new_scheduled_time.isoformat()
            }
            
        except Exception as e:
            logger.error("reschedule_post_error", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }
    
    @staticmethod
    def cancel_scheduled_post(
        db: Any,
        post_id: str,
        workspace_id: str
    ) -> Dict[str, Any]:
        """
        Cancel a scheduled post
        
        Args:
            db: Database session (unused, kept for compatibility)
            post_id: Post ID
            workspace_id: Workspace ID
        
        Returns:
            Cancellation result
        """
        try:
            supabase = get_supabase_service_client()
            
            # Check if post exists and is scheduled
            check_response = (
                supabase.table("posts")
                .select("id")
                .eq("id", post_id)
                .eq("workspace_id", workspace_id)
                .eq("status", "scheduled")
                .maybe_single()
                .execute()
            )
            
            if not getattr(check_response, "data", None):
                return {
                    "success": False,
                    "error": "Scheduled post not found"
                }
            
            # Cancel the scheduled post
            response = (
                supabase.table("posts")
                .update({"status": "draft", "scheduled_for": None})
                .eq("id", post_id)
                .eq("workspace_id", workspace_id)
                .execute()
            )
            
            error = getattr(response, "error", None)
            if error:
                raise Exception(str(error))
            
            logger.info("scheduled_post_cancelled", post_id=post_id)
            
            return {
                "success": True,
                "message": "Scheduled post cancelled and reverted to draft"
            }
            
        except Exception as e:
            logger.error("cancel_scheduled_post_error", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }
