from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime, timedelta, timezone
import logging
import json

from app.core.database import get_db
from app.core.auth import get_current_active_user, check_admin_permission, check_teacher_permission
from app.crud import subscription as subscription_crud
from app.crud import package as crud_packages
from app.schemas.schemas import Subscription, SubscriptionCreate, SubscriptionUpdate, UserSubscription, UserSubscriptionCreate, UserSubscriptionUpdate, User
from app.models.models import SubscriptionPlanPackage, User as UserModel, UserSubscription, SubscriptionStatus

router = APIRouter(
    prefix="/subscriptions",
    tags=["subscriptions"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[Subscription])
def read_subscriptions(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    subscriptions = subscription_crud.get_subscriptions(db, skip=skip, limit=limit)
    return subscriptions

@router.get("/all", response_model=List[Subscription])
def read_all_subscriptions(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission)
):
    subscriptions = subscription_crud.get_all_subscriptions(db, skip=skip, limit=limit)
    return subscriptions

@router.get("/{subscription_id}", response_model=Subscription)
def read_subscription(
    subscription_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_subscription = subscription_crud.get_subscription(db, subscription_id=subscription_id)
    if db_subscription is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return db_subscription

@router.post("/", response_model=Subscription)
def create_subscription(
    subscription: SubscriptionCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission)
):
    return subscription_crud.create_subscription(db=db, subscription=subscription)

@router.put("/{subscription_id}", response_model=Subscription)
def update_subscription(
    subscription_id: int, 
    subscription: SubscriptionUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission)
):
    db_subscription = subscription_crud.get_subscription(db, subscription_id=subscription_id)
    if db_subscription is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    return subscription_crud.update_subscription(db=db, subscription_id=subscription_id, subscription=subscription)

@router.delete("/{subscription_id}", response_model=Subscription)
def delete_subscription(
    subscription_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission)
):
    db_subscription = subscription_crud.delete_subscription(db, subscription_id=subscription_id)
    if db_subscription is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return db_subscription

