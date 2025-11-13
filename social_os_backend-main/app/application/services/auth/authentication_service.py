"""
Authentication Service - User authentication operations using Supabase
Matches Next.js authentication pattern exactly"""
from typing import Optional, Dict, Any
from supabase import create_client, Client
import structlog

from app.config import settings
from app.core.exceptions import AuthenticationError

logger = structlog.get_logger()


class AuthenticationService:
    """Service for user authentication operations using Supabase"""
    
    @staticmethod
    def get_supabase() -> Client:
        """Get Supabase client instance - matches Next.js pattern"""
        return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    
    @staticmethod
    def authenticate_user(email: str, password: str) -> Dict[str, Any]:
        """
        Authenticate user with email and password using Supabase Auth
        Matches Next.js signIn pattern exactly
        
        Args:
            email: User email
            password: User password
        
        Returns:
            Supabase auth response with user and session
        
        Raises:
            AuthenticationError: If credentials are invalid
        """
        try:
            supabase = AuthenticationService.get_supabase()
            
            # Use Supabase auth to sign in - matches Next.js pattern
            response = supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if response.user and response.session:
                logger.info("supabase_auth_success", user_id=str(response.user.id), email=email)
                return {
                    "user": response.user,
                    "session": response.session
                }
            else:
                logger.warning("supabase_auth_failed", email=email, error="No user or session returned")
                raise AuthenticationError("Invalid credentials")
                
        except Exception as e:
            logger.error("supabase_auth_error", email=email, error=str(e))
            if "Invalid login credentials" in str(e):
                raise AuthenticationError("Invalid email or password")
            elif "Email not confirmed" in str(e):
                raise AuthenticationError("Please confirm your email address")
            else:
                raise AuthenticationError(f"Authentication failed: {str(e)}")
    
    @staticmethod
    def register_user(
        email: str,
        password: str,
        full_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Register new user with Supabase Auth
        Matches Next.js signUp pattern exactly
        
        Args:
            email: User email
            password: User password
            full_name: User's full name
        
        Returns:
            Supabase auth response with user and session
        
        Raises:
            AuthenticationError: If registration fails
        """
        try:
            supabase = AuthenticationService.get_supabase()
            
            # Use Supabase auth to sign up - matches Next.js pattern exactly
            response = supabase.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {
                        "full_name": full_name
                    } if full_name else {}
                }
            })
            
            if response.user:
                logger.info("supabase_registration_success", user_id=str(response.user.id), email=email)
                return {
                    "user": response.user,
                    "session": response.session
                }
            else:
                logger.warning("supabase_registration_failed", email=email, error="No user returned")
                raise AuthenticationError("Registration failed")
                
        except Exception as e:
            logger.error("supabase_registration_error", email=email, error=str(e))
            if "User already registered" in str(e):
                raise AuthenticationError("User with this email already exists")
            elif "Password should be at least" in str(e):
                raise AuthenticationError("Password must be at least 6 characters long")
            else:
                raise AuthenticationError(f"Registration failed: {str(e)}")
    
    @staticmethod
    async def verify_user_credentials(
        user_id: str
    ):
        """
        Verify user exists and is active using Supabase
        
        Args:
            user_id: User ID
        
        Returns:
            User data if valid, None otherwise
        """
        try:
            supabase = AuthenticationService.get_supabase()
            
            # Get user from Supabase auth
            response = supabase.auth.admin.get_user_by_id(user_id)
            
            if response.user:
                return response.user
            
            return None
            
        except Exception as e:
            logger.error("credential_verification_error", error=str(e), user_id=user_id)
            return None
