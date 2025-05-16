from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import logging

from ..models.models import Course, Stream, Subject, Chapter, Topic, Class, User
from ..schemas.course_schema import CourseCreate, CourseUpdate

# Configure logging
logger = logging.getLogger(__name__)

def get_course(db: Session, course_id: int) -> Optional[Course]:
    """
    Get a course by ID with all relationships loaded
    """
    try:
        return db.query(Course).options(
            joinedload(Course.creator),
            joinedload(Course.stream).joinedload(Stream.class_),
            joinedload(Course.subject).joinedload(Subject.stream).joinedload(Stream.class_),
            joinedload(Course.chapter).joinedload(Chapter.subject).joinedload(Subject.stream).joinedload(Stream.class_),
            joinedload(Course.topic).joinedload(Topic.chapter).joinedload(Chapter.subject)
        ).filter(Course.id == course_id).first()
    except Exception as e:
        logger.error(f"Error getting course {course_id}: {str(e)}")
        raise

def get_courses(db: Session, skip: int = 0, limit: int = 100) -> List[Course]:
    """
    Get all courses with optional pagination
    """
    try:
        return db.query(Course).options(
            joinedload(Course.creator),
            joinedload(Course.stream).joinedload(Stream.class_),
            joinedload(Course.subject).joinedload(Subject.stream).joinedload(Stream.class_),
            joinedload(Course.chapter).joinedload(Chapter.subject).joinedload(Subject.stream).joinedload(Stream.class_),
            joinedload(Course.topic).joinedload(Topic.chapter).joinedload(Chapter.subject)
        ).offset(skip).limit(limit).all()
    except Exception as e:
        logger.error(f"Error getting courses: {str(e)}")
        raise

def get_courses_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Course]:
    """
    Get all courses created by a specific user
    """
    try:
        return db.query(Course).options(
            joinedload(Course.creator),
            joinedload(Course.stream).joinedload(Stream.class_),
            joinedload(Course.subject).joinedload(Subject.stream).joinedload(Stream.class_),
            joinedload(Course.chapter).joinedload(Chapter.subject).joinedload(Subject.stream).joinedload(Stream.class_),
            joinedload(Course.topic).joinedload(Topic.chapter).joinedload(Chapter.subject)
        ).filter(Course.created_by == user_id).offset(skip).limit(limit).all()
    except Exception as e:
        logger.error(f"Error getting courses by user {user_id}: {str(e)}")
        raise

def get_courses_by_stream(db: Session, stream_id: int, skip: int = 0, limit: int = 100) -> List[Course]:
    """
    Get all courses associated with a specific stream
    """
    try:
        return db.query(Course).options(
            joinedload(Course.creator),
            joinedload(Course.stream).joinedload(Stream.class_),
            joinedload(Course.subject).joinedload(Subject.stream).joinedload(Stream.class_),
            joinedload(Course.chapter).joinedload(Chapter.subject).joinedload(Subject.stream).joinedload(Stream.class_),
            joinedload(Course.topic).joinedload(Topic.chapter).joinedload(Chapter.subject)
        ).filter(Course.stream_id == stream_id).offset(skip).limit(limit).all()
    except Exception as e:
        logger.error(f"Error getting courses by stream {stream_id}: {str(e)}")
        raise

def get_courses_by_subject(db: Session, subject_id: int, skip: int = 0, limit: int = 100) -> List[Course]:
    """
    Get all courses associated with a specific subject
    """
    try:
        return db.query(Course).options(
            joinedload(Course.creator),
            joinedload(Course.stream).joinedload(Stream.class_),
            joinedload(Course.subject).joinedload(Subject.stream).joinedload(Stream.class_),
            joinedload(Course.chapter).joinedload(Chapter.subject).joinedload(Subject.stream).joinedload(Stream.class_),
            joinedload(Course.topic).joinedload(Topic.chapter).joinedload(Chapter.subject)
        ).filter(Course.subject_id == subject_id).offset(skip).limit(limit).all()
    except Exception as e:
        logger.error(f"Error getting courses by subject {subject_id}: {str(e)}")
        raise

