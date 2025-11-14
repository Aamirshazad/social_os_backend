"""Post Library API endpoints - Archive and manage published posts"""
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.database import get_async_db
from app.core.auth_helper import verify_auth_and_get_user, require_editor_or_admin_role
from app.core.supabase import get_supabase_service_client
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


def serialize_library_row(row: dict) -> dict:
    """Serialize Supabase row dict to LibraryItemResponse-compatible dict."""
    return {
        "id": str(row.get("id")),
        "workspace_id": str(row.get("workspace_id")),
        "title": row.get("title") or "",
        "content": row.get("content") or {},
        "type": row.get("post_type") or "post",
        "tags": row.get("platforms") or [],
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
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

        supabase = get_supabase_service_client()

        try:
            # Base query with exact count for pagination
            query = supabase.table("post_library").select("*", count="exact").eq("workspace_id", workspace_id)

            if type:
                query = query.eq("post_type", type)

            start = (page - 1) * page_size
            end = start + page_size - 1

            response = query.order("created_at", desc=True).range(start, end).execute()

            rows = getattr(response, "data", None) or []
            total = getattr(response, "count", None)
            if total is None:
                total = len(rows)

            serialized_items = [serialize_library_row(row) for row in rows]
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
            logger.error("supabase_get_library_posts_error", error=str(e), workspace_id=workspace_id)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch library items",
            )

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

        supabase = get_supabase_service_client()

        db_item = {
            "workspace_id": archive_request.workspace_id,
            "created_by": user_id,
            "title": archive_request.title,
            "content": archive_request.content or {},
            "post_type": archive_request.type,
            "platforms": archive_request.tags or [],
            "published_at": datetime.utcnow(),
        }

        response = (
            supabase.table("post_library")
            .insert(db_item)
            .select("*")
            .maybe_single()
            .execute()
        )

        error = getattr(response, "error", None)
        if error:
            logger.error(
                "supabase_archive_post_error",
                error=str(error),
                workspace_id=archive_request.workspace_id,
                user_id=user_id,
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to archive post to library",
            )

        row = getattr(response, "data", None)
        if not row:
            logger.error(
                "supabase_archive_post_empty_response",
                workspace_id=archive_request.workspace_id,
                user_id=user_id,
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to archive post to library",
            )

        logger.info(
            "post_archived",
            library_id=str(row.get("id")),
            workspace_id=archive_request.workspace_id,
        )

        return serialize_library_row(row)

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
    db: AsyncSession = Depends(get_async_db),
):
    """
    Get a specific library item by ID
    """
    try:
        # Verify authentication and get user data
        user_id, user_data = await verify_auth_and_get_user(request, db)
        workspace_id = user_data["workspace_id"]

        supabase = get_supabase_service_client()
        response = (
            supabase.table("post_library")
            .select("*")
            .eq("id", library_id)
            .maybe_single()
            .execute()
        )

        error = getattr(response, "error", None)
        if error:
            logger.error(
                "supabase_get_library_item_error",
                error=str(error),
                library_id=library_id,
                workspace_id=workspace_id,
                user_id=user_id,
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch library item",
            )

        row = getattr(response, "data", None)
        if not row or str(row.get("workspace_id")) != workspace_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Library item not found")

        return serialize_library_row(row)

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

        supabase = get_supabase_service_client()

        # Ensure item exists and belongs to the workspace
        fetch_response = (
            supabase.table("post_library")
            .select("id, workspace_id")
            .eq("id", library_id)
            .maybe_single()
            .execute()
        )
        fetch_error = getattr(fetch_response, "error", None)
        if fetch_error:
            logger.error(
                "supabase_get_library_item_for_update_error",
                error=str(fetch_error),
                library_id=library_id,
                workspace_id=update_request.workspace_id,
                user_id=user_id,
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update library item",
            )

        existing = getattr(fetch_response, "data", None)
        if not existing or str(existing.get("workspace_id")) != update_request.workspace_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Library item not found")

        update_data = {
            "title": update_request.title,
            "content": update_request.content,
            "post_type": update_request.type,
            "platforms": update_request.tags or [],
            "updated_at": datetime.utcnow(),
        }

        response = (
            supabase.table("post_library")
            .update(update_data)
            .eq("id", library_id)
            .eq("workspace_id", update_request.workspace_id)
            .maybe_single()
            .execute()
        )

        error = getattr(response, "error", None)
        if error:
            logger.error(
                "supabase_update_library_item_error",
                error=str(error),
                library_id=library_id,
                workspace_id=update_request.workspace_id,
                user_id=user_id,
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update library item",
            )

        row = getattr(response, "data", None)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Library item not found")

        logger.info("library_item_updated", library_id=library_id, workspace_id=update_request.workspace_id)

        return serialize_library_row(row)

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

        supabase = get_supabase_service_client()

        # Ensure item exists and belongs to the workspace
        fetch_response = (
            supabase.table("post_library")
            .select("id, workspace_id")
            .eq("id", library_id)
            .maybe_single()
            .execute()
        )
        fetch_error = getattr(fetch_response, "error", None)
        if fetch_error:
            logger.error(
                "supabase_get_library_item_for_delete_error",
                error=str(fetch_error),
                library_id=library_id,
                workspace_id=workspace_id,
                user_id=user_id,
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete library item",
            )

        existing = getattr(fetch_response, "data", None)
        if not existing or str(existing.get("workspace_id")) != workspace_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Library item not found")

        response = (
            supabase.table("post_library")
            .delete()
            .eq("id", library_id)
            .eq("workspace_id", workspace_id)
            .execute()
        )

        error = getattr(response, "error", None)
        if error:
            logger.error(
                "supabase_delete_library_item_error",
                error=str(error),
                library_id=library_id,
                workspace_id=workspace_id,
                user_id=user_id,
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete library item",
            )

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

        supabase = get_supabase_service_client()
        response = (
            supabase.table("post_library")
            .select("platforms")
            .eq("workspace_id", workspace_id)
            .execute()
        )

        error = getattr(response, "error", None)
        if error:
            logger.error("supabase_get_library_stats_error", error=str(error), workspace_id=workspace_id)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch library stats",
            )

        rows = getattr(response, "data", None) or []

        total = len(rows)
        platform_counts: dict[str, int] = {}
        for row in rows:
            for tag in row.get("platforms") or []:
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
