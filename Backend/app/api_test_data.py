"""
Script to populate database with test data for API testing
"""
import sys
from pathlib import Path

# Add the parent directory to sys.path
file_path = Path(__file__).resolve()
parent_dir = str(file_path.parent.parent)
sys.path.append(parent_dir)

from app.core.database import get_db
from app.models.models import User, Class, Stream, UserRole
from app.core.auth import get_password_hash
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_test_data():
    """Create test data for the application"""
    try:
        db = next(get_db())
        
        # Create admin user if it doesn't exist
        admin = db.query(User).filter(User.role == UserRole.admin).first()
        if not admin:
            logger.info("Creating admin user")
            admin = User(
                username="admin",
                email="admin@example.com",
                password_hash=get_password_hash("admin123"),
                role=UserRole.admin
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            logger.info(f"Created admin user with ID: {admin.id}")
        
        # Create test class if it doesn't exist
        test_class = db.query(Class).filter(Class.name == "Test Class").first()
        if not test_class:
            logger.info("Creating test class")
            test_class = Class(
                name="Test Class",
                description="A test class for API testing",
                created_by=admin.id
            )
            db.add(test_class)
            db.commit()
            db.refresh(test_class)
            logger.info(f"Created test class with ID: {test_class.id}")
        
        # Create test stream if it doesn't exist
        test_stream = db.query(Stream).filter(Stream.name == "Test Stream").first()
        if not test_stream:
            logger.info("Creating test stream")
            test_stream = Stream(
                name="Test Stream",
                description="A test stream for API testing",
                class_id=test_class.id
            )
            db.add(test_stream)
            db.commit()
            db.refresh(test_stream)
            logger.info(f"Created test stream with ID: {test_stream.id}")
            
        logger.info("Test data created successfully")
        
        # Print summary of created data
        print(f"\nTest Data Summary:")
        print(f"Admin User ID: {admin.id}")
        print(f"Test Class ID: {test_class.id}")
        print(f"Test Stream ID: {test_stream.id}")
        
    except Exception as e:
        logger.error(f"Error creating test data: {str(e)}")
        db.rollback()
        raise

if __name__ == "__main__":
    create_test_data() 