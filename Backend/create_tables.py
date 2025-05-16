import os
import sys
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("table-creator")

# Load environment variables
load_dotenv()

# Verify PostgreSQL connection string
db_url = os.environ.get("DATABASE_URL", "")
if not db_url:
    logger.error("DATABASE_URL environment variable not set")
    sys.exit(1)

if not db_url.startswith("postgresql://"):
    logger.error("This script is intended for PostgreSQL databases only")
    sys.exit(1)

# Import SQLAlchemy components after environment setup
from app.core.database import Base, engine
from app.models.models import (
    User, Course, Subject, Chapter, Topic,
    Question, Answer, Exam, ExamQuestion, 
    StudentExam, StudentAnswer, Subscription,
    UserSubscription, ContentItem, Stream, Class
)

def create_tables():
    logger.info("Creating database tables...")
    try:
        # This will create all tables defined in the models
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        sys.exit(1)

def initialize_default_data():
    # Import here to avoid circular imports
    from app.core.init_db import init_db
    
    logger.info("Initializing default data...")
    try:
        init_db()
        logger.info("Default data initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing default data: {e}")
        sys.exit(1)

if __name__ == "__main__":
    logger.info("Starting database setup process")
    
    # Create tables
    create_tables()
    
    # Initialize default data
    initialize_default_data()
    
    logger.info("Database setup completed successfully")
    
    # Print table list for verification
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    logger.info("Created tables:")
    for table in tables:
        logger.info(f"  - {table}") 