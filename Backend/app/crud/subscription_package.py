from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
import logging
from typing import List, Optional
import json

from app.models.models import SubscriptionPlanPackage, Subscription, Package
from app.schemas.subscription_package_schema import (
    SubscriptionPlanPackageCreate,
    SubscriptionPlanPackageUpdate,
    BulkSubscriptionPackageMapping
)

logger = logging.getLogger(__name__)

def get_subscription_package(db: Session, mapping_id: int) -> Optional[SubscriptionPlanPackage]:
    """
    Get a subscription-package mapping by ID with full relationships.
    
    Args:
        db: Database session
        mapping_id: ID of the subscription package mapping to retrieve
        
    Returns:
        The subscription package mapping if found, None otherwise
    """
    return (
        db.query(SubscriptionPlanPackage)
        .options(
            joinedload(SubscriptionPlanPackage.subscription)
        )
        .filter(SubscriptionPlanPackage.id == mapping_id)
        .first()
    )

def get_subscription_packages(
    db: Session, skip: int = 0, limit: int = 100
) -> List[SubscriptionPlanPackage]:
    """
    Get all subscription-package mappings with pagination and full relationships.
    
    Args:
        db: Database session
        skip: Number of records to skip
        limit: Maximum number of records to return
        
    Returns:
        List of subscription package mappings
    """
    return (
        db.query(SubscriptionPlanPackage)
        .options(
            joinedload(SubscriptionPlanPackage.subscription)
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_packages_by_subscription(db: Session, subscription_id: int) -> List[SubscriptionPlanPackage]:
    """
    Get all package mappings for a specific subscription with full relationships.
    
    Args:
        db: Database session
        subscription_id: ID of the subscription to get packages for
        
    Returns:
        List of subscription package mappings for the subscription
    """
    return (
        db.query(SubscriptionPlanPackage)
        .options(
            joinedload(SubscriptionPlanPackage.subscription)
        )
        .filter(SubscriptionPlanPackage.subscription_id == subscription_id)
        .all()
    )

def get_subscriptions_by_package(db: Session, package_id: int) -> List[SubscriptionPlanPackage]:
    """
    Get all subscription mappings for a specific package with full relationships.
    
    Args:
        db: Database session
        package_id: ID of the package to get subscriptions for
        
    Returns:
        List of subscription package mappings for the package (using JSON array search)
    """
    # We need to use SQL expression to search in JSON array
    mappings = []
    all_mappings = (
        db.query(SubscriptionPlanPackage)
        .options(
            joinedload(SubscriptionPlanPackage.subscription)
        )
        .all()
    )
    
    # Filter mappings where package_id is in the package_ids JSON array
    for mapping in all_mappings:
        if mapping.package_ids:
            try:
                package_ids = json.loads(mapping.package_ids)
                if package_id in package_ids:
                    mappings.append(mapping)
            except (json.JSONDecodeError, TypeError):
                pass
    
    return mappings

def create_subscription_package(
    db: Session, subscription_package: SubscriptionPlanPackageCreate
) -> SubscriptionPlanPackage:
    """
    Create a new subscription-package mapping.
    
    Args:
        db: Database session
        subscription_package: Schema with subscription and package data
        
    Returns:
        The created subscription package mapping
        
    Raises:
        HTTPException: If the subscription doesn't exist
    """
    # Verify subscription exists
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_package.subscription_id
    ).first()
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription with id {subscription_package.subscription_id} not found"
        )
    
    # Convert package_ids to JSON string if provided
    package_ids_json = None
    if subscription_package.package_ids:
        package_ids_json = json.dumps(subscription_package.package_ids)
    
    try:
        db_subscription_package = SubscriptionPlanPackage(
            subscription_id=subscription_package.subscription_id,
            package_ids=package_ids_json
        )
        db.add(db_subscription_package)
        db.commit()
        db.refresh(db_subscription_package)
        return db_subscription_package
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Error creating subscription package mapping: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not create subscription package mapping due to integrity constraint"
        )

def create_bulk_subscription_packages(
    db: Session, bulk_mapping: BulkSubscriptionPackageMapping
) -> SubscriptionPlanPackage:
    """
    Create a subscription-package mapping with multiple packages stored as JSON.
    
    Args:
        db: Database session
        bulk_mapping: Schema with subscription ID and list of package IDs
        
    Returns:
        The created subscription package mapping with all package IDs
        
    Raises:
        HTTPException: If the subscription doesn't exist or if any of the packages don't exist
    """
    # Verify subscription exists
    subscription = db.query(Subscription).filter(
        Subscription.id == bulk_mapping.subscription_id
    ).first()
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription with id {bulk_mapping.subscription_id} not found"
        )
    
    # Verify all packages exist
    package_count = db.query(Package).filter(
        Package.id.in_(bulk_mapping.package_ids)
    ).count()
    if package_count != len(bulk_mapping.package_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more packages in the provided list do not exist"
        )
    
    # Check if this subscription already has a mapping
    existing_mapping = db.query(SubscriptionPlanPackage).filter(
        SubscriptionPlanPackage.subscription_id == bulk_mapping.subscription_id,
        SubscriptionPlanPackage.package_ids.isnot(None)  # Look for entries with package_ids
    ).first()
    
    try:
        if existing_mapping:
            # Update existing mapping
            logger.info(f"Updating existing package_ids for subscription {bulk_mapping.subscription_id}")
            existing_mapping.package_ids = json.dumps(bulk_mapping.package_ids)
            db.commit()
            db.refresh(existing_mapping)
            return existing_mapping
        else:
            # Create new mapping
            logger.info(f"Creating new package_ids mapping for subscription {bulk_mapping.subscription_id}")
            db_subscription_package = SubscriptionPlanPackage(
                subscription_id=bulk_mapping.subscription_id,
                package_ids=json.dumps(bulk_mapping.package_ids)
            )
            db.add(db_subscription_package)
            db.commit()
            db.refresh(db_subscription_package)
            return db_subscription_package
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Error creating bulk subscription package mappings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not create subscription package mappings due to integrity constraint"
        )

