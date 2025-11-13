"""
Startup validation checks for production readiness
"""
import structlog
from app.config import settings

logger = structlog.get_logger()


def validate_environment():
    """
    Validate critical environment variables on startup
    
    Raises:
        ValueError: If critical configuration is missing or invalid
    """
    errors = []
    warnings = []
    
    # Critical checks - must be configured
    if settings.ENVIRONMENT == "production":
        # Production-specific checks
        if settings.DEBUG:
            errors.append("DEBUG must be False in production")
        
        # Supabase configuration is critical
        if settings.SUPABASE_URL == "https://placeholder.supabase.co":
            errors.append("SUPABASE_URL must be configured in production")
        
        if settings.SUPABASE_KEY == "placeholder-key":
            errors.append("SUPABASE_KEY must be configured in production")
        
        if settings.SUPABASE_SERVICE_ROLE_KEY == "placeholder-service-key":
            errors.append("SUPABASE_SERVICE_ROLE_KEY must be configured in production")
        
        # Check CORS origins are not using localhost
        cors_origins = settings.get_cors_origins()
        if any("localhost" in origin or "127.0.0.1" in origin for origin in cors_origins):
            warnings.append("CORS origins contain localhost - ensure this is intentional in production")
    
    # General checks
    if len(settings.SECRET_KEY) < 32:
        errors.append("SECRET_KEY must be at least 32 characters long")
    
    if len(settings.ENCRYPTION_KEY) < 32:
        errors.append("ENCRYPTION_KEY must be at least 32 characters long")
    
    # Warnings for optional but recommended settings
    if not settings.GEMINI_API_KEY and settings.ENVIRONMENT == "production":
        warnings.append("GEMINI_API_KEY not configured - AI features will be unavailable")
    
    if not settings.OPENAI_API_KEY and settings.ENVIRONMENT == "production":
        warnings.append("OPENAI_API_KEY not configured - OpenAI features will be unavailable")
    
    # Log results
    if errors:
        logger.error("startup_validation_failed", errors=errors, count=len(errors))
        raise ValueError(f"Startup validation failed with {len(errors)} error(s):\n" + "\n".join(f"  - {e}" for e in errors))
    
    if warnings:
        for warning in warnings:
            logger.warning("startup_validation_warning", message=warning)
    
    logger.info("startup_validation_passed", environment=settings.ENVIRONMENT)
    return True
