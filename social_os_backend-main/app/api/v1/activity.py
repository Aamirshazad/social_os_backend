"""
Activity Log API endpoints
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.database import get_async_db
from app.core.auth_helper import verify_auth_and_get_user
# TODO: ActivityService needs to be implemented in new structure
# from app.services.activity_service import ActivityService
import structlog

logger = structlog.get_logger()
router = APIRouter()


@router.get("")
async def get_activity(
    user_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get workspace activity log
    
    Requires admin role
    
    Query Parameters:
    - user_id: Filter by user
    - action: Filter by action type
    - start_date: ISO date string
    - end_date: ISO date string
    - limit: Results per page (1-500)
    - offset: Pagination offset
    """
    # Parse dates
    start = datetime.fromisoformat(start_date) if start_date else None
    end = datetime.fromisoformat(end_date) if end_date else None
    
    result = ActivityService.get_workspace_activity(
        db=db,
        workspace_id=workspace_id,
        user_id=user_id,
        action=action,
        start_date=start,
        end_date=end,
        limit=limit,
        offset=offset
    )
    
    # Format response
    activities = [
        {
            "id": str(log.id),
            "workspace_id": str(log.workspace_id),
            "user_id": str(log.user_id),
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "details": log.details,
            "created_at": log.created_at.isoformat()
        }
        for log in result["data"]
    ]
    
    return {
        "data": activities,
        "total": result["total"],
        "limit": result["limit"],
        "offset": result["offset"],
        "hasMore": result["hasMore"]
    }
