"""
Database initialization script for LAMS
"""
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.models.models import User, UserRole, Subscription, SubscriptionStatus
from app.core.auth import get_password_hash

# Create all tables
Base.metadata.create_all(bind=engine)

def init_db():
    db = SessionLocal()
    try:
        # Check if we already have a superadmin
        superadmin = db.query(User).filter(User.role == UserRole.superadmin).first()
        if not superadmin:
            # Create default superadmin
            superadmin = User(
                username="admin",
                email="admin@lams.com",
                password_hash=get_password_hash("password"),  # Hashing password properly
                role=UserRole.admin
            )
            db.add(superadmin)
            
        # Check if we have a default subscription
        free_subscription = db.query(Subscription).filter(Subscription.name == "Free").first()
        if not free_subscription:
            # Create default free subscription
            free_subscription = Subscription(
                name="Free",
                description="Free subscription with limited features",
                duration_days=30,
                price=0.0,
                max_exams=5,
                features="Access to basic exams and content",
                is_active=True
            )
            db.add(free_subscription)
            
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error initializing database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully")
