from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile, Form, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
import os

from app.core.database import get_db
from app.core.auth import get_current_active_user, check_admin_permission, check_teacher_permission
from app.crud import content as content_crud
from app.schemas.content_schema import ContentItem, ContentItemCreate, ContentItemUpdate, ContentType
from app.schemas.schemas import User
from app.utils.file_handler import save_upload_file, CONTENT_MAX_FILE_SIZE
from app.models.models import Course, Topic, Chapter, Subject

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["content"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[ContentItem])
def get_content_items(
    skip: int = Query(0, description="Number of items to skip"),
    limit: int = Query(100, description="Maximum number of items to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieve all content items with pagination.
    """
    return content_crud.get_content_items(db, skip=skip, limit=limit)

@router.get("/{content_id}", response_model=ContentItem)
def get_content_item(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieve a specific content item by ID.
    """
    content_item = content_crud.get_content_item(db, content_id)
    if not content_item:
        raise HTTPException(status_code=404, detail="Content item not found")
    return content_item

@router.get("/course/{course_id}", response_model=List[ContentItem])
def get_content_by_course(
    course_id: int,
    skip: int = Query(0, description="Number of items to skip"),
    limit: int = Query(100, description="Maximum number of items to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieve all content items associated with a specific course.
    """
    return content_crud.get_content_by_course(db, course_id, skip=skip, limit=limit)

@router.get("/topic/{topic_id}", response_model=List[ContentItem])
def get_content_by_topic(
    topic_id: int,
    skip: int = Query(0, description="Number of items to skip"),
    limit: int = Query(100, description="Maximum number of items to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieve all content items associated with a specific topic and its courses.
    """
    return content_crud.get_content_by_topic(db, topic_id, skip=skip, limit=limit)

@router.get("/chapter/{chapter_id}", response_model=List[ContentItem])
def get_content_by_chapter(
    chapter_id: int,
    skip: int = Query(0, description="Number of items to skip"),
    limit: int = Query(100, description="Maximum number of items to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieve all content items associated with a specific chapter, its topics, and courses.
    """
    return content_crud.get_content_by_chapter(db, chapter_id, skip=skip, limit=limit)

@router.get("/subject/{subject_id}", response_model=List[ContentItem])
def get_content_by_subject(
    subject_id: int,
    skip: int = Query(0, description="Number of items to skip"),
    limit: int = Query(100, description="Maximum number of items to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieve all content items associated with a specific subject, its chapters, topics, and courses.
    """
    return content_crud.get_content_by_subject(db, subject_id, skip=skip, limit=limit)

@router.post("/", response_model=ContentItem)
async def create_content_item(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    type: ContentType = Form(...),
    course_id: Optional[int] = Form(None),
    topic_id: Optional[int] = Form(None),
    chapter_id: Optional[int] = Form(None),
    subject_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Create a new content item with file upload.
    
    The file will be saved and converted to a public URL.
    At least one of course_id, topic_id, chapter_id, or subject_id must be provided.
    Maximum file size allowed is 100MB.
    """
    # Validate that at least one ID is provided and not zero
    valid_ids = {
        'course_id': course_id if course_id and course_id > 0 else None,
        'topic_id': topic_id if topic_id and topic_id > 0 else None,
        'chapter_id': chapter_id if chapter_id and chapter_id > 0 else None,
        'subject_id': subject_id if subject_id and subject_id > 0 else None
    }
    
    if not any(valid_ids.values()):
        raise HTTPException(
            status_code=400,
            detail="At least one valid ID (course_id, topic_id, chapter_id, or subject_id) must be provided"
        )
    
    # Validate that the provided IDs exist in the database
    if valid_ids['course_id']:
        if not db.query(Course).filter(Course.id == valid_ids['course_id']).first():
            raise HTTPException(status_code=404, detail=f"Course with id {valid_ids['course_id']} not found")
    
    if valid_ids['topic_id']:
        if not db.query(Topic).filter(Topic.id == valid_ids['topic_id']).first():
            raise HTTPException(status_code=404, detail=f"Topic with id {valid_ids['topic_id']} not found")
    
    if valid_ids['chapter_id']:
        if not db.query(Chapter).filter(Chapter.id == valid_ids['chapter_id']).first():
            raise HTTPException(status_code=404, detail=f"Chapter with id {valid_ids['chapter_id']} not found")
    
    if valid_ids['subject_id']:
        if not db.query(Subject).filter(Subject.id == valid_ids['subject_id']).first():
            raise HTTPException(status_code=404, detail=f"Subject with id {valid_ids['subject_id']} not found")
    
    try:
        # Validate file type based on content type
        file_ext = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
        valid_extensions = {
            ContentType.video: ['mp4', 'avi', 'mov', 'wmv'],
            ContentType.pdf: ['pdf'],
            ContentType.document: ['doc', 'docx', 'txt']
        }
        
        if file_ext not in valid_extensions[type]:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type for {type}. Allowed extensions: {valid_extensions[type]}"
            )
        
        # Save the file and get relative path with 100MB size limit
        relative_path = await save_upload_file(file, str(type), CONTENT_MAX_FILE_SIZE)
        
        # Create the full URL for storage
        base_url = str(request.base_url).rstrip('/')
        public_url = f"{base_url}/static/{relative_path}"
        
        # Create content item
        content_data = ContentItemCreate(
            title=title,
            description=description,
            type=type,
            **valid_ids  # Use validated IDs
        )
        
        # Create the content item in the database
        try:
            return content_crud.create_content_item(
                db=db,
                content_item=content_data,
                user_id=current_user.id,
                url=public_url
            )
        except Exception as db_error:
            # Log the database error
            logger.error(f"Database error while creating content: {str(db_error)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create content item in database: {str(db_error)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        # Log the error
        logger.error(f"Error creating content item: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process file upload: {str(e)}"
        )

@router.put("/{content_id}", response_model=ContentItem)
def update_content_item(
    content_id: int,
    content_item: ContentItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Update an existing content item.
    """
    db_content_item = content_crud.get_content_item(db, content_id)
    if not db_content_item:
        raise HTTPException(status_code=404, detail="Content item not found")
    
    # Check if user has permission to update
    if db_content_item.created_by != current_user.id and current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return content_crud.update_content_item(db, content_id, content_item)

@router.delete("/{content_id}", response_model=ContentItem)
def delete_content_item(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Delete a content item.
    """
    db_content_item = content_crud.get_content_item(db, content_id)
    if not db_content_item:
        raise HTTPException(status_code=404, detail="Content item not found")
    
    # Check if user has permission to delete
    if db_content_item.created_by != current_user.id and current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return content_crud.delete_content_item(db, content_id)
