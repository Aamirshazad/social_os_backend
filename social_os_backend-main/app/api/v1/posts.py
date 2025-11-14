"""
Posts API - Matches Next.js pattern exactly
GET /api/posts - Fetch all posts for workspace
POST /api/posts - Create new post
"""
from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import APIRouter, Request, Query, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, ValidationError
import structlog

from app.database import get_async_db
from app.models.post import Post
from app.models.enums import PostStatus
from app.core.auth_helper import verify_auth_and_get_user, require_editor_or_admin_role

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


def serialize_post(db_post: Post) -> Dict[str, Any]:
    """Serialize Post model to API response compatible with frontend Post type (snake_case)."""
    return {
        "id": str(db_post.id),
        "workspace_id": str(db_post.workspace_id),
        "created_by": str(db_post.created_by),
        "topic": db_post.topic,
        "platforms": db_post.platforms or [],
        "content": db_post.content or {},
        "status": db_post.status.value if hasattr(db_post.status, "value") else str(db_post.status),
        "scheduled_at": db_post.scheduled_at.isoformat() if db_post.scheduled_at else None,
        "published_at": db_post.published_at.isoformat() if db_post.published_at else None,
        "campaign_id": str(db_post.campaign_id) if db_post.campaign_id else None,
        "engagement_score": db_post.engagement_score,
        "engagement_suggestions": db_post.engagement_suggestions,
        "created_at": db_post.created_at.isoformat() if db_post.created_at else None,
        "updated_at": db_post.updated_at.isoformat() if db_post.updated_at else None,
    }


@router.get("", response_model=PaginatedPostsResponse)
async def get_posts(
    request: Request,
    workspace_id: str = Query(..., description="Workspace ID"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_async_db),
):
    """GET - Fetch posts for workspace with optional pagination and status filter."""
    try:
        user_id, user_data = await verify_auth_and_get_user(request, db)

        if user_data["workspace_id"] != workspace_id:
            raise HTTPException(status_code=403, detail="Access denied to workspace")

        count_query = select(func.count()).select_from(Post).where(Post.workspace_id == workspace_id)

        data_query = select(Post).where(Post.workspace_id == workspace_id)

        if status:
            try:
                status_enum = PostStatus(status)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid status value")

            count_query = count_query.where(Post.status == status_enum)
            data_query = data_query.where(Post.status == status_enum)

        total_result = await db.execute(count_query)
        total = total_result.scalar_one() or 0

        data_query = data_query.order_by(Post.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(data_query)
        posts = result.scalars().all()

        items = [serialize_post(p) for p in posts]
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
        logger.error("get_posts_error", error=str(e), workspace_id=workspace_id)
        raise HTTPException(status_code=500, detail="Failed to fetch posts")


@router.post("", status_code=201)
async def create_post(
    request: Request,
    post_data: CreatePostRequest,
    db: AsyncSession = Depends(get_async_db),
):
    """POST - Create new post using CreatePostRequest shape from frontend."""
    try:
        user_id, user_data = await require_editor_or_admin_role(request, db)

        if user_data["workspace_id"] != post_data.workspace_id:
            raise HTTPException(status_code=403, detail="Access denied to workspace")

        try:
            status_value = post_data.status or PostStatus.DRAFT.value
            status_enum = PostStatus(status_value)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status value")

        db_post = Post(
            workspace_id=post_data.workspace_id,
            created_by=user_id,
            topic=post_data.topic,
            platforms=post_data.platforms,
            content=post_data.content or {},
            status=status_enum,
            scheduled_at=post_data.scheduled_at,
            campaign_id=post_data.campaign_id,
        )

        db.add(db_post)
        await db.commit()
        await db.refresh(db_post)

        logger.info("post_created", post_id=str(db_post.id), workspace_id=post_data.workspace_id, user_id=user_id)
        return serialize_post(db_post)

    except HTTPException:
        raise
    except Exception as e:
        workspace_id = getattr(post_data, "workspace_id", None)
        logger.error("create_post_error", error=str(e), workspace_id=workspace_id)
        raise HTTPException(status_code=500, detail="Failed to create post")


@router.get("/{post_id}")
async def get_post(
    post_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """GET - Fetch a single post by ID."""
    try:
        user_id, user_data = await verify_auth_and_get_user(request, db)

        result = await db.execute(select(Post).where(Post.id == post_id))
        db_post = result.scalar_one_or_none()

        if not db_post:
            raise HTTPException(status_code=404, detail="Post not found")

        if str(db_post.workspace_id) != user_data["workspace_id"]:
            raise HTTPException(status_code=403, detail="Access denied to workspace")

        return serialize_post(db_post)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_post_error", error=str(e), post_id=post_id)
        raise HTTPException(status_code=500, detail="Failed to fetch post")


@router.put("/{post_id}")
async def update_post(
    post_id: str,
    request: Request,
    post_data: UpdatePostRequest,
    db: AsyncSession = Depends(get_async_db),
):
    """PUT - Update an existing post."""
    try:
        user_id, user_data = await require_editor_or_admin_role(request, db)

        if user_data["workspace_id"] != post_data.workspace_id:
            raise HTTPException(status_code=403, detail="Access denied to workspace")

        result = await db.execute(select(Post).where(Post.id == post_id))
        db_post = result.scalar_one_or_none()

        if not db_post:
            raise HTTPException(status_code=404, detail="Post not found")

        if str(db_post.workspace_id) != post_data.workspace_id:
            raise HTTPException(status_code=403, detail="Access denied to workspace")

        if post_data.topic is not None:
            db_post.topic = post_data.topic
        if post_data.platforms is not None:
            db_post.platforms = post_data.platforms
        if post_data.content is not None:
            db_post.content = post_data.content
        if post_data.campaign_id is not None:
            db_post.campaign_id = post_data.campaign_id
        if post_data.scheduled_at is not None:
            db_post.scheduled_at = post_data.scheduled_at
        if post_data.status is not None:
            try:
                db_post.status = PostStatus(post_data.status)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid status value")

        db_post.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(db_post)

        logger.info("post_updated", post_id=post_id, workspace_id=post_data.workspace_id, user_id=user_id)
        return serialize_post(db_post)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("update_post_error", error=str(e), post_id=post_id)
        raise HTTPException(status_code=500, detail="Failed to update post")


@router.delete("/{post_id}", status_code=204)
async def delete_post(
    post_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """DELETE - Remove a post by ID."""
    try:
        user_id, user_data = await require_editor_or_admin_role(request, db)

        result = await db.execute(select(Post).where(Post.id == post_id))
        db_post = result.scalar_one_or_none()

        if not db_post:
            raise HTTPException(status_code=404, detail="Post not found")

        if str(db_post.workspace_id) != user_data["workspace_id"]:
            raise HTTPException(status_code=403, detail="Access denied to workspace")

        await db.delete(db_post)
        await db.commit()

        logger.info("post_deleted", post_id=post_id, workspace_id=user_data["workspace_id"], user_id=user_id)
        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error("delete_post_error", error=str(e), post_id=post_id)
        raise HTTPException(status_code=500, detail="Failed to delete post")

