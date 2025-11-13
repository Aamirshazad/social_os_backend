"""
Supabase Client Configuration
Provides Supabase client for Auth, Storage, and Realtime features
Integrates with existing database configuration
"""
from fastapi import Depends, HTTPException
from supabase import create_client, Client
from typing import Optional
import structlog

from app.config import settings

logger = structlog.get_logger()

# Global Supabase client instances
_supabase_client: Optional[Client] = None
_supabase_service_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Get Supabase client instance for Auth, Storage, and Realtime features
    Uses anon/public key for client-side operations
    
    Returns:
        Client: Supabase client instance
        
    Raises:
        HTTPException: If Supabase credentials are not configured
    """
    global _supabase_client
    
    if _supabase_client is not None:
        return _supabase_client
    
    supabase_url = settings.SUPABASE_URL
    supabase_key = settings.SUPABASE_KEY
    
    # Check if credentials are properly configured (not placeholder values)
    if (not supabase_url or not supabase_key or 
        supabase_url == "https://placeholder.supabase.co" or 
        supabase_key == "placeholder-key"):
        logger.error("supabase_credentials_not_configured", 
                    url_configured=bool(supabase_url and supabase_url != "https://placeholder.supabase.co"),
                    key_configured=bool(supabase_key and supabase_key != "placeholder-key"))
        raise HTTPException(
            status_code=500, 
            detail="Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_KEY environment variables."
        )
    
    try:
        _supabase_client = create_client(supabase_url, supabase_key)
        logger.info("supabase_client_created", url=supabase_url[:30] + "...")
        return _supabase_client
    except Exception as e:
        logger.error("supabase_client_creation_failed", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create Supabase client: {str(e)}"
        )


def get_supabase_service_client() -> Client:
    """
    Get Supabase client with service role key for admin operations
    Uses service role key for server-side operations with elevated permissions
    
    Returns:
        Client: Supabase client with service role permissions
        
    Raises:
        HTTPException: If service role credentials are not configured
    """
    global _supabase_service_client
    
    if _supabase_service_client is not None:
        return _supabase_service_client
    
    supabase_url = settings.SUPABASE_URL
    service_key = settings.SUPABASE_SERVICE_ROLE_KEY
    
    if (not supabase_url or not service_key or 
        supabase_url == "https://placeholder.supabase.co" or 
        service_key == "placeholder-service-key"):
        logger.error("supabase_service_credentials_not_configured")
        raise HTTPException(
            status_code=500,
            detail="Supabase service role credentials not configured. Please set SUPABASE_SERVICE_ROLE_KEY environment variable."
        )
    
    try:
        _supabase_service_client = create_client(supabase_url, service_key)
        logger.info("supabase_service_client_created")
        return _supabase_service_client
    except Exception as e:
        logger.error("supabase_service_client_creation_failed", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create Supabase service client: {str(e)}"
        )


# FastAPI Dependencies
def get_supabase() -> Client:
    """
    FastAPI dependency to get Supabase client
    Use this in route functions that need Supabase client access
    
    Example:
        @app.get("/some-endpoint")
        async def some_endpoint(supabase: Client = Depends(get_supabase)):
            # Use supabase client here
            pass
    """
    return get_supabase_client()


def get_supabase_service() -> Client:
    """
    FastAPI dependency to get Supabase service client
    Use this in route functions that need admin-level Supabase access
    
    Example:
        @app.post("/admin-endpoint")
        async def admin_endpoint(supabase: Client = Depends(get_supabase_service)):
            # Use service role client here
            pass
    """
    return get_supabase_service_client()


def check_supabase_connection() -> bool:
    """
    Check if Supabase client connection is working
    
    Returns:
        bool: True if connection is successful, False otherwise
    """
    try:
        supabase = get_supabase_client()
        # Test connection with a simple auth check
        response = supabase.auth.get_session()
        return True
    except HTTPException:
        # Configuration error
        return False
    except Exception as e:
        logger.error("supabase_health_check_failed", error=str(e))
        return False


def get_supabase_status() -> dict:
    """
    Get Supabase configuration status (safe for logging)
    
    Returns:
        dict: Supabase configuration details
    """
    return {
        "supabase_url_configured": settings.SUPABASE_URL != "https://placeholder.supabase.co",
        "supabase_key_configured": settings.SUPABASE_KEY != "placeholder-key",
        "supabase_service_key_configured": settings.SUPABASE_SERVICE_ROLE_KEY != "placeholder-service-key",
        "supabase_db_password_configured": settings.SUPABASE_DB_PASSWORD != "placeholder-db-password",
        "connection_healthy": check_supabase_connection()
    }


def reset_clients():
    """
    Reset client instances (useful for testing or configuration changes)
    """
    global _supabase_client, _supabase_service_client
    _supabase_client = None
    _supabase_service_client = None
    logger.info("supabase_clients_reset")
