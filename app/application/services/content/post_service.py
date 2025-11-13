"""
Post Service - Content post management
"""
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime
import structlog

from app.models.post import Post
from app.core.exceptions import NotFoundError

logger = structlog.get_logger()


class PostService:
    """Service for managing content posts"""
    
    @staticmethod
    def create_post(
        db: Session,
        workspace_id: str,
        user_id: str,
        content: str,
        platform: str,
        status: str = "draft",
        scheduled_for: Optional[datetime] = None,
        media_urls: Optional[List[str]] = None,
        hashtags: Optional[List[str]] = None
    ) -> Post:
        """
        Create a new post
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            user_id: User ID
            content: Post content
            platform: Target platform
            status: Post status (draft, scheduled, published)
            scheduled_for: Scheduled publication time
            media_urls: List of media URLs
            hashtags: List of hashtags
        
        Returns:
            Created Post object
        """
        try:
            post = Post(
                workspace_id=workspace_id,
                user_id=user_id,
                content=content,
                platform=platform,
                status=status,
                scheduled_for=scheduled_for,
                media_urls=media_urls or [],
                hashtags=hashtags or []
            )
            
            db.add(post)
            db.commit()
            db.refresh(post)
            
            logger.info("post_created", post_id=str(post.id), platform=platform, status=status)
            return post
            
        except Exception as e:
            db.rollback()
            logger.error("post_creation_error", error=str(e))
            raise
    
    @staticmethod
    def get_post(db: Session, post_id: str, workspace_id: str) -> Post:
        """
        Get post by ID
        
        Args:
            db: Database session
            post_id: Post ID
            workspace_id: Workspace ID
        
        Returns:
            Post object
        
        Raises:
            NotFoundError: If post not found
        """
        post = db.query(Post).filter(
            and_(Post.id == post_id, Post.workspace_id == workspace_id)
        ).first()
        
        if not post:
            raise NotFoundError(f"Post {post_id} not found")
        
        return post
    
    @staticmethod
    def get_posts(
        db: Session,
        workspace_id: str,
        status: Optional[str] = None,
        platform: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Post]:
        """
        Get posts with filtering
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            status: Filter by status
            platform: Filter by platform
            limit: Number of posts to return
            offset: Number of posts to skip
        
        Returns:
            List of Post objects
        """
        query = db.query(Post).filter(Post.workspace_id == workspace_id)
        
        if status:
            query = query.filter(Post.status == status)
        
        if platform:
            query = query.filter(Post.platform == platform)
        
        posts = query.order_by(Post.created_at.desc()).offset(offset).limit(limit).all()
        
        return posts
    
    @staticmethod
    def update_post(
        db: Session,
        post_id: str,
        workspace_id: str,
        **updates
    ) -> Post:
        """
        Update post
        
        Args:
            db: Database session
            post_id: Post ID
            workspace_id: Workspace ID
            **updates: Fields to update
        
        Returns:
            Updated Post object
        
        Raises:
            NotFoundError: If post not found
        """
        post = PostService.get_post(db, post_id, workspace_id)
        
        for field, value in updates.items():
            if hasattr(post, field):
                setattr(post, field, value)
        
        post.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(post)
        
        logger.info("post_updated", post_id=post_id, updates=list(updates.keys()))
        return post
    
    @staticmethod
    def delete_post(db: Session, post_id: str, workspace_id: str) -> bool:
        """
        Delete post
        
        Args:
            db: Database session
            post_id: Post ID
            workspace_id: Workspace ID
        
        Returns:
            True if deleted successfully
        
        Raises:
            NotFoundError: If post not found
        """
        post = PostService.get_post(db, post_id, workspace_id)
        
        db.delete(post)
        db.commit()
        
        logger.info("post_deleted", post_id=post_id)
        return True
    
    @staticmethod
    def get_scheduled_posts(db: Session, workspace_id: str) -> List[Post]:
        """
        Get posts scheduled for publication
        
        Args:
            db: Database session
            workspace_id: Workspace ID
        
        Returns:
            List of scheduled posts
        """
        now = datetime.utcnow()
        
        posts = db.query(Post).filter(
            and_(
                Post.workspace_id == workspace_id,
                Post.status == "scheduled",
                Post.scheduled_for <= now
            )
        ).all()
        
        return posts
    
    @staticmethod
    def search_posts(
        db: Session,
        workspace_id: str,
        query: str,
        limit: int = 20
    ) -> List[Post]:
        """
        Search posts by content
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            query: Search query
            limit: Number of results to return
        
        Returns:
            List of matching posts
        """
        posts = db.query(Post).filter(
            and_(
                Post.workspace_id == workspace_id,
                or_(
                    Post.content.ilike(f"%{query}%"),
                    Post.hashtags.any(query.lower())
                )
            )
        ).order_by(Post.created_at.desc()).limit(limit).all()
        
        return posts
