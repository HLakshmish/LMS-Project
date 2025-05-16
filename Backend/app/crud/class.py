from sqlalchemy.orm import Session
from app.models import Class
from app.schemas.class import ClassCreate

def create_class(db: Session, class_in: ClassCreate):
    db_class = Class(**class_in.dict())
    db.add(db_class)
    db.commit()
    db.refresh(db_class)
    return db_class

def get_class(db: Session, class_id: int):
    return db.query(Class).filter(Class.id == class_id).first()

def get_classes(db: Session, skip: int = 0, limit: int = 10):
    return db.query(Class).offset(skip).limit(limit).all()
