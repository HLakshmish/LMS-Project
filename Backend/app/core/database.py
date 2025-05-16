from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from contextlib import contextmanager
import logging
import time
import os
from dotenv import load_dotenv
import traceback
from fastapi import HTTPException, status

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)  # Change to INFO level

# Default database URL if environment variable is not set
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/lams_db")

logger.info(f"Using database URL: {DATABASE_URL}")

# Database connection configuration
DB_MAX_RETRIES = 3
DB_RETRY_INTERVAL = 1  # seconds
DB_POOL_SIZE = 20
DB_MAX_OVERFLOW = 10
DB_POOL_TIMEOUT = 30
DB_POOL_RECYCLE = 1800  # 30 minutes

def create_db_engine():
    try:
        # Create engine with optimized settings
        engine = create_engine(
            DATABASE_URL,
            pool_size=DB_POOL_SIZE,
            max_overflow=DB_MAX_OVERFLOW,
            pool_timeout=DB_POOL_TIMEOUT,
            pool_recycle=DB_POOL_RECYCLE,
            echo=False  # Disable SQL query logging
        )
        
        # Test the connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            logger.info("Database connection test successful")
        
        return engine
    except Exception as e:
        logger.error(f"Error creating database engine with {DATABASE_URL}: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Fallback to SQLite if PostgreSQL connection fails
        if 'postgresql' in DATABASE_URL:
            sqlite_url = "sqlite:///lams.db"
            logger.warning(f"Falling back to SQLite database: {sqlite_url}")
            try:
                fallback_engine = create_engine(sqlite_url)
                with fallback_engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                logger.info("SQLite fallback connection successful")
                return fallback_engine
            except Exception as sqlite_error:
                logger.error(f"SQLite fallback also failed: {str(sqlite_error)}")
        
        raise

try:
    engine = create_db_engine()
except Exception as e:
    logger.error("Failed to create database engine")
    raise

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()

# Add query timing event listener
@event.listens_for(engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    conn.info.setdefault('query_start_time', []).append(time.time())
    # Remove debug logging of queries
    pass

@event.listens_for(engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    total = time.time() - conn.info['query_start_time'].pop(-1)
    if total > 0.5:  # Log only slow queries (more than 500ms)
        logger.warning(f"Slow query detected ({total:.2f}s)")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Context manager for DB session (for use outside of FastAPI dependencies)
@contextmanager
def get_db_context():
    db = SessionLocal()
    retry_count = 0
    while retry_count < DB_MAX_RETRIES:
        try:
            # Test the connection
            db.execute(text("SELECT 1"))
            yield db
            break
        except SQLAlchemyError as e:
            retry_count += 1
            logger.error(f"Database context error (attempt {retry_count}/{DB_MAX_RETRIES}): {str(e)}")
            if retry_count == DB_MAX_RETRIES:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Database connection error after multiple retries"
                )
            time.sleep(DB_RETRY_INTERVAL)
        finally:
            db.close()

# Health check function
def check_db_connection():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        return False
