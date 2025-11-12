"""
Media Service - File upload and media management
"""
from typing import Optional, BinaryIO
import uuid
from datetime import datetime
import structlog
from supabase import create_client, Client

from app.config import settings
from app.core.exceptions import ValidationError

logger = structlog.get_logger()


class MediaService:
    """Service for handling media uploads and storage"""
    
    def __init__(self):
        self.supabase: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY
        )
        self.bucket_name = "media"
    
    async def upload_image(
        self,
        file: BinaryIO,
        filename: str,
        workspace_id: str,
        content_type: str
    ) -> str:
        """
        Upload image to Supabase Storage
        
        Args:
            file: File object
            filename: Original filename
            workspace_id: Workspace ID
            content_type: MIME type
        
        Returns:
            Public URL of uploaded image
        """
        # Validate file type
        if not content_type.startswith("image/"):
            raise ValidationError("Only image files are allowed")
        
        # Generate unique filename
        ext = filename.split(".")[-1]
        unique_filename = f"{workspace_id}/{uuid.uuid4()}.{ext}"
        
        try:
            # Upload to Supabase Storage
            response = self.supabase.storage.from_(self.bucket_name).upload(
                path=unique_filename,
                file=file,
                file_options={"content-type": content_type}
            )
            
            # Get public URL
            public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(
                unique_filename
            )
            
            logger.info(
                "image_uploaded",
                workspace_id=workspace_id,
                filename=unique_filename
            )
            
            return public_url
            
        except Exception as e:
            logger.error("image_upload_error", error=str(e))
            raise Exception(f"Failed to upload image: {str(e)}")
    
    async def upload_video(
        self,
        file: BinaryIO,
        filename: str,
        workspace_id: str,
        content_type: str
    ) -> str:
        """
        Upload video to Supabase Storage
        
        Args:
            file: File object
            filename: Original filename
            workspace_id: Workspace ID
            content_type: MIME type
        
        Returns:
            Public URL of uploaded video
        """
        # Validate file type
        if not content_type.startswith("video/"):
            raise ValidationError("Only video files are allowed")
        
        # Generate unique filename
        ext = filename.split(".")[-1]
        unique_filename = f"{workspace_id}/videos/{uuid.uuid4()}.{ext}"
        
        try:
            # Upload to Supabase Storage
            response = self.supabase.storage.from_(self.bucket_name).upload(
                path=unique_filename,
                file=file,
                file_options={"content-type": content_type}
            )
            
            # Get public URL
            public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(
                unique_filename
            )
            
            logger.info(
                "video_uploaded",
                workspace_id=workspace_id,
                filename=unique_filename
            )
            
            return public_url
            
        except Exception as e:
            logger.error("video_upload_error", error=str(e))
            raise Exception(f"Failed to upload video: {str(e)}")
    
    async def delete_file(self, file_path: str) -> bool:
        """
        Delete a file from storage
        
        Args:
            file_path: Path to file in storage
        
        Returns:
            True if successful
        """
        try:
            self.supabase.storage.from_(self.bucket_name).remove([file_path])
            logger.info("file_deleted", path=file_path)
            return True
        except Exception as e:
            logger.error("file_delete_error", error=str(e), path=file_path)
            return False


# Singleton instance
media_service = MediaService()
