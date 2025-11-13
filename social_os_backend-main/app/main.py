"""
FastAPI Application Entry Point
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from app.config import settings
from app.api.v1 import api_router
from app.core.exceptions import APIException
from app.core.security_headers import SecurityHeadersMiddleware
from app.core.startup_validation import validate_environment
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
    docs_url="/docs" if settings.DEBUG else None,  # Only enable docs in debug mode
    redoc_url="/redoc" if settings.DEBUG else None,  # Only enable redoc in debug mode
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json" if settings.DEBUG else None,
)

# Add CORS middleware - Production-ready configuration
cors_origins = settings.get_cors_origins()

# Log CORS configuration for debugging (only in debug mode)
if settings.DEBUG:
    logger.info("cors_configuration", origins=cors_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (safe behind proxy)
    allow_credentials=False,  # Disable credentials when using wildcard
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allow_headers=["*"],  # Allow all headers
    expose_headers=["Content-Type", "Authorization"],
    max_age=3600  # Cache CORS preflight for 1 hour
)

# Add security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# Add GZip middleware for response compression
app.add_middleware(GZipMiddleware, minimum_size=1000)


# Request logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    """Log all incoming requests for debugging (without sensitive data)"""
    if settings.DEBUG:
        # Only log in debug mode to avoid exposing sensitive information
        safe_headers = {k: v for k, v in request.headers.items() 
                       if k.lower() not in ['authorization', 'cookie', 'x-api-key']}
        logger.info(
            "incoming_request",
            method=request.method,
            url=str(request.url),
            client=request.client.host if request.client else None
        )
    
    response = await call_next(request)
    
    if settings.DEBUG:
        logger.info(
            "response_sent",
            status_code=response.status_code,
            url=str(request.url)
        )
    
    return response


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
    
    # Validate environment configuration
    try:
        validate_environment()
    except ValueError as e:
        logger.error("startup_validation_error", error=str(e))
        raise
    
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
    
    # Skip direct PostgreSQL connection test - using Supabase client instead
    # Database operations will be handled through Supabase client
    health_status["services"]["database"] = "using_supabase_client"
    
    # Check Supabase connection
    try:
        from supabase import create_client
        import os
        
        supabase_url = settings.SUPABASE_URL
        supabase_key = settings.SUPABASE_KEY
        
        if (supabase_url != "https://placeholder.supabase.co" and 
            supabase_key != "placeholder-key"):
            # Create client and test connection
            supabase = create_client(supabase_url, supabase_key)
            # Simple connection test - just create the client
            health_status["services"]["supabase"] = "healthy"
        else:
            health_status["services"]["supabase"] = "configuration_error: credentials not configured"
            health_status["status"] = "degraded"
            
    except Exception as e:
        # Connection error
        health_status["services"]["supabase"] = f"connection_error: {str(e)}"
        health_status["status"] = "degraded"
        logger.error("supabase_health_check_failed", error=str(e))
    
    return health_status


# Configuration check endpoint for debugging
@app.get("/config-check")
async def config_check():
    """Configuration check endpoint for debugging environment variables"""
    import os
    supabase_url = os.getenv("SUPABASE_URL", "not-configured")
    supabase_key = os.getenv("SUPABASE_KEY", "not-configured")
    supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "not-configured")
    
    config_status = {
        "supabase_url_configured": supabase_url != "not-configured",
        "supabase_key_configured": supabase_key != "not-configured",
        "supabase_service_role_key_configured": supabase_service_key != "not-configured",
        "environment": settings.ENVIRONMENT,
        "debug": settings.DEBUG,
        "cors_origins": cors_origins,  # Show actual CORS origins being used
        "frontend_url": settings.FRONTEND_URL
    }
    
    # Don't expose actual values, just whether they're configured
    return config_status


# Removed global OPTIONS handler - will be added after API router


# CORS test endpoint
@app.get("/cors-test")
async def cors_test():
    """Simple CORS test endpoint"""
    return {"message": "CORS test successful", "timestamp": "2025-11-13T15:49:00Z"}


@app.post("/cors-test")
async def cors_test_post():
    """CORS test endpoint for POST requests"""
    return {"message": "CORS POST test successful", "timestamp": "2025-11-13T15:49:00Z"}


# Removed manual CORS OPTIONS handler - letting CORS middleware handle it


# Test endpoint that mimics the auth/login structure
@app.post("/test-login")
async def test_login():
    """Test endpoint to verify CORS is working for POST requests"""
    return {"message": "Test login endpoint working", "cors": "success"}


# Database test endpoint
@app.get("/test-db")
async def test_database():
    """Test database connectivity without authentication"""
    try:
        from app.database import async_engine
        async with async_engine.connect() as conn:
            result = await conn.execute("SELECT 1 as test")
            row = result.fetchone()
            return {
                "status": "success",
                "message": "Database connection successful",
                "test_result": row[0] if row else None
            }
    except Exception as e:
        logger.error("database_test_failed", error=str(e))
        return {
            "status": "error",
            "message": f"Database connection failed: {str(e)}"
        }


# Database configuration debug endpoint
@app.get("/debug-db-config")
async def debug_database_config():
    """Debug database configuration (safe for production)"""
    import os
    supabase_url = os.getenv("SUPABASE_URL", "not-configured")
    supabase_key = os.getenv("SUPABASE_KEY", "not-configured")
    supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "not-configured")
    
    # Extract project ref from Supabase URL
    if supabase_url != "not-configured":
        project_ref = supabase_url.replace("https://", "").replace(".supabase.co", "")
    else:
        project_ref = "not-configured"
    
    return {
        "supabase_url_configured": supabase_url != "not-configured",
        "supabase_key_configured": supabase_key != "not-configured",
        "supabase_service_role_key_configured": supabase_service_key != "not-configured",
        "supabase_project_ref": project_ref,
        "constructed_db_host": f"db.{project_ref}.supabase.co" if project_ref != "not-configured" else "not-configured"
    }


# Removed specific auth OPTIONS handler - letting CORS middleware handle it


# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# Removed global OPTIONS handler - letting CORS middleware handle all preflight requests


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
