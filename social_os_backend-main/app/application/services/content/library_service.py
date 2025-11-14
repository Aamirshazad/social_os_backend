"""
Library Service - Content library management via Supabase HTTP
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import structlog

from app.core.exceptions import NotFoundError
from app.core.supabase import get_supabase_service_client

logger = structlog.get_logger()


class LibraryService:
    """Service for managing content library"""
    
    @staticmethod
    def create_library_item(
        db: Any,
        workspace_id: str,
        user_id: str,
        title: str,
        content: str,
        item_type: str = "text",
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a new library item
        
        Args:
            db: Database session (unused, kept for compatibility)
            workspace_id: Workspace ID
            user_id: User ID
            title: Item title
            content: Item content
            item_type: Type of item (text, image, video, template)
            tags: List of tags
            metadata: Additional metadata
        
        Returns:
            Created library item dictionary
        """
        try:
            supabase = get_supabase_service_client()
            
            payload = {
                "workspace_id": workspace_id,
                "created_by": user_id,
                "title": title,
                "content": content,
                "post_type": item_type,
                "platforms": tags or [],
                "platform_data": metadata or {},
                "published_at": datetime.utcnow().isoformat()
            }
            
            response = (
                supabase.table("post_library")
                .insert(payload)
                .select("*")
                .maybe_single()
                .execute()
            )
            
            error = getattr(response, "error", None)
            if error:
                logger.error("library_item_creation_error", error=str(error))
                raise Exception(str(error))
            
            item = getattr(response, "data", None)
            logger.info("library_item_created", item_id=item.get("id"), item_type=item_type)
            return item
            
        except Exception as e:
            logger.error("library_item_creation_error", error=str(e))
            raise
    
    @staticmethod
    def get_library_item(db: Any, item_id: str, workspace_id: str) -> Dict[str, Any]:
        """
        Get library item by ID
        
        Args:
            db: Database session (unused, kept for compatibility)
            item_id: Item ID
            workspace_id: Workspace ID
        
        Returns:
            Library item dictionary
        
        Raises:
            NotFoundError: If item not found
        """
        try:
            supabase = get_supabase_service_client()
            
            response = (
                supabase.table("post_library")
                .select("*")
                .eq("id", item_id)
                .eq("workspace_id", workspace_id)
                .maybe_single()
                .execute()
            )
            
            item = getattr(response, "data", None)
            if not item:
                raise NotFoundError(f"Library item {item_id} not found")
            
            return item
            
        except NotFoundError:
            raise
        except Exception as e:
            logger.error("get_library_item_error", error=str(e), item_id=item_id)
            raise
    
    @staticmethod
    def get_library_items(
        db: Any,
        workspace_id: str,
        item_type: Optional[str] = None,
        tags: Optional[List[str]] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get library items with filtering
        
        Args:
            db: Database session (unused, kept for compatibility)
            workspace_id: Workspace ID
            item_type: Filter by item type
            tags: Filter by tags
            limit: Number of items to return
            offset: Number of items to skip
        
        Returns:
            List of library item dictionaries
        """
        try:
            supabase = get_supabase_service_client()
            
            query = supabase.table("post_library").select("*").eq("workspace_id", workspace_id)
            
            if item_type:
                query = query.eq("post_type", item_type)
            
            if tags:
                query = query.contains("platforms", tags)
            
            response = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
            
            items = getattr(response, "data", None) or []
            return items
            
        except Exception as e:
            logger.error("get_library_items_error", error=str(e), workspace_id=workspace_id)
            return []
    
    @staticmethod
    def update_library_item(
        db: Any,
        item_id: str,
        workspace_id: str,
        **updates
    ) -> Dict[str, Any]:
        """
        Update library item
        
        Args:
            db: Database session (unused, kept for compatibility)
            item_id: Item ID
            workspace_id: Workspace ID
            **updates: Fields to update
        
        Returns:
            Updated library item dictionary
        
        Raises:
            NotFoundError: If item not found
        """
        try:
            # Verify item exists
            LibraryService.get_library_item(db, item_id, workspace_id)
            
            supabase = get_supabase_service_client()
            
            response = (
                supabase.table("post_library")
                .update(updates)
                .eq("id", item_id)
                .eq("workspace_id", workspace_id)
                .select("*")
                .maybe_single()
                .execute()
            )
            
            error = getattr(response, "error", None)
            if error:
                logger.error("library_item_update_error", error=str(error))
                raise Exception(str(error))
            
            item = getattr(response, "data", None)
            logger.info("library_item_updated", item_id=item_id, updates=list(updates.keys()))
            return item
            
        except NotFoundError:
            raise
        except Exception as e:
            logger.error("library_item_update_error", error=str(e), item_id=item_id)
            raise
    
    @staticmethod
    def delete_library_item(db: Any, item_id: str, workspace_id: str) -> bool:
        """
        Delete library item
        
        Args:
            db: Database session (unused, kept for compatibility)
            item_id: Item ID
            workspace_id: Workspace ID
        
        Returns:
            True if deleted successfully
        
        Raises:
            NotFoundError: If item not found
        """
        try:
            # Verify item exists
            LibraryService.get_library_item(db, item_id, workspace_id)
            
            supabase = get_supabase_service_client()
            
            response = (
                supabase.table("post_library")
                .delete()
                .eq("id", item_id)
                .eq("workspace_id", workspace_id)
                .execute()
            )
            
            error = getattr(response, "error", None)
            if error:
                logger.error("library_item_delete_error", error=str(error))
                raise Exception(str(error))
            
            logger.info("library_item_deleted", item_id=item_id)
            return True
            
        except NotFoundError:
            raise
        except Exception as e:
            logger.error("library_item_delete_error", error=str(e), item_id=item_id)
            raise
    
    @staticmethod
    def search_library(
        db: Any,
        workspace_id: str,
        query: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search library items
        
        Args:
            db: Database session (unused, kept for compatibility)
            workspace_id: Workspace ID
            query: Search query
            limit: Number of results to return
        
        Returns:
            List of matching library items
        """
        try:
            supabase = get_supabase_service_client()
            
            response = (
                supabase.table("post_library")
                .select("*")
                .eq("workspace_id", workspace_id)
                .or_(f"title.ilike.%{query}%,content.ilike.%{query}%")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            
            items = getattr(response, "data", None) or []
            return items
            
        except Exception as e:
            logger.error("search_library_error", error=str(e), workspace_id=workspace_id)
            return []
    
    @staticmethod
    def get_popular_tags(db: Any, workspace_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get most popular tags in library
        
        Args:
            db: Database session (unused, kept for compatibility)
            workspace_id: Workspace ID
            limit: Number of tags to return
        
        Returns:
            List of tags with usage counts
        """
        try:
            supabase = get_supabase_service_client()
            
            response = (
                supabase.table("post_library")
                .select("platforms")
                .eq("workspace_id", workspace_id)
                .execute()
            )
            
            items = getattr(response, "data", None) or []
            
            tag_counts: dict[str, int] = {}
            for item in items:
                for tag in item.get("platforms", []):
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
