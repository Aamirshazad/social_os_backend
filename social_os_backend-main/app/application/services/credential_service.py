"""Credential Service - Platform credential management via Supabase HTTP.

All credential storage is handled through the Supabase service client to avoid
any direct PostgreSQL connections (SQLAlchemy/asyncpg). The public method
signatures are preserved so existing callers continue to work, but the
``db``/``Session`` arguments are no longer used for persistence.
"""
from typing import Any, Dict, List, Optional

import structlog

from app.core.security import encryption
from app.core.supabase import get_supabase_service_client


logger = structlog.get_logger()


class CredentialService:
    """Service for managing platform credentials"""
    
    def __init__(self, db: object):
        # ``db`` is accepted for backward compatibility but not used; all
        # storage goes through Supabase HTTP.
        self.db = db
    
    @staticmethod
    async def get_platform_credentials(
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
            supabase = get_supabase_service_client()

            response = (
                supabase.table("credentials")
                .select("*")
                .eq("workspace_id", workspace_id)
                .eq("platform", platform)
                .maybe_single()
                .execute()
            )

            row = getattr(response, "data", None)
            if not row:
                return None

            # Decrypt tokens from Supabase row (stored encrypted as text)
            decrypted_credentials: Dict[str, Any] = {
                "access_token": encryption.decrypt(row.get("access_token")),
                "platform_user_id": row.get("platform_user_id"),
                "platform_username": row.get("platform_username"),
                "scopes": row.get("scopes"),
                "additional_data": row.get("additional_data"),
            }

            refresh_encrypted = row.get("refresh_token")
            if refresh_encrypted:
                decrypted_credentials["refresh_token"] = encryption.decrypt(refresh_encrypted)

            if row.get("token_expires_at"):
                decrypted_credentials["token_expires_at"] = row.get("token_expires_at")

            return decrypted_credentials

        except Exception as e:
            logger.error("get_credentials_error", error=str(e), platform=platform)
            return None
    
    @staticmethod
    async def store_platform_credentials(
                workspace_id: str,
        platform: str,
        access_token: str,
        refresh_token: Optional[str] = None,
        platform_user_id: Optional[str] = None,
        platform_username: Optional[str] = None,
        scopes: Optional[List[str]] = None,
        additional_data: Optional[Dict[str, object]] = None,
        token_expires_at: Optional[str] = None
    ) -> Dict[str, object]:
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
            Created or updated credential row (as dict) from Supabase
        """
        try:
            supabase = get_supabase_service_client()

            # Encrypt tokens
            encrypted_access_token = encryption.encrypt(access_token)
            encrypted_refresh_token = encryption.encrypt(refresh_token) if refresh_token else None

            # Check if credential already exists for this workspace/platform
            existing_resp = (
                supabase.table("credentials")
                .select("id")
                .eq("workspace_id", workspace_id)
                .eq("platform", platform)
                .maybe_single()
                .execute()
            )
            existing = getattr(existing_resp, "data", None)

            payload = {
                "workspace_id": workspace_id,
                "platform": platform,
                "access_token": encrypted_access_token,
                "refresh_token": encrypted_refresh_token,
                "platform_user_id": platform_user_id,
                "platform_username": platform_username,
                "scopes": scopes,
                "additional_data": additional_data,
                "token_expires_at": token_expires_at,
            }

            if existing and existing.get("id"):
                # Update existing credential row
                response = (
                    supabase.table("credentials")
                    .update(payload)
                    .eq("id", existing["id"])
                    .maybe_single()
                    .execute()
                )
            else:
                # Insert new credential row
                response = (
                    supabase.table("credentials")
                    .insert(payload)
                    .select("*")
                    .maybe_single()
                    .execute()
                )

            error = getattr(response, "error", None)
            if error:
                logger.error("store_credentials_error", error=str(error), platform=platform)
                raise Exception(str(error))

            data = getattr(response, "data", None)
            logger.info("credentials_stored", platform=platform, workspace_id=workspace_id)
            return data

        except Exception as e:
            logger.error("store_credentials_error", error=str(e), platform=platform)
            raise
    
    @staticmethod
    async def delete_platform_credentials(
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
            supabase = get_supabase_service_client()

            response = (
                supabase.table("credentials")
                .delete()
                .eq("workspace_id", workspace_id)
                .eq("platform", platform)
                .execute()
            )

            error = getattr(response, "error", None)
            if error:
                logger.error("delete_credentials_error", error=str(error), platform=platform)
                raise Exception(str(error))

            # Supabase returns the deleted rows in ``data`` when RETURNING is enabled.
            deleted_rows = getattr(response, "data", None) or []
            if deleted_rows:
                logger.info("credentials_deleted", platform=platform, workspace_id=workspace_id)
                return True

            logger.warning("credentials_not_found", platform=platform, workspace_id=workspace_id)
            return False

        except Exception as e:
            logger.error("delete_credentials_error", error=str(e), platform=platform)
            raise
    
    @staticmethod
    async def get_all_workspace_credentials(
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
            supabase = get_supabase_service_client()

            response = (
                supabase.table("credentials")
                .select("platform, platform_username, token_expires_at, created_at, updated_at")
                .eq("workspace_id", workspace_id)
                .execute()
            )

            rows = getattr(response, "data", None) or []

            credential_list: List[Dict[str, Any]] = []
            for row in rows:
                credential_list.append(
                    {
                        "platform": row.get("platform"),
                        "platform_user_id": None,
                        "platform_username": row.get("platform_username"),
                        "scopes": None,
                        "token_expires_at": row.get("token_expires_at"),
                        "created_at": row.get("created_at"),
                        "updated_at": row.get("updated_at"),
                    }
                )

            return credential_list

        except Exception as e:
            logger.error("get_all_credentials_error", error=str(e), workspace_id=workspace_id)
            return []
    
    # Synchronous methods for backward compatibility, also using Supabase HTTP
    def get_platform_credentials_sync(self, workspace_id: str, platform: str) -> Optional[Dict[str, Any]]:
        """Synchronous version of get_platform_credentials using Supabase HTTP."""
        try:
            supabase = get_supabase_service_client()

            response = (
                supabase.table("credentials")
                .select("*")
                .eq("workspace_id", workspace_id)
                .eq("platform", platform)
                .maybe_single()
                .execute()
            )

            row = getattr(response, "data", None)
            if not row:
                return None

            decrypted_credentials: Dict[str, Any] = {
                "access_token": encryption.decrypt(row.get("access_token")),
                "platform_user_id": row.get("platform_user_id"),
                "platform_username": row.get("platform_username"),
                "scopes": row.get("scopes"),
                "additional_data": row.get("additional_data"),
            }

            refresh_encrypted = row.get("refresh_token")
            if refresh_encrypted:
                decrypted_credentials["refresh_token"] = encryption.decrypt(refresh_encrypted)

            if row.get("token_expires_at"):
                decrypted_credentials["token_expires_at"] = row.get("token_expires_at")

            return decrypted_credentials

        except Exception as e:
            logger.error("get_credentials_sync_error", error=str(e), platform=platform)
            return None

    def get_all_credentials(self, workspace_id: str) -> List[Dict[str, Any]]:
        """Synchronous version of get_all_workspace_credentials using Supabase HTTP."""
        try:
            supabase = get_supabase_service_client()

            response = (
                supabase.table("credentials")
                .select("*")
                .eq("workspace_id", workspace_id)
                .execute()
            )

            rows = getattr(response, "data", None) or []

            credential_list: List[Dict[str, Any]] = []
            for row in rows:
                credential_list.append(
                    {
                        "platform": row.get("platform"),
                        "platform_user_id": row.get("platform_user_id"),
                        "platform_username": row.get("platform_username"),
                        "scopes": row.get("scopes"),
                        "token_expires_at": row.get("token_expires_at"),
                        "created_at": row.get("created_at"),
                        "updated_at": row.get("updated_at"),
                    }
                )

            return credential_list

        except Exception as e:
            logger.error("get_all_credentials_sync_error", error=str(e), workspace_id=workspace_id)
            return []

    def delete_credential(self, workspace_id: str, platform: str) -> bool:
        """Synchronous version of delete_platform_credentials using Supabase HTTP."""
        try:
            supabase = get_supabase_service_client()

            response = (
                supabase.table("credentials")
                .delete()
                .eq("workspace_id", workspace_id)
                .eq("platform", platform)
                .execute()
            )

            error = getattr(response, "error", None)
            if error:
                logger.error("delete_credentials_sync_error", error=str(error), platform=platform)
                raise Exception(str(error))

            deleted_rows = getattr(response, "data", None) or []
            if deleted_rows:
                logger.info("credentials_deleted_sync", platform=platform, workspace_id=workspace_id)
                return True

            logger.warning("credentials_not_found_sync", platform=platform, workspace_id=workspace_id)
            return False

        except Exception as e:
            logger.error("delete_credentials_sync_error", error=str(e), platform=platform)
            raise
