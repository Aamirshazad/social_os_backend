"""Media API endpoints - File uploads and media library.

This module provides production-ready media handling:
- Upload images/videos (file or base64) to Supabase Storage
- Persist media metadata in the media_assets table
- List, fetch, and delete workspace media
"""
from typing import Optional, List
import base64
import uuid
from io import BytesIO

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.database import get_async_db
from app.core.auth_helper import verify_auth_and_get_user, require_editor_or_admin_role
from app.core.supabase import get_supabase_service_client
from app.config import settings
from app.models.media_asset import MediaAsset
from app.models.enums import MediaType, MediaSource
import structlog


logger = structlog.get_logger()
router = APIRouter()

# NOTE: Ensure this bucket exists in your Supabase project
MEDIA_BUCKET_NAME = "media"


class Base64UploadRequest(BaseModel):
    """Request schema for base64 upload"""
    base64Data: str
    fileName: str
    type: str = "image"


def _build_public_url(object_path: str) -> str:
    """Build a public URL for an object stored in Supabase Storage.

    We rely on the conventional public URL pattern for Supabase Storage.
    """
    base_url = settings.SUPABASE_URL.rstrip("/")
    return f"{base_url}/storage/v1/object/public/{MEDIA_BUCKET_NAME}/{object_path}"


def _serialize_media_asset(asset: MediaAsset) -> dict:
    """Serialize MediaAsset DB model to frontend MediaAsset shape."""
    # Derive public URL from stored file_url/path
    # If file_url already looks like a full URL, use it as-is; otherwise treat as object path
    file_url = asset.file_url
    if file_url and not file_url.startswith("http"):
        url = _build_public_url(file_url)
    else:
        url = file_url

    return {
        "id": str(asset.id),
        "name": asset.name,
        "type": asset.type.value if hasattr(asset.type, "value") else str(asset.type),
        "url": url,
        "thumbnailUrl": asset.thumbnail_url,
        "size": asset.file_size or 0,
        "width": asset.width,
        "height": asset.height,
        "tags": asset.tags or [],
        "createdAt": asset.created_at.isoformat() if asset.created_at else None,
        "source": asset.source.value if hasattr(asset.source, "value") else str(asset.source),
        # Usage tracking is not yet implemented; return empty list for now
        "usedInPosts": [],
    }


