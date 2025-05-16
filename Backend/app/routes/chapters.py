from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import logging

from app.core.database import get_db
from app.core.auth import get_current_user
from app.crud import chapter as chapter_crud
from app.crud import subject as subject_crud
from app.schemas.chapter_schema import Chapter, ChapterCreate, ChapterUpdate
from app.models.models import User, UserRole

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

@router.get("/{chapter_id}", response_model=Chapter)
def get_chapter(
    chapter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a chapter by ID
    """
    db_chapter = chapter_crud.get_chapter(db, chapter_id=chapter_id)
    if db_chapter is None:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return db_chapter

@router.get("/", response_model=List[Chapter])
def get_chapters(
    skip: int = Query(0, ge=0, description="Number of chapters to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of chapters to return"),
    subject_id: Optional[int] = Query(None, description="Filter chapters by subject ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all chapters with pagination and optional subject filtering
    """
    if subject_id:
        # Verify that the subject exists
        db_subject = subject_crud.get_subject(db, subject_id=subject_id)
        if not db_subject:
            raise HTTPException(status_code=404, detail=f"Subject with id {subject_id} not found")
    
    chapters = chapter_crud.get_chapters(
        db, 
        skip=skip, 
        limit=limit, 
        subject_id=subject_id
    )
    return chapters

@router.post("/", response_model=Chapter, status_code=status.HTTP_201_CREATED)
def create_chapter(
    chapter: ChapterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Create a new chapter (teachers and admins only)
    """
    # Verify that the subject exists
    db_subject = subject_crud.get_subject(db, subject_id=chapter.subject_id)
    if not db_subject:
        raise HTTPException(
            status_code=404,
            detail=f"Subject with id {chapter.subject_id} not found"
        )
    
    return chapter_crud.create_chapter(
        db=db, 
        chapter=chapter, 
        user_id=current_user.id
    )

@router.put("/{chapter_id}", response_model=Chapter)
def update_chapter(
    chapter_id: int,
    chapter_update: ChapterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Update a chapter (teachers and admins only)
    """
    db_chapter = chapter_crud.get_chapter(db, chapter_id=chapter_id)
    if db_chapter is None:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    if chapter_update.subject_id is not None:
        # Verify that the new subject exists if subject_id is being updated
        db_subject = subject_crud.get_subject(db, subject_id=chapter_update.subject_id)
        if not db_subject:
            raise HTTPException(
                status_code=404,
                detail=f"Subject with id {chapter_update.subject_id} not found"
            )
    
    return chapter_crud.update_chapter(
        db=db, 
        db_chapter=db_chapter, 
        chapter_update=chapter_update
    )

@router.delete("/{chapter_id}", response_model=Chapter)
def delete_chapter(
    chapter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Delete a chapter (teachers and admins only)
    """
    db_chapter = chapter_crud.delete_chapter(db=db, chapter_id=chapter_id)
    if db_chapter is None:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return db_chapter
