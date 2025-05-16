from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import logging

from app.core.database import get_db
from app.core.auth import get_current_user
from app.crud import topic as crud_topic
from app.crud import chapter as crud_chapter
from app.schemas.topic_schema import Topic, TopicCreate, TopicUpdate
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

@router.get("/{topic_id}", response_model=Topic)
def get_topic(
    topic_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a topic by ID
    """
    db_topic = crud_topic.get_topic(db, topic_id=topic_id)
    if db_topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    return db_topic

@router.get("/", response_model=List[Topic])
def get_topics(
    skip: int = Query(0, ge=0, description="Number of topics to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of topics to return"),
    chapter_id: Optional[int] = Query(None, description="Filter topics by chapter ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all topics with pagination and optional chapter filtering
    """
    if chapter_id:
        # Verify that the chapter exists
        db_chapter = crud_chapter.get_chapter(db, chapter_id=chapter_id)
        if not db_chapter:
            raise HTTPException(status_code=404, detail=f"Chapter with id {chapter_id} not found")
    
    topics = crud_topic.get_topics(
        db, 
        skip=skip, 
        limit=limit, 
        chapter_id=chapter_id
    )
    return topics

@router.post("/", response_model=Topic, status_code=status.HTTP_201_CREATED)
def create_topic(
    topic: TopicCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Create a new topic (teachers and admins only)
    """
    # Verify that the chapter exists
    db_chapter = crud_chapter.get_chapter(db, chapter_id=topic.chapter_id)
    if not db_chapter:
        raise HTTPException(
            status_code=404,
            detail=f"Chapter with id {topic.chapter_id} not found"
        )
    
    return crud_topic.create_topic(db=db, topic=topic)

@router.put("/{topic_id}", response_model=Topic)
def update_topic(
    topic_id: int,
    topic_update: TopicUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Update a topic (teachers and admins only)
    """
    db_topic = crud_topic.get_topic(db, topic_id=topic_id)
    if db_topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    if topic_update.chapter_id is not None:
        # Verify that the new chapter exists if chapter_id is being updated
        db_chapter = crud_chapter.get_chapter(db, chapter_id=topic_update.chapter_id)
        if not db_chapter:
            raise HTTPException(
                status_code=404,
                detail=f"Chapter with id {topic_update.chapter_id} not found"
            )
    
    return crud_topic.update_topic(
        db=db, 
        db_topic=db_topic, 
        topic_update=topic_update
    )

@router.delete("/{topic_id}", response_model=Topic)
def delete_topic(
    topic_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Delete a topic (teachers and admins only)
    """
    db_topic = crud_topic.delete_topic(db=db, topic_id=topic_id)
    if db_topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    return db_topic
