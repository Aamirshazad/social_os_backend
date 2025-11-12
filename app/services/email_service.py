"""
Email Service - Handles sending transactional emails via Resend
"""
from typing import Optional, Dict, Any
import os
from pathlib import Path
import structlog
import resend
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.config import settings

logger = structlog.get_logger()


class EmailService:
    """Service for sending transactional emails"""
    
    def __init__(self):
        """Initialize email service with Resend API"""
        self.api_key = settings.RESEND_API_KEY
        if not self.api_key:
            logger.warning("RESEND_API_KEY not configured - emails will not be sent")
            self.client = None
        else:
            resend.api_key = self.api_key
            self.client = resend
        
        # Setup Jinja2 for email templates
        template_dir = Path(__file__).parent.parent / "templates" / "emails"
        self.jinja_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=select_autoescape(['html', 'xml'])
        )
        
        self.from_email = settings.SMTP_FROM_EMAIL or "noreply@socialmediaos.com"
        self.from_name = settings.SMTP_FROM_NAME or "Social Media OS"
    
    def _send_email(
        self,
        to: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send email via Resend API
        
        Args:
            to: Recipient email address
            subject: Email subject
            html_content: HTML email content
            text_content: Plain text content (optional)
        
        Returns:
            Dict with success status and optional error message
        """
        if not self.client:
            logger.error("email_not_configured", to=to, subject=subject)
            return {"success": False, "error": "Email service not configured"}
        
        try:
            params = {
                "from": f"{self.from_name} <{self.from_email}>",
                "to": [to],
                "subject": subject,
                "html": html_content,
            }
            
            if text_content:
                params["text"] = text_content
            
            response = self.client.emails.send(params)
            
            logger.info("email_sent", to=to, subject=subject, message_id=response.get("id"))
            return {"success": True, "message_id": response.get("id")}
            
        except Exception as e:
            error_msg = str(e)
            logger.error("email_send_failed", to=to, subject=subject, error=error_msg)
            return {"success": False, "error": error_msg}
    
    def send_invitation_email(
        self,
        to: str,
        workspace_name: str,
        role: str,
        invitation_url: str,
        expires_at: Optional[str] = None,
        inviter_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send workspace invitation email
        
        Args:
            to: Recipient email
            workspace_name: Name of the workspace
            role: Role being assigned
            invitation_url: Full invitation URL
            expires_at: Expiration date (optional)
            inviter_name: Name of person sending invite (optional)
        
        Returns:
            Dict with success status and optional error message
        """
        try:
            template = self.jinja_env.get_template("invitation.html")
            html_content = template.render(
                workspace_name=workspace_name,
                role=role,
                invitation_url=invitation_url,
                expires_at=expires_at,
                inviter_name=inviter_name or "Someone"
            )
            
            subject = f"You're invited to join {workspace_name} on Social Media OS"
            
            return self._send_email(
                to=to,
                subject=subject,
                html_content=html_content
            )
            
        except Exception as e:
            error_msg = str(e)
            logger.error("invitation_email_failed", to=to, error=error_msg)
            return {"success": False, "error": error_msg}
    
    def send_welcome_email(
        self,
        to: str,
        user_name: str,
        workspace_name: str,
        dashboard_url: str
    ) -> Dict[str, Any]:
        """
        Send welcome email to new user
        
        Args:
            to: Recipient email
            user_name: User's name
            workspace_name: Name of the workspace
            dashboard_url: URL to dashboard
        
        Returns:
            Dict with success status and optional error message
        """
        try:
            template = self.jinja_env.get_template("welcome.html")
            html_content = template.render(
                user_name=user_name,
                workspace_name=workspace_name,
                dashboard_url=dashboard_url
            )
            
            subject = f"Welcome to {workspace_name} on Social Media OS!"
            
            return self._send_email(
                to=to,
                subject=subject,
                html_content=html_content
            )
            
        except Exception as e:
            error_msg = str(e)
            logger.error("welcome_email_failed", to=to, error=error_msg)
            return {"success": False, "error": error_msg}
    
    def send_role_change_email(
        self,
        to: str,
        user_name: str,
        workspace_name: str,
        new_role: str,
        dashboard_url: str
    ) -> Dict[str, Any]:
        """
        Send role change notification email
        
        Args:
            to: Recipient email
            user_name: User's name
            workspace_name: Name of the workspace
            new_role: New role assigned
            dashboard_url: URL to dashboard
        
        Returns:
            Dict with success status and optional error message
        """
        try:
            template = self.jinja_env.get_template("role_change.html")
            html_content = template.render(
                user_name=user_name,
                workspace_name=workspace_name,
                new_role=new_role,
                dashboard_url=dashboard_url
            )
            
            subject = f"Your role in {workspace_name} has been updated"
            
            return self._send_email(
                to=to,
                subject=subject,
                html_content=html_content
            )
            
        except Exception as e:
            error_msg = str(e)
            logger.error("role_change_email_failed", to=to, error=error_msg)
            return {"success": False, "error": error_msg}


# Global email service instance
email_service = EmailService()
