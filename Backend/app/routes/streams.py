from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.core.database import get_db
from app.core.auth import get_current_user, check_admin_permission
from app.crud import stream as stream_crud
from app.crud import class_ as class_crud
from app.schemas.stream_schema import Stream, StreamCreate, StreamUpdate
from app.models.models import User

# Configure logging
logger = logging.getLogger(__name__)

# Use empty prefix to avoid duplication
router = APIRouter(
    tags=["Streams"],
    responses={
        404: {"description": "Not found"},
        401: {"description": "Not authenticated"},
        403: {"description": "Not enough permissions (Admin only)"}
    },
)

@router.post("/", 
    response_model=Stream, 
    status_code=status.HTTP_201_CREATED,
    summary="Create a new stream",
    description="""
    Create a new stream in the system.
    
    Required Parameters:
    - name: String (3-100 characters)
    - class_id: Integer (ID of the class this stream belongs to)
    
    Optional Parameters:
    - description: String (max 500 characters)
    
    This endpoint requires admin privileges.
    """,
    responses={
        201: {
            "description": "Stream created successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "name": "Science Stream",
                        "description": "Stream for science students",
                        "class_id": 1,
                        "created_at": "2024-03-14T12:00:00",
                        "updated_at": None,
                        "class_": {
                            "id": 1,
                            "name": "Class 10",
                            "description": "10th standard"
                        }
                    }
                }
            }
        }
    }
)
def create_stream(
    stream: StreamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission)
):
    """
    Create a new stream (Admin only)
    """
    # Verify that the class exists
    db_class = class_crud.get_class(db, class_id=stream.class_id)
    if not db_class:
        raise HTTPException(
            status_code=404,
            detail=f"Class with id {stream.class_id} not found"
        )
    
    logger.info(f"Creating new stream: {stream.name} for class {stream.class_id}")
    return stream_crud.create_stream(db=db, stream=stream)

@router.get("/", 
    response_model=List[Stream],
    summary="Get all streams",
    description="Retrieve a list of all streams with pagination support and optional class filtering."
)
def read_streams(
    skip: int = Query(
        default=0, 
        ge=0,
        description="Number of streams to skip (for pagination)"
    ),
    limit: int = Query(
        default=100, 
        ge=1, 
        le=100,
        description="Maximum number of streams to return"
    ),
    class_id: Optional[int] = Query(
        None,
        description="Filter streams by class ID"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve streams with pagination and optional class filtering
    """
    if class_id:
        # Verify that the class exists
        db_class = class_crud.get_class(db, class_id=class_id)
        if not db_class:
            raise HTTPException(
                status_code=404,
                detail=f"Class with id {class_id} not found"
            )
    
    logger.info(f"Fetching streams with skip={skip}, limit={limit}, class_id={class_id}")
    try:
        streams = stream_crud.get_streams(db, skip=skip, limit=limit, class_id=class_id)
        return streams
    except Exception as e:
        logger.error(f"Error fetching streams: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching streams"
        )

@router.get("/{stream_id}", 
    response_model=Stream,
    summary="Get a specific stream",
    description="Get detailed information about a specific stream by its ID."
)
def read_stream(
    stream_id: int = Path(..., gt=0, description="The ID of the stream to retrieve"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific stream by ID
    """
    logger.info(f"Fetching stream with id: {stream_id}")
    db_stream = stream_crud.get_stream(db, stream_id=stream_id)
    if db_stream is None:
        logger.warning(f"Stream not found: {stream_id}")
        raise HTTPException(status_code=404, detail="Stream not found")
    return db_stream

@router.put("/{stream_id}", 
    response_model=Stream,
    summary="Update a stream",
    description="""
    Update an existing stream by its ID.
    
    Optional Parameters:
    - name: String (3-100 characters)
    - description: String (max 500 characters)
    - class_id: Integer (ID of the class this stream belongs to)
    
    This endpoint requires admin privileges.
    """
)
def update_stream(
    stream_id: int = Path(..., gt=0, description="The ID of the stream to update"),
    stream: StreamUpdate = ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission)
):
    """
    Update a stream (Admin only)
    """
    # If class_id is being updated, verify that the new class exists
    if stream.class_id is not None:
        db_class = class_crud.get_class(db, class_id=stream.class_id)
        if not db_class:
            raise HTTPException(
                status_code=404,
                detail=f"Class with id {stream.class_id} not found"
            )
    
    logger.info(f"Updating stream {stream_id}")
    db_stream = stream_crud.update_stream(db, stream_id=stream_id, stream=stream)
    if db_stream is None:
        logger.warning(f"Stream not found: {stream_id}")
        raise HTTPException(status_code=404, detail="Stream not found")
    return db_stream

@router.delete("/{stream_id}", 
    response_model=Stream,
    summary="Delete a stream",
    description="""
    Delete a stream from the system.
    This endpoint requires admin privileges.
    """
)
def delete_stream(
    stream_id: int = Path(..., gt=0, description="The ID of the stream to delete"),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission)
):
    """
    Delete a stream (Admin only)
    """
    logger.info(f"Deleting stream {stream_id}")
    db_stream = stream_crud.delete_stream(db, stream_id=stream_id)
    if db_stream is None:
        logger.warning(f"Stream not found: {stream_id}")
        raise HTTPException(status_code=404, detail="Stream not found")
    return db_stream 