def update_subscription_package(
    db: Session, mapping_id: int, subscription_package_update: SubscriptionPlanPackageUpdate
) -> SubscriptionPlanPackage:
    """
    Update a subscription-package mapping.
    
    Args:
        db: Database session
        mapping_id: ID of the mapping to update
        subscription_package_update: Schema with updated mapping data
        
    Returns:
        The updated subscription package mapping
        
    Raises:
        HTTPException: If the mapping doesn't exist, or if the updated subscription doesn't exist
    """
    db_subscription_package = get_subscription_package(db, mapping_id)
    if not db_subscription_package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription package mapping with id {mapping_id} not found"
        )
    
    update_data = subscription_package_update.dict(exclude_unset=True)
    
    if "subscription_id" in update_data:
        # Verify new subscription exists
        subscription = db.query(Subscription).filter(
            Subscription.id == update_data["subscription_id"]
        ).first()
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subscription with id {update_data['subscription_id']} not found"
            )
    
    # Convert package_ids to JSON string if provided
    if "package_ids" in update_data and update_data["package_ids"] is not None:
        update_data["package_ids"] = json.dumps(update_data["package_ids"])
    
    try:
        for key, value in update_data.items():
            setattr(db_subscription_package, key, value)
        
        db.add(db_subscription_package)
        db.commit()
        db.refresh(db_subscription_package)
        return db_subscription_package
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Error updating subscription package mapping: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not update subscription package mapping due to integrity constraint"
        )

def delete_subscription_package(
    db: Session, mapping_id: int
) -> SubscriptionPlanPackage:
    """
    Delete a subscription-package mapping.
    
    Args:
        db: Database session
        mapping_id: ID of the mapping to delete
        
    Returns:
        The deleted subscription package mapping
        
    Raises:
        HTTPException: If the mapping doesn't exist
    """
    db_subscription_package = get_subscription_package(db, mapping_id)
    if not db_subscription_package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription package mapping with id {mapping_id} not found"
        )
    
    db.delete(db_subscription_package)
    db.commit()
    return db_subscription_package

def delete_subscription_packages_by_subscription(
    db: Session, subscription_id: int
) -> List[SubscriptionPlanPackage]:
    """
    Delete all package mappings for a specific subscription.
    
    Args:
        db: Database session
        subscription_id: ID of the subscription to remove all package mappings for
        
    Returns:
        List of deleted subscription package mappings
    """
    subscription_packages = get_packages_by_subscription(db, subscription_id)
    
    if not subscription_packages:
        return []
    
    for sp in subscription_packages:
        db.delete(sp)
    
    db.commit()
    return subscription_packages

def delete_subscription_packages_by_package(
    db: Session, package_id: int
) -> List[SubscriptionPlanPackage]:
    """
    Delete all subscription mappings for a specific package.
    
    Args:
        db: Database session
        package_id: ID of the package to remove all subscription mappings for
        
    Returns:
        List of deleted subscription package mappings
    """
    subscription_packages = get_subscriptions_by_package(db, package_id)
    
    if not subscription_packages:
        return []
    
    for sp in subscription_packages:
        db.delete(sp)
    
    db.commit()
    return subscription_packages 

def get_subscription_with_parsed_package_ids(db: Session, subscription_id: int):
    """
    Get subscription plan package with parsed package_ids from JSON.
    
    Args:
        db: Database session
        subscription_id: ID of the subscription
        
    Returns:
        The subscription package mapping with parsed package_ids field
    """
    mapping = db.query(SubscriptionPlanPackage).filter(
        SubscriptionPlanPackage.subscription_id == subscription_id,
        SubscriptionPlanPackage.package_ids.isnot(None)
    ).first()
    
    if mapping and mapping.package_ids:
        try:
            # Parse package_ids from JSON string to list of integers
            package_ids = json.loads(mapping.package_ids)
            # Add a dynamic property for easy access
            mapping.parsed_package_ids = package_ids
        except (json.JSONDecodeError, TypeError):
            logger.error(f"Error parsing package_ids for subscription {subscription_id}")
            mapping.parsed_package_ids = []
    else:
        # If mapping not found or package_ids is None
        return None
        
    return mapping 

def get_all_subscription_packages(db: Session) -> List[SubscriptionPlanPackage]:
    """
    Get all subscription-package mappings without pagination and with full relationships.
    
    Args:
        db: Database session
        
    Returns:
        List of all subscription package mappings
    """
    return (
        db.query(SubscriptionPlanPackage)
        .options(
            joinedload(SubscriptionPlanPackage.subscription)
        )
        .all()
    ) 