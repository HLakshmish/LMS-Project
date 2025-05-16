import sys
import json
from sqlalchemy.orm import Session
from app.models.models import SubscriptionPlanPackage, Subscription
from app.core.database import SessionLocal

# Create a debug function to test the subscription package creation
def debug_subscription_package():
    db = SessionLocal()
    try:
        # Print the columns in the table
        print("SubscriptionPlanPackage columns:", [c.name for c in SubscriptionPlanPackage.__table__.columns])
        
        # Try creating a subscription package with the data from the example
        subscription_id = 1
        package_ids = [1, 2]
        
        # Check if subscription exists
        subscription = db.query(Subscription).filter(Subscription.id == subscription_id).first()
        if not subscription:
            print(f"Subscription with id {subscription_id} not found")
            return
        
        print(f"Found subscription: {subscription.name}")
        
        # Test creating a new mapping
        try:
            new_mapping = SubscriptionPlanPackage(
                subscription_id=subscription_id,
                package_ids=json.dumps(package_ids)
            )
            db.add(new_mapping)
            db.commit()
            db.refresh(new_mapping)
            print(f"Successfully created mapping with id {new_mapping.id}")
            
            # Now try accessing common attributes to see if any cause errors
            print(f"Attributes: subscription_id={new_mapping.subscription_id}, package_ids={new_mapping.package_ids}")
            
            # Test loading all mappings
            mappings = db.query(SubscriptionPlanPackage).all()
            print(f"Found {len(mappings)} mappings")
            for m in mappings:
                print(f"Mapping {m.id}: subscription_id={m.subscription_id}, package_ids={m.package_ids}")
        
        except Exception as e:
            db.rollback()
            print(f"Error creating mapping: {str(e)}")
            import traceback
            traceback.print_exc()
    
    finally:
        db.close()

if __name__ == "__main__":
    debug_subscription_package() 