from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
import re
import logging
from pydantic import BaseModel

from ..core.database import get_db
from ..core.auth import get_current_user
from ..crud import subject as crud_subject
from ..crud import stream as crud_stream
from ..crud import class_ as crud_class
from ..schemas.subject_schema import Subject, SubjectCreate, SubjectUpdate, StreamInfo, ClassInfo
from ..models.models import User, UserRole

# Configure logging
logger = logging.getLogger(__name__)

# Create router with empty prefix - FastAPI will handle the mounting
router = APIRouter()

def check_teacher_permission(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Check if the current user has teacher or admin permissions
    """
    if current_user.role not in [UserRole.teacher, UserRole.admin, UserRole.superadmin]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Only teachers and admins can perform this action."
        )
    return current_user

def generate_unique_code(db: Session, base_code: str) -> str:
    """
    Generate a unique subject code if the provided one already exists
    """
    # Extract the prefix and number parts
    match = re.match(r"([A-Z]+)(\d+)", base_code)
    if not match:
        return base_code  # Return as is if not in expected format
    
    prefix, number = match.groups()
    number = int(number)
    
    # Check if the base code is already unique
    existing = crud_subject.get_subject_by_code(db, base_code)
    if not existing:
        return base_code
    
    # Try incremented numbers until we find a unique code
    increment = 1
    while True:
        new_code = f"{prefix}{number + increment}"
        existing = crud_subject.get_subject_by_code(db, new_code)
        if not existing:
            return new_code
        increment += 1

def ensure_class_data(subject: Subject, db: Session) -> Subject:
    """
    Ensure class data is loaded for a subject's stream
    """
    if subject and subject.stream and subject.stream.class_ is None:
        # If class_ is missing, load it directly
        class_id = db.query(crud_subject.Stream).filter(crud_subject.Stream.id == subject.stream_id).first().class_id
        class_obj = db.query(crud_subject.Class).filter(crud_subject.Class.id == class_id).first()
        if class_obj:
            # Create the ClassInfo object
            class_info = ClassInfo(
                id=class_obj.id,
                name=class_obj.name,
                description=class_obj.description
            )
            # Need to modify stream since it's already in the response
            if isinstance(subject.stream, dict):
                subject.stream["class_"] = class_info.model_dump()
            else:
                subject.stream.class_ = class_info
    return subject

@router.get("/{subject_id}", response_model=Subject)
def get_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a subject by ID
    """
    db_subject = crud_subject.get_subject(db, subject_id=subject_id)
    if db_subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Ensure class data is loaded
    db_subject = ensure_class_data(db_subject, db)
    return db_subject

@router.get("/", response_model=List[Subject])
def get_subjects(
    skip: int = Query(0, ge=0, description="Number of subjects to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of subjects to return"),
    stream_id: Optional[int] = Query(None, description="Filter subjects by stream ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all subjects with pagination and optional stream filtering
    """
    if stream_id:
        # Verify that the stream exists
        db_stream = crud_stream.get_stream(db, stream_id=stream_id)
        if not db_stream:
            raise HTTPException(status_code=404, detail=f"Stream with id {stream_id} not found")
    
    subjects = crud_subject.get_subjects(
        db, 
        skip=skip, 
        limit=limit, 
        stream_id=stream_id
    )
    
    # Ensure class data is loaded for each subject
    for i, subject in enumerate(subjects):
        subjects[i] = ensure_class_data(subject, db)
        
    return subjects

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=Subject)
def create_subject(
    subject: SubjectCreate = Body(
        ...,
        examples=[{
            "name": "Physics",
            "description": "Study of matter, energy, and the interaction between them",
            "code": "PHY101",
            "credits": 4,
            "stream_id": 1
        }],
        description="Subject data. Note: requires stream_id, not class_id. Code must be unique.",
    ),
    auto_generate_code: bool = Query(False, description="Automatically generate a unique code if the provided one exists"),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Create a new subject
    
    Required fields:
    - name: String (1-100 characters)
    - code: String (2-20 characters, uppercase letters and numbers only)
    - stream_id: Integer (ID of the stream this subject belongs to)
    
    Optional fields:
    - description: String (max 500 characters)
    - credits: Integer (default: 0)
    
    Query parameters:
    - auto_generate_code: If true, will generate a unique code if the provided one exists
    
    This endpoint requires teacher or admin privileges.
    """
    # Verify that the stream exists
    db_stream = crud_stream.get_stream(db, stream_id=subject.stream_id)
    if not db_stream:
        raise HTTPException(
            status_code=404,
            detail=f"Stream with id {subject.stream_id} not found"
        )
    
    # Check if we should auto-generate a unique code
    if auto_generate_code:
        subject.code = generate_unique_code(db, subject.code)
    
    try:
        new_subject = crud_subject.create_subject(
            db=db, 
            subject=subject, 
            user_id=current_user.id
        )
        # Ensure class data is loaded
        new_subject = ensure_class_data(new_subject, db)
        return new_subject
    except HTTPException as e:
        if e.status_code == status.HTTP_409_CONFLICT and auto_generate_code:
            # If code conflict and auto_generate_code is True, try again with a new code
            subject.code = generate_unique_code(db, subject.code)
            new_subject = crud_subject.create_subject(
                db=db, 
                subject=subject, 
                user_id=current_user.id
            )
            # Ensure class data is loaded
            new_subject = ensure_class_data(new_subject, db)
            return new_subject
        raise e

@router.put("/{subject_id}", response_model=Subject)
def update_subject(
    subject_id: int,
    subject_update: SubjectUpdate = Body(
        ...,
        examples=[{
            "name": "Updated Physics",
            "code": "PHY102",
            "stream_id": 1
        }],
        description="Fields to update. Note: uses stream_id, not class_id",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Update a subject
    
    All fields are optional:
    - name: String (1-100 characters)
    - description: String (max 500 characters)
    - code: String (2-20 characters, uppercase letters and numbers only)
    - credits: Integer
    - stream_id: Integer (ID of the stream this subject belongs to)
    
    This endpoint requires teacher or admin privileges.
    """
    db_subject = crud_subject.get_subject(db, subject_id=subject_id)
    if db_subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    if subject_update.stream_id is not None:
        # Verify that the new stream exists if stream_id is being updated
        db_stream = crud_stream.get_stream(db, stream_id=subject_update.stream_id)
        if not db_stream:
            raise HTTPException(
                status_code=404,
                detail=f"Stream with id {subject_update.stream_id} not found"
            )
    
    updated_subject = crud_subject.update_subject(
        db=db, 
        db_subject=db_subject, 
        subject_update=subject_update
    )
    
    # Ensure class data is loaded
    updated_subject = ensure_class_data(updated_subject, db)
    return updated_subject

@router.delete("/{subject_id}", response_model=Subject)
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Delete a subject
    
    This endpoint requires teacher or admin privileges.
    """
    db_subject = crud_subject.delete_subject(db=db, subject_id=subject_id)
    if db_subject is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    # Ensure class data is loaded
    db_subject = ensure_class_data(db_subject, db)
    return db_subject
