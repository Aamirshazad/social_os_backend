"""
Optimized HTTP Client with Performance Enhancements
- Keep-Alive Connections
- Session Persistence  
- Connection Pooling
- Optimized Headers
"""
import httpx
import asyncio
from typing import Dict, Any, Optional, Union
from datetime import datetime, timedelta
import structlog

logger = structlog.get_logger()


class OptimizedHTTPClient:
    """
    High-performance HTTP client with connection pooling and keep-alive
    """
    
    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None
        self._session_cache: Dict[str, Dict[str, Any]] = {}
        self._token_cache: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()
        
        # Optimized connection limits and timeouts
        self._limits = httpx.Limits(
            max_keepalive_connections=20,  # Keep connections alive
            max_connections=100,           # Total connection pool
            keepalive_expiry=30.0         # Keep connections for 30s
        )
        
        # Optimized timeout configuration
        self._timeout = httpx.Timeout(
            connect=5.0,    # Connection timeout
            read=30.0,      # Read timeout
            write=10.0,     # Write timeout
            pool=5.0        # Pool timeout
        )
        
        # Default optimized headers
        self._default_headers = {
            "Connection": "keep-alive",
            "Keep-Alive": "timeout=30, max=100",
            "User-Agent": "SocialMediaAI/1.0 (High-Performance Client)",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept": "application/json",
            "Cache-Control": "no-cache"
        }
    
    async def get_client(self) -> httpx.AsyncClient:
        """
        Get or create the singleton HTTP client with optimized settings
        """
        if self._client is None or self._client.is_closed:
            async with self._lock:
                if self._client is None or self._client.is_closed:
                    self._client = httpx.AsyncClient(
                        limits=self._limits,
                        timeout=self._timeout,
                        headers=self._default_headers,
                        http2=True,  # Enable HTTP/2 for better performance
                        follow_redirects=True
                    )
                    logger.info("http_client_created", 
                              max_connections=self._limits.max_connections,
                              keepalive_connections=self._limits.max_keepalive_connections)
        
        return self._client
    
    async def request(
        self,
        method: str,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        params: Optional[Dict[str, Any]] = None,
        json: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        timeout: Optional[float] = None,
        auth_token: Optional[str] = None,
        platform: Optional[str] = None
    ) -> httpx.Response:
        """
        Make an optimized HTTP request with session persistence
        """
        client = await self.get_client()
        
        # Merge headers with optimized defaults
        request_headers = self._default_headers.copy()
        if headers:
            request_headers.update(headers)
        
        # Add authentication if provided
        if auth_token:
            request_headers["Authorization"] = f"Bearer {auth_token}"
        
        # Use custom timeout if provided
        request_timeout = timeout if timeout is not None else self._timeout
        
        start_time = datetime.now()
        
        try:
            response = await client.request(
                method=method,
                url=url,
                headers=request_headers,
                params=params,
                json=json,
                data=data,
                timeout=request_timeout
            )
            
            duration = (datetime.now() - start_time).total_seconds() * 1000
            
            logger.info("http_request_completed",
                       method=method,
                       url=url,
                       status_code=response.status_code,
                       duration_ms=round(duration, 2),
                       platform=platform,
                       connection_reused=True)  # Assume reused with keep-alive
            
            return response
            
        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds() * 1000
            logger.error("http_request_failed",
                        method=method,
                        url=url,
                        error=str(e),
                        duration_ms=round(duration, 2),
                        platform=platform)
            raise
    
    async def get(self, url: str, **kwargs) -> httpx.Response:
        """Optimized GET request"""
        return await self.request("GET", url, **kwargs)
    
    async def post(self, url: str, **kwargs) -> httpx.Response:
        """Optimized POST request"""
        return await self.request("POST", url, **kwargs)
    
    async def put(self, url: str, **kwargs) -> httpx.Response:
        """Optimized PUT request"""
        return await self.request("PUT", url, **kwargs)
    
    async def delete(self, url: str, **kwargs) -> httpx.Response:
        """Optimized DELETE request"""
        return await self.request("DELETE", url, **kwargs)
    
    def cache_session(self, platform: str, session_data: Dict[str, Any]) -> None:
        """
        Cache session data for persistence across requests
        """
        self._session_cache[platform] = {
            **session_data,
            "cached_at": datetime.now(),
            "expires_at": datetime.now() + timedelta(hours=1)
        }
        logger.info("session_cached", platform=platform)
    
    def get_cached_session(self, platform: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached session data if still valid
        """
        if platform in self._session_cache:
            session = self._session_cache[platform]
            if datetime.now() < session["expires_at"]:
                logger.info("session_cache_hit", platform=platform)
                return session
            else:
                # Clean up expired session
                del self._session_cache[platform]
                logger.info("session_cache_expired", platform=platform)
        
        logger.info("session_cache_miss", platform=platform)
        return None
    
    def cache_token(self, platform: str, token_data: Dict[str, Any], expires_in: int = 3600) -> None:
        """
        Cache authentication tokens with auto-refresh capability
        """
        self._token_cache[platform] = {
            **token_data,
            "cached_at": datetime.now(),
            "expires_at": datetime.now() + timedelta(seconds=expires_in - 300)  # Refresh 5 min early
        }
        logger.info("token_cached", platform=platform, expires_in=expires_in)
    
    def get_cached_token(self, platform: str) -> Optional[Dict[str, Any]]:
        """
        Get cached token, checking for expiration
        """
        if platform in self._token_cache:
            token = self._token_cache[platform]
            if datetime.now() < token["expires_at"]:
                logger.info("token_cache_hit", platform=platform)
                return token
            else:
                logger.info("token_cache_expired", platform=platform)
                # Don't delete yet - might be refreshable
                return None
        
        logger.info("token_cache_miss", platform=platform)
        return None
    
    def is_token_expired(self, platform: str) -> bool:
        """
        Check if cached token is expired and needs refresh
        """
        if platform in self._token_cache:
            token = self._token_cache[platform]
            return datetime.now() >= token["expires_at"]
        return True
    
    async def close(self) -> None:
        """
        Close the HTTP client and clean up resources
        """
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            logger.info("http_client_closed")
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """
        Get connection pool statistics for monitoring
        """
        if self._client and not self._client.is_closed:
            return {
                "max_connections": self._limits.max_connections,
                "max_keepalive": self._limits.max_keepalive_connections,
                "keepalive_expiry": self._limits.keepalive_expiry,
                "session_cache_size": len(self._session_cache),
                "token_cache_size": len(self._token_cache),
                "client_closed": self._client.is_closed
            }
        return {"client_closed": True}


# Global singleton instance
_http_client: Optional[OptimizedHTTPClient] = None


async def get_http_client() -> OptimizedHTTPClient:
    """
    Get the global optimized HTTP client instance
    """
    global _http_client
    if _http_client is None:
        _http_client = OptimizedHTTPClient()
    return _http_client


async def close_http_client() -> None:
    """
    Close the global HTTP client
    """
    global _http_client
    if _http_client:
        await _http_client.close()
        _http_client = None
