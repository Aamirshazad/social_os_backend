"""
Posts API - Matches Next.js pattern exactly
GET /api/posts - Fetch all posts for workspace
POST /api/posts - Create new post
"""
from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import APIRouter, Request, Query, HTTPException, Depends
from pydantic import BaseModel
import structlog

from app.core.auth_helper import verify_auth_and_get_user, require_editor_or_admin_role
from app.core.supabase import get_supabase_service_client
from app.models.enums import PostStatus

logger = structlog.get_logger()
router = APIRouter()

class PostCreateRequest(BaseModel):
    """Post creation request matching Next.js schema"""
    post: Dict[str, Any]
    workspaceId: str

class PostResponse(BaseModel):
    """Post response matching Next.js format"""
    id: str
    topic: Optional[str]
    platforms: Optional[List[str]]
    content: Dict[str, Any]
    postType: str = "post"
    status: str
    createdAt: str
    scheduledAt: Optional[str] = None
    publishedAt: Optional[str] = None
    campaignId: Optional[str] = None
    engagementScore: Optional[int] = None
    engagementSuggestions: Optional[List[str]] = None
    generatedImage: Optional[str] = None
    generatedVideoUrl: Optional[str] = None
    platformTemplates: Optional[Dict[str, Any]] = None
    isGeneratingImage: bool = False
    isGeneratingVideo: bool = False
    videoGenerationStatus: str = ""
    videoOperation: Optional[Dict[str, Any]] = None

class CreatePostRequest(BaseModel):
    workspace_id: str
    topic: str
    platforms: List[str]
    content: Dict[str, Any]
    status: Optional[str] = "draft"
    scheduled_at: Optional[datetime] = None
    campaign_id: Optional[str] = None

class UpdatePostRequest(BaseModel):
    workspace_id: str
    topic: Optional[str] = None
    platforms: Optional[List[str]] = None
    content: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    campaign_id: Optional[str] = None

class PaginatedPostsResponse(BaseModel):
    items: List[Dict[str, Any]]
    total: int
    page: int
    page_size: int
    pages: int

