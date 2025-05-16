from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime, timedelta
from typing import Optional
from app.models.models import User, OTP, OTPPurpose
from app.core.security import get_password_hash
from app.core.email import generate_otp

def create_otp(db: Session, email: str, purpose: str) -> OTP:
    """Create a new OTP record."""
    # Delete any existing unverified OTPs for this email and purpose
    db.query(OTP).filter(
        OTP.email == email,
        OTP.purpose == purpose,
        OTP.is_verified == False
    ).delete()
    
    # Create new OTP
    otp_code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    db_otp = OTP(
        email=email,
        otp_code=otp_code,
        purpose=purpose,
        expires_at=expires_at
    )
    
    db.add(db_otp)
    db.commit()
    db.refresh(db_otp)
    return db_otp

def verify_otp(db: Session, email: str, otp_code: str, purpose: str) -> Optional[OTP]:
    """Verify an OTP."""
    try:
        # Get the most recent unverified OTP for this email and purpose
        db_otp = db.query(OTP).filter(
            OTP.email == email,
            OTP.otp_code == otp_code,
            OTP.purpose == purpose,
            OTP.is_verified == False
        ).order_by(OTP.created_at.desc()).first()
        
        if not db_otp:
            return None
        
        # Check if OTP has expired
        if datetime.utcnow() > db_otp.expires_at:
            return None
        
        # Mark OTP as verified
        db_otp.is_verified = True
        db.commit()
        db.refresh(db_otp)
        return db_otp
        
    except Exception as e:
        db.rollback()
        raise e

def check_user_exists(db: Session, username: Optional[str] = None, email: Optional[str] = None) -> dict:
    """Check if a user exists by username or email."""
    exists = False
    username_taken = None
    email_taken = None
    
    if username:
        username_taken = db.query(User).filter(User.username == username).first() is not None
        exists = exists or username_taken
    
    if email:
        email_taken = db.query(User).filter(User.email == email).first() is not None
        exists = exists or email_taken
    
    return {
        "exists": exists,
        "username_taken": username_taken,
        "email_taken": email_taken
    } 