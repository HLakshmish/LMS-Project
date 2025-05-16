from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.auth import get_current_user
from ..crud import class_ as crud_class
from ..schemas import class_schema
from ..models.models import User, UserRole

# Use empty prefix to avoid duplication
router = APIRouter(
    tags=["classes"]
)

def check_teacher_permission(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Check if the current user has teacher or admin permissions
    """
    if current_user.role not in [UserRole.teacher, UserRole.admin, UserRole.superadmin]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Only teachers and admins can perform this action."
        )
    return current_user

@router.get("/{class_id}", response_model=class_schema.Class)
def get_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a class by ID
    """
    db_class = crud_class.get_class(db, class_id=class_id)
    if db_class is None:
        raise HTTPException(status_code=404, detail="Class not found")
    return db_class

@router.get("/", response_model=List[class_schema.Class])
def get_classes(
    skip: int = Query(0, ge=0, description="Number of classes to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of classes to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all classes with pagination
    """
    # Removed stream_id parameter as it's not supported in the backend
    classes = crud_class.get_classes(
        db, 
        skip=skip, 
        limit=limit
    )
    return classes

@router.post("/", response_model=class_schema.Class, status_code=status.HTTP_201_CREATED)
def create_class(
    class_: class_schema.ClassCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Create a new class (teachers and admins only)
    """
    return crud_class.create_class(db=db, class_=class_, user_id=current_user.id)

@router.put("/{class_id}", response_model=class_schema.Class)
def update_class(
    class_id: int,
    class_update: class_schema.ClassUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Update a class (teachers and admins only)
    """
    db_class = crud_class.get_class(db, class_id=class_id)
    if db_class is None:
        raise HTTPException(status_code=404, detail="Class not found")
    return crud_class.update_class(db=db, db_class=db_class, class_update=class_update)

@router.delete("/{class_id}", response_model=class_schema.Class)
def delete_class(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Delete a class (teachers and admins only)
    """
    db_class = crud_class.delete_class(db=db, class_id=class_id)
    if db_class is None:
        raise HTTPException(status_code=404, detail="Class not found")
    return db_class 