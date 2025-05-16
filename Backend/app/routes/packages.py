from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import logging

from ..core.database import get_db
from ..core.auth import get_current_user
from ..crud import package as crud_package
from ..schemas.schemas import Package, PackageCreate, PackageUpdate
from ..models.models import User, UserRole

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="",
    tags=["Packages"],
    responses={404: {"description": "Not found"}}
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

@router.get("/{package_id}", response_model=Package)
def get_package(
    package_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a package by ID
    """
    try:
        db_package = crud_package.get_package_with_courses(db, package_id=package_id)
        if db_package is None:
            raise HTTPException(status_code=404, detail="Package not found")
        return db_package
    except Exception as e:
        logger.error(f"Error retrieving package {package_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred while retrieving the package: {str(e)}")

@router.get("/", response_model=List[Package])
def get_packages(
    skip: int = Query(0, ge=0, description="Number of packages to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of packages to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all packages with pagination
    """
    try:
        packages = crud_package.get_packages(db, skip=skip, limit=limit)
        return packages
    except Exception as e:
        logger.error(f"Error retrieving packages: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred while retrieving packages: {str(e)}")

@router.post("/", response_model=Package, status_code=status.HTTP_201_CREATED)
def create_package(
    package: PackageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Create a new package with the following fields:
    - name: string (required)
    - description: string (required)
    - course_ids: list of integers (required) - IDs of courses to include in the package
    """
    return crud_package.create_package(db=db, package=package, user_id=current_user.id)

@router.put("/{package_id}", response_model=Package)
def update_package(
    package_id: int,
    package: PackageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Update a package with the following optional fields:
    - name: string
    - description: string
    - course_ids: list of integers - IDs of courses to include in the package
    """
    db_package = crud_package.get_package(db, package_id=package_id)
    if db_package is None:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Check if user is the creator
    if db_package.created_by != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions. Only the creator can update the package."
        )
    
    return crud_package.update_package(db=db, package_id=package_id, package=package)

@router.delete("/{package_id}", response_model=Package)
def delete_package(
    package_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Delete a package
    """
    db_package = crud_package.get_package(db, package_id=package_id)
    if db_package is None:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Check if user is the creator
    if db_package.created_by != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions. Only the creator can delete the package."
        )
    
    return crud_package.delete_package(db=db, package_id=package_id) 