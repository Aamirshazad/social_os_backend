"""
Content Threads API endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_active_user, get_workspace_id
# TODO: ThreadService needs to be implemented in new structure
# from app.services.thread_service import ThreadService
from app.schemas.thread import (
    CreateThreadRequest,
    UpdateThreadTitleRequest,
    AddMessageRequest,
    UpdateMessagesRequest,
    ThreadResponse,
    ThreadListResponse
)
import structlog

logger = structlog.get_logger()
router = APIRouter()


@router.get("", response_model=ThreadListResponse)
async def get_threads(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    include_deleted: bool = Query(False),
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all threads for workspace
    """
    result = ThreadService.get_workspace_threads(
        db=db,
        workspace_id=workspace_id,
        limit=limit,
        offset=offset,
        include_deleted=include_deleted
    )
    
    return result


@router.post("", response_model=ThreadResponse, status_code=201)
async def create_thread(
    request: CreateThreadRequest,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a new thread
    """
    thread = ThreadService.create_thread(
        db=db,
        workspace_id=workspace_id,
        title=request.title,
        created_by=current_user["id"]
    )
    
    logger.info("thread_created", thread_id=str(thread.id), user_id=current_user["id"])
    
    return thread


@router.get("/{thread_id}", response_model=ThreadResponse)
async def get_thread(
    thread_id: str,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get thread by ID
    """
    try:
        thread = ThreadService.get_thread_by_id(
            db=db,
            thread_id=thread_id,
            workspace_id=workspace_id
        )
        return thread
        
    except Exception as e:
        logger.error("get_thread_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found"
        )


@router.put("/{thread_id}/title", response_model=ThreadResponse)
async def update_thread_title(
    thread_id: str,
    request: UpdateThreadTitleRequest,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update thread title
    """
    try:
        thread = ThreadService.update_thread_title(
            db=db,
            thread_id=thread_id,
            workspace_id=workspace_id,
            title=request.title
        )
        
        logger.info("thread_title_updated", thread_id=thread_id, user_id=current_user["id"])
        
        return thread
        
    except Exception as e:
        logger.error("update_thread_title_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found"
        )


@router.post("/{thread_id}/messages", response_model=ThreadResponse)
async def add_message(
    thread_id: str,
    request: AddMessageRequest,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Add a message to thread
    """
    try:
        message = {
            "role": request.role,
            "content": request.content
        }
        
        thread = ThreadService.add_message_to_thread(
            db=db,
            thread_id=thread_id,
            workspace_id=workspace_id,
            message=message
        )
        
        logger.info("message_added", thread_id=thread_id, user_id=current_user["id"])
        
        return thread
        
    except Exception as e:
        logger.error("add_message_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found"
        )


@router.put("/{thread_id}/messages", response_model=ThreadResponse)
async def update_messages(
    thread_id: str,
    request: UpdateMessagesRequest,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update all messages in thread
    """
    try:
        messages = [message.dict() for message in request.messages]
        
        thread = ThreadService.update_thread_messages(
            db=db,
            thread_id=thread_id,
            workspace_id=workspace_id,
            messages=messages
        )
        
        logger.info("messages_updated", thread_id=thread_id, user_id=current_user["id"])
        
        return thread
        
    except Exception as e:
        logger.error("update_messages_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found"
        )


@router.delete("/{thread_id}", status_code=204)
async def delete_thread(
    thread_id: str,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete (soft delete) a thread
    """
    try:
        ThreadService.delete_thread(
            db=db,
            thread_id=thread_id,
            workspace_id=workspace_id
        )
        
        logger.info("thread_deleted", thread_id=thread_id, user_id=current_user["id"])
        
        return None
        
    except Exception as e:
        logger.error("delete_thread_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found"
        )


@router.post("/{thread_id}/restore", response_model=ThreadResponse)
async def restore_thread(
    thread_id: str,
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Restore a deleted thread
    """
    try:
        thread = ThreadService.restore_thread(
            db=db,
            thread_id=thread_id,
            workspace_id=workspace_id
        )
        
        logger.info("thread_restored", thread_id=thread_id, user_id=current_user["id"])
        
        return thread
        
    except Exception as e:
        logger.error("restore_thread_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found"
        )


@router.get("/recent", response_model=List[ThreadResponse])
async def get_recent_threads(
    limit: int = Query(10, ge=1, le=50),
    workspace_id: str = Depends(get_workspace_id),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get recent threads for workspace
    """
    threads = ThreadService.get_recent_threads(
        db=db,
        workspace_id=workspace_id,
        limit=limit
    )
    
    return threads
