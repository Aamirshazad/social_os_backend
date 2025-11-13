"""
Posts API - Matches Next.js pattern exactly
GET /api/posts - Fetch all posts for workspace
POST /api/posts - Create new post
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Request, Query, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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


@router.get("/posts")
async def get_posts(
    request: Request,
    workspace_id: str = Query(..., description="Workspace ID"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    GET - Fetch all posts for workspace
    Matches Next.js /api/posts GET handler exactly
    """
    try:
        # Verify authentication and get user data
        user_id, user_data = await verify_auth_and_get_user(request, db)
        
        # Verify workspace access
        if user_data["workspace_id"] != workspace_id:
            raise HTTPException(status_code=403, detail="Access denied to workspace")
        
        # Fetch posts
        result = await db.execute(
            select(Post)
            .where(Post.workspace_id == workspace_id)
            .order_by(Post.created_at.desc())
        )
        posts = result.scalars().all()
        
        # Transform database format to app format (matching Next.js)
        transformed_posts = []
        for db_post in posts:
            post_data = {
                "id": str(db_post.id),
                "topic": db_post.topic,
                "platforms": db_post.platforms,
                "content": db_post.content or {},
                "postType": db_post.post_type or "post",
                "status": db_post.status.value if hasattr(db_post.status, 'value') else str(db_post.status),
                "createdAt": db_post.created_at.isoformat(),
                "scheduledAt": db_post.scheduled_at.isoformat() if db_post.scheduled_at else None,
                "publishedAt": db_post.published_at.isoformat() if db_post.published_at else None,
                "campaignId": str(db_post.campaign_id) if db_post.campaign_id else None,
                "engagementScore": db_post.engagement_score,
                "engagementSuggestions": db_post.engagement_suggestions,
                "generatedImage": db_post.content.get("generatedImage") if db_post.content else None,
                "generatedVideoUrl": db_post.content.get("generatedVideoUrl") if db_post.content else None,
                "platformTemplates": db_post.content.get("platformTemplates") if db_post.content else None,
                "isGeneratingImage": db_post.content.get("isGeneratingImage", False) if db_post.content else False,
                "isGeneratingVideo": db_post.content.get("isGeneratingVideo", False) if db_post.content else False,
                "videoGenerationStatus": db_post.content.get("videoGenerationStatus", "") if db_post.content else "",
                "videoOperation": db_post.content.get("videoOperation") if db_post.content else None,
            }
            transformed_posts.append(post_data)
        
        logger.info("posts_fetched", count=len(transformed_posts), workspace_id=workspace_id, user_id=user_id)
        return transformed_posts
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_posts_error", error=str(e), workspace_id=workspace_id)
        raise HTTPException(status_code=500, detail="Failed to fetch posts")


@router.post("/posts")
async def create_post(
    request: Request,
    post_data: PostCreateRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    POST - Create new post
    Matches Next.js /api/posts POST handler exactly
    """
    try:
        # Verify authentication and require editor/admin role
        user_id, user_data = await require_editor_or_admin_role(request, db)
        
        # Verify workspace access
        if user_data["workspace_id"] != post_data.workspaceId:
            raise HTTPException(status_code=403, detail="Access denied to workspace")
        
        post = post_data.post
        
        # Extract fields that go into content JSONB (matching Next.js logic)
        content_fields = {
            "generatedImage": post.get("generatedImage"),
            "generatedVideoUrl": post.get("generatedVideoUrl"),
            "isGeneratingImage": post.get("isGeneratingImage", False),
            "isGeneratingVideo": post.get("isGeneratingVideo", False),
            "videoGenerationStatus": post.get("videoGenerationStatus", ""),
            "videoOperation": post.get("videoOperation"),
            "platformTemplates": post.get("platformTemplates"),
        }
        
        # Add any additional content
        if post.get("content"):
            content_fields.update(post["content"])
        
        # Create database post object
        db_post = Post(
            id=post.get("id"),  # Use provided ID or let DB generate
            workspace_id=post_data.workspaceId,
            created_by=user_id,
            topic=post.get("topic"),
            platforms=post.get("platforms", []),
            post_type=post.get("postType", "post"),
            content=content_fields,
            status=PostStatus(post.get("status", "draft")),
            scheduled_at=post.get("scheduledAt"),
            published_at=post.get("publishedAt"),
            campaign_id=post.get("campaignId"),
            engagement_score=post.get("engagementScore"),
            engagement_suggestions=post.get("engagementSuggestions")
        )
        
        db.add(db_post)
        await db.commit()
        await db.refresh(db_post)
        
        # Log activity (matching Next.js pattern)
        # TODO: Implement activity logging
        
        # Transform response to match Next.js format
        response_data = {
            "id": str(db_post.id),
            "workspace_id": str(db_post.workspace_id),
            "created_by": str(db_post.created_by),
            "topic": db_post.topic,
            "platforms": db_post.platforms,
            "post_type": db_post.post_type,
            "content": db_post.content,
            "status": db_post.status.value if hasattr(db_post.status, 'value') else str(db_post.status),
            "scheduled_at": db_post.scheduled_at.isoformat() if db_post.scheduled_at else None,
            "published_at": db_post.published_at.isoformat() if db_post.published_at else None,
            "campaign_id": str(db_post.campaign_id) if db_post.campaign_id else None,
            "engagement_score": db_post.engagement_score,
            "engagement_suggestions": db_post.engagement_suggestions,
            "created_at": db_post.created_at.isoformat(),
            "updated_at": db_post.updated_at.isoformat()
        }
        
        logger.info("post_created", post_id=str(db_post.id), workspace_id=post_data.workspaceId, user_id=user_id)
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_post_error", error=str(e), workspace_id=post_data.workspaceId if post_data else None)
        raise HTTPException(status_code=500, detail="Failed to create post")
