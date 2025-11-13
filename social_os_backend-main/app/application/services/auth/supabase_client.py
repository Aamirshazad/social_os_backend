"""
Simplified Supabase Client for Authentication
Matches Next.js Supabase integration pattern
"""
from typing import Optional, Dict, Any
import httpx
import structlog
from app.config import settings

logger = structlog.get_logger()


class SupabaseClient:
    """Simplified Supabase client for authentication"""
    
    def __init__(self):
        self.url = settings.SUPABASE_URL
        self.anon_key = settings.SUPABASE_KEY
        self.service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY
        
    async def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify JWT token with Supabase
        
        Args:
            token: JWT token to verify
            
        Returns:
            User data if token is valid, None otherwise
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.url}/auth/v1/user",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "apikey": self.anon_key
                    }
                )
                
                if response.status_code == 200:
                    user_data = response.json()
                    return {"user": user_data}
                else:
                    logger.warning("token_verification_failed", status_code=response.status_code)
                    return None
                    
        except Exception as e:
            logger.error("supabase_token_verification_error", error=str(e))
            return None
    
    async def create_user(self, email: str, password: str, user_metadata: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """
        Create user with Supabase Auth
        
        Args:
            email: User email
            password: User password
            user_metadata: Additional user metadata
            
        Returns:
            User data if successful, None otherwise
        """
        try:
            async with httpx.AsyncClient() as client:
                payload = {
                    "email": email,
                    "password": password,
                    "email_confirm": True
                }
                
                if user_metadata:
                    payload["user_metadata"] = user_metadata
                
                response = await client.post(
                    f"{self.url}/auth/v1/admin/users",
                    headers={
                        "Authorization": f"Bearer {self.service_role_key}",
                        "apikey": self.service_role_key,
                        "Content-Type": "application/json"
                    },
                    json=payload
                )
                
                if response.status_code in [200, 201]:
                    return response.json()
                else:
                    logger.error("user_creation_failed", status_code=response.status_code, response=response.text)
                    return None
                    
        except Exception as e:
            logger.error("supabase_user_creation_error", error=str(e))
            return None
    
    async def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """
        Authenticate user with Supabase
        
        Args:
            email: User email
            password: User password
            
        Returns:
            Authentication response if successful, None otherwise
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.url}/auth/v1/token?grant_type=password",
                    headers={
                        "apikey": self.anon_key,
                        "Content-Type": "application/json"
                    },
                    json={
                        "email": email,
                        "password": password
                    }
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.warning("authentication_failed", status_code=response.status_code)
                    return None
                    
        except Exception as e:
            logger.error("supabase_authentication_error", error=str(e))
            return None