# UserSubscription routes
@router.get("/user/{user_id}")
def read_user_subscriptions(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all subscriptions for a specific user.
    Users can only access their own subscriptions.
    Admins and superadmins can access any user's subscriptions.
    """
    # Check if user is requesting their own subscriptions or is an admin
    if current_user.id != user_id and current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    try:
        # Get current time in UTC
        current_time = datetime.now(timezone.utc)
        
        # Query user subscriptions with timezone-aware datetime comparison
        user_subscriptions = db.query(UserSubscription).filter(
            UserSubscription.user_id == user_id
        ).all()
        
        # Format each subscription with timezone-aware datetimes
        formatted_subscriptions = []
        for sub in user_subscriptions:
            # Ensure all datetime fields are timezone-aware
            if sub.start_date and not sub.start_date.tzinfo:
                sub.start_date = sub.start_date.replace(tzinfo=timezone.utc)
            if sub.end_date and not sub.end_date.tzinfo:
                sub.end_date = sub.end_date.replace(tzinfo=timezone.utc)
            if sub.created_at and not sub.created_at.tzinfo:
                sub.created_at = sub.created_at.replace(tzinfo=timezone.utc)
            if sub.updated_at and not sub.updated_at.tzinfo:
                sub.updated_at = sub.updated_at.replace(tzinfo=timezone.utc)
            
            formatted_subscriptions.append(format_user_subscription_response(sub, db))
        
        return formatted_subscriptions
        
    except Exception as e:
        logging.error(f"Error retrieving user subscriptions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving user subscriptions: {str(e)}"
        )

@router.get("/user/{user_id}/active")
def read_active_user_subscriptions(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all active subscriptions for a specific user.
    A subscription is considered active if:
    - status is 'active'
    - end_date has not been reached
    """
    if current_user.id != user_id and current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    try:
        current_time = datetime.now(timezone.utc)
        user_subscriptions = db.query(UserSubscription).filter(
            UserSubscription.user_id == user_id,
            UserSubscription.status == SubscriptionStatus.active,
            UserSubscription.end_date >= current_time
        ).all()
        
        return [format_user_subscription_response(sub, db) for sub in user_subscriptions]
    except Exception as e:
        logging.error(f"Error retrieving active user subscriptions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving active user subscriptions: {str(e)}"
        )

@router.get("/user/{user_id}/expired")
def read_expired_user_subscriptions(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all expired subscriptions for a specific user.
    A subscription is considered expired if:
    - status is 'expired' OR
    - end_date has been reached
    """
    if current_user.id != user_id and current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    try:
        user_subscriptions = db.query(UserSubscription).filter(
            UserSubscription.user_id == user_id,
            (UserSubscription.status == SubscriptionStatus.expired) | 
            (UserSubscription.end_date < datetime.now())
        ).all()
        
        return [format_user_subscription_response(sub, db) for sub in user_subscriptions]
    except Exception as e:
        logging.error(f"Error retrieving expired user subscriptions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving expired user subscriptions: {str(e)}"
        )

@router.get("/user/{user_id}/cancelled")
def read_cancelled_user_subscriptions(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all cancelled subscriptions for a specific user.
    """
    if current_user.id != user_id and current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    try:
        user_subscriptions = db.query(UserSubscription).filter(
            UserSubscription.user_id == user_id,
            UserSubscription.status == SubscriptionStatus.cancelled
        ).all()
        
        return [format_user_subscription_response(sub, db) for sub in user_subscriptions]
    except Exception as e:
        logging.error(f"Error retrieving cancelled user subscriptions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving cancelled user subscriptions: {str(e)}"
        )

@router.get("/user/{user_id}/upcoming")
def read_upcoming_user_subscriptions(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all upcoming subscriptions for a specific user.
    A subscription is considered upcoming if:
    - status is 'active'
    - start_date has not been reached yet
    """
    if current_user.id != user_id and current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    try:
        user_subscriptions = db.query(UserSubscription).filter(
            UserSubscription.user_id == user_id,
            UserSubscription.status == SubscriptionStatus.active,
            UserSubscription.start_date > datetime.now()
        ).all()
        
        return [format_user_subscription_response(sub, db) for sub in user_subscriptions]
    except Exception as e:
        logging.error(f"Error retrieving upcoming user subscriptions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving upcoming user subscriptions: {str(e)}"
        )

# Helper function to format UserSubscription for response
def format_user_subscription_response(subscription: UserSubscription, db: Session) -> Dict[str, Any]:
    # Create a dict representation for user
    user_data = {
        "id": subscription.user.id,
        "username": subscription.user.username,
        "email": subscription.user.email,
        "role": subscription.user.role,
        "full_name": subscription.user.full_name
    }
    
    # Create a dict for subscription plan package with package details
    sub_pkg_data = None
    packages_details = []
    
    if subscription.subscription_plan_package:
        try:
            # Parse package_ids from JSON string
            if subscription.subscription_plan_package.package_ids:
                package_ids = json.loads(subscription.subscription_plan_package.package_ids)
                
                # Get full package details
                if package_ids:
                    packages = crud_packages.get_packages_by_ids(db=db, package_ids=package_ids)
                    packages_details = [
                        {
                            "id": package.id,
                            "name": package.name,
                            "description": package.description,
                            "is_active": package.is_active,
                            "created_at": package.created_at.replace(tzinfo=timezone.utc) if package.created_at else None,
                            "updated_at": package.updated_at.replace(tzinfo=timezone.utc) if package.updated_at else None,
                            "courses": [
                                {
                                    "id": course.id,
                                    "name": course.name,
                                    "description": course.description,
                                    "duration": course.duration,
                                    "level": course.level,
                                    "is_active": course.is_active,
                                    "created_at": course.created_at.replace(tzinfo=timezone.utc) if course.created_at else None,
                                    "updated_at": course.updated_at.replace(tzinfo=timezone.utc) if course.updated_at else None,
                                    "stream": {
                                        "id": course.stream.id,
                                        "name": course.stream.name,
                                        "description": course.stream.description,
                                        "class": {
                                            "id": course.stream.class_.id,
                                            "name": course.stream.class_.name,
                                            "description": course.stream.class_.description
                                        } if hasattr(course.stream, 'class_') else None
                                    } if hasattr(course, 'stream') and course.stream else None,
                                    "subject": {
                                        "id": course.subject.id,
                                        "name": course.subject.name,
                                        "description": course.subject.description,
                                        "code": course.subject.code
                                    } if hasattr(course, 'subject') and course.subject else None,
                                    "chapter": {
                                        "id": course.chapter.id,
                                        "name": course.chapter.name,
                                        "description": course.chapter.description,
                                        "chapter_number": course.chapter.chapter_number
                                    } if hasattr(course, 'chapter') and course.chapter else None,
                                    "topic": {
                                        "id": course.topic.id,
                                        "name": course.topic.name,
                                        "description": course.topic.description,
                                        "topic_number": course.topic.topic_number,
                                        "estimated_time": course.topic.estimated_time
                                    } if hasattr(course, 'topic') and course.topic else None
                                } for course in package.courses
                            ] if hasattr(package, 'courses') else []
                        } 
                        for package in packages
                    ]
        except json.JSONDecodeError as e:
            logging.error(f"Error parsing package_ids: {str(e)}")
            packages_details = []
        except Exception as e:
            logging.error(f"Error getting package details: {str(e)}")
            packages_details = []
        
        sub_pkg_data = {
            "id": subscription.subscription_plan_package.id,
            "subscription_id": subscription.subscription_plan_package.subscription_id,
            "package_ids": json.loads(subscription.subscription_plan_package.package_ids) if subscription.subscription_plan_package.package_ids else [],
            "packages": packages_details,
            "created_at": subscription.subscription_plan_package.created_at.replace(tzinfo=timezone.utc) if subscription.subscription_plan_package.created_at else None
        }
    
    # Create a cleaned response with timezone-aware datetimes
    response = {
        "id": subscription.id,
        "user_id": subscription.user_id,
        "subscription_plan_packages_id": subscription.subscription_plan_packages_id,
        "start_date": subscription.start_date.replace(tzinfo=timezone.utc) if subscription.start_date else None,
        "end_date": subscription.end_date.replace(tzinfo=timezone.utc) if subscription.end_date else None,
        "status": subscription.status,
        "created_at": subscription.created_at.replace(tzinfo=timezone.utc) if subscription.created_at else None,
        "updated_at": subscription.updated_at.replace(tzinfo=timezone.utc) if subscription.updated_at else None,
        "user": user_data,
        "subscription_plan_package": sub_pkg_data
    }
    
    return response

@router.post("/user", status_code=status.HTTP_201_CREATED)
def create_user_subscription(
    user_subscription: UserSubscriptionCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if user is creating their own subscription or is an admin
    if current_user.id != user_subscription.user_id and current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    try:
        # Check if subscription plan package exists
        subscription_plan_package = db.query(SubscriptionPlanPackage).filter(
            SubscriptionPlanPackage.id == user_subscription.subscription_plan_packages_id
        ).first()
        
        if not subscription_plan_package:
            raise HTTPException(
                status_code=404, 
                detail=f"Subscription plan package with ID {user_subscription.subscription_plan_packages_id} not found"
            )
            
        # Check if user exists
        user = db.query(UserModel).filter(UserModel.id == user_subscription.user_id).first()
        if not user:
            raise HTTPException(
                status_code=404,
                detail=f"User with ID {user_subscription.user_id} not found"
            )
        
        result = subscription_crud.create_user_subscription(db=db, user_subscription=user_subscription)
        
        # Use the helper function to format the response
        return format_user_subscription_response(result, db)
        
    except Exception as e:
        # Log the error
        logging.error(f"Error creating user subscription: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error creating user subscription: {str(e)}"
        )

@router.put("/user/{user_subscription_id}")
def update_user_subscription(
    user_subscription_id: int, 
    user_subscription: UserSubscriptionUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission)
):
    try:
        db_user_subscription = subscription_crud.get_user_subscription(db, user_subscription_id=user_subscription_id)
        if db_user_subscription is None:
            raise HTTPException(status_code=404, detail="User subscription not found")
        
        updated_subscription = subscription_crud.update_user_subscription(
            db=db, 
            user_subscription_id=user_subscription_id, 
            user_subscription=user_subscription
        )
        return format_user_subscription_response(updated_subscription, db)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating user subscription: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error updating user subscription: {str(e)}"
        )

@router.put("/user/{user_subscription_id}/cancel")
def cancel_user_subscription(
    user_subscription_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        db_user_subscription = subscription_crud.get_user_subscription(db, user_subscription_id=user_subscription_id)
        if db_user_subscription is None:
            raise HTTPException(status_code=404, detail="User subscription not found")
        
        # Check if user is cancelling their own subscription or is an admin
        if current_user.id != db_user_subscription.user_id and current_user.role not in ["admin", "superadmin"]:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        cancelled_subscription = subscription_crud.cancel_user_subscription(db=db, user_subscription_id=user_subscription_id)
        return format_user_subscription_response(cancelled_subscription, db)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error cancelling user subscription: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error cancelling user subscription: {str(e)}"
        )

@router.post("/user/{user_id}/renew/{subscription_plan_packages_id}")
def renew_user_subscription(
    user_id: int,
    subscription_plan_packages_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if user is renewing their own subscription or is an admin
    if current_user.id != user_id and current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    try:
        # Check if subscription plan package exists
        subscription_plan_package = db.query(SubscriptionPlanPackage).filter(
            SubscriptionPlanPackage.id == subscription_plan_packages_id
        ).first()
        
        if not subscription_plan_package:
            raise HTTPException(
                status_code=404, 
                detail=f"Subscription plan package with ID {subscription_plan_packages_id} not found"
            )
            
        # Check if user exists
        user = db.query(UserModel).filter(UserModel.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=404,
                detail=f"User with ID {user_id} not found"
            )
        
        renewed_subscription = subscription_crud.renew_user_subscription(
            db=db, 
            user_id=user_id, 
            subscription_plan_packages_id=subscription_plan_packages_id
        )
        
        if not renewed_subscription:
            raise HTTPException(
                status_code=400,
                detail="Could not renew subscription"
            )
            
        return format_user_subscription_response(renewed_subscription, db)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error renewing user subscription: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error renewing user subscription: {str(e)}"
        )

@router.post("/update-expired", 
    summary="Update expired subscription statuses",
    response_model=dict
)
def update_expired_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission)
):
    """
    Update the status of all expired subscriptions to 'expired'.
    Only accessible by admin users.
    """
    try:
        count = subscription_crud.update_expired_subscriptions(db)
        return {
            "message": f"Successfully updated {count} expired subscriptions",
            "updated_count": count
        }
    except Exception as e:
        logging.error(f"Error updating expired subscriptions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating expired subscriptions: {str(e)}"
        )
