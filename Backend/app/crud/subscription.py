from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta
from app.models.models import Subscription, UserSubscription, SubscriptionStatus, SubscriptionPlanPackage
from app.schemas.schemas import SubscriptionCreate, SubscriptionUpdate, UserSubscriptionCreate, UserSubscriptionUpdate
import logging

logger = logging.getLogger(__name__)

# Subscription CRUD operations
def get_subscription(db: Session, subscription_id: int):
    return db.query(Subscription).filter(Subscription.id == subscription_id).first()

def get_subscriptions(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Subscription).filter(Subscription.is_active == True).offset(skip).limit(limit).all()

def get_all_subscriptions(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Subscription).offset(skip).limit(limit).all()

def create_subscription(db: Session, subscription: SubscriptionCreate):
    db_subscription = Subscription(
        name=subscription.name,
        description=subscription.description,
        duration_days=subscription.duration_days,
        price=subscription.price,
        max_exams=subscription.max_exams,
        features=subscription.features,
        is_active=subscription.is_active
    )
    db.add(db_subscription)
    db.commit()
    db.refresh(db_subscription)
    return db_subscription

def update_subscription(db: Session, subscription_id: int, subscription: SubscriptionUpdate):
    db_subscription = get_subscription(db, subscription_id)
    if not db_subscription:
        return None
    
    update_data = subscription.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_subscription, key, value)
    
    db.commit()
    db.refresh(db_subscription)
    return db_subscription

def delete_subscription(db: Session, subscription_id: int):
    db_subscription = get_subscription(db, subscription_id)
    if not db_subscription:
        return None
    
    # Instead of deleting, mark as inactive
    db_subscription.is_active = False
    
    db.commit()
    db.refresh(db_subscription)
    return db_subscription

# UserSubscription CRUD operations
def get_user_subscription(db: Session, user_subscription_id: int):
    return db.query(UserSubscription).options(
        joinedload(UserSubscription.user),
        joinedload(UserSubscription.subscription_plan_package)
    ).filter(UserSubscription.id == user_subscription_id).first()

def check_subscription_status(subscription: UserSubscription) -> bool:
    """
    Check if a subscription is expired and update its status if needed.
    
    Args:
        subscription: UserSubscription object to check
        
    Returns:
        bool: True if the subscription is active, False if expired
    """
    if subscription.status == SubscriptionStatus.active and subscription.end_date < datetime.now():
        subscription.status = SubscriptionStatus.expired
        return False
    return subscription.status == SubscriptionStatus.active

def get_user_subscriptions(db: Session, user_id: int):
    """Returns all subscriptions for a user with updated status"""
    subscriptions = db.query(UserSubscription).options(
        joinedload(UserSubscription.user),
        joinedload(UserSubscription.subscription_plan_package)
    ).filter(UserSubscription.user_id == user_id).all()
    
    # Check and update status for each subscription
    status_updated = False
    for subscription in subscriptions:
        if subscription.status == SubscriptionStatus.active:
            is_active = check_subscription_status(subscription)
            if not is_active:
                status_updated = True
    
    # Commit any status updates
    if status_updated:
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating subscription statuses: {str(e)}")
    
    return subscriptions

def get_active_user_subscriptions(db: Session, user_id: int):
    """Returns all active subscriptions for a user"""
    return db.query(UserSubscription).options(
        joinedload(UserSubscription.user),
        joinedload(UserSubscription.subscription_plan_package)
    ).filter(
        UserSubscription.user_id == user_id,
        UserSubscription.status == SubscriptionStatus.active,
        UserSubscription.end_date >= datetime.now()
    ).all()

# Keep the original function for backwards compatibility
def get_active_user_subscription(db: Session, user_id: int):
    """Returns the first active subscription for a user (for backwards compatibility)"""
    return db.query(UserSubscription).options(
        joinedload(UserSubscription.user),
        joinedload(UserSubscription.subscription_plan_package)
    ).filter(
        UserSubscription.user_id == user_id,
        UserSubscription.status == SubscriptionStatus.active,
        UserSubscription.end_date >= datetime.now()
    ).first()

