"""
Authentication Middleware with Auto Token Refresh
"""
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Dict, Any, Optional
import structlog
import json

from app.application.services.auth import AuthenticationService, TokenService
from app.database import get_async_db
from app.core.security import decode_token

logger = structlog.get_logger()


class AutoTokenRefreshMiddleware(BaseHTTPMiddleware):
    """
    Middleware that automatically refreshes JWT tokens when they're about to expire
    """
    
    def __init__(self, app, refresh_buffer_minutes: int = 5):
        super().__init__(app)
        self.refresh_buffer_minutes = refresh_buffer_minutes
        self.excluded_paths = {
            "/api/v1/auth/login",
            "/api/v1/auth/register", 
            "/api/v1/auth/refresh",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/health"
        }
    
    async def dispatch(self, request: Request, call_next):
        """
        Process request and auto-refresh tokens if needed
        """
        # Skip middleware for excluded paths
        if request.url.path in self.excluded_paths:
            return await call_next(request)
        
        # Skip if no authorization header
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return await call_next(request)
        
        access_token = auth_header.split(" ")[1]
        refresh_token = request.headers.get("x-refresh-token")
        
        # Skip if no refresh token provided
        if not refresh_token:
            return await call_next(request)
        
        try:
            # Check if token needs refresh
            if TokenService.is_token_expired(access_token):
                logger.info("auto_refresh_triggered", 
                           path=request.url.path,
                           method=request.method)
                
                # Attempt auto refresh without database dependency
                try:
                    new_tokens = TokenService.refresh_tokens(refresh_token)
                    
                    if new_tokens:
                        # Process the original request with new token
                        request.headers.__dict__["_list"] = [
                            (k, v) for k, v in request.headers.items() 
                            if k.lower() != "authorization"
                        ]
                        request.headers.__dict__["_list"].append(
                            ("authorization", f"Bearer {new_tokens['access_token']}")
                        )
                        
                        # Process request
                        response = await call_next(request)
                        
                        # Add new tokens to response headers
                        response.headers["x-new-access-token"] = new_tokens["access_token"]
                        response.headers["x-new-refresh-token"] = new_tokens["refresh_token"]
                        response.headers["x-token-refreshed"] = "true"
                        
                        logger.info("auto_refresh_successful",
                                   path=request.url.path,
                                   method=request.method)
                        
                        return response
                    else:
                        # Refresh failed, let request proceed with original token
                        logger.warning("auto_refresh_failed_proceeding",
                                     path=request.url.path,
                                     method=request.method)
                        return await call_next(request)
                
                except Exception as refresh_error:
                    logger.error("token_refresh_error", error=str(refresh_error))
                    return await call_next(request)
            
            # Token doesn't need refresh, proceed normally
            return await call_next(request)
            
        except Exception as e:
            logger.error("auto_refresh_middleware_error", 
                        error=str(e),
                        path=request.url.path,
                        method=request.method)
            
            # On error, proceed with original request
            return await call_next(request)


class TokenValidationMiddleware(BaseHTTPMiddleware):
    """
    Middleware for token validation with performance optimizations
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.excluded_paths = {
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/refresh",
            "/docs",
            "/redoc", 
            "/openapi.json",
            "/health"
        }
        # Cache for recently validated tokens (in-memory for performance)
        self._token_cache: Dict[str, Dict[str, Any]] = {}
        self._cache_max_size = 1000
    
    async def dispatch(self, request: Request, call_next):
        """
        Validate tokens with caching for performance
        """
        # Skip middleware for excluded paths
        if request.url.path in self.excluded_paths:
            return await call_next(request)
        
        # Check for authorization header
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return await call_next(request)
        
        access_token = auth_header.split(" ")[1]
        
        try:
            # Check cache first for performance
            if access_token in self._token_cache:
                cached_data = self._token_cache[access_token]
                # Use cached validation if token hasn't expired
                if not TokenService.is_token_expired(access_token):
                    request.state.user = cached_data
                    return await call_next(request)
                else:
                    # Remove expired token from cache
                    del self._token_cache[access_token]
            
            # Validate token
            payload = decode_token(access_token)
            
            # Cache the validation result
            if len(self._token_cache) >= self._cache_max_size:
                # Remove oldest entry if cache is full
                oldest_key = next(iter(self._token_cache))
                del self._token_cache[oldest_key]
            
            self._token_cache[access_token] = payload
            request.state.user = payload
            
            return await call_next(request)
            
        except Exception as e:
            logger.warning("token_validation_failed",
                          error=str(e),
                          path=request.url.path,
                          method=request.method)
            
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or expired token"}
            )
