"""
Content Threads API endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, Query, HTTPException, status, Request

from app.core.auth_helper import verify_auth_and_get_user, require_editor_or_admin_role
from app.application.services.thread_service import ThreadService
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
    request: Request,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    include_deleted: bool = Query(False)
):
    """
    Get all threads for workspace
    """
    try:
        # Verify authentication and get user data
        user_id, user_data = await verify_auth_and_get_user(request)
        workspace_id = user_data["workspace_id"]
        
        # Get threads from database
        result = await ThreadService.get_workspace_threads(
            workspace_id=workspace_id,
            limit=limit,
            offset=offset,
            include_deleted=include_deleted
        )
        
        logger.info(
            "get_threads",
            workspace_id=workspace_id,
            count=len(result["items"]),
            total=result["total"]
        )
        
        return result
        
    except Exception as e:
        logger.error("get_threads_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("", response_model=ThreadResponse, status_code=201)
async def create_thread(
    thread_request: CreateThreadRequest,
    request: Request
):
    """
    Create a new thread
    """
    try:
        # Verify authentication and require editor or admin role
        user_id, user_data = await require_editor_or_admin_role(request)
        workspace_id = user_data["workspace_id"]
        
        # Create thread in database
        thread = await ThreadService.create_thread(
            workspace_id=workspace_id,
            title=thread_request.title,
            created_by=user_id
        )
        
        logger.info(
            "create_thread",
            thread_id=thread["id"],
            workspace_id=workspace_id,
            user_id=user_id
        )
        
        return thread
        
    except Exception as e:
        logger.error("create_thread_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{thread_id}", response_model=ThreadResponse)
async def get_thread(
    thread_id: str,
    request: Request
):
    """
    Get thread by ID
    """
    try:
        # Verify authentication and get user data
        user_id, user_data = await verify_auth_and_get_user(request)
        workspace_id = user_data["workspace_id"]
        
        # Get thread from database
        thread = await ThreadService.get_thread_by_id(
            thread_id=thread_id,
            workspace_id=workspace_id
        )
        
        logger.info(
            "get_thread",
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
    title_request: UpdateThreadTitleRequest,
    request: Request
):
    """
    Update thread title
    """
    try:
        # Verify authentication and require editor or admin role
        user_id, user_data = await require_editor_or_admin_role(request)
        workspace_id = user_data["workspace_id"]
        
        # Update thread title in database
        thread = await ThreadService.update_thread_title(
            thread_id=thread_id,
            workspace_id=workspace_id,
            title=title_request.title
        )
        
        logger.info(
            "update_thread_title",
            thread_id=thread_id,
            user_id=user_id
        )
        
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
    message_request: AddMessageRequest,
    request: Request
):
    """
    Add a message to thread
    """
    try:
        # Verify authentication and require editor or admin role
        user_id, user_data = await require_editor_or_admin_role(request)
        workspace_id = user_data["workspace_id"]
        
        # Add message to thread in database
        message = {
            "role": message_request.role,
            "content": message_request.content
        }
        
        thread = await ThreadService.add_message_to_thread(
            thread_id=thread_id,
            workspace_id=workspace_id,
            message=message
        )
        
        logger.info(
            "add_message",
            thread_id=thread_id,
            user_id=user_id,
            role=message_request.role
        )
        
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
    messages_request: UpdateMessagesRequest,
    request: Request
):
    """
    Update all messages in thread
    """
    try:
        # Verify authentication and require editor or admin role
        user_id, user_data = await require_editor_or_admin_role(request)
        workspace_id = user_data["workspace_id"]
        
        # Update all messages in thread
        messages = [message.dict() for message in messages_request.messages]
        
        thread = await ThreadService.update_thread_messages(
            thread_id=thread_id,
            workspace_id=workspace_id,
            messages=messages
        )
        
        logger.info(
            "update_messages",
            thread_id=thread_id,
            user_id=user_id,
            message_count=len(messages)
        )
        
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
    request: Request
):
    """
    Delete (soft delete) a thread
    """
    try:
        # Verify authentication and require editor or admin role
        user_id, user_data = await require_editor_or_admin_role(request)
        workspace_id = user_data["workspace_id"]
        
        # Delete thread from database (soft delete)
        await ThreadService.delete_thread(
            thread_id=thread_id,
            workspace_id=workspace_id
        )
        
        logger.info(
            "delete_thread",
            thread_id=thread_id,
            user_id=user_id
        )
        
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
    request: Request
):
    """
    Restore a deleted thread
    """
    try:
        # Verify authentication and require editor or admin role
        user_id, user_data = await require_editor_or_admin_role(request)
        workspace_id = user_data["workspace_id"]
        
        # Restore thread in database
        thread = await ThreadService.restore_thread(
            thread_id=thread_id,
            workspace_id=workspace_id
        )
        
        logger.info(
            "restore_thread",
            thread_id=thread_id,
            user_id=user_id
        )
        
        return thread
        
    except Exception as e:
        logger.error("restore_thread_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found"
        )

@router.get("/recent", response_model=List[ThreadResponse])
async def get_recent_threads(
    request: Request,
    limit: int = Query(10, ge=1, le=50)
):
    """
    Get recent threads for workspace
    """
    try:
        # Verify authentication and get user data
        user_id, user_data = await verify_auth_and_get_user(request)
        workspace_id = user_data["workspace_id"]
        
        # Get recent threads from database
        threads = await ThreadService.get_recent_threads(
            workspace_id=workspace_id,
            limit=limit
        )
        
        logger.info(
            "get_recent_threads",
            workspace_id=workspace_id,
            count=len(threads)
        )
        
        return threads
        
    except Exception as e:
        logger.error("get_recent_threads_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
