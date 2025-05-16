from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from fastapi import HTTPException, status
import logging

from ..models.models import Subject, Stream, Class
from ..schemas.subject_schema import SubjectCreate, SubjectUpdate

# Configure logging
logger = logging.getLogger(__name__)

def get_subject(db: Session, subject_id: int) -> Optional[Subject]:
    """
    Get a subject by ID with stream relationship loaded
    """
    try:
        return db.query(Subject).options(
            joinedload(Subject.stream).joinedload(Stream.class_)
        ).filter(Subject.id == subject_id).first()
    except Exception as e:
        logger.error(f"Error fetching subject {subject_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch subject: {str(e)}"
        )

def get_subjects(
    db: Session, 
    skip: int = 0, 
    limit: int = 100,
    stream_id: Optional[int] = None
) -> List[Subject]:
    """
    Get all subjects with pagination and optional stream filtering
    """
    try:
        query = db.query(Subject).options(
            joinedload(Subject.stream).joinedload(Stream.class_)
        )
        
        if stream_id:
            query = query.filter(Subject.stream_id == stream_id)
            
        # Verify that the stream exists if filtering by stream_id
        if stream_id:
            stream = db.query(Stream).get(stream_id)
            if not stream:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Stream with ID {stream_id} not found"
                )
                
        subjects = query.offset(skip).limit(limit).all()
        
        # Log subjects for debugging
        logger.debug(f"Retrieved {len(subjects)} subjects")
        for subject in subjects:
            if subject.stream is None:
                logger.warning(f"Subject {subject.id} has no associated stream")
            elif subject.stream.class_ is None:
                logger.warning(f"Stream {subject.stream.id} for subject {subject.id} has no associated class")
                
        return subjects
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching subjects: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch subjects: {str(e)}"
        )

def create_subject(db: Session, subject: SubjectCreate, user_id: int) -> Subject:
    """
    Create a new subject
    """
    try:
        # Verify that the stream exists
        stream = db.query(Stream).filter(Stream.id == subject.stream_id).first()
        if not stream:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stream with ID {subject.stream_id} not found"
            )
            
        # Check if subject with same code already exists
        existing_subject = db.query(Subject).filter(Subject.code == subject.code).first()
        if existing_subject:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Subject with code '{subject.code}' already exists. Please use a unique code."
            )
            
        db_subject = Subject(
            name=subject.name,
            description=subject.description,
            code=subject.code,
            credits=subject.credits,
            stream_id=subject.stream_id,
            created_by=user_id
        )
        db.add(db_subject)
        db.commit()
        db.refresh(db_subject)
        
        # Load the stream relationship
        db_subject = get_subject(db, db_subject.id)
        return db_subject
    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        logger.error(f"Error creating subject: {str(e)}")
        db.rollback()
        # Check for unique constraint violation on code
        if "UniqueViolation" in str(e) and "ix_subjects_code" in str(e):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Subject with code '{subject.code}' already exists. Please use a unique code."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create subject: {str(e)}"
        )

def update_subject(db: Session, db_subject: Subject, subject_update: SubjectUpdate) -> Subject:
    """
    Update a subject
    """
    try:
        update_data = subject_update.model_dump(exclude_unset=True)
        
        # If updating stream_id, verify that the stream exists
        if "stream_id" in update_data:
            stream_id = update_data["stream_id"]
            stream = db.query(Stream).filter(Stream.id == stream_id).first()
            if not stream:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Stream with ID {stream_id} not found"
                )
                
        for field, value in update_data.items():
            setattr(db_subject, field, value)
        
        db.commit()
        db.refresh(db_subject)
        
        # Load the stream relationship
        updated_subject = get_subject(db, db_subject.id)
        return updated_subject
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        logger.error(f"Error updating subject {db_subject.id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update subject: {str(e)}"
        )

def delete_subject(db: Session, subject_id: int) -> Optional[Subject]:
    """
    Delete a subject and return the deleted subject data
    """
    try:
        db_subject = get_subject(db, subject_id)
        if db_subject:
            db.delete(db_subject)
            db.commit()
            return db_subject
        return None
    except Exception as e:
        logger.error(f"Error deleting subject {subject_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete subject: {str(e)}"
        )

def get_subject_by_code(db: Session, code: str) -> Optional[Subject]:
    """
    Get a subject by its code
    """
    try:
        return db.query(Subject).options(
            joinedload(Subject.stream).joinedload(Stream.class_)
        ).filter(Subject.code == code).first()
    except Exception as e:
        logger.error(f"Error fetching subject by code {code}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch subject by code: {str(e)}"
        )
