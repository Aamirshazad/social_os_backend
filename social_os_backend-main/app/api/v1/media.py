"""Media API endpoints - File uploads and media library.

This module provides production-ready media handling:
- Upload images/videos (file or base64) to Supabase Storage
- Persist media metadata in the media_assets table via Supabase HTTP
- List, fetch, and delete workspace media
"""
from typing import Optional, List
import base64
import uuid
from io import BytesIO
from datetime import datetime

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Request, Query
from pydantic import BaseModel

from app.core.auth_helper import verify_auth_and_get_user, require_editor_or_admin_role
from app.core.supabase import get_supabase_service_client
from app.config import settings
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

def _serialize_media_asset(row: dict) -> dict:
    """Serialize media_assets Supabase row to frontend MediaAsset shape."""
    # Derive public URL from stored file_url/path
    # If file_url already looks like a full URL, use it as-is; otherwise treat as object path
    file_url = row.get("file_url")
    if file_url and not file_url.startswith("http"):
        url = _build_public_url(file_url)
    else:
        url = file_url

    return {
        "id": row.get("id"),
        "name": row.get("name"),
        "type": row.get("type"),
        "url": url,
        "thumbnailUrl": row.get("thumbnail_url"),
        "size": row.get("file_size") or 0,
        "width": row.get("width"),
        "height": row.get("height"),
        "tags": row.get("tags") or [],
        "createdAt": row.get("created_at"),
        "source": row.get("source"),
        # Usage tracking is not yet implemented; return empty list for now
        "usedInPosts": [],
    }

