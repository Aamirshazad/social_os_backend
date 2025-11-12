"""
Credential Service - OAuth credential management
"""
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime
import structlog

from app.models.credential import Credential
from app.core.security import encryption
from app.core.exceptions import NotFoundError

logger = structlog.get_logger()


class CredentialService:
    """Service for managing OAuth credentials"""
    
    @staticmethod
    def store_credential(
        db: Session,
        workspace_id: str,
        platform: str,
        access_token: str,
        refresh_token: Optional[str] = None,
        token_expires_at: Optional[str] = None,
        platform_user_id: Optional[str] = None,
        platform_username: Optional[str] = None,
        scopes: Optional[list] = None,
        additional_data: Optional[Dict[str, Any]] = None
    ) -> Credential:
        """
        Store or update OAuth credential
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            platform: Platform name
            access_token: OAuth access token
            refresh_token: OAuth refresh token
            token_expires_at: Token expiration time
            platform_user_id: Platform user ID
            platform_username: Platform username
            scopes: OAuth scopes
            additional_data: Additional platform-specific data
        
        Returns:
            Credential object
        """
        # Check if credential exists
        existing = db.query(Credential).filter(
            Credential.workspace_id == workspace_id,
            Credential.platform == platform
        ).first()
        
        # Encrypt tokens
        encrypted_access_token = encryption.encrypt(access_token)
        encrypted_refresh_token = encryption.encrypt(refresh_token) if refresh_token else None
        
        if existing:
            # Update existing credential
            existing.access_token = encrypted_access_token
            existing.refresh_token = encrypted_refresh_token
            existing.token_expires_at = token_expires_at
            existing.platform_user_id = platform_user_id
            existing.platform_username = platform_username
            existing.scopes = scopes
            existing.additional_data = additional_data
            existing.updated_at = datetime.utcnow()
            
            db.commit()
            db.refresh(existing)
            
            logger.info("credential_updated", workspace_id=workspace_id, platform=platform)
            return existing
        else:
            # Create new credential
            credential = Credential(
                workspace_id=workspace_id,
                platform=platform,
                access_token=encrypted_access_token,
                refresh_token=encrypted_refresh_token,
                token_expires_at=token_expires_at,
                platform_user_id=platform_user_id,
                platform_username=platform_username,
                scopes=scopes,
                additional_data=additional_data
            )
            
            db.add(credential)
            db.commit()
            db.refresh(credential)
            
            logger.info("credential_created", workspace_id=workspace_id, platform=platform)
            return credential
    
    @staticmethod
    def get_credential(
        db: Session,
        workspace_id: str,
        platform: str,
        decrypt: bool = True
    ) -> Optional[Credential]:
        """
        Get credential for platform
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            platform: Platform name
            decrypt: Whether to decrypt tokens
        
        Returns:
            Credential object with decrypted tokens
        """
        credential = db.query(Credential).filter(
            Credential.workspace_id == workspace_id,
            Credential.platform == platform
        ).first()
        
        if credential and decrypt:
            # Decrypt tokens
            credential.access_token = encryption.decrypt(credential.access_token)
            if credential.refresh_token:
                credential.refresh_token = encryption.decrypt(credential.refresh_token)
        
        return credential
    
    @staticmethod
    def delete_credential(
        db: Session,
        workspace_id: str,
        platform: str
    ) -> None:
        """
        Delete credential
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            platform: Platform name
        
        Raises:
            NotFoundError: If credential not found
        """
        credential = db.query(Credential).filter(
            Credential.workspace_id == workspace_id,
            Credential.platform == platform
        ).first()
        
        if not credential:
            raise NotFoundError(f"Credential for {platform}")
        
        db.delete(credential)
        db.commit()
        
        logger.info("credential_deleted", workspace_id=workspace_id, platform=platform)
    
    @staticmethod
    def get_all_credentials(db: Session, workspace_id: str) -> list:
        """
        Get all credentials for workspace (without decryption)
        
        Args:
            db: Database session
            workspace_id: Workspace ID
        
        Returns:
            List of credential metadata
        """
        credentials = db.query(Credential).filter(
            Credential.workspace_id == workspace_id
        ).all()
        
        # Return metadata only (no tokens)
        return [
            {
                "platform": cred.platform,
                "platform_user_id": cred.platform_user_id,
                "platform_username": cred.platform_username,
                "created_at": cred.created_at,
                "updated_at": cred.updated_at
            }
            for cred in credentials
        ]
