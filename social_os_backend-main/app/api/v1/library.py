"""Post Library API endpoints - Archive and manage published posts"""
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, Field

from app.database import get_async_db
from app.core.auth_helper import verify_auth_and_get_user, require_editor_or_admin_role
from app.models.post_library import PostLibrary
import structlog


logger = structlog.get_logger()
router = APIRouter()


class CreateLibraryItemRequest(BaseModel):
    """Request schema matching frontend CreateLibraryItemRequest"""
    workspace_id: str
    title: str = Field(..., min_length=1, max_length=200)
    content: dict
    type: str
    tags: Optional[List[str]] = None


class LibraryItemResponse(BaseModel):
    """Response schema matching frontend LibraryItem type"""
    id: str
    workspace_id: str
    title: str
    content: dict
    type: str
    tags: List[str] = []
    created_at: datetime
    updated_at: Optional[datetime] = None


class PaginatedLibraryResponse(BaseModel):
    """Paginated response wrapper for library items"""
    items: List[LibraryItemResponse]
    total: int
    page: int
    page_size: int
    pages: int


def serialize_library_item(item: PostLibrary) -> dict:
    """Serialize PostLibrary model to LibraryItemResponse-compatible dict."""
    return {
        "id": str(item.id),
        "workspace_id": str(item.workspace_id),
        "title": item.title or "",
        "content": item.content or {},
        "type": item.post_type or "post",
        "tags": item.platforms or [],
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


@router.get("", response_model=PaginatedLibraryResponse)
async def get_library_posts(
    request: Request,
    workspace_id: str = Query(..., description="Workspace ID"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    type: Optional[str] = Query(None, description="Filter by item type"),
    db: AsyncSession = Depends(get_async_db),
):
    """Get archived posts from library with pagination.

    Query Parameters:
    - workspace_id: Workspace ID (validated against authenticated user)
    - page: Page number (1-based)
    - page_size: Items per page
    - type: Filter by item type (e.g., "published_post")
    """
    try:
        user_id, user_data = await verify_auth_and_get_user(request, db)

        if user_data["workspace_id"] != workspace_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to workspace")

        count_query = select(func.count()).select_from(PostLibrary).where(PostLibrary.workspace_id == workspace_id)
        data_query = select(PostLibrary).where(PostLibrary.workspace_id == workspace_id)

        if type:
            count_query = count_query.where(PostLibrary.post_type == type)
            data_query = data_query.where(PostLibrary.post_type == type)

        total_result = await db.execute(count_query)
        total = total_result.scalar_one() or 0

        data_query = data_query.order_by(PostLibrary.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(data_query)
        items = result.scalars().all()

        serialized_items = [serialize_library_item(item) for item in items]
        pages = (total + page_size - 1) // page_size if total else 0

        return {
            "items": serialized_items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": pages,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_library_posts_error", error=str(e), workspace_id=workspace_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch library items",
        )


@router.post("", response_model=LibraryItemResponse, status_code=201)
async def archive_post_to_library(
    archive_request: CreateLibraryItemRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """Archive a published post to library.

    This matches the frontend libraryService.createLibraryItem contract and is used
    by the main app's publish flow to store published posts.
    """
    try:
        user_id, user_data = await require_editor_or_admin_role(request, db)

        if user_data["workspace_id"] != archive_request.workspace_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to workspace")

        db_item = PostLibrary(
            workspace_id=archive_request.workspace_id,
            created_by=user_id,
            title=archive_request.title,
            content=archive_request.content,
            post_type=archive_request.type,
            platforms=archive_request.tags or [],
            published_at=datetime.utcnow(),
        )

        db.add(db_item)
        await db.commit()
        await db.refresh(db_item)

        logger.info(
            "post_archived",
            library_id=str(db_item.id),
            workspace_id=archive_request.workspace_id,
        )

        return serialize_library_item(db_item)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("archive_post_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to archive post to library",
        )


@router.get("/{library_id}", response_model=LibraryItemResponse)
async def get_library_item(
    library_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get a specific library item by ID
    """
    try:
        # Verify authentication and get user data
        user_id, user_data = await verify_auth_and_get_user(request, db)
        workspace_id = user_data["workspace_id"]
        
        result = await db.execute(
            select(PostLibrary).where(PostLibrary.id == library_id)
        )
        item = result.scalar_one_or_none()
        
        if not item or str(item.workspace_id) != workspace_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Library item not found")
        
        return serialize_library_item(item)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_library_item_error", error=str(e), library_id=library_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch library item",
        )


@router.put("/{library_id}", response_model=LibraryItemResponse)
async def update_library_item(
    library_id: str,
    update_request: CreateLibraryItemRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """Update a library item (title/content/type/tags)."""
    try:
        user_id, user_data = await require_editor_or_admin_role(request, db)

        if user_data["workspace_id"] != update_request.workspace_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to workspace")

        result = await db.execute(select(PostLibrary).where(PostLibrary.id == library_id))
        item = result.scalar_one_or_none()

        if not item or str(item.workspace_id) != update_request.workspace_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Library item not found")

        item.title = update_request.title
        item.content = update_request.content
        item.post_type = update_request.type
        item.platforms = update_request.tags or []
        item.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(item)

        logger.info("library_item_updated", library_id=library_id, workspace_id=update_request.workspace_id)

        return serialize_library_item(item)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("update_library_item_error", error=str(e), library_id=library_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update library item",
        )


@router.delete("/{library_id}", status_code=204)
async def delete_library_item(
    library_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """Delete a library item"""
    try:
        user_id, user_data = await require_editor_or_admin_role(request, db)
        workspace_id = user_data["workspace_id"]

        result = await db.execute(select(PostLibrary).where(PostLibrary.id == library_id))
        item = result.scalar_one_or_none()

        if not item or str(item.workspace_id) != workspace_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Library item not found")

        await db.delete(item)
        await db.commit()

        logger.info("library_item_deleted", library_id=library_id, workspace_id=workspace_id)

        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error("delete_library_item_error", error=str(e), library_id=library_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete library item",
        )


@router.get("/stats/summary")
async def get_library_stats(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """Get library statistics summary.

    Returns counts by platform, total posts, etc.
    """
    try:
        user_id, user_data = await verify_auth_and_get_user(request, db)
        workspace_id = user_data["workspace_id"]

        result = await db.execute(select(PostLibrary).where(PostLibrary.workspace_id == workspace_id))
        items = result.scalars().all()

        total = len(items)
        platform_counts: dict[str, int] = {}
        for item in items:
            for tag in item.platforms or []:
                platform_counts[tag] = platform_counts.get(tag, 0) + 1

        stats = {
            "total": total,
            "platform_counts": platform_counts,
        }

        return {
            "success": True,
            "data": stats,
        }

    except Exception as e:
        logger.error("get_library_stats_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
