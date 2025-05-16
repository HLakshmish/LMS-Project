from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Dict
from datetime import timedelta, datetime
import logging
import traceback

from app.core.database import get_db
from app.core.auth import authenticate_user, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_active_user, verify_password, get_password_hash
from app.crud import user as user_crud, auth as auth_crud
from app.models.models import User as UserModel
from app.schemas.schemas import User, UserCreate, UserUpdate, Token, EmailPasswordLogin, OTPRequest, OTPVerify, OTPResponse, UserExistsCheck, UserExistsResponse, ResetPassword
from app.core.email import send_otp_email

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Create a direct token endpoint with simplified authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

# Create router with empty prefix - FastAPI will handle the mounting
router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
    responses={404: {"description": "Not found"}},
)

@router.post("/token", response_model=Token, summary="Login For Access Token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Get an access token using username and password authentication
    """
    try:
        user = authenticate_user(db, form_data.username, form_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Update last_login and updated_at time
        current_time = datetime.now()
        user.last_login = current_time
        user.updated_at = current_time
        db.commit()
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        logger.error(f"Error in login_for_access_token: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/login", response_model=Token, summary="Login With Email")
async def login_with_email(login_data: EmailPasswordLogin, db: Session = Depends(get_db)):
    """
    Get an access token using email and password authentication
    """
    try:
        logger.info(f"Login attempt with email: {login_data.email}")
        user = authenticate_user(db, login_data.email, login_data.password)
        
        if not user:
            logger.warning(f"Authentication failed for email: {login_data.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Update last_login and updated_at time
        current_time = datetime.now()
        user.last_login = current_time
        user.updated_at = current_time
        db.commit()
        
        logger.info(f"Authentication successful for user: {user.email}")
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
        logger.info(f"Access token generated for user: {user.email}")
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in login_with_email: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED, summary="Register User")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user with username, email, and password
    """
    try:
        logger.info(f"Registration attempt for username: {user.username}, email: {user.email}")
        
        # Check if email exists
        db_user = user_crud.get_user_by_email(db, email=user.email)
        if db_user:
            logger.warning(f"Registration failed: Email already exists: {user.email}")
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Check if username exists
        db_user = user_crud.get_user_by_username(db, username=user.username)
        if db_user:
            logger.warning(f"Registration failed: Username already exists: {user.username}")
            raise HTTPException(status_code=400, detail="Username already registered")
        
        # Create user
        new_user = user_crud.create_user(db=db, user=user)
        logger.info(f"User registered successfully: {new_user.email}")
        return new_user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in register_user: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/me", response_model=User, summary="Read Users Me")
async def read_users_me(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get information about the currently authenticated user
    """
    try:
        # Update last_login time and get fresh user data
        user = db.query(UserModel).filter(UserModel.id == current_user.id).first()
        if user:
            user.last_login = datetime.now()
            user.updated_at = datetime.now()  # Force update
            db.commit()
            db.refresh(user)
            logger.info(f"Updated last_login and updated_at for user {user.username}")
            return user
    except Exception as e:
        logger.error(f"Error updating user timestamps: {str(e)}")
        
    return current_user

@router.post("/request-otp", 
    response_model=OTPResponse,
    summary="Request OTP",
    description="Request a one-time password for authentication or registration."
)
async def request_otp(
    request: OTPRequest,
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"OTP request received for email: {request.email}, purpose: {request.purpose}")
        
        # Check if the purpose is valid
        if request.purpose not in ["login", "registration", "password_reset"]:
            logger.warning(f"Invalid OTP purpose: {request.purpose}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP purpose. Must be one of: login, registration, password_reset"
            )
        
        # For login/password reset, verify user exists
        if request.purpose in ["login", "password_reset"]:
            logger.info(f"Checking if user exists for {request.purpose}")
            user_exists = auth_crud.check_user_exists(db, email=request.email)
            if not user_exists["exists"]:
                logger.warning(f"User not found for email: {request.email}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
        
        # For registration, verify user doesn't exist
        if request.purpose == "registration":
            logger.info(f"Checking if user already exists for registration")
            user_exists = auth_crud.check_user_exists(db, email=request.email)
            if user_exists["exists"]:
                logger.warning(f"User already exists with email: {request.email}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User already exists"
                )
        
        try:
            # Create OTP
            logger.info(f"Creating new OTP for email: {request.email}")
            otp = auth_crud.create_otp(db, request.email, request.purpose)
            
            # Send OTP email
            logger.info(f"Sending OTP email to: {request.email}")
            email_sent = await send_otp_email(
                request.email, 
                otp.otp_code,
                is_registration=(request.purpose == "registration")
            )
            
            if not email_sent:
                logger.error(f"Failed to send OTP email to: {request.email}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to send OTP email. Please try again later."
                )
            
            # Calculate expiry time in seconds
            expires_in = int((otp.expires_at - datetime.utcnow()).total_seconds())
            
            logger.info(f"OTP sent successfully to: {request.email}")
            return OTPResponse(
                message="OTP sent successfully",
                email=request.email,
                expires_in=expires_in
            )
            
        except Exception as e:
            logger.error(f"Error in OTP creation/email sending: {str(e)}")
            logger.error(traceback.format_exc())
            # Rollback the transaction if OTP was created but email failed
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to process OTP request. Please try again later."
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in request_otp: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again later."
        )

@router.post("/verify-otp",
    response_model=dict,
    summary="Verify OTP",
    description="Verify an OTP and generate an access token or confirm email verification."
)
async def verify_otp_endpoint(
    verify_data: OTPVerify,
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Verifying OTP for email: {verify_data.email}, purpose: {verify_data.purpose}")
        
        # Check if user exists for login purpose
        if verify_data.purpose == "login":
            user = db.query(User).filter(User.email == verify_data.email).first()
            if not user:
                logger.warning(f"User not found for email: {verify_data.email}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
        
        # Verify OTP
        otp = auth_crud.verify_otp(db, verify_data.email, verify_data.otp_code, verify_data.purpose)
        if not otp:
            logger.warning(f"Invalid or expired OTP for email: {verify_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP"
            )
        
        response = {
            "message": "OTP verified successfully",
            "email": verify_data.email
        }
        
        # For login, generate access token
        if verify_data.purpose == "login":
            logger.info(f"Generating access token for user: {user.username}")
            access_token = create_access_token(data={"sub": user.username})
            response["access_token"] = access_token
            response["token_type"] = "bearer"
            
            # Update user's last login
            user.last_login = datetime.utcnow()
            db.commit()
        
        logger.info(f"OTP verification successful for email: {verify_data.email}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in verify_otp: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing your request"
        )

@router.post("/check-user-exists",
    response_model=UserExistsResponse,
    summary="Check User Exists",
    description="Check if a user exists by username or email."
)
async def check_user_exists_endpoint(
    check_data: UserExistsCheck,
    db: Session = Depends(get_db)
):
    try:
        if not check_data.username and not check_data.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either username or email must be provided"
            )
        
        result = auth_crud.check_user_exists(
            db,
            username=check_data.username,
            email=check_data.email
        )
        
        return UserExistsResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in check_user_exists: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing your request"
        )

@router.post("/reset-password",
    response_model=dict,
    summary="Reset Password",
    description="Reset user's password without OTP verification"
)
async def reset_password(
    reset_data: ResetPassword,
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Password reset request received for email: {reset_data.email}")
        
        # Check if user exists
        user = db.query(UserModel).filter(UserModel.email == reset_data.email).first()
        if not user:
            logger.warning(f"User not found for email: {reset_data.email}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update password
        try:
            # Hash the new password
            hashed_password = get_password_hash(reset_data.new_password)
            
            # Update user's password
            user.password_hash = hashed_password
            user.updated_at = datetime.utcnow()
            db.commit()
            
            logger.info(f"Password successfully reset for user: {reset_data.email}")
            return {
                "message": "Password reset successful",
                "email": reset_data.email
            }
            
        except Exception as e:
            logger.error(f"Error updating password: {str(e)}")
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to reset password. Please try again later."
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in reset_password: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred. Please try again later."
        )
