"""
Email service for sending triggered emails.
Supports multiple email providers: Resend, SendGrid, SMTP.
"""
import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class EmailService:
    """Email service abstraction for sending emails."""
    
    def __init__(self):
        self.provider = os.environ.get("EMAIL_PROVIDER", "resend").lower()
        self.from_email = os.environ.get("FROM_EMAIL", "noreply@startupideaadvisor.com")
        self.from_name = os.environ.get("FROM_NAME", "Startup Idea Advisor")
        self.enabled = os.environ.get("EMAIL_ENABLED", "true").lower() == "true"
        
        # Initialize provider-specific clients
        if self.provider == "resend":
            self._init_resend()
        elif self.provider == "sendgrid":
            self._init_sendgrid()
        elif self.provider == "smtp":
            self._init_smtp()
        else:
            logger.warning(f"Unknown email provider: {self.provider}. Emails will be logged only.")
            self.client = None
    
    def _init_resend(self):
        """Initialize Resend client."""
        try:
            import resend
            api_key = os.environ.get("RESEND_API_KEY")
            if api_key:
                resend.api_key = api_key
                self.client = resend
                logger.info("Resend email service initialized")
            else:
                logger.warning("RESEND_API_KEY not set. Emails will be logged only.")
                self.client = None
        except ImportError:
            logger.warning("Resend package not installed. Install with: pip install resend")
            self.client = None
    
    def _init_sendgrid(self):
        """Initialize SendGrid client."""
        try:
            import sendgrid
            from sendgrid.helpers.mail import Mail
            api_key = os.environ.get("SENDGRID_API_KEY")
            if api_key:
                self.client = sendgrid.SendGridAPIClient(api_key=api_key)
                self.Mail = Mail
                logger.info("SendGrid email service initialized")
            else:
                logger.warning("SENDGRID_API_KEY not set. Emails will be logged only.")
                self.client = None
        except ImportError:
            logger.warning("SendGrid package not installed. Install with: pip install sendgrid")
            self.client = None
    
    def _init_smtp(self):
        """Initialize SMTP client."""
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            self.smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
            self.smtp_port = int(os.environ.get("SMTP_PORT", "587"))
            self.smtp_username = os.environ.get("SMTP_USERNAME")
            self.smtp_password = os.environ.get("SMTP_PASSWORD")
            
            if self.smtp_username and self.smtp_password:
                self.client = {
                    "server": self.smtp_server,
                    "port": self.smtp_port,
                    "username": self.smtp_username,
                    "password": self.smtp_password,
                }
                self.MIMEText = MIMEText
                self.MIMEMultipart = MIMEMultipart
                self.smtplib = smtplib
                logger.info("SMTP email service initialized")
            else:
                logger.warning("SMTP credentials not set. Emails will be logged only.")
                self.client = None
        except Exception as e:
            logger.warning(f"SMTP initialization failed: {e}. Emails will be logged only.")
            self.client = None
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        """
        Send an email.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML email content
            text_content: Plain text alternative (optional)
            
        Returns:
            True if sent successfully, False otherwise
        """
        if not self.enabled:
            logger.info(f"Email disabled. Would send to {to_email}: {subject}")
            return False
        
        if not self.client:
            logger.warning(f"Email service not configured. Logging email to {to_email}: {subject}")
            logger.info(f"Email content:\n{html_content}")
            return False
        
        try:
            if self.provider == "resend":
                return self._send_resend(to_email, subject, html_content, text_content)
            elif self.provider == "sendgrid":
                return self._send_sendgrid(to_email, subject, html_content, text_content)
            elif self.provider == "smtp":
                return self._send_smtp(to_email, subject, html_content, text_content)
            else:
                logger.warning(f"Unknown provider: {self.provider}")
                return False
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}", exc_info=True)
            return False
    
    def _send_resend(self, to_email: str, subject: str, html_content: str, text_content: Optional[str]) -> bool:
        """Send email via Resend."""
        try:
            params = {
                "from": f"{self.from_name} <{self.from_email}>",
                "to": [to_email],
                "subject": subject,
                "html": html_content,
            }
            if text_content:
                params["text"] = text_content
            
            email = self.client.Emails.send(params)
            logger.info(f"Email sent via Resend to {to_email}: {email.get('id', 'unknown')}")
            return True
        except Exception as e:
            logger.error(f"Resend send failed: {e}")
            return False
    
    def _send_sendgrid(self, to_email: str, subject: str, html_content: str, text_content: Optional[str]) -> bool:
        """Send email via SendGrid."""
        try:
            message = self.Mail(
                from_email=(self.from_email, self.from_name),
                to_emails=to_email,
                subject=subject,
                html_content=html_content,
            )
            if text_content:
                message.plain_text_content = text_content
            
            response = self.client.send(message)
            logger.info(f"Email sent via SendGrid to {to_email}: Status {response.status_code}")
            return response.status_code in [200, 201, 202]
        except Exception as e:
            logger.error(f"SendGrid send failed: {e}")
            return False
    
    def _send_smtp(self, to_email: str, subject: str, html_content: str, text_content: Optional[str]) -> bool:
        """Send email via SMTP."""
        try:
            msg = self.MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email
            
            if text_content:
                text_part = self.MIMEText(text_content, "plain")
                msg.attach(text_part)
            
            html_part = self.MIMEText(html_content, "html")
            msg.attach(html_part)
            
            with self.smtplib.SMTP(self.client["server"], self.client["port"]) as server:
                server.starttls()
                server.login(self.client["username"], self.client["password"])
                server.send_message(msg)
            
            logger.info(f"Email sent via SMTP to {to_email}")
            return True
        except Exception as e:
            logger.error(f"SMTP send failed: {e}")
            return False


# Global email service instance
email_service = EmailService()

