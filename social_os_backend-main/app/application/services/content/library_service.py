"""
Library Service - Content library management
"""
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime
import structlog

from app.models.library import LibraryItem
from app.core.exceptions import NotFoundError

logger = structlog.get_logger()


class LibraryService:
    """Service for managing content library"""
    
    @staticmethod
    def create_library_item(
        db: Session,
        workspace_id: str,
        user_id: str,
        title: str,
        content: str,
        item_type: str = "text",
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> LibraryItem:
        """
        Create a new library item
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            user_id: User ID
            title: Item title
            content: Item content
            item_type: Type of item (text, image, video, template)
            tags: List of tags
            metadata: Additional metadata
        
        Returns:
            Created LibraryItem object
        """
        try:
            item = LibraryItem(
                workspace_id=workspace_id,
                user_id=user_id,
                title=title,
                content=content,
                item_type=item_type,
                tags=tags or [],
                metadata=metadata or {}
            )
            
            db.add(item)
            db.commit()
            db.refresh(item)
            
            logger.info("library_item_created", item_id=str(item.id), item_type=item_type)
            return item
            
        except Exception as e:
            db.rollback()
            logger.error("library_item_creation_error", error=str(e))
            raise
    
    @staticmethod
    def get_library_item(db: Session, item_id: str, workspace_id: str) -> LibraryItem:
        """
        Get library item by ID
        
        Args:
            db: Database session
            item_id: Item ID
            workspace_id: Workspace ID
        
        Returns:
            LibraryItem object
        
        Raises:
            NotFoundError: If item not found
        """
        item = db.query(LibraryItem).filter(
            and_(LibraryItem.id == item_id, LibraryItem.workspace_id == workspace_id)
        ).first()
        
        if not item:
            raise NotFoundError(f"Library item {item_id} not found")
        
        return item
    
    @staticmethod
    def get_library_items(
        db: Session,
        workspace_id: str,
        item_type: Optional[str] = None,
        tags: Optional[List[str]] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[LibraryItem]:
        """
        Get library items with filtering
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            item_type: Filter by item type
            tags: Filter by tags
            limit: Number of items to return
            offset: Number of items to skip
        
        Returns:
            List of LibraryItem objects
        """
        query = db.query(LibraryItem).filter(LibraryItem.workspace_id == workspace_id)
        
        if item_type:
            query = query.filter(LibraryItem.item_type == item_type)
        
        if tags:
            for tag in tags:
                query = query.filter(LibraryItem.tags.any(tag))
        
        items = query.order_by(LibraryItem.created_at.desc()).offset(offset).limit(limit).all()
        
        return items
    
    @staticmethod
    def update_library_item(
        db: Session,
        item_id: str,
        workspace_id: str,
        **updates
    ) -> LibraryItem:
        """
        Update library item
        
        Args:
            db: Database session
            item_id: Item ID
            workspace_id: Workspace ID
            **updates: Fields to update
        
        Returns:
            Updated LibraryItem object
        
        Raises:
            NotFoundError: If item not found
        """
        item = LibraryService.get_library_item(db, item_id, workspace_id)
        
        for field, value in updates.items():
            if hasattr(item, field):
                setattr(item, field, value)
        
        db.commit()
        db.refresh(item)
        
        logger.info("library_item_updated", item_id=item_id, updates=list(updates.keys()))
        return item
    
    @staticmethod
    def delete_library_item(db: Session, item_id: str, workspace_id: str) -> bool:
        """
        Delete library item
        
        Args:
            db: Database session
            item_id: Item ID
            workspace_id: Workspace ID
        
        Returns:
            True if deleted successfully
        
        Raises:
            NotFoundError: If item not found
        """
        item = LibraryService.get_library_item(db, item_id, workspace_id)
        
        db.delete(item)
        db.commit()
        
        logger.info("library_item_deleted", item_id=item_id)
        return True
    
    @staticmethod
    def search_library(
        db: Session,
        workspace_id: str,
        query: str,
        limit: int = 20
    ) -> List[LibraryItem]:
        """
        Search library items
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            query: Search query
            limit: Number of results to return
        
        Returns:
            List of matching library items
        """
        items = db.query(LibraryItem).filter(
            and_(
                LibraryItem.workspace_id == workspace_id,
                or_(
                    LibraryItem.title.ilike(f"%{query}%"),
                    LibraryItem.content.ilike(f"%{query}%"),
                    LibraryItem.tags.any(query.lower())
                )
            )
        ).order_by(LibraryItem.created_at.desc()).limit(limit).all()
        
        return items
    
    @staticmethod
    def get_popular_tags(db: Session, workspace_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get most popular tags in library
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            limit: Number of tags to return
        
        Returns:
            List of tags with usage counts
        """
        try:
            items = db.query(LibraryItem).filter(LibraryItem.workspace_id == workspace_id).all()
            
            tag_counts: dict[str, int] = {}
            for item in items:
                for tag in item.tags or []:
                    tag_counts[tag] = tag_counts.get(tag, 0) + 1
            
            # Sort by count and return top tags
            popular_tags = [
                {"tag": tag, "count": count}
                for tag, count in sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
            ]
            
            return popular_tags
            
        except Exception as e:
            logger.error("popular_tags_error", error=str(e))
            return []
