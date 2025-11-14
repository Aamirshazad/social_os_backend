"""
Credential Service - Platform credential management
"""
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
import structlog

from app.models.credential import Credential
from app.core.security import encryption
from app.core.exceptions import NotFoundError
from app.core.supabase import get_supabase_service_client

logger = structlog.get_logger()


class CredentialService:
    """Service for managing platform credentials"""
    
    def __init__(self, db: Session):
        self.db = db
    
    @staticmethod
    async def get_platform_credentials(
        db: AsyncSession,
        workspace_id: str,
        platform: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get credentials for a specific platform
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            platform: Platform name
        
        Returns:
            Decrypted credentials dictionary or None
        """
        try:
            result = await db.execute(
                select(Credential).where(
                    Credential.workspace_id == workspace_id,
                    Credential.platform == platform
                )
            )
            credential = result.scalar_one_or_none()
            
            if not credential:
                return None
            
            # Decrypt tokens
            decrypted_credentials = {
                "access_token": encryption.decrypt(credential.access_token),
                "platform_user_id": credential.platform_user_id,
                "platform_username": credential.platform_username,
                "scopes": credential.scopes,
                "additional_data": credential.additional_data
            }
            
            if credential.refresh_token:
                decrypted_credentials["refresh_token"] = encryption.decrypt(credential.refresh_token)
            
            if credential.token_expires_at:
                decrypted_credentials["token_expires_at"] = credential.token_expires_at
            
            return decrypted_credentials
            
        except Exception as e:
            logger.error("get_credentials_error", error=str(e), platform=platform)
            return None
    
    @staticmethod
    async def store_platform_credentials(
        db: AsyncSession,
        workspace_id: str,
        platform: str,
        access_token: str,
        refresh_token: Optional[str] = None,
        platform_user_id: Optional[str] = None,
        platform_username: Optional[str] = None,
        scopes: Optional[List[str]] = None,
        additional_data: Optional[Dict[str, Any]] = None,
        token_expires_at: Optional[str] = None
    ) -> Credential:
        """
        Store or update platform credentials
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            platform: Platform name
            access_token: OAuth access token
            refresh_token: OAuth refresh token (optional)
            platform_user_id: Platform-specific user ID
            platform_username: Platform username
            scopes: OAuth scopes
            additional_data: Platform-specific additional data
            token_expires_at: Token expiration timestamp
        
        Returns:
            Created or updated Credential object
        """
        try:
            # Check if credential already exists
            result = await db.execute(
                select(Credential).where(
                    Credential.workspace_id == workspace_id,
                    Credential.platform == platform
                )
            )
            credential = result.scalar_one_or_none()
            
            # Encrypt tokens
            encrypted_access_token = encryption.encrypt(access_token)
            encrypted_refresh_token = encryption.encrypt(refresh_token) if refresh_token else None
            
            if credential:
                # Update existing credential
                credential.access_token = encrypted_access_token
                credential.refresh_token = encrypted_refresh_token
                credential.platform_user_id = platform_user_id
                credential.platform_username = platform_username
                credential.scopes = scopes
                credential.additional_data = additional_data
                credential.token_expires_at = token_expires_at
            else:
                # Create new credential
                credential = Credential(
                    workspace_id=workspace_id,
                    platform=platform,
                    access_token=encrypted_access_token,
                    refresh_token=encrypted_refresh_token,
                    platform_user_id=platform_user_id,
                    platform_username=platform_username,
                    scopes=scopes,
                    additional_data=additional_data,
                    token_expires_at=token_expires_at
                )
                db.add(credential)
            
            await db.commit()
            await db.refresh(credential)
            
            logger.info("credentials_stored", platform=platform, workspace_id=workspace_id)
            return credential
            
        except Exception as e:
            await db.rollback()
            logger.error("store_credentials_error", error=str(e), platform=platform)
            raise
    
    @staticmethod
    async def delete_platform_credentials(
        db: AsyncSession,
        workspace_id: str,
        platform: str
    ) -> bool:
        """
        Delete platform credentials
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            platform: Platform name
        
        Returns:
            True if deleted, False if not found
        """
        try:
            result = await db.execute(
                delete(Credential).where(
                    Credential.workspace_id == workspace_id,
                    Credential.platform == platform
                )
            )
            
            if result.rowcount > 0:
                await db.commit()
                logger.info("credentials_deleted", platform=platform, workspace_id=workspace_id)
                return True
            else:
                logger.warning("credentials_not_found", platform=platform, workspace_id=workspace_id)
                return False
                
        except Exception as e:
            await db.rollback()
            logger.error("delete_credentials_error", error=str(e), platform=platform)
            raise
    
    @staticmethod
    async def get_all_workspace_credentials(
        db: AsyncSession,
        workspace_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get all credentials for a workspace
        
        Args:
            db: Database session
            workspace_id: Workspace ID
        
        Returns:
            List of credential summaries (without sensitive data)
        """
        try:
            # Use Supabase service client as the single source of truth for credential status
            supabase = get_supabase_service_client()

            response = supabase.table("social_accounts").select(
                "platform, username, page_name, expires_at, credentials_encrypted, is_connected"
            ).eq("workspace_id", workspace_id).execute()

            rows = getattr(response, "data", None) or []

            credential_list: List[Dict[str, Any]] = []
            for row in rows:
                has_credentials = bool(row.get("credentials_encrypted"))
                expires_at = row.get("expires_at")

                credential_list.append(
                    {
                        "platform": row.get("platform"),
                        "platform_user_id": None,
                        "platform_username": row.get("username") or row.get("page_name"),
                        "scopes": None,
                        "token_expires_at": expires_at,
                        "created_at": None,
                        "updated_at": None,
                        # The platform credentials/status endpoint only cares if something exists
                        # and when it expires; actual tokens remain encrypted server-side.
                    }
                )

            return credential_list

        except Exception as e:
            logger.error("get_all_credentials_error", error=str(e), workspace_id=workspace_id)
            return []
    
    # Synchronous methods for backward compatibility
    def get_platform_credentials_sync(self, workspace_id: str, platform: str) -> Optional[Dict[str, Any]]:
        """Synchronous version of get_platform_credentials"""
        try:
            credential = self.db.query(Credential).filter(
                Credential.workspace_id == workspace_id,
                Credential.platform == platform
            ).first()
            
            if not credential:
                return None
            
            # Decrypt tokens
            decrypted_credentials = {
                "access_token": encryption.decrypt(credential.access_token),
                "platform_user_id": credential.platform_user_id,
                "platform_username": credential.platform_username,
                "scopes": credential.scopes,
                "additional_data": credential.additional_data
            }
            
            if credential.refresh_token:
                decrypted_credentials["refresh_token"] = encryption.decrypt(credential.refresh_token)
            
            if credential.token_expires_at:
                decrypted_credentials["token_expires_at"] = credential.token_expires_at
            
            return decrypted_credentials
            
        except Exception as e:
            logger.error("get_credentials_sync_error", error=str(e), platform=platform)
            return None
    
    def get_all_credentials(self, workspace_id: str) -> List[Dict[str, Any]]:
        """Synchronous version of get_all_workspace_credentials"""
        try:
            credentials = self.db.query(Credential).filter(
                Credential.workspace_id == workspace_id
            ).all()
            
            credential_list = []
            for cred in credentials:
                credential_list.append({
                    "platform": cred.platform,
                    "platform_user_id": cred.platform_user_id,
                    "platform_username": cred.platform_username,
                    "scopes": cred.scopes,
                    "token_expires_at": cred.token_expires_at,
                    "created_at": cred.created_at.isoformat() if cred.created_at else None,
                    "updated_at": cred.updated_at.isoformat() if cred.updated_at else None
                })
            
            return credential_list
            
        except Exception as e:
            logger.error("get_all_credentials_sync_error", error=str(e), workspace_id=workspace_id)
            return []
    
    def delete_credential(self, workspace_id: str, platform: str) -> bool:
        """Synchronous version of delete_platform_credentials"""
        try:
            credential = self.db.query(Credential).filter(
                Credential.workspace_id == workspace_id,
                Credential.platform == platform
            ).first()
            
            if credential:
                self.db.delete(credential)
                self.db.commit()
                logger.info("credentials_deleted_sync", platform=platform, workspace_id=workspace_id)
                return True
            else:
                logger.warning("credentials_not_found_sync", platform=platform, workspace_id=workspace_id)
                return False
                
        except Exception as e:
            self.db.rollback()
            logger.error("delete_credentials_sync_error", error=str(e), platform=platform)
            raise
