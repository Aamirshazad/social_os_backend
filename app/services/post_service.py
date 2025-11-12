"""
Post Service - Business logic for post operations
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
import structlog

from app.models.post import Post
from app.schemas.post import PostCreate, PostUpdate, PostStatus
from app.core.exceptions import NotFoundError, ValidationError

logger = structlog.get_logger()


class PostService:
    """Service for post operations"""
    
    @staticmethod
    def transformFromDB(post: Post) -> dict:
        """
        Transform Post model to dictionary format
        
        Args:
            post: Post model instance
        
        Returns:
            Dictionary with post data
        """
        return {
            "id": str(post.id),
            "workspace_id": str(post.workspace_id),
            "created_by": str(post.created_by),
            "topic": post.topic,
            "platforms": post.platforms,
            "content": post.content,
            "status": post.status,
            "scheduled_at": post.scheduled_at.isoformat() if post.scheduled_at else None,
            "published_at": post.published_at.isoformat() if post.published_at else None,
            "campaign_id": str(post.campaign_id) if post.campaign_id else None,
            "engagement_score": post.engagement_score,
            "engagement_suggestions": post.engagement_suggestions,
            "created_at": post.created_at.isoformat(),
            "updated_at": post.updated_at.isoformat()
        }
    
    @staticmethod
    def get_all_posts(
        db: Session,
        workspace_id: str,
        status: Optional[PostStatus] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Post]:
        """
        Get all posts for a workspace
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            status: Optional status filter
            limit: Maximum number of posts
            offset: Offset for pagination
        
        Returns:
            List of posts
        """
        query = db.query(Post).filter(Post.workspace_id == workspace_id)
        
        if status:
            query = query.filter(Post.status == status.value)
        
        posts = query.order_by(Post.created_at.desc()).offset(offset).limit(limit).all()
        
        return posts
    
    @staticmethod
    def get_post_by_id(db: Session, post_id: str, workspace_id: str) -> Post:
        """
        Get a post by ID
        
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
            Post.id == post_id,
            Post.workspace_id == workspace_id
        ).first()
        
        if not post:
            raise NotFoundError("Post")
        
        return post
    
    @staticmethod
    def create_post(
        db: Session,
        post_data: PostCreate,
        user_id: str,
        workspace_id: str
    ) -> Post:
        """
        Create a new post
        
        Args:
            db: Database session
            post_data: Post creation data
            user_id: Creator user ID
            workspace_id: Workspace ID
        
        Returns:
            Created post
        """
        post = Post(
            workspace_id=workspace_id,
            created_by=user_id,
            topic=post_data.topic,
            platforms=[p.value for p in post_data.platforms],
            content=post_data.content,
            status=post_data.status.value,
            scheduled_at=post_data.scheduled_at,
            campaign_id=post_data.campaign_id
        )
        
        db.add(post)
        db.commit()
        db.refresh(post)
        
        logger.info("post_created", post_id=str(post.id), workspace_id=workspace_id)
        
        return post
    
    @staticmethod
    def update_post(
        db: Session,
        post_id: str,
        post_data: PostUpdate,
        workspace_id: str
    ) -> Post:
        """
        Update a post
        
        Args:
            db: Database session
            post_id: Post ID
            post_data: Post update data
            workspace_id: Workspace ID
        
        Returns:
            Updated post
        
        Raises:
            NotFoundError: If post not found
        """
        post = PostService.get_post_by_id(db, post_id, workspace_id)
        
        # Update fields
        update_data = post_data.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            if field == "platforms" and value:
                setattr(post, field, [p.value for p in value])
            elif field == "status" and value:
                setattr(post, field, value.value)
            else:
                setattr(post, field, value)
        
        db.commit()
        db.refresh(post)
        
        logger.info("post_updated", post_id=post_id, workspace_id=workspace_id)
        
        return post
    
    @staticmethod
    def delete_post(db: Session, post_id: str, workspace_id: str) -> None:
        """
        Delete a post
        
        Args:
            db: Database session
            post_id: Post ID
            workspace_id: Workspace ID
        
        Raises:
            NotFoundError: If post not found
        """
        post = PostService.get_post_by_id(db, post_id, workspace_id)
        
        db.delete(post)
        db.commit()
        
        logger.info("post_deleted", post_id=post_id, workspace_id=workspace_id)
    
    @staticmethod
    def update_post_status(
        db: Session,
        post_id: str,
        status: PostStatus,
        workspace_id: str
    ) -> Post:
        """
        Update post status
        
        Args:
            db: Database session
            post_id: Post ID
            status: New status
            workspace_id: Workspace ID
        
        Returns:
            Updated post
        """
        post = PostService.get_post_by_id(db, post_id, workspace_id)
        
        post.status = status.value
        
        if status == PostStatus.PUBLISHED:
            post.published_at = datetime.utcnow()
        
        db.commit()
        db.refresh(post)
        
        logger.info("post_status_updated", post_id=post_id, status=status.value)
        
        return post
    
    @staticmethod
    def get_posts_by_campaign(
        db: Session,
        campaign_id: str,
        workspace_id: str
    ) -> List[Post]:
        """Get posts by campaign"""
        posts = db.query(Post).filter(
            Post.workspace_id == workspace_id,
            Post.campaign_id == campaign_id
        ).all()
        
        return posts
    
    @staticmethod
    def get_scheduled_posts(db: Session, workspace_id: str) -> List[Post]:
        """
        Get posts that are scheduled to be published
        
        Args:
            db: Database session
            workspace_id: Workspace ID
        
        Returns:
            List of scheduled posts
        """
        now = datetime.utcnow()
        
        posts = db.query(Post).filter(
            Post.workspace_id == workspace_id,
            Post.status == PostStatus.SCHEDULED.value,
            Post.scheduled_at <= now
        ).all()
        
        return posts
