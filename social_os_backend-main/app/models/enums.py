"""
Shared enums for the application - Matching Next.js schema exactly
"""
import enum


class UserRole(enum.Enum):
    """User roles enum matching Next.js schema"""
    ADMIN = "admin"
    EDITOR = "editor" 
    VIEWER = "viewer"


class PlatformType(enum.Enum):
    """Platform types enum matching Next.js schema"""
    TWITTER = "twitter"
    LINKEDIN = "linkedin"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    TIKTOK = "tiktok"
    YOUTUBE = "youtube"


class PostStatus(enum.Enum):
    """Post status enum matching Next.js schema"""
    DRAFT = "draft"
    NEEDS_APPROVAL = "needs_approval"
    APPROVED = "approved"
    READY_TO_PUBLISH = "ready_to_publish"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    FAILED = "failed"


class ApprovalStatus(enum.Enum):
    """Approval status enum matching Next.js schema"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class MediaType(enum.Enum):
    """Media type enum matching Next.js schema"""
    IMAGE = "image"
    VIDEO = "video"


class MediaSource(enum.Enum):
    """Media source enum matching Next.js schema"""
    AI_GENERATED = "ai-generated"
    UPLOADED = "uploaded"
