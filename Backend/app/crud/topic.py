from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import logging

from ..models.models import Topic, Chapter, Subject, Stream, Class, User
from ..schemas.topic_schema import TopicCreate, TopicUpdate

# Configure logging
logger = logging.getLogger(__name__)

def get_topic(db: Session, topic_id: int) -> Optional[Topic]:
    """
    Get a topic by ID with all relationships loaded
    """
    try:
        return db.query(Topic).options(
            joinedload(Topic.chapter)
              .joinedload(Chapter.subject)
              .joinedload(Subject.stream)
              .joinedload(Stream.class_)
        ).filter(Topic.id == topic_id).first()
    except Exception as e:
        logger.error(f"Error getting topic {topic_id}: {str(e)}")
        raise

def get_topics(
    db: Session, 
    skip: int = 0, 
    limit: int = 100,
    chapter_id: Optional[int] = None
) -> List[Topic]:
    """
    Get all topics with pagination and optional chapter filtering
    """
    try:
        query = db.query(Topic).options(
            joinedload(Topic.chapter)
              .joinedload(Chapter.subject)
              .joinedload(Subject.stream)
              .joinedload(Stream.class_)
        )
        
        if chapter_id:
            query = query.filter(Topic.chapter_id == chapter_id)
        
        return query.offset(skip).limit(limit).all()
    except Exception as e:
        logger.error(f"Error getting topics: {str(e)}")
        raise

def create_topic(db: Session, topic: TopicCreate) -> Topic:
    """
    Create a new topic
    """
    try:
        db_topic = Topic(
            name=topic.name,
            description=topic.description,
            chapter_id=topic.chapter_id
        )
        db.add(db_topic)
        db.commit()
        db.refresh(db_topic)
        
        # Reload with relationships
        return get_topic(db, db_topic.id)
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating topic: {str(e)}")
        raise

def update_topic(db: Session, db_topic: Topic, topic_update: TopicUpdate) -> Topic:
    """
    Update a topic
    """
    try:
        update_data = topic_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_topic, field, value)
        
        db.add(db_topic)
        db.commit()
        db.refresh(db_topic)
        
        # Reload with relationships
        return get_topic(db, db_topic.id)
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating topic {db_topic.id}: {str(e)}")
        raise

def delete_topic(db: Session, topic_id: int) -> Optional[Topic]:
    """
    Delete a topic and return the deleted topic data
    """
    try:
        db_topic = get_topic(db, topic_id)
        if db_topic:
            db.delete(db_topic)
            db.commit()
            return db_topic
        return None
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting topic {topic_id}: {str(e)}")
        raise
