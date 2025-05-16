from sqlalchemy.orm import Session
from typing import List, Optional

from ..models.models import Class
from ..schemas.class_schema import ClassCreate, ClassUpdate

def get_class(db: Session, class_id: int) -> Optional[Class]:
    """
    Get a class by ID
    """
    return db.query(Class).filter(Class.id == class_id).first()

def get_classes(
    db: Session, 
    skip: int = 0, 
    limit: int = 100
) -> List[Class]:
    """
    Get all classes with pagination
    """
    return db.query(Class).offset(skip).limit(limit).all()

def create_class(db: Session, class_: ClassCreate, user_id: int) -> Class:
    """
    Create a new class
    """
    db_class = Class(
        name=class_.name,
        description=class_.description,
        created_by=user_id
    )
    db.add(db_class)
    db.commit()
    db.refresh(db_class)
    return db_class

def update_class(
    db: Session,
    db_class: Class,
    class_update: ClassUpdate
) -> Class:
    """
    Update a class
    """
    update_data = class_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_class, key, value)
    db.commit()
    db.refresh(db_class)
    return db_class

def delete_class(db: Session, class_id: int) -> Optional[Class]:
    """
    Delete a class and return the deleted class data
    """
    db_class = get_class(db, class_id)
    if db_class:
        db.delete(db_class)
        db.commit()
    return db_class 