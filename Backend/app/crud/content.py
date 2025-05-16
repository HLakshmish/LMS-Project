from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.models.models import ContentItem, Course, Topic, Chapter, Subject
from app.schemas.content_schema import ContentItemCreate, ContentItemUpdate

def get_content_item(db: Session, content_id: int):
    return (
        db.query(ContentItem)
        .options(
            joinedload(ContentItem.creator),
            joinedload(ContentItem.course),
            joinedload(ContentItem.topic),
            joinedload(ContentItem.chapter),
            joinedload(ContentItem.subject)
        )
        .filter(ContentItem.id == content_id)
        .first()
    )

def get_content_items(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(ContentItem)
        .options(
            joinedload(ContentItem.creator),
            joinedload(ContentItem.course),
            joinedload(ContentItem.topic),
            joinedload(ContentItem.chapter),
            joinedload(ContentItem.subject)
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_content_by_course(db: Session, course_id: int, skip: int = 0, limit: int = 100):
    """Get content items directly associated with a course"""
    return (
        db.query(ContentItem)
        .options(
            joinedload(ContentItem.creator),
            joinedload(ContentItem.course),
            joinedload(ContentItem.topic),
            joinedload(ContentItem.chapter),
            joinedload(ContentItem.subject)
        )
        .filter(ContentItem.course_id == course_id)
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_content_by_topic(db: Session, topic_id: int, skip: int = 0, limit: int = 100):
    """Get content items for a topic and its associated course"""
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        return []

    return (
        db.query(ContentItem)
        .options(
            joinedload(ContentItem.creator),
            joinedload(ContentItem.course),
            joinedload(ContentItem.topic),
            joinedload(ContentItem.chapter),
            joinedload(ContentItem.subject)
        )
        .filter(
            (ContentItem.topic_id == topic_id) |
            (ContentItem.course_id.in_(
                db.query(Course.id).filter(Course.topic_id == topic_id)
            ))
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_content_by_chapter(db: Session, chapter_id: int, skip: int = 0, limit: int = 100):
    """Get content items for a chapter, its topics, and associated courses"""
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        return []

    topic_ids = [topic.id for topic in chapter.topics]
    
    return (
        db.query(ContentItem)
        .options(
            joinedload(ContentItem.creator),
            joinedload(ContentItem.course),
            joinedload(ContentItem.topic),
            joinedload(ContentItem.chapter),
            joinedload(ContentItem.subject)
        )
        .filter(
            (ContentItem.chapter_id == chapter_id) |
            (ContentItem.topic_id.in_(topic_ids)) |
            (ContentItem.course_id.in_(
                db.query(Course.id).filter(
                    (Course.chapter_id == chapter_id) |
                    (Course.topic_id.in_(topic_ids))
                )
            ))
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_content_by_subject(db: Session, subject_id: int, skip: int = 0, limit: int = 100):
    """Get content items for a subject, its chapters, topics, and associated courses"""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        return []

    # Get all chapter IDs for this subject
    chapter_ids = [chapter.id for chapter in subject.chapters]
    
    # Get all topic IDs for these chapters
    topic_ids = []
    for chapter in subject.chapters:
        topic_ids.extend([topic.id for topic in chapter.topics])

    return (
        db.query(ContentItem)
        .options(
            joinedload(ContentItem.creator),
            joinedload(ContentItem.course),
            joinedload(ContentItem.topic),
            joinedload(ContentItem.chapter),
            joinedload(ContentItem.subject)
        )
        .filter(
            (ContentItem.subject_id == subject_id) |
            (ContentItem.chapter_id.in_(chapter_ids)) |
            (ContentItem.topic_id.in_(topic_ids)) |
            (ContentItem.course_id.in_(
                db.query(Course.id).filter(
                    (Course.subject_id == subject_id) |
                    (Course.chapter_id.in_(chapter_ids)) |
                    (Course.topic_id.in_(topic_ids))
                )
            ))
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

def create_content_item(db: Session, content_item: ContentItemCreate, user_id: int, url: str):
    """
    Create a new content item with the provided URL.
    
    Args:
        db (Session): Database session
        content_item (ContentItemCreate): Content item data
        user_id (int): ID of the user creating the content
        url (str): Public URL of the uploaded file
        
    Returns:
        ContentItem: Created content item with relationships loaded
    """
    db_content_item = ContentItem(
        title=content_item.title,
        description=content_item.description,
        type=content_item.type,
        url=url,  # Use the provided public URL
        course_id=content_item.course_id,
        topic_id=content_item.topic_id,
        chapter_id=content_item.chapter_id,
        subject_id=content_item.subject_id,
        created_by=user_id
    )
    db.add(db_content_item)
    db.commit()
    db.refresh(db_content_item)
    
    # Reload with relationships
    return get_content_item(db, db_content_item.id)

def update_content_item(db: Session, content_id: int, content_item: ContentItemUpdate):
    db_content_item = get_content_item(db, content_id)
    if not db_content_item:
        return None
    
    # Update fields if provided
    for var, value in vars(content_item).items():
        if value is not None:
            setattr(db_content_item, var, value)
    
    db.commit()
    db.refresh(db_content_item)
    
    # Reload with relationships
    return get_content_item(db, content_id)

def delete_content_item(db: Session, content_id: int):
    db_content_item = get_content_item(db, content_id)
    if not db_content_item:
        return None
    
    db.delete(db_content_item)
    db.commit()
    return db_content_item
