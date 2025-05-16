"""
Script to fix subject-stream relationships in the database
"""

from app.core.database import get_db
from app.models.models import Subject, Stream
from sqlalchemy.orm import joinedload
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, 
                  format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def fix_subjects():
    """Ensure all subjects have their stream relationship properly set"""
    try:
        db = next(get_db())
        
        # Get all subjects with their stream relationships
        subjects = db.query(Subject).options(
            joinedload(Subject.stream)
        ).all()
        
        logger.info(f"Found {len(subjects)} subjects in the database")
        
        # Check each subject
        for subject in subjects:
            logger.info(f"Subject ID: {subject.id}, Name: {subject.name}, Stream ID: {subject.stream_id}")
            
            if subject.stream is None:
                logger.warning(f"Subject {subject.id} ({subject.name}) has no associated stream object even though stream_id is {subject.stream_id}")
                
                # Try to find the stream
                stream = db.query(Stream).filter(Stream.id == subject.stream_id).first()
                if stream:
                    logger.info(f"Found stream: {stream.id} ({stream.name})")
                    # The relationship should be automatically fixed when the session is refreshed
                    db.refresh(subject)
                    logger.info(f"After refresh, stream is {'available' if subject.stream else 'still None'}")
                else:
                    logger.error(f"Stream with ID {subject.stream_id} does not exist in the database")
            else:
                logger.info(f"Subject {subject.id} ({subject.name}) has stream: {subject.stream.id} ({subject.stream.name})")
        
        # Verify relationship was properly loaded
        for subject in subjects:
            stream_info = f"ID: {subject.stream.id}, Name: {subject.stream.name}" if subject.stream else "None"
            logger.info(f"Subject {subject.id} ({subject.name}) - Stream: {stream_info}")
            
        logger.info("Subject-stream relationship check complete")
        
    except Exception as e:
        logger.error(f"Error checking subjects: {str(e)}")
        raise

if __name__ == "__main__":
    fix_subjects() 