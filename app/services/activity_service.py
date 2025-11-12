"""
Activity Service - Audit logging
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from datetime import datetime
import uuid
import structlog

from app.models.activity_log import ActivityLog

logger = structlog.get_logger()


class ActivityService:
    """Service for activity logging"""
    
    @staticmethod
    def log_activity(
        db: Session,
        workspace_id: str,
        user_id: str,
        action: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> ActivityLog:
        """
        Log an activity
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            user_id: User performing action
            action: Action name
            entity_type: Type of entity affected
            entity_id: ID of entity affected
            details: Additional details
            ip_address: User's IP address
            user_agent: User's agent string
        
        Returns:
            Created activity log
        """
        activity = ActivityLog(
            id=uuid.uuid4(),
            workspace_id=workspace_id,
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.add(activity)
        db.commit()
        db.refresh(activity)
        
        return activity
    
    @staticmethod
    def get_workspace_activity(
        db: Session,
        workspace_id: str,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Get workspace activity log with filters
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            user_id: Filter by user
            action: Filter by action
            start_date: Filter by start date
            end_date: Filter by end date
            limit: Maximum results
            offset: Pagination offset
        
        Returns:
            Dictionary with data, total, limit, offset, hasMore
        """
        # Build query
        query = db.query(ActivityLog).filter(
            ActivityLog.workspace_id == workspace_id
        )
        
        if user_id:
            query = query.filter(ActivityLog.user_id == user_id)
        
        if action:
            query = query.filter(ActivityLog.action == action)
        
        if start_date:
            query = query.filter(ActivityLog.created_at >= start_date)
        
        if end_date:
            query = query.filter(ActivityLog.created_at <= end_date)
        
        # Get total count
        total = query.count()
        
        # Get paginated results
        activities = query.order_by(
            ActivityLog.created_at.desc()
        ).offset(offset).limit(limit).all()
        
        return {
            "data": activities,
            "total": total,
            "limit": limit,
            "offset": offset,
            "hasMore": (offset + limit) < total
        }
