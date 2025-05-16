from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import logging

from ..models.models import Chapter, Topic, Subject, Stream, Class, User
from ..schemas.chapter_schema import ChapterCreate, ChapterUpdate

# Configure logging
logger = logging.getLogger(__name__)

def get_chapter(db: Session, chapter_id: int) -> Optional[Chapter]:
    """
    Get a chapter by ID with all relationships loaded
    """
    try:
        return db.query(Chapter).options(
            joinedload(Chapter.subject).joinedload(Subject.stream).joinedload(Stream.class_),
            joinedload(Chapter.topics),
            joinedload(Chapter.creator)
        ).filter(Chapter.id == chapter_id).first()
    except Exception as e:
        logger.error(f"Error getting chapter {chapter_id}: {str(e)}")
        raise

def get_chapters(
    db: Session, 
    skip: int = 0, 
    limit: int = 100,
    subject_id: Optional[int] = None
) -> List[Chapter]:
    """
    Get all chapters with pagination and optional subject filtering
    """
    try:
        query = db.query(Chapter).options(
            joinedload(Chapter.subject).joinedload(Subject.stream).joinedload(Stream.class_),
            joinedload(Chapter.topics),
            joinedload(Chapter.creator)
        )
        if subject_id:
            query = query.filter(Chapter.subject_id == subject_id)
        return query.offset(skip).limit(limit).all()
    except Exception as e:
        logger.error(f"Error getting chapters: {str(e)}")
        raise

def get_chapters_by_subject(db: Session, subject_id: int, skip: int = 0, limit: int = 100):
    """
    Get chapters by subject ID
    """
    try:
        return db.query(Chapter).options(
            joinedload(Chapter.subject).joinedload(Subject.stream).joinedload(Stream.class_),
            joinedload(Chapter.topics),
            joinedload(Chapter.creator)
        ).filter(Chapter.subject_id == subject_id).offset(skip).limit(limit).all()
    except Exception as e:
        logger.error(f"Error getting chapters by subject {subject_id}: {str(e)}")
        raise

def create_chapter(db: Session, chapter: ChapterCreate, user_id: int) -> Chapter:
    """
    Create a new chapter
    """
    try:
        db_chapter = Chapter(
            name=chapter.name,
            description=chapter.description,
            subject_id=chapter.subject_id,
            chapter_number=chapter.chapter_number,
            created_by=user_id
        )
        db.add(db_chapter)
        db.commit()
        db.refresh(db_chapter)

        # Reload with relationships
        return get_chapter(db, db_chapter.id)
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating chapter: {str(e)}")
        raise

def update_chapter(db: Session, db_chapter: Chapter, chapter_update: ChapterUpdate) -> Chapter:
    """
    Update a chapter
    """
    try:
        update_data = chapter_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_chapter, field, value)
        
        db.add(db_chapter)
        db.commit()
        db.refresh(db_chapter)
        
        # Reload with relationships
        return get_chapter(db, db_chapter.id)
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating chapter {db_chapter.id}: {str(e)}")
        raise

def delete_chapter(db: Session, chapter_id: int) -> Optional[Chapter]:
    """
    Delete a chapter and return the deleted chapter data
    """
    try:
        db_chapter = get_chapter(db, chapter_id)
        if db_chapter:
            db.delete(db_chapter)
            db.commit()
            return db_chapter
        return None
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting chapter {chapter_id}: {str(e)}")
        raise
