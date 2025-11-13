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
    
    # CORS - Use a simple string field and parse it after initialization
    CORS_ORIGINS_STRING: str = "https://social-os-frontend.vercel.app,http://localhost:3000,https://localhost:3000"
    
    # Handle BACKEND_CORS_ORIGINS environment variable safely
    BACKEND_CORS_ORIGINS_RAW: Optional[str] = Field(default=None, alias="BACKEND_CORS_ORIGINS")
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Parse CORS origins after initialization to avoid Pydantic issues
        self._parse_cors_origins()
    
    def _parse_cors_origins(self):
        """Parse CORS origins from environment or default string"""
        # Use the captured raw value or fall back to default
        env_value = self.BACKEND_CORS_ORIGINS_RAW
        if env_value:
            cors_string = env_value
        else:
            cors_string = self.CORS_ORIGINS_STRING
            
        # Parse the string into a list and store in __dict__ to bypass Pydantic restrictions
        if isinstance(cors_string, str) and cors_string.strip():
            # Handle both comma-separated and JSON array formats safely
            try:
                # Try JSON parsing first
                import json
                if cors_string.startswith('[') and cors_string.endswith(']'):
                    parsed_origins = json.loads(cors_string)
                    if isinstance(parsed_origins, list):
                        self.__dict__['_cors_origins_list'] = [str(origin).strip() for origin in parsed_origins if str(origin).strip()]
                    else:
                        raise ValueError("Not a list")
                else:
                    # Fall back to comma-separated parsing
                    self.__dict__['_cors_origins_list'] = [i.strip() for i in cors_string.split(",") if i.strip()]
            except (json.JSONDecodeError, ValueError):
                # If JSON parsing fails, try comma-separated
                self.__dict__['_cors_origins_list'] = [i.strip() for i in cors_string.split(",") if i.strip()]
        else:
            self.__dict__['_cors_origins_list'] = ["https://social-os-frontend.vercel.app", "http://localhost:3000", "https://localhost:3000"]
    
    def get_cors_origins(self) -> List[str]:
        """Get parsed CORS origins"""
        return self.__dict__.get('_cors_origins_list', ["https://social-os-frontend.vercel.app", "http://localhost:3000", "https://localhost:3000"])
    
    # Compatibility property with a different name to avoid Pydantic conflicts
    @property
    def allowed_origins(self) -> List[str]:
        """Get CORS allowed origins (compatibility property)"""
        return self.get_cors_origins()
    
    # Backward compatibility property for BACKEND_CORS_ORIGINS
    @property
    def BACKEND_CORS_ORIGINS(self) -> List[str]:
        """Get CORS origins for backward compatibility"""
        return self.get_cors_origins()
    
    # Database
    DATABASE_URL: str = Field(default="postgresql://user:pass@localhost:5432/dbname")
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    
    def get_database_url(self) -> str:
        """Get database URL - simplified for Supabase usage"""
        # For Supabase, we primarily use the Supabase client, not direct PostgreSQL connections
        # Only return DATABASE_URL if explicitly set, otherwise return default
        if self.DATABASE_URL != "postgresql://user:pass@localhost:5432/dbname":
            return self.DATABASE_URL
        
        # Return default - most operations will use Supabase client instead
        return self.DATABASE_URL
    
    # JWT
    SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Supabase
    SUPABASE_URL: str = Field(default="https://placeholder.supabase.co")
    SUPABASE_KEY: str = Field(default="placeholder-key")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="placeholder-service-key")
    SUPABASE_DB_PASSWORD: str = Field(default="placeholder-db-password")
    
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
    FRONTEND_URL: str = Field(default="https://social-os-frontend.vercel.app")
    CALLBACK_URL: str = Field(default="http://localhost:8000/api/v1/oauth")
    
    # Email Configuration
    RESEND_API_KEY: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_FROM_NAME: Optional[str] = None
    
    # Encryption
    ENCRYPTION_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    
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
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True
    }


# Create global settings instance
settings = Settings()
