"""
Email service — transactional emails via Resend API.
Gracefully skips if RESEND_API_KEY is not configured.
"""

import logging

from config import settings

logger = logging.getLogger(__name__)


def _check_configured() -> bool:
    if not settings.RESEND_API_KEY:
        logger.warning("Resend API key not configured — email will not be sent")
        return False
    return True


async def send_verification_email(to: str, otp: str) -> None:
    """Send an email verification OTP."""
    if not _check_configured():
        logger.info(f"[DEV] Verification OTP for {to}: {otp}")
        return

    try:
        import resend
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": settings.FROM_EMAIL,
            "to": [to],
            "subject": "Verify your AI-Setu CRM account",
            "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color: #1a1a2e;">Email Verification</h2>
                    <p>Your verification code is:</p>
                    <div style="background: #f0f0f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e;">{otp}</span>
                    </div>
                    <p>This code expires in 15 minutes.</p>
                    <p style="color: #888; font-size: 12px;">If you didn't create an account, please ignore this email.</p>
                </div>
            """,
        })
    except Exception as e:
        logger.error(f"Failed to send verification email: {e}")


async def send_password_reset_email(to: str, reset_link: str) -> None:
    """Send a password reset link (expires in 1 hour)."""
    if not _check_configured():
        logger.info(f"[DEV] Password reset link for {to}: {reset_link}")
        return

    try:
        import resend
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": settings.FROM_EMAIL,
            "to": [to],
            "subject": "Reset your AI-Setu CRM password",
            "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color: #1a1a2e;">Password Reset</h2>
                    <p>Click the button below to reset your password:</p>
                    <a href="{reset_link}" style="display: inline-block; background: #1a1a2e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Reset Password</a>
                    <p>This link expires in 1 hour.</p>
                    <p style="color: #888; font-size: 12px;">If you didn't request this, please ignore this email.</p>
                </div>
            """,
        })
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")


async def send_invoice_email(to: str, invoice_number: str, pdf_bytes: bytes) -> None:
    """Send an invoice PDF via email."""
    if not _check_configured():
        logger.info(f"[DEV] Would send invoice {invoice_number} to {to}")
        return

    try:
        import resend
        import base64
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": settings.FROM_EMAIL,
            "to": [to],
            "subject": f"Invoice {invoice_number} from AI-Setu CRM",
            "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color: #1a1a2e;">Invoice {invoice_number}</h2>
                    <p>Please find your invoice attached.</p>
                    <p>Thank you for your business!</p>
                </div>
            """,
            "attachments": [
                {
                    "filename": f"{invoice_number}.pdf",
                    "content": base64.b64encode(pdf_bytes).decode(),
                }
            ],
        })
    except Exception as e:
        logger.error(f"Failed to send invoice email: {e}")


async def send_task_reminder(to: str, task_title: str, due_date: str) -> None:
    """Send a task reminder notification email."""
    if not _check_configured():
        logger.info(f"[DEV] Task reminder for {to}: {task_title} due {due_date}")
        return

    try:
        import resend
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": settings.FROM_EMAIL,
            "to": [to],
            "subject": f"Task Reminder: {task_title}",
            "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color: #1a1a2e;">Task Reminder</h2>
                    <p>Your task <strong>{task_title}</strong> is due on <strong>{due_date}</strong>.</p>
                    <p>Log in to AI-Setu CRM to view and update this task.</p>
                </div>
            """,
        })
    except Exception as e:
        logger.error(f"Failed to send task reminder: {e}")
