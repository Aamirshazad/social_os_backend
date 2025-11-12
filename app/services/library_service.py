"""
Library Service - Post library/archive management
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
import structlog

from app.models.library import LibraryItem
from app.core.exceptions import NotFoundError

logger = structlog.get_logger()


class LibraryService:
    """Service for managing post library/archive"""
    
    @staticmethod
    def get_library_items(
        db: Session,
        workspace_id: str,
        limit: int = 50,
        offset: int = 0,
        platform_filter: Optional[str] = None
    ) -> List[LibraryItem]:
        """
        Get library items for workspace
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            limit: Maximum items to return
            offset: Offset for pagination
            platform_filter: Optional platform filter
        
        Returns:
            List of library items
        """
        query = db.query(LibraryItem).filter(
            LibraryItem.workspace_id == workspace_id
        )
        
        if platform_filter:
            # Filter by platform (platforms is an array column)
            query = query.filter(
                LibraryItem.platforms.contains([platform_filter])
            )
        
        items = query.order_by(
            LibraryItem.published_at.desc()
        ).offset(offset).limit(limit).all()
        
        return items
    
    @staticmethod
    def get_library_item_by_id(
        db: Session,
        library_id: str,
        workspace_id: str
    ) -> LibraryItem:
        """
        Get library item by ID
        
        Args:
            db: Database session
            library_id: Library item ID
            workspace_id: Workspace ID
        
        Returns:
            Library item
        
        Raises:
            NotFoundError: If item not found
        """
        item = db.query(LibraryItem).filter(
            LibraryItem.id == library_id,
            LibraryItem.workspace_id == workspace_id
        ).first()
        
        if not item:
            raise NotFoundError("Library item")
        
        return item
    
    @staticmethod
    def create_library_item(
        db: Session,
        workspace_id: str,
        user_id: str,
        post_id: str,
        title: str,
        topic: str,
        platforms: List[str],
        content: Dict[str, Any],
        platform_results: List[Dict[str, Any]]
    ) -> LibraryItem:
        """
        Create a library item (archive a post)
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            user_id: User ID
            post_id: Original post ID
            title: Post title
            topic: Post topic
            platforms: List of platforms
            content: Post content
            platform_results: Platform publishing results
        
        Returns:
            Created library item
        """
        # Transform platform results into platform_data
        platform_data = {}
        for result in platform_results:
            platform = result.get("platform")
            platform_data[platform] = {
                "post_id": result.get("post_id"),
                "url": result.get("url"),
                "status": "published" if result.get("success") else "failed",
                "error": result.get("error"),
                "published_at": datetime.utcnow().isoformat()
            }
        
        library_item = LibraryItem(
            id=uuid.uuid4(),
            workspace_id=workspace_id,
            original_post_id=post_id,
            title=title,
            topic=topic,
            post_type="post",
            platforms=platforms,
            content=content,
            published_at=datetime.utcnow(),
            platform_data=platform_data,
            created_by=user_id
        )
        
        db.add(library_item)
        db.commit()
        db.refresh(library_item)
        
        logger.info("library_item_created", library_id=str(library_item.id))
        
        return library_item
    
    @staticmethod
    def delete_library_item(
        db: Session,
        library_id: str,
        workspace_id: str
    ) -> None:
        """
        Delete a library item
        
        Args:
            db: Database session
            library_id: Library item ID
            workspace_id: Workspace ID
        
        Raises:
            NotFoundError: If item not found
        """
        item = LibraryService.get_library_item_by_id(db, library_id, workspace_id)
        
        db.delete(item)
        db.commit()
        
        logger.info("library_item_deleted", library_id=library_id)
    
    @staticmethod
    def get_library_stats(
        db: Session,
        workspace_id: str
    ) -> Dict[str, Any]:
        """
        Get library statistics
        
        Args:
            db: Database session
            workspace_id: Workspace ID
        
        Returns:
            Statistics dictionary
        """
        # Get total count
        total_count = db.query(LibraryItem).filter(
            LibraryItem.workspace_id == workspace_id
        ).count()
        
        # Get platform breakdown
        items = db.query(LibraryItem).filter(
            LibraryItem.workspace_id == workspace_id
        ).all()
        
        platform_counts = {}
        for item in items:
            for platform in item.platforms:
                platform_counts[platform] = platform_counts.get(platform, 0) + 1
        
        return {
            "total_posts": total_count,
            "by_platform": platform_counts,
            "last_archived": items[0].published_at.isoformat() if items else None
        }
