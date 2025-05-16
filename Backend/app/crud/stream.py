from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.models.models import Stream, Class
from app.schemas.stream_schema import StreamCreate, StreamUpdate
from fastapi import HTTPException, status
import logging

# Configure logging
logger = logging.getLogger(__name__)

def create_stream(db: Session, stream: StreamCreate) -> Stream:
    try:
        # Verify that the class exists
        db_class = db.query(Class).filter(Class.id == stream.class_id).first()
        if not db_class:
            raise HTTPException(
                status_code=404,
                detail=f"Class with id {stream.class_id} not found"
            )
            
        db_stream = Stream(
            name=stream.name,
            description=stream.description,
            class_id=stream.class_id
        )
        db.add(db_stream)
        db.commit()
        db.refresh(db_stream)
        return db_stream
    except Exception as e:
        logger.error(f"Error creating stream: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create stream: {str(e)}"
        )

def get_stream(db: Session, stream_id: int) -> Optional[Stream]:
    try:
        # Join load the class relationship
        return db.query(Stream).options(
            joinedload(Stream.class_)
        ).filter(Stream.id == stream_id).first()
    except Exception as e:
        logger.error(f"Error getting stream {stream_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch stream: {str(e)}"
        )

def get_streams(
    db: Session, 
    skip: int = 0, 
    limit: int = 100,
    class_id: Optional[int] = None
) -> List[Stream]:
    try:
        query = db.query(Stream).options(
            joinedload(Stream.class_)
        )
        
        if class_id:
            query = query.filter(Stream.class_id == class_id)
        
        streams = query.offset(skip).limit(limit).all()
        
        # Log streams for debugging
        logger.debug(f"Retrieved {len(streams)} streams")
        for stream in streams:
            if stream.class_ is None:
                logger.warning(f"Stream {stream.id} has no associated class")
                
        return streams
    except Exception as e:
        logger.error(f"Error getting streams: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch streams: {str(e)}"
        )

def update_stream(
    db: Session,
    stream_id: int,
    stream: StreamUpdate
) -> Optional[Stream]:
    try:
        db_stream = get_stream(db, stream_id=stream_id)
        if db_stream:
            update_data = stream.model_dump(exclude_unset=True)
            
            # If updating class_id, verify that the class exists
            if "class_id" in update_data:
                class_id = update_data["class_id"]
                db_class = db.query(Class).filter(Class.id == class_id).first()
                if not db_class:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Class with id {class_id} not found"
                    )
                    
            for key, value in update_data.items():
                setattr(db_stream, key, value)
                
            db.commit()
            db.refresh(db_stream)
            
        return db_stream
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        logger.error(f"Error updating stream {stream_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update stream: {str(e)}"
        )

def delete_stream(db: Session, stream_id: int) -> Optional[Stream]:
    try:
        # Use get_stream to load relationships for return value
        db_stream = get_stream(db, stream_id=stream_id)
        if db_stream:
            db.delete(db_stream)
            db.commit()
            return db_stream
        return None
    except Exception as e:
        logger.error(f"Error deleting stream {stream_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete stream: {str(e)}"
        ) 