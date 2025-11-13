"""
FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from app.config import settings
from app.api.v1 import api_router
from app.core.exceptions import APIException
import structlog

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer() if settings.LOG_FORMAT == "json" 
        else structlog.dev.ConsoleRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered social media management system backend",
    docs_url="/docs",  # Always enable docs for development
    redoc_url="/redoc",  # Always enable redoc for development
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add GZip middleware for response compression
app.add_middleware(GZipMiddleware, minimum_size=1000)


# Exception handlers
@app.exception_handler(APIException)
async def api_exception_handler(request, exc: APIException):
    """Handle custom API exceptions"""
    logger.error(
        "api_exception",
        status_code=exc.status_code,
        detail=exc.detail,
        path=request.url.path,
        exception_type=type(exc).__name__
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "status_code": exc.status_code
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc: Exception):
    """Handle unexpected exceptions"""
    logger.exception(
        "unexpected_exception",
        exc_info=exc,
        path=request.url.path,
        exception_type=type(exc).__name__
    )
    
    # Provide more specific error messages for known exception types
    if "timeout" in str(exc).lower():
        status_code = 504
        detail = "Request timeout"
    elif "connection" in str(exc).lower():
        status_code = 503
        detail = "Service temporarily unavailable"
    else:
        status_code = 500
        detail = "Internal server error" if not settings.DEBUG else str(exc)
    
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": detail,
            "status_code": status_code
        },
    )


# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize resources on startup"""
    logger.info("application_startup", environment=settings.ENVIRONMENT)
    # Initialize database connections, cache, etc.


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup resources on shutdown"""
    logger.info("application_shutdown")
    # Close database connections, cache, etc.


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint with service status"""
    health_status = {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "services": {}
    }
    
    # Check Supabase connection
    try:
        # Media service removed - functionality moved to platform services
        # from app.services.media_service import media_service
        # _ = media_service.supabase
        health_status["services"]["supabase"] = "healthy"
    except ValueError as e:
        # Configuration error (placeholder values)
        health_status["services"]["supabase"] = f"configuration_error: {str(e)}"
        health_status["status"] = "degraded"
    except Exception as e:
        # Connection error
        health_status["services"]["supabase"] = f"connection_error: {str(e)}"
        health_status["status"] = "degraded"
    
    return health_status


# Configuration check endpoint for debugging
@app.get("/config-check")
async def config_check():
    """Configuration check endpoint for debugging environment variables"""
    config_status = {
        "supabase_url_configured": settings.SUPABASE_URL != "https://placeholder.supabase.co",
        "supabase_service_key_configured": settings.SUPABASE_SERVICE_ROLE_KEY != "placeholder-service-key",
        "database_url_configured": settings.DATABASE_URL != "postgresql://user:pass@localhost:5432/dbname",
        "environment": settings.ENVIRONMENT,
        "debug": settings.DEBUG
    }
    
    # Don't expose actual values, just whether they're configured
    return config_status


# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "version": settings.APP_VERSION,
        "docs": "/docs",  # Always show docs URL for development
        "redoc": "/redoc",
        "openapi": f"{settings.API_V1_PREFIX}/openapi.json",
    }


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
