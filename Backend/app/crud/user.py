from typing import Optional, Union, List
import logging
from datetime import datetime

from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.models.models import User, UserRole
from app.schemas.schemas import UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password
from app.crud.base import CRUDBase

# Configure logger
logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_user(db: Session, user_id: int):
    logger.info(f"Fetching user with ID: {user_id}")
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    logger.info(f"Looking up user by email: {email}")
    return db.query(User).filter(User.email == email).first()

def get_user_by_username(db: Session, username: str):
    logger.info(f"Looking up user by username: {username}")
    return db.query(User).filter(User.username == username).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    logger.info(f"Fetching users with offset {skip} and limit {limit}")
    return db.query(User).offset(skip).limit(limit).all()

def create_user(db: Session, user: UserCreate):
    logger.info(f"Creating new user with username: {user.username} and email: {user.email}")
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password,
        role=user.role,
        full_name=user.full_name,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        logger.info(f"Successfully created user with ID: {db_user.id}")
        return db_user
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating user: {str(e)}")
        raise

def update_user(db: Session, user_id: int, user: Union[UserUpdate, dict]):
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    
    if isinstance(user, dict):
        update_data = user
    else:
        update_data = user.dict(exclude_unset=True)
    
    if "password" in update_data:
        update_data["password_hash"] = get_password_hash(update_data.pop("password"))
    
    for key, value in update_data.items():
        setattr(db_user, key, value)
    
    try:
        db.commit()
        db.refresh(db_user)
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating user: {str(e)}")
        raise
    
    return db_user

def delete_user(db: Session, user_id: int):
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    
    db.delete(db_user)
    db.commit()
    return db_user

# Student profile functions
def get_student_profile_by_user_id(db: Session, user_id: int):
    """Get a student profile by user ID."""
    return db.query(User).filter(
        User.id == user_id,
        User.role == UserRole.student
    ).first()

def get_students_by_class(db: Session, class_id: int) -> List[User]:
    """Get all student profiles in a specific class."""
    return db.query(User).filter(
        User.role == UserRole.student,
        User.student_class_id == class_id
    ).all()

def get_all_students(db: Session) -> List[User]:
    """Get all student profiles."""
    return db.query(User).filter(User.role == UserRole.student).all()

class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    def get_by_email(self, db: Session, *, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    def create(self, db: Session, *, obj_in: UserCreate) -> User:
        db_obj = User(
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password),
            full_name=obj_in.full_name,
            is_superuser=obj_in.is_superuser,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def authenticate(self, db: Session, *, email: str, password: str) -> Optional[User]:
        user = self.get_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def is_active(self, user: User) -> bool:
        return user.is_active

    def is_superuser(self, user: User) -> bool:
        return user.is_superuser

user = CRUDUser(User)