def create_user_subscription(db: Session, user_subscription: UserSubscriptionCreate):
    # Create the user subscription
    db_user_subscription = UserSubscription(
        user_id=user_subscription.user_id,
        subscription_plan_packages_id=user_subscription.subscription_plan_packages_id,
        start_date=user_subscription.start_date,
        end_date=user_subscription.end_date,
        status=user_subscription.status
    )
    db.add(db_user_subscription)
    db.commit()
    
    # Refresh with eagerly loaded relationships
    db_user_subscription = db.query(UserSubscription).options(
        joinedload(UserSubscription.user),
        joinedload(UserSubscription.subscription_plan_package)
    ).filter(UserSubscription.id == db_user_subscription.id).first()
    
    return db_user_subscription

def update_user_subscription(db: Session, user_subscription_id: int, user_subscription: UserSubscriptionUpdate):
    db_user_subscription = get_user_subscription(db, user_subscription_id)
    if not db_user_subscription:
        return None
    
    update_data = user_subscription.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_user_subscription, key, value)
    
    db.commit()
    
    # Reload with relationships
    return get_user_subscription(db, user_subscription_id)

def cancel_user_subscription(db: Session, user_subscription_id: int):
    db_user_subscription = get_user_subscription(db, user_subscription_id)
    if not db_user_subscription:
        return None
    
    db_user_subscription.status = SubscriptionStatus.cancelled
    
    db.commit()
    
    # Reload with relationships
    return get_user_subscription(db, user_subscription_id)

def renew_user_subscription(db: Session, user_id: int, subscription_plan_packages_id: int):
    # Get the subscription plan package
    subscription_plan_package = db.query(SubscriptionPlanPackage).filter(
        SubscriptionPlanPackage.id == subscription_plan_packages_id
    ).first()
    
    if not subscription_plan_package:
        return None
    
    # Get the subscription to determine duration
    subscription = get_subscription(db, subscription_plan_package.subscription_id)
    if not subscription:
        return None
    
    start_date = datetime.now()
    end_date = start_date + timedelta(days=subscription.duration_days)
    
    db_user_subscription = UserSubscription(
        user_id=user_id,
        subscription_plan_packages_id=subscription_plan_packages_id,
        start_date=start_date,
        end_date=end_date,
        status=SubscriptionStatus.active
    )
    db.add(db_user_subscription)
    db.commit()
    
    # Reload with relationships
    return get_user_subscription(db, db_user_subscription.id)

def update_expired_subscriptions(db: Session):
    """
    Update the status of expired subscriptions to 'expired'.
    This function runs periodically to keep subscription statuses up to date.
    
    Args:
        db: Database session
        
    Returns:
        int: Number of subscriptions updated
    """
    try:
        # Find all active subscriptions that have passed their end date
        current_time = datetime.now()
        expired_subscriptions = db.query(UserSubscription).filter(
            UserSubscription.status == SubscriptionStatus.active,
            UserSubscription.end_date < current_time
        ).all()
        
        if not expired_subscriptions:
            return 0
            
        # Update their status to expired in batches
        count = 0
        batch_size = 100  # Process 100 subscriptions at a time
        
        for i in range(0, len(expired_subscriptions), batch_size):
            batch = expired_subscriptions[i:i + batch_size]
            try:
                for subscription in batch:
                    subscription.status = SubscriptionStatus.expired
                    subscription.updated_at = current_time
                    count += 1
                
                db.commit()
                logger.info(f"Updated batch of {len(batch)} expired subscriptions")
                
            except Exception as batch_error:
                db.rollback()
                logger.error(f"Error updating batch of subscriptions: {str(batch_error)}")
                # Continue with next batch instead of failing completely
                continue
        
        return count
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating expired subscriptions: {str(e)}")
        raise