@router.post("/upload/image")
async def upload_image(
    request: Request,
    file: UploadFile = File(...)
):
    """
    Upload an image file
    
    Supports: JPEG, PNG, GIF, WebP
    Max size: 10MB
    """
    try:
        # Verify authentication and require editor or admin role
        user_id, user_data = await require_editor_or_admin_role(request)
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
        
        # Persist media metadata to Supabase
        supabase_client = get_supabase_service_client()
        payload = {
            "workspace_id": workspace_id,
            "name": file.filename,
            "type": "image",
            "source": "uploaded",
            "file_url": object_path,
            "file_size": len(contents),
            "tags": [],
            "created_by": user_id,
        }
        
        response = supabase_client.table("media_assets").insert(payload).select("*").maybe_single().execute()
        
        error = getattr(response, "error", None)
        if error:
            logger.error("supabase_media_insert_error", error=str(error), workspace_id=workspace_id)
            raise HTTPException(status_code=500, detail="Failed to save media metadata")
        
        media_row = getattr(response, "data", None)
        if not media_row:
            raise HTTPException(status_code=500, detail="Failed to save media metadata")
        
        logger.info(
            "image_uploaded",
            workspace_id=workspace_id,
            filename=file.filename,
            media_id=media_row.get("id"))
        
        return {
            "success": True,
            "data": {
                "id": media_row.get("id"),
                "url": public_url,
                "filename": media_row.get("name"),
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
            detail=str(e))

@router.post("/upload/video")
async def upload_video(
    request: Request,
    file: UploadFile = File(...)
):
    """
    Upload a video file
    
    Supports: MP4, MOV, AVI, WebM
    Max size: 100MB
    """
    try:
        # Verify authentication and require editor or admin role
        user_id, user_data = await require_editor_or_admin_role(request)
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
        
        # Persist media metadata to Supabase
        supabase_client = get_supabase_service_client()
        payload = {
            "workspace_id": workspace_id,
            "name": file.filename,
            "type": "video",
            "source": "uploaded",
            "file_url": object_path,
            "file_size": len(contents),
            "tags": [],
            "created_by": user_id,
        }
        
        response = supabase_client.table("media_assets").insert(payload).select("*").maybe_single().execute()
        
        error = getattr(response, "error", None)
        if error:
            logger.error("supabase_media_insert_error", error=str(error), workspace_id=workspace_id)
            raise HTTPException(status_code=500, detail="Failed to save media metadata")
        
        media_row = getattr(response, "data", None)
        if not media_row:
            raise HTTPException(status_code=500, detail="Failed to save media metadata")
        
        logger.info(
            "video_uploaded",
            workspace_id=workspace_id,
            filename=file.filename,
            media_id=media_row.get("id"))
        
        return {
            "success": True,
            "data": {
                "id": media_row.get("id"),
                "url": public_url,
                "filename": media_row.get("name"),
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
            detail=str(e))

@router.post("/upload/base64")
async def upload_base64(
    upload_request: Base64UploadRequest,
    request: Request
):
    """
    Upload a base64 encoded file
    
    Used for uploading data URIs from canvas/generated images
    """
    try:
        # Verify authentication and require editor or admin role
        user_id, user_data = await require_editor_or_admin_role(request)
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
        
        # Persist media metadata to Supabase
        supabase_client = get_supabase_service_client()
        media_type = "video" if is_video else "image"
        payload = {
            "workspace_id": workspace_id,
            "name": upload_request.fileName,
            "type": media_type,
            "source": "ai_generated",
            "file_url": object_path,
            "file_size": len(file_data),
            "tags": [],
            "created_by": user_id,
        }
        
        response = supabase_client.table("media_assets").insert(payload).select("*").maybe_single().execute()
        
        error = getattr(response, "error", None)
        if error:
            logger.error("supabase_media_insert_error", error=str(error), workspace_id=workspace_id)
            raise HTTPException(status_code=500, detail="Failed to save media metadata")
        
        media_row = getattr(response, "data", None)
        if not media_row:
            raise HTTPException(status_code=500, detail="Failed to save media metadata")
        
        logger.info(
            "base64_media_uploaded",
            workspace_id=workspace_id,
            filename=upload_request.fileName,
            media_id=media_row.get("id"))
        
        return {
            "success": True,
            "data": {
                "id": media_row.get("id"),
                "url": public_url,
                "filename": media_row.get("name"),
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
            detail=str(e))

@router.get("")
async def list_workspace_media(
    request: Request,
    workspace_id: str = Query(..., description="Workspace ID"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    type: Optional[str] = Query(None, description="Filter by media type: image or video")):
    """List media assets for a workspace with pagination.

    This powers the Media Library and mediaService.getWorkspaceMedia on the frontend.
    """
    try:
        user_id, user_data = await verify_auth_and_get_user(request)

        if user_data["workspace_id"] != workspace_id:
            raise HTTPException(status_code=403, detail="Access denied to workspace")

        supabase = get_supabase_service_client()
        
        # Get total count
        count_response = supabase.table("media_assets").select("id", count="exact").eq("workspace_id", workspace_id)
        
        if type:
            if type not in ["image", "video"]:
                raise HTTPException(status_code=400, detail="Invalid media type")
            count_response = count_response.eq("type", type)
        
        count_result = count_response.execute()
        total = getattr(count_result, "count", 0) or 0

        # Get paginated results
        offset = (page - 1) * page_size
        query = supabase.table("media_assets").select("*").eq("workspace_id", workspace_id).order("created_at", desc=True).range(offset, offset + page_size - 1)
        
        if type:
            query = query.eq("type", type)
        
        result = query.execute()
        rows = getattr(result, "data", None) or []

        items = [_serialize_media_asset(row) for row in rows]
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
            detail="Failed to fetch media assets")

@router.get("/{media_id}")
async def get_media(
    media_id: str,
    request: Request):
    """Get a single media asset by ID."""
    try:
        user_id, user_data = await verify_auth_and_get_user(request)

        supabase = get_supabase_service_client()
        response = supabase.table("media_assets").select("*").eq("id", media_id).maybe_single().execute()
        
        asset_row = getattr(response, "data", None)
        if not asset_row:
            raise HTTPException(status_code=404, detail="Media not found")

        if asset_row.get("workspace_id") != user_data["workspace_id"]:
            raise HTTPException(status_code=403, detail="Access denied to workspace")

        return {
            "success": True,
            "data": _serialize_media_asset(asset_row),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("get_media_error", error=str(e), media_id=media_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch media asset")

@router.delete("/{media_id}", status_code=204)
async def delete_media(
    media_id: str,
    request: Request):
    """Delete a media asset and remove the file from Supabase Storage."""
    try:
        user_id, user_data = await require_editor_or_admin_role(request)

        supabase = get_supabase_service_client()
        
        # Get media asset from Supabase
        response = supabase.table("media_assets").select("*").eq("id", media_id).maybe_single().execute()
        asset_row = getattr(response, "data", None)

        if not asset_row:
            raise HTTPException(status_code=404, detail="Media not found")

        if asset_row.get("workspace_id") != user_data["workspace_id"]:
            raise HTTPException(status_code=403, detail="Access denied to workspace")

        # Try to remove from Supabase Storage (best effort)
        try:
            object_path = asset_row.get("file_url")
            # If file_url is a full URL, derive the object path relative to the bucket
            prefix = f"/storage/v1/object/public/{MEDIA_BUCKET_NAME}/"
            if "storage/v1/object" in object_path:
                # Strip host and leading path up to bucket
                object_path = object_path.split(prefix, 1)[-1]
            supabase.storage.from_(MEDIA_BUCKET_NAME).remove([object_path])
        except Exception as e:
            # Log but do not fail the request solely because storage cleanup failed
            logger.error("supabase_media_delete_failed", error=str(e), media_id=media_id)

        # Delete from media_assets table
        delete_response = supabase.table("media_assets").delete().eq("id", media_id).execute()
        
        error = getattr(delete_response, "error", None)
        if error:
            logger.error("delete_media_db_error", error=str(error), media_id=media_id)
            raise HTTPException(status_code=500, detail="Failed to delete media")

        logger.info("media_deleted", media_id=media_id, workspace_id=user_data["workspace_id"])
        return None

    except HTTPException:
        raise
    except Exception as e:
        logger.error("delete_media_error", error=str(e), media_id=media_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e))