def get_courses_by_chapter(db: Session, chapter_id: int, skip: int = 0, limit: int = 100) -> List[Course]:
    """
    Get all courses associated with a specific chapter
    """
    try:
        return db.query(Course).options(
            joinedload(Course.creator),
            joinedload(Course.stream).joinedload(Stream.class_),
            joinedload(Course.subject).joinedload(Subject.stream).joinedload(Stream.class_),
            joinedload(Course.chapter).joinedload(Chapter.subject).joinedload(Subject.stream).joinedload(Stream.class_),
            joinedload(Course.topic).joinedload(Topic.chapter).joinedload(Chapter.subject)
        ).filter(Course.chapter_id == chapter_id).offset(skip).limit(limit).all()
    except Exception as e:
        logger.error(f"Error getting courses by chapter {chapter_id}: {str(e)}")
        raise

def get_courses_by_topic(db: Session, topic_id: int, skip: int = 0, limit: int = 100) -> List[Course]:
    """
    Get all courses associated with a specific topic
    """
    try:
        return db.query(Course).options(
            joinedload(Course.creator),
            joinedload(Course.stream).joinedload(Stream.class_),
            joinedload(Course.subject).joinedload(Subject.stream).joinedload(Stream.class_),
            joinedload(Course.chapter).joinedload(Chapter.subject).joinedload(Subject.stream).joinedload(Stream.class_),
            joinedload(Course.topic).joinedload(Topic.chapter).joinedload(Chapter.subject)
        ).filter(Course.topic_id == topic_id).offset(skip).limit(limit).all()
    except Exception as e:
        logger.error(f"Error getting courses by topic {topic_id}: {str(e)}")
        raise

def create_course(db: Session, course: CourseCreate, user_id: int) -> Course:
    """
    Create a new course
    """
    try:
        db_course = Course(
            name=course.name,
            description=course.description,
            duration=course.duration,
            is_active=course.is_active,
            level=course.level,
            created_by=user_id
        )
        
        # Add the hierarchical associations as provided
        if course.stream_id:
            db_course.stream_id = course.stream_id
        if course.subject_id:
            db_course.subject_id = course.subject_id
        if course.chapter_id:
            db_course.chapter_id = course.chapter_id
        if course.topic_id:
            db_course.topic_id = course.topic_id
            
        db.add(db_course)
        db.commit()
        db.refresh(db_course)
        
        # Reload with relationships
        return get_course(db, db_course.id)
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating course: {str(e)}")
        raise

def update_course(db: Session, course_id: int, course: CourseUpdate) -> Optional[Course]:
    """
    Update a course
    """
    try:
        db_course = get_course(db, course_id)
        if db_course:
            update_data = course.model_dump(exclude_unset=True)
            
            # Handle hierarchical IDs - convert 0 to None
            if 'stream_id' in update_data and update_data['stream_id'] == 0:
                update_data['stream_id'] = None
            if 'subject_id' in update_data and update_data['subject_id'] == 0:
                update_data['subject_id'] = None
            if 'chapter_id' in update_data and update_data['chapter_id'] == 0:
                update_data['chapter_id'] = None
            if 'topic_id' in update_data and update_data['topic_id'] == 0:
                update_data['topic_id'] = None
            
            # Update fields
            for field, value in update_data.items():
                setattr(db_course, field, value)
            
            try:
                db.add(db_course)
                db.commit()
                db.refresh(db_course)
                
                # Reload with relationships
                return get_course(db, db_course.id)
            except Exception as commit_error:
                db.rollback()
                logger.error(f"Error committing course update for course {course_id}: {str(commit_error)}")
                raise
        return None
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating course {course_id}: {str(e)}")
        raise

def delete_course(db: Session, course_id: int) -> Optional[Course]:
    """
    Delete a course
    """
    try:
        db_course = get_course(db, course_id)
        if db_course:
            db.delete(db_course)
            db.commit()
            return db_course
        return None
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting course {course_id}: {str(e)}")
        raise 