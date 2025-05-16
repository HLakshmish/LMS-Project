from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import logging
import json

from ..core.database import get_db
from ..core.auth import get_current_user, check_admin_permission
from ..models.models import User, UserRole, SubscriptionPlanPackage as SubscriptionPlanPackageModel, Subscription
from ..schemas.subscription_package_schema import (
    SubscriptionPlanPackage, 
    SubscriptionPlanPackageCreate, 
    SubscriptionPlanPackageUpdate,
    BulkSubscriptionPackageMapping,
    SubscriptionWithPackages
)
from ..crud import subscription_package as crud_subscription_package
from ..crud import subscription as crud_subscription
from ..crud import package as crud_packages

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    tags=["subscription packages"],
    responses={
        404: {"description": "Not found"},
        401: {"description": "Not authenticated"},
        403: {"description": "Not enough permissions (Admin only)"}
    },
)

@router.post("/", 
    summary="Create a subscription-package mapping"
)
def create_subscription_package(
    subscription_package: SubscriptionPlanPackageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new mapping between a subscription plan and multiple packages.
    
    All package IDs are stored as a JSON array in the database.
    Admin privileges are required for this operation.
    Returns the created mapping with full package details.
    """
    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not authorized to create subscription-package mappings")
    
    logger.info(f"Creating subscription-package mapping: subscription_id={subscription_package.subscription_id}, package_ids={subscription_package.package_ids}")
    
    # Use the CRUD function but convert to dict for response
    db_mapping = crud_subscription_package.create_subscription_package(
        db=db,
        subscription_package=subscription_package
    )
    
    # Return a dictionary with parsed package_ids and package details
    package_ids_list = []
    packages_details = []
    
    if db_mapping.package_ids:
        try:
            package_ids_list = json.loads(db_mapping.package_ids)
            
            # Get details for each package
            if package_ids_list:
                try:
                    packages = crud_packages.get_packages_by_ids(db=db, package_ids=package_ids_list)
                    packages_details = [
                        {
                            "id": package.id,
                            "name": package.name,
                            "description": package.description,
                            "is_active": package.is_active,
                            "created_at": package.created_at,
                            "updated_at": package.updated_at
                        } 
                        for package in packages
                    ]
                    
                    # Log if some package IDs were not found
                    found_ids = [p.id for p in packages]
                    missing_ids = [pid for pid in package_ids_list if pid not in found_ids]
                    if missing_ids:
                        logger.warning(f"Some package IDs not found: {missing_ids}")
                except Exception as e:
                    logger.error(f"Error retrieving package details: {str(e)}")
                    # Continue with empty package details rather than failing completely
                    packages_details = []
        except json.JSONDecodeError:
            pass
    
    return {
        "id": db_mapping.id,
        "subscription_id": db_mapping.subscription_id,
        "package_ids": package_ids_list,
        "packages": packages_details,  # Add the package details
        "created_at": db_mapping.created_at,
        "updated_at": db_mapping.updated_at
    }

@router.post("/bulk", 
    summary="Map multiple packages to a subscription plan in a single record"
)
def bulk_create_subscription_package_mappings(
    data: BulkSubscriptionPackageMapping,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a single mapping between a subscription plan and multiple packages.
    
    All package IDs are stored as a JSON array in the database.
    Admin privileges are required for this operation.
    Returns the created or updated mapping with full package details.
    """
    try:
        if current_user.role not in ["admin", "superadmin"]:
            raise HTTPException(status_code=403, detail="Not authorized to create subscription-package mappings")
        
        logger.info(f"Creating bulk subscription-package mapping: subscription_id={data.subscription_id}, package_ids={data.package_ids}")
        
        # Verify subscription exists
        subscription = db.query(Subscription).filter(
            Subscription.id == data.subscription_id
        ).first()
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subscription with id {data.subscription_id} not found"
            )
        
        # Check if a mapping already exists for this subscription
        existing_mapping = db.query(SubscriptionPlanPackageModel).filter(
            SubscriptionPlanPackageModel.subscription_id == data.subscription_id
        ).first()
        
        # Get details for each package
        packages = crud_packages.get_packages_by_ids(db=db, package_ids=data.package_ids)
        packages_details = [
            {
                "id": package.id,
                "name": package.name,
                "description": package.description,
                "is_active": package.is_active,
                "created_at": package.created_at,
                "updated_at": package.updated_at
            } 
            for package in packages
        ]
        
        if existing_mapping:
            # Update existing mapping
            logger.info(f"Updating existing mapping with id {existing_mapping.id}")
            existing_mapping.package_ids = json.dumps(data.package_ids)
            db.commit()
            db.refresh(existing_mapping)
            
            # Return a dictionary with parsed package_ids and package details
            return {
                "id": existing_mapping.id,
                "subscription_id": existing_mapping.subscription_id,
                "package_ids": data.package_ids,  # Use the original list
                "packages": packages_details,  # Add the package details
                "created_at": existing_mapping.created_at,
                "updated_at": existing_mapping.updated_at
            }
        else:
            # Create new mapping
            logger.info("Creating new mapping")
            new_mapping = SubscriptionPlanPackageModel(
                subscription_id=data.subscription_id,
                package_ids=json.dumps(data.package_ids)
            )
            db.add(new_mapping)
            db.commit()
            db.refresh(new_mapping)
            
            # Return a dictionary with parsed package_ids and package details
            return {
                "id": new_mapping.id,
                "subscription_id": new_mapping.subscription_id,
                "package_ids": data.package_ids,  # Use the original list
                "packages": packages_details,  # Add the package details
                "created_at": new_mapping.created_at,
                "updated_at": new_mapping.updated_at
            }
    except Exception as e:
        db.rollback()
        logger.error(f"Error in bulk_create_subscription_package_mappings: {str(e)}", exc_info=True)
        # Return a detailed error for debugging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing request: {str(e)}"
    )

