"""
Authentication Service - User authentication operations using Supabase
"""
from typing import Optional
from supabase import create_client
import structlog

from app.config import settings
from app.core.security import verify_password
from app.core.exceptions import AuthenticationError

logger = structlog.get_logger()


class AuthenticationService:
    """Service for user authentication operations using Supabase"""
    
    @staticmethod
    def get_supabase():
        """Get Supabase client instance"""
        return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    
    @staticmethod
    async def authenticate_user(
        email: str, 
        password: str
    ):
        """
        Authenticate user with email and password using Supabase Auth
        
        Args:
            email: User email
            password: User password
        
        Returns:
            User data from Supabase
        
        Raises:
            AuthenticationError: If credentials are invalid
        """
        try:
            supabase = AuthenticationService.get_supabase()
            
            # Use Supabase auth to sign in
            response = supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if response.user:
                logger.info("user_authenticated", user_id=response.user.id, email=email)
                return response.user
            else:
                logger.warning("authentication_failed", email=email, reason="invalid_credentials")
                raise AuthenticationError("Invalid email or password")
                
        except Exception as e:
            logger.warning("authentication_failed", email=email, error=str(e))
            raise AuthenticationError("Invalid email or password")
    
    @staticmethod
    async def verify_user_credentials(
        db: AsyncSession,
        user_id: str
    ) -> Optional[User]:
        """
        Verify user exists and is active
        
        Args:
            db: Async database session
            user_id: User ID
        
        Returns:
            User object if valid, None otherwise
        """
        try:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            
            if user and user.is_active:
                return user
            
            return None
            
        except Exception as e:
            logger.error("credential_verification_error", error=str(e), user_id=user_id)
            return None