@router.post("/upload/image")
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Upload an image file
    
    Supports: JPEG, PNG, GIF, WebP
    Max size: 10MB
    """
    try:
        # Verify authentication and require editor or admin role
        user_id, user_data = await require_editor_or_admin_role(request, db)
        workspace_id = user_data["workspace_id"]
        
        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
            )
        
        # Validate file size (10MB)
        contents = await file.read()
        max_size = 10 * 1024 * 1024  # 10MB
        if len(contents) > max_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Max size: {max_size / 1024 / 1024}MB"
            )
        
        # Upload to Supabase Storage
        supabase = get_supabase_service_client()
        object_path = f"{workspace_id}/images/{uuid.uuid4()}_{file.filename}"
        try:
            supabase.storage.from_(MEDIA_BUCKET_NAME).upload(object_path, contents)
        except Exception as e:
            logger.error("supabase_image_upload_failed", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload image to storage"
            )
        
        public_url = _build_public_url(object_path)
        
        # Persist media metadata
        media_asset = MediaAsset(
            workspace_id=workspace_id,
            name=file.filename,
            type=MediaType.IMAGE,
            source=MediaSource.UPLOADED,
            file_url=object_path,  # store storage path; public URL derived when serializing
            file_size=len(contents),
            tags=[],
            created_by=user_id,
        )
        db.add(media_asset)
        await db.commit()
        await db.refresh(media_asset)
        
        logger.info(
            "image_uploaded",
            workspace_id=workspace_id,
            filename=file.filename,
            media_id=str(media_asset.id),
        )
        
        return {
            "success": True,
            "data": {
                "id": str(media_asset.id),
                "url": public_url,
                "filename": media_asset.name,
                "content_type": file.content_type,
            },
            "message": "Image uploaded successfully",
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("image_upload_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post("/upload/video")
async def upload_video(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Upload a video file
    
    Supports: MP4, MOV, AVI, WebM
    Max size: 100MB
    """
    try:
        # Verify authentication and require editor or admin role
        user_id, user_data = await require_editor_or_admin_role(request, db)
        workspace_id = user_data["workspace_id"]
        
        # Validate file type
        allowed_types = ["video/mp4", "video/mov", "video/avi", "video/webm"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
            )
        
        # Note: For large videos, consider streaming upload
        contents = await file.read()
        
        supabase = get_supabase_service_client()
        object_path = f"{workspace_id}/videos/{uuid.uuid4()}_{file.filename}"
        try:
            supabase.storage.from_(MEDIA_BUCKET_NAME).upload(object_path, contents)
        except Exception as e:
            logger.error("supabase_video_upload_failed", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload video to storage"
            )
        
        public_url = _build_public_url(object_path)
        
        media_asset = MediaAsset(
            workspace_id=workspace_id,
            name=file.filename,
            type=MediaType.VIDEO,
            source=MediaSource.UPLOADED,
            file_url=object_path,
            file_size=len(contents),
            tags=[],
            created_by=user_id,
        )
        db.add(media_asset)
        await db.commit()
        await db.refresh(media_asset)
        
        logger.info(
            "video_uploaded",
            workspace_id=workspace_id,
            filename=file.filename,
            media_id=str(media_asset.id),
        )
        
        return {
            "success": True,
            "data": {
                "id": str(media_asset.id),
                "url": public_url,
                "filename": media_asset.name,
                "content_type": file.content_type,
            },
            "message": "Video uploaded successfully",
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("video_upload_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post("/upload/base64")
async def upload_base64(
    upload_request: Base64UploadRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Upload a base64 encoded file
    
    Used for uploading data URIs from canvas/generated images
    """
    try:
        # Verify authentication and require editor or admin role
        user_id, user_data = await require_editor_or_admin_role(request, db)
        workspace_id = user_data["workspace_id"]
        
        # Decode base64
        # Handle data URI format (data:image/png;base64,xxxxx)
        base64_data = upload_request.base64Data
        if "," in base64_data:
            header, base64_data = base64_data.split(",", 1)
            # Extract content type from header
            if ":" in header and ";" in header:
                content_type = header.split(":")[1].split(";")[0]
            else:
                content_type = "image/png"
        else:
            content_type = "image/png"
        
        # Decode base64
        file_data = base64.b64decode(base64_data)
        
        # Create file-like object
        file_obj = BytesIO(file_data)
        
        supabase = get_supabase_service_client()
        is_video = upload_request.type == "video"
        folder = "videos" if is_video else "images"
        object_path = f"{workspace_id}/{folder}/{uuid.uuid4()}_{upload_request.fileName}"
        try:
            supabase.storage.from_(MEDIA_BUCKET_NAME).upload(object_path, file_obj.read())
        except Exception as e:
            logger.error("supabase_base64_upload_failed", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload media to storage"
            )
        
        public_url = _build_public_url(object_path)
        
        media_type = MediaType.VIDEO if is_video else MediaType.IMAGE
        media_asset = MediaAsset(
            workspace_id=workspace_id,
            name=upload_request.fileName,
            type=media_type,
            source=MediaSource.AI_GENERATED,
            file_url=object_path,
            file_size=len(file_data),
            tags=[],
            created_by=user_id,
        )
        db.add(media_asset)
        await db.commit()
        await db.refresh(media_asset)
        
        logger.info(
            "base64_media_uploaded",
            workspace_id=workspace_id,
            filename=upload_request.fileName,
            media_id=str(media_asset.id),
        )
        
        return {
            "success": True,
            "data": {
                "id": str(media_asset.id),
                "url": public_url,
                "filename": media_asset.name,
                "content_type": content_type,
            },
            "message": "Media uploaded successfully",
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("base64_upload_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get("")
async def list_workspace_media(
    request: Request,
    workspace_id: str = Query(..., description="Workspace ID"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    type: Optional[str] = Query(None, description="Filter by media type: image or video"),
    db: AsyncSession = Depends(get_async_db),
):
    """List media assets for a workspace with pagination.

    This powers the Media Library and mediaService.getWorkspaceMedia on the frontend.
    """
    try:
        user_id, user_data = await verify_auth_and_get_user(request, db)

        if user_data["workspace_id"] != workspace_id:
            raise HTTPException(status_code=403, detail="Access denied to workspace")

        query = select(MediaAsset).where(MediaAsset.workspace_id == workspace_id)
        count_query = select(func.count()).select_from(MediaAsset).where(MediaAsset.workspace_id == workspace_id)

        if type:
            try:
                media_type = MediaType(type)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid media type")
            query = query.where(MediaAsset.type == media_type)
            count_query = count_query.where(MediaAsset.type == media_type)

        total_result = await db.execute(count_query)
        total = total_result.scalar_one() or 0

        query = query.order_by(MediaAsset.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        assets: List[MediaAsset] = result.scalars().all()

        items = [_serialize_media_asset(a) for a in assets]
        pages = (total + page_size - 1) // page_size if total else 0

        return {
            "success": True,
            "data": {
                "items": items,
                "total": total,
                "page": page,
                "page_size": page_size,
                "pages": pages,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("list_media_error", error=str(e), workspace_id=workspace_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch media assets",
        )


@router.get("/{media_id}")
async def get_media(
    media_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """Get a single media asset by ID."""
    try:
        user_id, user_data = await verify_auth_and_get_user(request, db)

        result = await db.execute(select(MediaAsset).where(MediaAsset.id == media_id))
        asset: Optional[MediaAsset] = result.scalar_one_or_none()

        if not asset:
            raise HTTPException(status_code=404, detail="Media not found")

        if str(asset.workspace_id) != user_data["workspace_id"]:
            raise HTTPException(status_code=403, detail="Access denied to workspace")

        return {
            "success": True,
            "data": _serialize_media_asset(asset),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_media_error", error=str(e), media_id=media_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch media asset",
        )


@router.delete("/{media_id}", status_code=204)
async def delete_media(
    media_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """Delete a media asset and remove the file from Supabase Storage."""
    try:
        user_id, user_data = await require_editor_or_admin_role(request, db)

        result = await db.execute(select(MediaAsset).where(MediaAsset.id == media_id))
        asset: Optional[MediaAsset] = result.scalar_one_or_none()

        if not asset:
            raise HTTPException(status_code=404, detail="Media not found")

        if str(asset.workspace_id) != user_data["workspace_id"]:
            raise HTTPException(status_code=403, detail="Access denied to workspace")

        # Try to remove from Supabase Storage (best effort)
        try:
            supabase = get_supabase_service_client()
            object_path = asset.file_url
            # If file_url is a full URL, derive the object path relative to the bucket
            prefix = f"/storage/v1/object/public/{MEDIA_BUCKET_NAME}/"
            if "storage/v1/object" in object_path:
                # Strip host and leading path up to bucket
                object_path = object_path.split(prefix, 1)[-1]
            supabase.storage.from_(MEDIA_BUCKET_NAME).remove([object_path])
        except Exception as e:
            # Log but do not fail the request solely because storage cleanup failed
            logger.error("supabase_media_delete_failed", error=str(e), media_id=media_id)

        await db.delete(asset)
        await db.commit()

        logger.info("media_deleted", media_id=media_id, workspace_id=user_data["workspace_id"])
        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error("delete_media_error", error=str(e), media_id=media_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete media asset",
        )