@router.get("/", 
    summary="Get all subscription-package mappings"
)
def get_subscription_package_mappings(
    skip: int = Query(None, ge=0, description="Number of mappings to skip (set to null to retrieve all)"),
    limit: int = Query(None, ge=1, le=1000, description="Maximum number of mappings to return (set to null to retrieve all)"),
    subscription_id: Optional[int] = Query(None, description="Filter by subscription ID"),
    package_id: Optional[int] = Query(None, description="Filter by package ID (searches within JSON arrays)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all subscription-package mappings with optional pagination and filtering.
    
    - When filtering by subscription_id, returns all mappings for that subscription
    - When filtering by package_id, searches for mappings where the package_id is in the package_ids JSON array
    - Returns full details of packages in the package_ids array
    - To get all data without pagination, don't provide skip and limit parameters
    """
    logger.info(f"Fetching subscription-package mappings: subscription_id={subscription_id}, package_id={package_id}, skip={skip}, limit={limit}")
    
    # Get mappings from database
    if subscription_id is not None:
        mappings = crud_subscription_package.get_packages_by_subscription(db=db, subscription_id=subscription_id)
    elif package_id is not None:
        mappings = crud_subscription_package.get_subscriptions_by_package(db=db, package_id=package_id)
    else:
        if skip is None and limit is None:
            # Retrieve all mappings without pagination
            mappings = crud_subscription_package.get_all_subscription_packages(db=db)
            logger.info(f"Retrieving all {len(mappings)} subscription-package mappings")
        else:
            # Use default values for pagination if only one parameter is provided
            skip = skip if skip is not None else 0
            limit = limit if limit is not None else 100
            mappings = crud_subscription_package.get_subscription_packages(db=db, skip=skip, limit=limit)
    
    # Convert each mapping to a dict with parsed package_ids
    result = []
    for mapping in mappings:
        package_ids_list = []
        packages_details = []
        
        if mapping.package_ids:
            try:
                package_ids_list = json.loads(mapping.package_ids)
                
                # Get details for each package
                if package_ids_list:
                    try:
                        packages = crud_packages.get_packages_by_ids(db=db, package_ids=package_ids_list)
                        packages_details = [
                            {
                                "id": package.id,
                                "name": package.name,
                                "description": package.description,
                                "is_active": package.is_active,
                                "created_at": package.created_at,
                                "updated_at": package.updated_at
                            } 
                            for package in packages
                        ]
                        
                        # Log if some package IDs were not found
                        found_ids = [p.id for p in packages]
                        missing_ids = [pid for pid in package_ids_list if pid not in found_ids]
                        if missing_ids:
                            logger.warning(f"Some package IDs not found: {missing_ids}")
                    except Exception as e:
                        logger.error(f"Error retrieving package details: {str(e)}")
                        # Continue with empty package details rather than failing completely
                        packages_details = []
            except json.JSONDecodeError:
                pass
        
        mapping_dict = {
            "id": mapping.id,
            "subscription_id": mapping.subscription_id,
            "package_ids": package_ids_list,
            "packages": packages_details,  # Add the package details
            "created_at": mapping.created_at,
            "updated_at": mapping.updated_at,
            "subscription": mapping.subscription
        }
        result.append(mapping_dict)
    
    return result

@router.get("/{mapping_id}", 
    summary="Get a specific subscription-package mapping"
)
def get_subscription_package_mapping(
    mapping_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get details of a specific subscription-package mapping by its ID.
    Includes full details of each package in the package_ids array.
    """
    db_mapping = crud_subscription_package.get_subscription_package(db, mapping_id=mapping_id)
    if not db_mapping:
        raise HTTPException(status_code=404, detail="Subscription-package mapping not found")
    
    # Return a dictionary with parsed package_ids and package details
    package_ids_list = []
    packages_details = []
    
    if db_mapping.package_ids:
        try:
            package_ids_list = json.loads(db_mapping.package_ids)
            
            # Get details for each package
            if package_ids_list:
                try:
                    packages = crud_packages.get_packages_by_ids(db=db, package_ids=package_ids_list)
                    packages_details = [
                        {
                            "id": package.id,
                            "name": package.name,
                            "description": package.description,
                            "is_active": package.is_active,
                            "created_at": package.created_at,
                            "updated_at": package.updated_at
                        } 
                        for package in packages
                    ]
                    
                    # Log if some package IDs were not found
                    found_ids = [p.id for p in packages]
                    missing_ids = [pid for pid in package_ids_list if pid not in found_ids]
                    if missing_ids:
                        logger.warning(f"Some package IDs not found: {missing_ids}")
                except Exception as e:
                    logger.error(f"Error retrieving package details: {str(e)}")
                    # Continue with empty package details rather than failing completely
                    packages_details = []
        except json.JSONDecodeError:
            pass
    
    return {
        "id": db_mapping.id,
        "subscription_id": db_mapping.subscription_id,
        "package_ids": package_ids_list,
        "packages": packages_details,  # Add the package details
        "created_at": db_mapping.created_at,
        "updated_at": db_mapping.updated_at,
        "subscription": db_mapping.subscription
    }

@router.delete("/{mapping_id}", 
    summary="Delete a subscription-package mapping"
)
def delete_subscription_package_mapping(
    mapping_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission)
):
    """
    Delete a specific subscription-package mapping.
    Admin privileges required.
    Returns the deleted mapping with full package details.
    """
    logger.info(f"Deleting subscription-package mapping {mapping_id}")
    db_mapping = crud_subscription_package.delete_subscription_package(db, mapping_id=mapping_id)
    if not db_mapping:
        raise HTTPException(status_code=404, detail="Subscription-package mapping not found")
    
    # Return a dictionary with parsed package_ids and package details
    package_ids_list = []
    packages_details = []
    
    if db_mapping.package_ids:
        try:
            package_ids_list = json.loads(db_mapping.package_ids)
            
            # Get details for each package
            if package_ids_list:
                try:
                    packages = crud_packages.get_packages_by_ids(db=db, package_ids=package_ids_list)
                    packages_details = [
                        {
                            "id": package.id,
                            "name": package.name,
                            "description": package.description,
                            "is_active": package.is_active,
                            "created_at": package.created_at,
                            "updated_at": package.updated_at
                        } 
                        for package in packages
                    ]
                    
                    # Log if some package IDs were not found
                    found_ids = [p.id for p in packages]
                    missing_ids = [pid for pid in package_ids_list if pid not in found_ids]
                    if missing_ids:
                        logger.warning(f"Some package IDs not found: {missing_ids}")
                except Exception as e:
                    logger.error(f"Error retrieving package details: {str(e)}")
                    # Continue with empty package details rather than failing completely
                    packages_details = []
        except json.JSONDecodeError:
            pass
    
    return {
        "id": db_mapping.id,
        "subscription_id": db_mapping.subscription_id,
        "package_ids": package_ids_list,
        "packages": packages_details,  # Add the package details
        "created_at": db_mapping.created_at,
        "updated_at": db_mapping.updated_at,
        "subscription": db_mapping.subscription
    }

@router.delete("/subscription/{subscription_id}", 
    summary="Delete all package mappings for a subscription"
)
def delete_subscription_package_mappings(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission)
):
    """
    Delete all package mappings for a specific subscription.
    Admin privileges required.
    """
    logger.info(f"Deleting all package mappings for subscription {subscription_id}")
    mappings = crud_subscription_package.delete_subscription_packages_by_subscription(db, subscription_id=subscription_id)
    return {"detail": f"Deleted {len(mappings)} package mappings for subscription {subscription_id}"} 

