"""
Media API endpoints - File uploads
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
import base64

from app.database import get_async_db
from app.core.auth_helper import verify_auth_and_get_user, require_editor_or_admin_role
# TODO: MediaService needs to be implemented in new structure
# from app.services.media_service import media_service
from app.config import settings
import structlog

logger = structlog.get_logger()
router = APIRouter()


class Base64UploadRequest(BaseModel):
    """Request schema for base64 upload"""
    base64Data: str
    fileName: str
    type: str = "image"


@router.post("/upload/image")
async def upload_image(
    file: UploadFile = File(...),
    request: Request,

    ):
    """
    Upload an image file
    
    Supports: JPEG, PNG, GIF, WebP
    Max size: 10MB
    """
    # Validate file type
    if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(settings.ALLOWED_IMAGE_TYPES)}"
        )
    
    # Validate file size
    contents = await file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Max size: {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    await file.seek(0)
    
    try:
        # Upload to storage
        url = await media_service.upload_image(
            file=file.file,
            filename=file.filename,
            workspace_id=workspace_id,
            content_type=file.content_type
        )
        
        logger.info(
            "image_uploaded",
            workspace_id=workspace_id,
            filename=file.filename
        )
        
        return {
            "success": True,
            "data": {
                "url": url,
                "filename": file.filename,
                "content_type": file.content_type
            },
            "message": "Image uploaded successfully"
        }
        
    except Exception as e:
        logger.error("image_upload_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/upload/video")
async def upload_video(
    file: UploadFile = File(...),
    request: Request,

    ):
    """
    Upload a video file
    
    Supports: MP4, MOV, AVI, WebM
    Max size: 100MB
    """
    # Validate file type
    if file.content_type not in settings.ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(settings.ALLOWED_VIDEO_TYPES)}"
        )
    
    # Note: For large videos, consider streaming upload
    
    try:
        # Upload to storage
        url = await media_service.upload_video(
            file=file.file,
            filename=file.filename,
            workspace_id=workspace_id,
            content_type=file.content_type
        )
        
        logger.info(
            "video_uploaded",
            workspace_id=workspace_id,
            filename=file.filename
        )
        
        return {
            "success": True,
            "data": {
                "url": url,
                "filename": file.filename,
                "content_type": file.content_type
            },
            "message": "Video uploaded successfully"
        }
        
    except Exception as e:
        logger.error("video_upload_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/upload/base64")
async def upload_base64(
    request: Base64UploadRequest,
    request: Request,

    ):
    """
    Upload a base64 encoded file
    
    Used for uploading data URIs from canvas/generated images
    """
    try:
        # Decode base64
        # Handle data URI format (data:image/png;base64,xxxxx)
        base64_data = request.base64Data
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
        from io import BytesIO
        file_obj = BytesIO(file_data)
        
        # Upload based on type
        if request.type == "image":
            url = await media_service.upload_image(
                file=file_obj,
                filename=request.fileName,
                workspace_id=workspace_id,
                content_type=content_type
            )
        else:
            url = await media_service.upload_video(
                file=file_obj,
                filename=request.fileName,
                workspace_id=workspace_id,
                content_type=content_type
            )
        
        logger.info(
            "base64_uploaded",
            workspace_id=workspace_id,
            filename=request.fileName
        )
        
        return {
            "url": url,
            "message": "File uploaded successfully"
        }
        
    except Exception as e:
        logger.error("base64_upload_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
