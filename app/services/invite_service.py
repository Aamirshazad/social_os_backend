"""
Invite Service - Workspace invitation management
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
import structlog

from app.models.workspace_invite import WorkspaceInvite
from app.models.workspace_member import WorkspaceMember, MemberRole
from app.core.exceptions import NotFoundError, ValidationError
from app.services.email_service import email_service
from app.config import settings

logger = structlog.get_logger()


class InviteService:
    """Service for managing workspace invitations"""
    
    @staticmethod
    def create_invite(
        db: Session,
        workspace_id: str,
        invited_by: str,
        role: str,
        email: Optional[str] = None,
        expires_in_days: int = 7
    ) -> WorkspaceInvite:
        """
        Create a new workspace invitation
        
        Args:
            db: Database session
            workspace_id: Workspace ID
            invited_by: User ID creating the invite
            role: Role to assign (admin, editor, viewer)
            email: Optional email to send invite to
            expires_in_days: Days until expiration
        
        Returns:
            Created invite
        """
        # Validate role
        valid_roles = ["admin", "editor", "viewer"]
        if role not in valid_roles:
            raise ValidationError(f"Invalid role. Must be one of: {', '.join(valid_roles)}")
        
        # Create invite
        invite = WorkspaceInvite(
            id=uuid.uuid4(),
            workspace_id=workspace_id,
            email=email,
            token=WorkspaceInvite.generate_token(),
            role=role,
            invited_by=invited_by,
            expires_at=WorkspaceInvite.calculate_expiry(expires_in_days)
        )
        
        db.add(invite)
        db.commit()
        db.refresh(invite)
        
        # Send invitation email if email is provided
        if email:
            invitation_url = f"{settings.FRONTEND_URL}/invite/{invite.token}"
            expires_at = invite.expires_at.strftime("%B %d, %Y") if invite.expires_at else None
            
            email_result = email_service.send_invitation_email(
                to=email,
                workspace_name=f"Workspace {workspace_id}",  # TODO: Get actual workspace name
                role=role,
                invitation_url=invitation_url,
                expires_at=expires_at,
                inviter_name="Team Member"  # TODO: Get actual inviter name
            )
            
            if email_result["success"]:
                logger.info("invitation_email_sent", invite_id=str(invite.id), email=email)
            else:
                logger.warning("invitation_email_failed", invite_id=str(invite.id), error=email_result.get("error"))
        
        logger.info("invite_created", invite_id=str(invite.id), workspace_id=workspace_id)
        
        return invite
    
    @staticmethod
    def get_workspace_invites(
        db: Session,
        workspace_id: str,
        include_expired: bool = False
    ) -> List[WorkspaceInvite]:
        """Get all invites for a workspace"""
        query = db.query(WorkspaceInvite).filter(
            WorkspaceInvite.workspace_id == workspace_id,
            WorkspaceInvite.accepted_at.is_(None)
        )
        
        if not include_expired:
            query = query.filter(WorkspaceInvite.expires_at > datetime.utcnow())
        
        invites = query.order_by(WorkspaceInvite.created_at.desc()).all()
        
        return invites
    
    @staticmethod
    def get_invite_by_token(
        db: Session,
        token: str
    ) -> Optional[WorkspaceInvite]:
        """Get invite by token"""
        invite = db.query(WorkspaceInvite).filter(
            WorkspaceInvite.token == token
        ).first()
        
        return invite
    
    @staticmethod
    def accept_invite(
        db: Session,
        token: str,
        user_id: str
    ) -> WorkspaceMember:
        """
        Accept an invitation and add user to workspace
        
        Args:
            db: Database session
            token: Invite token
            user_id: User accepting the invite
        
        Returns:
            Created workspace member
        
        Raises:
            NotFoundError: If invite not found
            ValidationError: If invite expired or already accepted
        """
        # Get invite
        invite = InviteService.get_invite_by_token(db, token)
        
        if not invite:
            raise NotFoundError("Invitation")
        
        # Check if expired
        if invite.is_expired():
            raise ValidationError("Invitation has expired")
        
        # Check if already accepted
        if invite.is_accepted():
            raise ValidationError("Invitation has already been accepted")
        
        # Create workspace member
        member = WorkspaceMember(
            id=uuid.uuid4(),
            workspace_id=invite.workspace_id,
            user_id=user_id,
            role=MemberRole(invite.role)
        )
        
        # Mark invite as accepted
        invite.accepted_at = datetime.utcnow()
        
        db.add(member)
        db.commit()
        db.refresh(member)
        
        logger.info(
            "invite_accepted",
            invite_id=str(invite.id),
            user_id=user_id,
            workspace_id=str(invite.workspace_id)
        )
        
        return member
    
    @staticmethod
    def revoke_invite(
        db: Session,
        invite_id: str,
        workspace_id: str
    ) -> None:
        """
        Revoke (delete) an invitation
        
        Args:
            db: Database session
            invite_id: Invite ID
            workspace_id: Workspace ID (for verification)
        
        Raises:
            NotFoundError: If invite not found
        """
        invite = db.query(WorkspaceInvite).filter(
            WorkspaceInvite.id == invite_id,
            WorkspaceInvite.workspace_id == workspace_id
        ).first()
        
        if not invite:
            raise NotFoundError("Invitation")
        
        db.delete(invite)
        db.commit()
        
        logger.info("invite_revoked", invite_id=invite_id, workspace_id=workspace_id)
