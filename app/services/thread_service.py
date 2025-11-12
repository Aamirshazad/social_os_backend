"""
Thread Service - Content thread management
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
import structlog

from app.models.content_thread import ContentThread
from app.core.exceptions import NotFoundError, ValidationError

logger = structlog.get_logger()


class ThreadService:
    """Service for managing content threads"""
    
    @staticmethod
    def create_thread(
        db: Session,
        workspace_id: str,
        title: str,
        created_by: str
    ) -> ContentThread:
        """
        Create a new content thread
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            title: Thread title
            created_by: User ID creating the thread
        
        Returns:
            Created thread
        """
        thread = ContentThread(
            id=uuid.uuid4(),
            workspace_id=workspace_id,
            title=title,
            messages=[],
            created_by=created_by
        )
        
        db.add(thread)
        db.commit()
        db.refresh(thread)
        
        logger.info("thread_created", thread_id=str(thread.id), workspace_id=workspace_id)
        
        return thread
    
    @staticmethod
    def get_workspace_threads(
        db: Session,
        workspace_id: str,
        limit: int = 50,
        offset: int = 0,
        include_deleted: bool = False
    ) -> Dict[str, Any]:
        """Get all threads for a workspace"""
        query = db.query(ContentThread).filter(
            ContentThread.workspace_id == workspace_id
        )
        
        if not include_deleted:
            query = query.filter(ContentThread.deleted_at.is_(None))
        
        # Get total count
        total = query.count()
        
        # Get paginated results
        threads = query.order_by(ContentThread.created_at.desc()).offset(offset).limit(limit).all()
        
        return {
            "items": threads,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    
    @staticmethod
    def get_thread_by_id(
        db: Session,
        thread_id: str,
        workspace_id: str
    ) -> ContentThread:
        """Get thread by ID"""
        thread = db.query(ContentThread).filter(
            ContentThread.id == thread_id,
            ContentThread.workspace_id == workspace_id,
            ContentThread.deleted_at.is_(None)
        ).first()
        
        if not thread:
            raise NotFoundError("Thread")
        
        return thread
    
    @staticmethod
    def update_thread_title(
        db: Session,
        thread_id: str,
        workspace_id: str,
        title: str
    ) -> ContentThread:
        """Update thread title"""
        thread = ThreadService.get_thread_by_id(db, thread_id, workspace_id)
        
        thread.title = title
        thread.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(thread)
        
        logger.info("thread_title_updated", thread_id=thread_id)
        
        return thread
    
    @staticmethod
    def add_message_to_thread(
        db: Session,
        thread_id: str,
        workspace_id: str,
        message: Dict[str, Any]
    ) -> ContentThread:
        """Add a message to thread"""
        thread = ThreadService.get_thread_by_id(db, thread_id, workspace_id)
        
        # Add timestamp if not provided
        if "timestamp" not in message:
            message["timestamp"] = datetime.utcnow().isoformat()
        
        # Add message to array
        messages = thread.messages or []
        messages.append(message)
        thread.messages = messages
        thread.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(thread)
        
        logger.info("message_added_to_thread", thread_id=thread_id, message_count=len(messages))
        
        return thread
    
    @staticmethod
    def update_thread_messages(
        db: Session,
        thread_id: str,
        workspace_id: str,
        messages: List[Dict[str, Any]]
    ) -> ContentThread:
        """Update all messages in thread"""
        thread = ThreadService.get_thread_by_id(db, thread_id, workspace_id)
        
        # Add timestamps to messages if not present
        for message in messages:
            if "timestamp" not in message:
                message["timestamp"] = datetime.utcnow().isoformat()
        
        thread.messages = messages
        thread.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(thread)
        
        logger.info("thread_messages_updated", thread_id=thread_id, message_count=len(messages))
        
        return thread
    
    @staticmethod
    def delete_thread(
        db: Session,
        thread_id: str,
        workspace_id: str
    ) -> None:
        """Soft delete a thread"""
        thread = ThreadService.get_thread_by_id(db, thread_id, workspace_id)
        
        thread.soft_delete()
        thread.updated_at = datetime.utcnow()
        
        db.commit()
        
        logger.info("thread_deleted", thread_id=thread_id)
    
    @staticmethod
    def restore_thread(
        db: Session,
        thread_id: str,
        workspace_id: str
    ) -> ContentThread:
        """Restore a soft deleted thread"""
        thread = db.query(ContentThread).filter(
            ContentThread.id == thread_id,
            ContentThread.workspace_id == workspace_id
        ).first()
        
        if not thread:
            raise NotFoundError("Thread")
        
        thread.restore()
        thread.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(thread)
        
        logger.info("thread_restored", thread_id=thread_id)
        
        return thread
    
    @staticmethod
    def get_recent_threads(
        db: Session,
        workspace_id: str,
        limit: int = 10
    ) -> List[ContentThread]:
        """Get recent threads for workspace"""
        return db.query(ContentThread).filter(
            ContentThread.workspace_id == workspace_id,
            ContentThread.deleted_at.is_(None)
        ).order_by(ContentThread.updated_at.desc()).limit(limit).all()
    
    @staticmethod
    def cleanup_old_threads(
        db: Session,
        workspace_id: str,
        days_old: int = 30
    ) -> int:
        """Cleanup old deleted threads"""
        cutoff_date = datetime.utcnow()
        cutoff_date = cutoff_date.replace(day=cutoff_date.day - days_old)
        
        deleted_count = db.query(ContentThread).filter(
            ContentThread.workspace_id == workspace_id,
            ContentThread.deleted_at < cutoff_date
        ).delete()
        
        db.commit()
        
        logger.info("old_threads_cleaned", workspace_id=workspace_id, count=deleted_count)
        
        return deleted_count
