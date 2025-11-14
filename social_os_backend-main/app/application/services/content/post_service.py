"""
Post Service - Content post management via Supabase HTTP
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import structlog

from app.core.exceptions import NotFoundError
from app.core.supabase import get_supabase_service_client

logger = structlog.get_logger()


class PostService:
    """Service for managing content posts"""
    
    @staticmethod
    def create_post(
        db: Any,
        workspace_id: str,
        user_id: str,
        content: str,
        platform: str,
        status: str = "draft",
        scheduled_for: Optional[datetime] = None,
        media_urls: Optional[List[str]] = None,
        hashtags: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Create a new post
        
        Args:
            db: Database session (unused, kept for compatibility)
            workspace_id: Workspace ID
            user_id: User ID
            content: Post content
            platform: Target platform
            status: Post status (draft, scheduled, published)
            scheduled_for: Scheduled publication time
            media_urls: List of media URLs
            hashtags: List of hashtags
        
        Returns:
            Created post dictionary
        """
        try:
            supabase = get_supabase_service_client()
            
            payload = {
                "workspace_id": workspace_id,
                "user_id": user_id,
                "content": content,
                "platform": platform,
                "status": status,
                "scheduled_for": scheduled_for.isoformat() if scheduled_for else None,
                "media_urls": media_urls or [],
                "hashtags": hashtags or []
            }
            
            response = (
                supabase.table("posts")
                .insert(payload)
                .select("*")
                .maybe_single()
                .execute()
            )
            
            error = getattr(response, "error", None)
            if error:
                logger.error("post_creation_error", error=str(error))
                raise Exception(str(error))
            
            post = getattr(response, "data", None)
            logger.info("post_created", post_id=post.get("id"), platform=platform, status=status)
            return post
            
        except Exception as e:
            logger.error("post_creation_error", error=str(e))
            raise
    
    @staticmethod
    def get_post(db: Any, post_id: str, workspace_id: str) -> Dict[str, Any]:
        """
        Get post by ID
        
        Args:
            db: Database session (unused, kept for compatibility)
            post_id: Post ID
            workspace_id: Workspace ID
        
        Returns:
            Post dictionary
        
        Raises:
            NotFoundError: If post not found
        """
        try:
            supabase = get_supabase_service_client()
            
            response = (
                supabase.table("posts")
                .select("*")
                .eq("id", post_id)
                .eq("workspace_id", workspace_id)
                .maybe_single()
                .execute()
            )
            
            post = getattr(response, "data", None)
            if not post:
                raise NotFoundError(f"Post {post_id} not found")
            
            return post
            
        except NotFoundError:
            raise
        except Exception as e:
            logger.error("get_post_error", error=str(e), post_id=post_id)
            raise
    
    @staticmethod
    def get_posts(
        db: Any,
        workspace_id: str,
        status: Optional[str] = None,
        platform: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get posts with filtering
        
        Args:
            db: Database session (unused, kept for compatibility)
            workspace_id: Workspace ID
            status: Filter by status
            platform: Filter by platform
            limit: Number of posts to return
            offset: Number of posts to skip
        
        Returns:
            List of post dictionaries
        """
        try:
            supabase = get_supabase_service_client()
            
            query = supabase.table("posts").select("*").eq("workspace_id", workspace_id)
            
            if status:
                query = query.eq("status", status)
            
            if platform:
                query = query.eq("platform", platform)
            
            response = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
            
            posts = getattr(response, "data", None) or []
            return posts
            
        except Exception as e:
            logger.error("get_posts_error", error=str(e), workspace_id=workspace_id)
            return []
    
    @staticmethod
    def update_post(
        db: Any,
        post_id: str,
        workspace_id: str,
        **updates
    ) -> Dict[str, Any]:
        """
        Update post
        
        Args:
            db: Database session (unused, kept for compatibility)
            post_id: Post ID
            workspace_id: Workspace ID
            **updates: Fields to update
        
        Returns:
            Updated post dictionary
        
        Raises:
            NotFoundError: If post not found
        """
        try:
            # Verify post exists
            PostService.get_post(db, post_id, workspace_id)
            
            supabase = get_supabase_service_client()
            
            updates["updated_at"] = datetime.utcnow().isoformat()
            
            response = (
                supabase.table("posts")
                .update(updates)
                .eq("id", post_id)
                .eq("workspace_id", workspace_id)
                .select("*")
                .maybe_single()
                .execute()
            )
            
            error = getattr(response, "error", None)
            if error:
                logger.error("post_update_error", error=str(error))
                raise Exception(str(error))
            
            post = getattr(response, "data", None)
            logger.info("post_updated", post_id=post_id, updates=list(updates.keys()))
            return post
            
        except NotFoundError:
            raise
        except Exception as e:
            logger.error("post_update_error", error=str(e), post_id=post_id)
            raise
    
    @staticmethod
    def delete_post(db: Any, post_id: str, workspace_id: str) -> bool:
        """
        Delete post
        
        Args:
            db: Database session (unused, kept for compatibility)
            post_id: Post ID
            workspace_id: Workspace ID
        
        Returns:
            True if deleted successfully
        
        Raises:
            NotFoundError: If post not found
        """
        try:
            # Verify post exists
            PostService.get_post(db, post_id, workspace_id)
            
            supabase = get_supabase_service_client()
            
            response = (
                supabase.table("posts")
                .delete()
                .eq("id", post_id)
                .eq("workspace_id", workspace_id)
                .execute()
            )
            
            error = getattr(response, "error", None)
            if error:
                logger.error("post_delete_error", error=str(error))
                raise Exception(str(error))
            
            logger.info("post_deleted", post_id=post_id)
            return True
            
        except NotFoundError:
            raise
        except Exception as e:
            logger.error("post_delete_error", error=str(e), post_id=post_id)
            raise
    
    @staticmethod
    def get_scheduled_posts(db: Any, workspace_id: str) -> List[Dict[str, Any]]:
        """
        Get posts scheduled for publication
        
        Args:
            db: Database session (unused, kept for compatibility)
            workspace_id: Workspace ID
        
        Returns:
            List of scheduled posts
        """
        try:
            supabase = get_supabase_service_client()
            now = datetime.utcnow().isoformat()
            
            response = (
                supabase.table("posts")
                .select("*")
                .eq("workspace_id", workspace_id)
                .eq("status", "scheduled")
                .lte("scheduled_for", now)
                .execute()
            )
            
            posts = getattr(response, "data", None) or []
            return posts
            
        except Exception as e:
            logger.error("get_scheduled_posts_error", error=str(e), workspace_id=workspace_id)
            return []
    
    @staticmethod
    def search_posts(
        db: Any,
        workspace_id: str,
        query: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search posts by content
        
        Args:
            db: Database session (unused, kept for compatibility)
            workspace_id: Workspace ID
            query: Search query
            limit: Number of results to return
        
        Returns:
            List of matching posts
        """
        try:
            supabase = get_supabase_service_client()
            
            response = (
                supabase.table("posts")
                .select("*")
                .eq("workspace_id", workspace_id)
                .or_(f"content.ilike.%{query}%")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            
            posts = getattr(response, "data", None) or []
            return posts
            
        except Exception as e:
            logger.error("search_posts_error", error=str(e), workspace_id=workspace_id)
            return []