@router.get("/subscription/{subscription_id}/packages",
    summary="Get packages for a subscription from the JSON array"
)
def get_subscription_packages_json(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all package IDs associated with a subscription, from the JSON array storage.
    
    This endpoint retrieves packages stored in the new JSON format with full package details.
    """
    logger.info(f"Fetching packages for subscription {subscription_id} from JSON array")
    
    mapping = crud_subscription_package.get_subscription_with_parsed_package_ids(db, subscription_id=subscription_id)
    
    if not mapping:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No packages found for subscription with id {subscription_id}"
        )
    
    # Get details for each package
    packages_details = []
    if mapping.parsed_package_ids:
        try:
            packages = crud_packages.get_packages_by_ids(db=db, package_ids=mapping.parsed_package_ids)
            packages_details = [
                {
                    "id": package.id,
                    "name": package.name,
                    "description": package.description,
                    "is_active": package.is_active,
                    "created_at": package.created_at,
                    "updated_at": package.updated_at
                } 
                for package in packages
            ]
            
            # Log if some package IDs were not found
            found_ids = [p.id for p in packages]
            missing_ids = [pid for pid in mapping.parsed_package_ids if pid not in found_ids]
            if missing_ids:
                logger.warning(f"Some package IDs not found: {missing_ids}")
        except Exception as e:
            logger.error(f"Error retrieving package details: {str(e)}")
            # Continue with empty package details rather than failing completely
            packages_details = []
    
    # Return the parsed package IDs, package details, and the full mapping
    return {
        "subscription_id": subscription_id,
        "package_ids": mapping.parsed_package_ids,
        "packages": packages_details,  # Add the package details
        "mapping_id": mapping.id,
        "created_at": mapping.created_at
    }

@router.put("/{mapping_id}", 
    summary="Update a subscription-package mapping"
)
def update_subscription_package(
    mapping_id: int,
    subscription_package: SubscriptionPlanPackageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing subscription-package mapping.
    
    The package_ids field can be updated to modify the packages associated with this subscription.
    Admin privileges are required for this operation.
    Returns the updated mapping with full package details.
    """
    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not authorized to update subscription-package mappings")
    
    db_subscription_package = crud_subscription_package.get_subscription_package(db, mapping_id=mapping_id)
    if db_subscription_package is None:
        raise HTTPException(status_code=404, detail="Subscription-package mapping not found")
    
    logger.info(f"Updating subscription-package mapping: id={mapping_id}, data={subscription_package}")
    
    # Use the CRUD function but convert to dict for response
    db_mapping = crud_subscription_package.update_subscription_package(
        db=db,
        mapping_id=mapping_id,
        subscription_package_update=subscription_package
    )
    
    # Return a dictionary with parsed package_ids and package details
    package_ids_list = []
    packages_details = []
    
    if db_mapping.package_ids:
        try:
            package_ids_list = json.loads(db_mapping.package_ids)
            
            # Get details for each package
            if package_ids_list:
                try:
                    packages = crud_packages.get_packages_by_ids(db=db, package_ids=package_ids_list)
                    packages_details = [
                        {
                            "id": package.id,
                            "name": package.name,
                            "description": package.description,
                            "is_active": package.is_active,
                            "created_at": package.created_at,
                            "updated_at": package.updated_at
                        } 
                        for package in packages
                    ]
                    
                    # Log if some package IDs were not found
                    found_ids = [p.id for p in packages]
                    missing_ids = [pid for pid in package_ids_list if pid not in found_ids]
                    if missing_ids:
                        logger.warning(f"Some package IDs not found: {missing_ids}")
                except Exception as e:
                    logger.error(f"Error retrieving package details: {str(e)}")
                    # Continue with empty package details rather than failing completely
                    packages_details = []
        except json.JSONDecodeError:
            pass
    
    return {
        "id": db_mapping.id,
        "subscription_id": db_mapping.subscription_id,
        "package_ids": package_ids_list,
        "packages": packages_details,  # Add the package details
        "created_at": db_mapping.created_at,
        "updated_at": db_mapping.updated_at,
        "subscription": db_mapping.subscription
    } 