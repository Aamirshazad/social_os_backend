"""
Application configuration using Pydantic Settings
"""
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
import secrets


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "Social Media AI System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"
    API_V1_PREFIX: str = "/api/v1"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS - Use string field to avoid JSON parsing issues
    BACKEND_CORS_ORIGINS_STR: str = "http://localhost:3000,https://localhost:3000,https://social-ms.vercel.app"
    
    @property
    def BACKEND_CORS_ORIGINS(self) -> List[str]:
        """Parse CORS origins from string or return default list"""
        # Check for BACKEND_CORS_ORIGINS environment variable first
        import os
        env_value = os.getenv('BACKEND_CORS_ORIGINS')
        if env_value:
            value = env_value
        else:
            value = getattr(self, 'BACKEND_CORS_ORIGINS_STR', '')
            
        if isinstance(value, str):
            # Handle empty string case
            if not value.strip():
                return ["http://localhost:3000"]
            # Split comma-separated values
            return [i.strip() for i in value.split(",") if i.strip()]
        elif isinstance(value, list):
            return value
        else:
            # Fallback to default
            return ["http://localhost:3000"]
    
    # Database
    DATABASE_URL: str = Field("postgresql://user:pass@localhost:5432/dbname")
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    
    # JWT
    SECRET_KEY: str = Field(default_factory=secrets.token_urlsafe)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Supabase
    SUPABASE_URL: str = Field("https://placeholder.supabase.co")
    SUPABASE_KEY: str = Field("placeholder-key")
    SUPABASE_SERVICE_ROLE_KEY: str = Field("placeholder-service-key")
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # AI Services
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    
    # Social Platforms - Twitter
    TWITTER_CLIENT_ID: Optional[str] = None
    TWITTER_CLIENT_SECRET: Optional[str] = None
    TWITTER_BEARER_TOKEN: Optional[str] = None
    
    # LinkedIn
    LINKEDIN_CLIENT_ID: Optional[str] = None
    LINKEDIN_CLIENT_SECRET: Optional[str] = None
    
    # Facebook
    FACEBOOK_CLIENT_ID: Optional[str] = None
    FACEBOOK_CLIENT_SECRET: Optional[str] = None
    
    # Instagram
    INSTAGRAM_CLIENT_ID: Optional[str] = None
    INSTAGRAM_CLIENT_SECRET: Optional[str] = None
    
    # TikTok
    TIKTOK_CLIENT_ID: Optional[str] = None
    TIKTOK_CLIENT_SECRET: Optional[str] = None
    
    # YouTube
    YOUTUBE_CLIENT_ID: Optional[str] = None
    YOUTUBE_CLIENT_SECRET: Optional[str] = None
    
    # Application URLs
    FRONTEND_URL: str = Field("http://localhost:3000")
    CALLBACK_URL: str = Field("http://localhost:8000/api/v1/oauth")
    
    # Email Configuration
    RESEND_API_KEY: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_FROM_NAME: Optional[str] = None
    
    # Encryption
    ENCRYPTION_KEY: str = Field(default_factory=secrets.token_urlsafe)
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 30485760  # 10MB
    ALLOWED_IMAGE_TYPES: List[str] = [
        "image/jpeg", "image/png", "image/gif", "image/webp"
    ]
    ALLOWED_VIDEO_TYPES: List[str] = [
        "video/mp4", "video/quicktime", "video/x-msvideo"
    ]
    
    @field_validator("ALLOWED_IMAGE_TYPES", "ALLOWED_VIDEO_TYPES", mode="before")
    @classmethod
    def parse_list_fields(cls, v):
        if isinstance(v, str):
            # Handle JSON string format
            if v.startswith('[') and v.endswith(']'):
                import json
                try:
                    return json.loads(v)
                except json.JSONDecodeError:
                    pass
            # Handle comma-separated format
            return [i.strip().strip('"') for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        else:
            return []
    
    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create global settings instance
settings = Settings()
