from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr
from typing import Dict, Any
import random
import string
from datetime import datetime, timedelta
import logging
from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)

# Email configuration using settings from config
conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=settings.USE_CREDENTIALS,
    VALIDATE_CERTS=settings.VALIDATE_CERTS,
    TEMPLATE_FOLDER=None
)

# Initialize FastMail
fastmail = FastMail(conf)

def generate_otp() -> str:
    """Generate a 6-digit OTP."""
    return ''.join(random.choices(string.digits, k=6))

async def send_otp_email(email: EmailStr, otp: str, is_registration: bool = False) -> bool:
    """
    Send OTP email to user.
    
    Args:
        email: User's email address
        otp: Generated OTP
        is_registration: Whether this is for registration or login
    """
    try:
        logger.info(f"Attempting to send OTP email to {email}")
        
        subject = "Email Verification OTP" if is_registration else "Login OTP"
        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2c3e50;">{'Welcome to LMS!' if is_registration else 'Login Verification'}</h2>
                    <p>Your OTP for {'registration' if is_registration else 'login'} is:</p>
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
                        <h1 style="color: #007bff; margin: 0; font-size: 32px;">{otp}</h1>
                    </div>
                    <p><strong>This OTP will expire in 10 minutes.</strong></p>
                    <p style="color: #6c757d; font-size: 14px;">If you didn't request this OTP, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #6c757d; font-size: 12px; text-align: center;">
                        This is an automated message, please do not reply.
                    </p>
                </div>
            </body>
        </html>
        """
        
        message = MessageSchema(
            subject=subject,
            recipients=[email],
            body=body,
            subtype="html"
        )
        
        await fastmail.send_message(message)
        logger.info(f"Successfully sent OTP email to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Error sending email to {email}: {str(e)}")
        return False 