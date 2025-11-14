"""
Thread Service - Manages content strategist conversation threads
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
import structlog

from app.infrastructure.database.supabase_client import get_supabase_client

logger = structlog.get_logger()


class ThreadService:
    """Service for managing content strategist conversation threads"""
    
    @staticmethod
    def _format_thread(thread_data: Dict[str, Any]) -> Dict[str, Any]:
        """Format thread data for API response"""
        return {
            "id": thread_data["id"],
            "workspace_id": thread_data["workspace_id"],
            "title": thread_data["title"],
            "messages": thread_data.get("messages", []),
            "created_by": thread_data["created_by"],
            "created_at": thread_data["created_at"],
            "updated_at": thread_data["updated_at"],
            "deleted_at": thread_data.get("deleted_at"),
        }
    
    @staticmethod
    async def create_thread(
        workspace_id: str,
        title: str,
        created_by: str
    ) -> Dict[str, Any]:
        """
        Create a new conversation thread
        
        Args:
            workspace_id: Workspace ID
            title: Thread title
            created_by: User ID who created the thread
            
        Returns:
            Created thread data
        """
        try:
            supabase = get_supabase_client()
            
            thread_data = {
                "id": str(uuid.uuid4()),
                "workspace_id": workspace_id,
                "title": title,
                "messages": [],
                "created_by": created_by,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "deleted_at": None
            }
            
            response = supabase.table("content_threads").insert(thread_data).execute()
            
            if not response.data:
                raise Exception("Failed to create thread")
            
            logger.info(
                "thread_created",
                thread_id=thread_data["id"],
                workspace_id=workspace_id,
                created_by=created_by
            )
            
            return ThreadService._format_thread(response.data[0])
            
        except Exception as e:
            logger.error("create_thread_error", error=str(e))
            raise
    
    @staticmethod
    async def get_workspace_threads(
        workspace_id: str,
        limit: int = 50,
        offset: int = 0,
        include_deleted: bool = False
    ) -> Dict[str, Any]:
        """
        Get all threads for a workspace with pagination
        
        Args:
            workspace_id: Workspace ID
            limit: Maximum number of threads to return
            offset: Number of threads to skip
            include_deleted: Whether to include soft-deleted threads
            
        Returns:
            Dictionary with items, total, limit, offset
        """
        try:
            supabase = get_supabase_client()
            
            # Build query
            query = supabase.table("content_threads").select("*", count="exact")
            query = query.eq("workspace_id", workspace_id)
            
            if not include_deleted:
                query = query.is_("deleted_at", "null")
            
            # Order by updated_at descending (most recent first)
            query = query.order("updated_at", desc=True)
            
            # Apply pagination
            query = query.range(offset, offset + limit - 1)
            
            response = query.execute()
            
            threads = [ThreadService._format_thread(thread) for thread in response.data]
            total = response.count if response.count is not None else len(threads)
            
            logger.info(
                "get_workspace_threads",
                workspace_id=workspace_id,
                count=len(threads),
                total=total
            )
            
            return {
                "items": threads,
                "total": total,
                "limit": limit,
                "offset": offset
            }
            
        except Exception as e:
            logger.error("get_workspace_threads_error", error=str(e))
            raise
    
    @staticmethod
    async def get_thread_by_id(
        thread_id: str,
        workspace_id: str
    ) -> Dict[str, Any]:
        """
        Get thread by ID
        
        Args:
            thread_id: Thread ID
            workspace_id: Workspace ID (for authorization)
            
        Returns:
            Thread data
        """
        try:
            supabase = get_supabase_client()
            
            response = supabase.table("content_threads").select("*").eq("id", thread_id).eq("workspace_id", workspace_id).is_("deleted_at", "null").execute()
            
            if not response.data:
                raise Exception(f"Thread {thread_id} not found")
            
            logger.info("get_thread_by_id", thread_id=thread_id)
            
            return ThreadService._format_thread(response.data[0])
            
        except Exception as e:
            logger.error("get_thread_by_id_error", thread_id=thread_id, error=str(e))
            raise
    
    @staticmethod
    async def update_thread_title(
        thread_id: str,
        workspace_id: str,
        title: str
    ) -> Dict[str, Any]:
        """
        Update thread title
        
        Args:
            thread_id: Thread ID
            workspace_id: Workspace ID (for authorization)
            title: New title
            
        Returns:
            Updated thread data
        """
        try:
            supabase = get_supabase_client()
            
            update_data = {
                "title": title,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            response = supabase.table("content_threads").update(update_data).eq("id", thread_id).eq("workspace_id", workspace_id).is_("deleted_at", "null").execute()
            
            if not response.data:
                raise Exception(f"Thread {thread_id} not found")
            
            logger.info("update_thread_title", thread_id=thread_id, title=title)
            
            return ThreadService._format_thread(response.data[0])
            
        except Exception as e:
            logger.error("update_thread_title_error", thread_id=thread_id, error=str(e))
            raise
    
    @staticmethod
    async def add_message_to_thread(
        thread_id: str,
        workspace_id: str,
        message: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Add a message to thread
        
        Args:
            thread_id: Thread ID
            workspace_id: Workspace ID (for authorization)
            message: Message data with role and content
            
        Returns:
            Updated thread data
        """
        try:
            supabase = get_supabase_client()
            
            # Get current thread
            thread = await ThreadService.get_thread_by_id(thread_id, workspace_id)
            
            # Append new message
            messages = thread.get("messages", [])
            messages.append({
                "role": message["role"],
                "content": message["content"],
                "timestamp": datetime.utcnow().isoformat()
            })
            
            update_data = {
                "messages": messages,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            response = supabase.table("content_threads").update(update_data).eq("id", thread_id).eq("workspace_id", workspace_id).execute()
            
            if not response.data:
                raise Exception(f"Thread {thread_id} not found")
            
            logger.info("add_message_to_thread", thread_id=thread_id, role=message["role"])
            
            return ThreadService._format_thread(response.data[0])
            
        except Exception as e:
            logger.error("add_message_to_thread_error", thread_id=thread_id, error=str(e))
            raise
    
    @staticmethod
    async def update_thread_messages(
        thread_id: str,
        workspace_id: str,
        messages: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Update all messages in thread (replace)
        
        Args:
            thread_id: Thread ID
            workspace_id: Workspace ID (for authorization)
            messages: List of messages
            
        Returns:
            Updated thread data
        """
        try:
            supabase = get_supabase_client()
            
            update_data = {
                "messages": messages,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            response = supabase.table("content_threads").update(update_data).eq("id", thread_id).eq("workspace_id", workspace_id).is_("deleted_at", "null").execute()
            
            if not response.data:
                raise Exception(f"Thread {thread_id} not found")
            
            logger.info("update_thread_messages", thread_id=thread_id, message_count=len(messages))
            
            return ThreadService._format_thread(response.data[0])
            
        except Exception as e:
            logger.error("update_thread_messages_error", thread_id=thread_id, error=str(e))
            raise
    
    @staticmethod
    async def delete_thread(
        thread_id: str,
        workspace_id: str
    ) -> None:
        """
        Soft delete a thread
        
        Args:
            thread_id: Thread ID
            workspace_id: Workspace ID (for authorization)
        """
        try:
            supabase = get_supabase_client()
            
            update_data = {
                "deleted_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            response = supabase.table("content_threads").update(update_data).eq("id", thread_id).eq("workspace_id", workspace_id).execute()
            
            if not response.data:
                raise Exception(f"Thread {thread_id} not found")
            
            logger.info("delete_thread", thread_id=thread_id)
            
        except Exception as e:
            logger.error("delete_thread_error", thread_id=thread_id, error=str(e))
            raise
    
    @staticmethod
    async def restore_thread(
        thread_id: str,
        workspace_id: str
    ) -> Dict[str, Any]:
        """
        Restore a soft-deleted thread
        
        Args:
            thread_id: Thread ID
            workspace_id: Workspace ID (for authorization)
            
        Returns:
            Restored thread data
        """
        try:
            supabase = get_supabase_client()
            
            update_data = {
                "deleted_at": None,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            response = supabase.table("content_threads").update(update_data).eq("id", thread_id).eq("workspace_id", workspace_id).execute()
            
            if not response.data:
                raise Exception(f"Thread {thread_id} not found")
            
            logger.info("restore_thread", thread_id=thread_id)
            
            return ThreadService._format_thread(response.data[0])
            
        except Exception as e:
            logger.error("restore_thread_error", thread_id=thread_id, error=str(e))
            raise
    
    @staticmethod
    async def get_recent_threads(
        workspace_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get recent threads for workspace
        
        Args:
            workspace_id: Workspace ID
            limit: Maximum number of threads to return
            
        Returns:
            List of recent threads
        """
        try:
            supabase = get_supabase_client()
            
            response = supabase.table("content_threads").select("*").eq("workspace_id", workspace_id).is_("deleted_at", "null").order("updated_at", desc=True).limit(limit).execute()
            
            threads = [ThreadService._format_thread(thread) for thread in response.data]
            
            logger.info("get_recent_threads", workspace_id=workspace_id, count=len(threads))
            
            return threads
            
        except Exception as e:
            logger.error("get_recent_threads_error", error=str(e))
            raise