def serialize_post_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Serialize Supabase row dict to the same snake_case response used by serialize_post."""
    return {
        "id": str(row.get("id")),
        "workspace_id": str(row.get("workspace_id")),
        "created_by": str(row.get("created_by")) if row.get("created_by") is not None else None,
        "topic": row.get("topic"),
        "platforms": row.get("platforms") or [],
        "content": row.get("content") or {},
        "status": row.get("status"),
        "scheduled_at": row.get("scheduled_at").isoformat() if hasattr(row.get("scheduled_at"), "isoformat") and row.get("scheduled_at") else row.get("scheduled_at"),
        "published_at": row.get("published_at").isoformat() if hasattr(row.get("published_at"), "isoformat") and row.get("published_at") else row.get("published_at"),
        "campaign_id": str(row.get("campaign_id")) if row.get("campaign_id") else None,
        "engagement_score": row.get("engagement_score"),
        "engagement_suggestions": row.get("engagement_suggestions"),
        "created_at": row.get("created_at").isoformat() if hasattr(row.get("created_at"), "isoformat") and row.get("created_at") else row.get("created_at"),
        "updated_at": row.get("updated_at").isoformat() if hasattr(row.get("updated_at"), "isoformat") and row.get("updated_at") else row.get("updated_at"),
    }

@router.get("", response_model=PaginatedPostsResponse)
async def get_posts(
    request: Request,
    workspace_id: str = Query(..., description="Workspace ID"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None)):
    """GET - Fetch posts for workspace with optional pagination and status filter."""
    try:
        user_id, user_data = await verify_auth_and_get_user(request)

        if user_data["workspace_id"] != workspace_id:
            raise HTTPException(status_code=403, detail="Access denied to workspace")

        # Use Supabase service client instead of direct database connection
        supabase = get_supabase_service_client()

        # Build base query with count for pagination
        try:
            query = supabase.table("posts").select("*", count="exact").eq("workspace_id", workspace_id)

            if status:
                # Status is stored as a string in Supabase (matches Next.js implementation)
                query = query.eq("status", status)

            # Supabase range is inclusive, so end index is start + page_size - 1
            start = (page - 1) * page_size
            end = start + page_size - 1

            response = query.order("created_at", desc=True).range(start, end).execute()

            rows = getattr(response, "data", None) or []
            total = getattr(response, "count", None)
            if total is None:
                total = len(rows)

            items = [serialize_post_row(row) for row in rows]
            pages = (total + page_size - 1) // page_size if total else 0

            logger.info("posts_fetched", count=len(items), workspace_id=workspace_id, user_id=user_id)

            return {
                "items": items,
                "total": total,
                "page": page,
                "page_size": page_size,
                "pages": pages,
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error("supabase_get_posts_error", error=str(e), workspace_id=workspace_id)
            raise HTTPException(status_code=500, detail="Failed to fetch posts")

    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_posts_error", error=str(e), workspace_id=workspace_id)
        raise HTTPException(status_code=500, detail="Failed to fetch posts")

@router.post("", status_code=201)
async def create_post(
    request: Request,
    post_data: CreatePostRequest):
    """POST - Create new post using CreatePostRequest shape from frontend."""
    try:
        user_id, user_data = await require_editor_or_admin_role(request)

        if user_data["workspace_id"] != post_data.workspace_id:
            raise HTTPException(status_code=403, detail="Access denied to workspace")

        try:
            status_value = post_data.status or PostStatus.DRAFT.value
            status_enum = PostStatus(status_value)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status value")

        supabase = get_supabase_service_client()

        db_post = {
            "workspace_id": post_data.workspace_id,
            "created_by": user_id,
            "topic": post_data.topic,
            "platforms": post_data.platforms,
            "content": post_data.content or {},
            "status": status_enum.value,
            "scheduled_at": post_data.scheduled_at,
            "campaign_id": post_data.campaign_id,
        }

        response = supabase.table("posts").insert(db_post).select("*").maybe_single().execute()

        error = getattr(response, "error", None)
        if error:
            logger.error(
                "supabase_create_post_error",
                error=str(error),
                workspace_id=post_data.workspace_id,
                user_id=user_id)
            raise HTTPException(status_code=500, detail="Failed to create post")

        row = getattr(response, "data", None)
        if not row:
            logger.error(
                "supabase_create_post_empty_response",
                workspace_id=post_data.workspace_id,
                user_id=user_id)
            raise HTTPException(status_code=500, detail="Failed to create post")

        logger.info(
            "post_created",
            post_id=str(row.get("id")),
            workspace_id=post_data.workspace_id,
            user_id=user_id)
        return serialize_post_row(row)

    except HTTPException:
        raise
    except Exception as e:
        workspace_id = getattr(post_data, "workspace_id", None)
        logger.error("create_post_error", error=str(e), workspace_id=workspace_id)
        raise HTTPException(status_code=500, detail="Failed to create post")

@router.get("/{post_id}")
async def get_post(
    post_id: str,
    request: Request):
    """GET - Fetch a single post by ID."""
    try:
        user_id, user_data = await verify_auth_and_get_user(request)

        supabase = get_supabase_service_client()
        response = supabase.table("posts").select("*").eq("id", post_id).maybe_single().execute()

        error = getattr(response, "error", None)
        if error:
            logger.error("supabase_get_post_error", error=str(error), post_id=post_id, user_id=user_id)
            raise HTTPException(status_code=500, detail="Failed to fetch post")

        row = getattr(response, "data", None)
        if not row:
            raise HTTPException(status_code=404, detail="Post not found")

        if str(row.get("workspace_id")) != user_data["workspace_id"]:
            raise HTTPException(status_code=403, detail="Access denied to workspace")

        return serialize_post_row(row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_post_error", error=str(e), post_id=post_id)
        raise HTTPException(status_code=500, detail="Failed to fetch post")

@router.put("/{post_id}")
async def update_post(
    post_id: str,
    request: Request,
    post_data: UpdatePostRequest):
    """PUT - Update an existing post."""
    try:
        user_id, user_data = await require_editor_or_admin_role(request)

        if user_data["workspace_id"] != post_data.workspace_id:
            raise HTTPException(status_code=403, detail="Access denied to workspace")

        supabase = get_supabase_service_client()

        # Ensure post exists and belongs to the workspace
        fetch_response = (
            supabase.table("posts")
            .select("id, workspace_id")
            .eq("id", post_id)
            .maybe_single()
            .execute()
        )
        fetch_error = getattr(fetch_response, "error", None)
        if fetch_error:
            logger.error(
                "supabase_get_post_for_update_error",
                error=str(fetch_error),
                post_id=post_id,
                workspace_id=post_data.workspace_id,
                user_id=user_id)
            raise HTTPException(status_code=500, detail="Failed to update post")

        existing = getattr(fetch_response, "data", None)
        if not existing:
            raise HTTPException(status_code=404, detail="Post not found")

        if str(existing.get("workspace_id")) != post_data.workspace_id:
            raise HTTPException(status_code=403, detail="Access denied to workspace")

        update_data: Dict[str, Any] = {}

        if post_data.topic is not None:
            update_data["topic"] = post_data.topic
        if post_data.platforms is not None:
            update_data["platforms"] = post_data.platforms
        if post_data.content is not None:
            update_data["content"] = post_data.content
        if post_data.campaign_id is not None:
            update_data["campaign_id"] = post_data.campaign_id
        if post_data.scheduled_at is not None:
            update_data["scheduled_at"] = post_data.scheduled_at
        if post_data.status is not None:
            try:
                status_enum = PostStatus(post_data.status)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid status value")
            update_data["status"] = status_enum.value

        # Always bump updated_at to match previous behavior
        update_data["updated_at"] = datetime.utcnow()

        response = (
            supabase.table("posts")
            .update(update_data)
            .eq("id", post_id)
            .eq("workspace_id", post_data.workspace_id)
            .maybe_single()
            .execute()
        )

        error = getattr(response, "error", None)
        if error:
            logger.error(
                "supabase_update_post_error",
                error=str(error),
                post_id=post_id,
                workspace_id=post_data.workspace_id,
                user_id=user_id)
            raise HTTPException(status_code=500, detail="Failed to update post")

        updated_row = getattr(response, "data", None)
        if not updated_row:
            raise HTTPException(status_code=404, detail="Post not found")

        logger.info("post_updated", post_id=post_id, workspace_id=post_data.workspace_id, user_id=user_id)
        return serialize_post_row(updated_row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("update_post_error", error=str(e), post_id=post_id)
        raise HTTPException(status_code=500, detail="Failed to update post")

@router.delete("/{post_id}", status_code=204)
async def delete_post(
    post_id: str,
    request: Request):
    """DELETE - Remove a post by ID."""
    try:
        user_id, user_data = await require_editor_or_admin_role(request)

        supabase = get_supabase_service_client()

        # Ensure post exists and belongs to the workspace
        fetch_response = (
            supabase.table("posts")
            .select("id, workspace_id")
            .eq("id", post_id)
            .maybe_single()
            .execute()
        )
        fetch_error = getattr(fetch_response, "error", None)
        if fetch_error:
            logger.error(
                "supabase_get_post_for_delete_error",
                error=str(fetch_error),
                post_id=post_id,
                workspace_id=user_data["workspace_id"],
                user_id=user_id)
            raise HTTPException(status_code=500, detail="Failed to delete post")

        existing = getattr(fetch_response, "data", None)
        if not existing:
            raise HTTPException(status_code=404, detail="Post not found")

        if str(existing.get("workspace_id")) != user_data["workspace_id"]:
            raise HTTPException(status_code=403, detail="Access denied to workspace")

        response = (
            supabase.table("posts")
            .delete()
            .eq("id", post_id)
            .eq("workspace_id", user_data["workspace_id"])
            .execute()
        )

        error = getattr(response, "error", None)
        if error:
            logger.error(
                "supabase_delete_post_error",
                error=str(error),
                post_id=post_id,
                workspace_id=user_data["workspace_id"],
                user_id=user_id)
            raise HTTPException(status_code=500, detail="Failed to delete post")

        logger.info(
            "post_deleted",
            post_id=post_id,
            workspace_id=user_data["workspace_id"],
            user_id=user_id)
        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error("delete_post_error", error=str(e), post_id=post_id)
        raise HTTPException(status_code=500, detail="Failed to delete post")

