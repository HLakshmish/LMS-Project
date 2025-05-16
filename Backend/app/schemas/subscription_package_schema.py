from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
import json
from .schemas import Package, Subscription
from pydantic import field_validator

# Base schema for subscription plan package mapping
class SubscriptionPlanPackageBase(BaseModel):
    subscription_id: int = Field(..., description="ID of the subscription plan")
    package_ids: Optional[List[int]] = Field(None, description="List of package IDs stored as JSON")

# Schema for creating a new subscription-package mapping
class SubscriptionPlanPackageCreate(SubscriptionPlanPackageBase):
    pass

# Schema for updating an existing subscription-package mapping
class SubscriptionPlanPackageUpdate(BaseModel):
    subscription_id: Optional[int] = Field(None, description="ID of the subscription plan")
    package_ids: Optional[List[int]] = Field(None, description="List of package IDs stored as JSON")

# Schema for returning subscription-package mapping data with full relationships
class SubscriptionPlanPackage(SubscriptionPlanPackageBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    subscription: Optional[Subscription] = None

    model_config = ConfigDict(from_attributes=True)
    
    @field_validator('package_ids')
    @classmethod
    def parse_package_ids(cls, v):
        # If it's a string (JSON), parse it to a list
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return None
        return v

# Schema for bulk creation of subscription-package mappings
class BulkSubscriptionPackageMapping(BaseModel):
    subscription_id: int = Field(..., description="ID of the subscription plan")
    package_ids: List[int] = Field(..., description="List of package IDs to associate with the subscription")

# Schema for subscription with packages
class SubscriptionWithPackages(BaseModel):
    subscription_id: int = Field(..., description="ID of the subscription plan")
    subscription_name: str = Field(..., description="Name of the subscription plan")
    packages: List[Package] = Field(default=[], description="List of packages associated with the subscription")

    model_config = ConfigDict(from_attributes=True) 