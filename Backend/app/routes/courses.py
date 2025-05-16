from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import logging

from app.core.database import get_db
from app.core.auth import get_current_active_user, check_admin_permission, check_teacher_permission
from app.crud import course as course_crud
from app.crud import chapter as chapter_crud
from app.schemas.course_schema import Course, CourseCreate, CourseUpdate
from app.schemas.schemas import User

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Courses"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", 
    response_model=List[Course],
    summary="Get all courses",
    description="Retrieve all courses with pagination options."
)
def get_courses(
    skip: int = Query(0, ge=0, description="Number of courses to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of courses to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all courses with pagination
    """
    try:
        courses = course_crud.get_courses(db, skip=skip, limit=limit)
        return courses
    except Exception as e:
        logger.error(f"Error retrieving courses: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving courses")

@router.get("/my-courses", 
    response_model=List[Course],
    summary="Get user's courses",
    description="Retrieve all courses created by the current user."
)
def read_user_courses(
    skip: int = Query(0, ge=0, description="Number of courses to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of courses to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get courses created by the current user
    """
    try:
        courses = course_crud.get_courses_by_user(db, user_id=current_user.id, skip=skip, limit=limit)
        return courses
    except Exception as e:
        logger.error(f"Error retrieving user courses: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving user courses")

@router.get("/stream/{stream_id}", 
    response_model=List[Course],
    summary="Get courses by stream",
    description="Retrieve all courses associated with a specific stream."
)
def get_courses_by_stream(
    stream_id: int,
    skip: int = Query(0, ge=0, description="Number of courses to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of courses to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all courses associated with a specific stream
    """
    try:
        courses = course_crud.get_courses_by_stream(db, stream_id=stream_id, skip=skip, limit=limit)
        return courses
    except Exception as e:
        logger.error(f"Error retrieving courses by stream: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving courses by stream")

@router.get("/subject/{subject_id}", 
    response_model=List[Course],
    summary="Get courses by subject",
    description="Retrieve all courses associated with a specific subject."
)
def get_courses_by_subject(
    subject_id: int,
    skip: int = Query(0, ge=0, description="Number of courses to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of courses to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all courses associated with a specific subject
    """
    try:
        courses = course_crud.get_courses_by_subject(db, subject_id=subject_id, skip=skip, limit=limit)
        return courses
    except Exception as e:
        logger.error(f"Error retrieving courses by subject: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving courses by subject")

@router.get("/chapter/{chapter_id}", 
    response_model=List[Course],
    summary="Get courses by chapter",
    description="Retrieve all courses associated with a specific chapter."
)
def get_courses_by_chapter(
    chapter_id: int,
    skip: int = Query(0, ge=0, description="Number of courses to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of courses to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all courses associated with a specific chapter
    """
    try:
        courses = course_crud.get_courses_by_chapter(db, chapter_id=chapter_id, skip=skip, limit=limit)
        return courses
    except Exception as e:
        logger.error(f"Error retrieving courses by chapter: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving courses by chapter")

@router.get("/topic/{topic_id}", 
    response_model=List[Course],
    summary="Get courses by topic",
    description="Retrieve all courses associated with a specific topic."
)
def get_courses_by_topic(
    topic_id: int,
    skip: int = Query(0, ge=0, description="Number of courses to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of courses to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all courses associated with a specific topic
    """
    try:
        courses = course_crud.get_courses_by_topic(db, topic_id=topic_id, skip=skip, limit=limit)
        return courses
    except Exception as e:
        logger.error(f"Error retrieving courses by topic: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving courses by topic")

@router.get("/{course_id}", 
    response_model=Course,
    summary="Get a specific course",
    description="Retrieve detailed information about a specific course by its ID."
)
def get_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific course by ID
    """
    try:
        db_course = course_crud.get_course(db, course_id=course_id)
        if db_course is None:
            raise HTTPException(status_code=404, detail="Course not found")
        return db_course
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving course: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving course")

@router.post("/", 
    response_model=Course, 
    status_code=status.HTTP_201_CREATED,
    summary="Create a new course",
    description="""
    Create a new course with flexible association to the educational hierarchy.
    Courses can be associated with a Stream, Subject, Chapter, or Topic - or any combination of these.
    At least one hierarchy level must be specified.
    """
)
def create_course(
    course: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Create a new course with the following fields:
    - name: string (required) - The name of the course
    - description: string (required) - Detailed description of the course
    - duration: integer (required) - Duration in hours
    - is_active: boolean (defaults to true) - Whether the course is active
    - level: string (beginner/intermediate/advanced, defaults to beginner) - Course difficulty level
    
    At least one of these hierarchy levels must be provided:
    - stream_id: integer (optional) - Associate with a stream (highest level)
    - subject_id: integer (optional) - Associate with a subject
    - chapter_id: integer (optional) - Associate with a chapter
    - topic_id: integer (optional) - Associate with a topic (lowest level)
    
    You can associate a course with multiple levels of the hierarchy, 
    but at least one must be provided.
    """
    try:
        # Log the input data
        logger.info(f"Attempting to create course with data: {course.model_dump()}")
        return course_crud.create_course(db=db, course=course, user_id=current_user.id)
    except Exception as e:
        logger.error(f"Error creating course: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error creating course: {str(e)}"
        )

@router.put("/{course_id}", 
    response_model=Course,
    summary="Update a course",
    description="""
    Update an existing course. All fields are optional.
    The course's position in the educational hierarchy can be modified by updating
    stream_id, subject_id, chapter_id, or topic_id.
    """
)
def update_course(
    course_id: int,
    course: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        # Get existing course
        db_course = course_crud.get_course(db, course_id=course_id)
        if not db_course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with id {course_id} not found"
            )
        
        # Check permissions - allow both admin and the course creator
        if not check_admin_permission(current_user) and db_course.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions. Only admin or the course creator can update it."
            )
        
        # Validate chapter_id if provided and not 0
        if course.chapter_id and course.chapter_id != 0:
            chapter = chapter_crud.get_chapter(db, chapter_id=course.chapter_id)
            if not chapter:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Chapter with id {course.chapter_id} not found"
            )
        
        # Update the course
        updated_course = course_crud.update_course(db, course_id, course)
        if not updated_course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with id {course_id} not found"
            )
        return updated_course
        
    except HTTPException as http_error:
        raise http_error
    except Exception as e:
        logger.error(f"Error updating course {course_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating course: {str(e)}"
        )

@router.delete("/{course_id}", 
    response_model=Course,
    summary="Delete a course",
    description="Delete a specific course. Only the creator of the course can delete it."
)
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Delete a course
    """
    try:
        db_course = course_crud.get_course(db, course_id=course_id)
        if db_course is None:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Check if user is the creator - only the creator can delete the course
        if db_course.created_by != current_user.id:
            raise HTTPException(
                status_code=403, 
                detail="Not enough permissions. Only the creator of the course can delete it."
            )
        
        return course_crud.delete_course(db=db, course_id=course_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting course: {str(e)}")
        raise HTTPException(status_code=500, detail="Error deleting course")
