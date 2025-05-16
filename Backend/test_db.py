from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./lams.db")

def test_connection():
    try:
        # Create engine
        engine = create_engine(DATABASE_URL)
        
        # Try to connect and execute a simple query
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print("Database connection successful!")
            
            # Try to query the users table
            result = connection.execute(text("SELECT * FROM users LIMIT 1"))
            users = result.fetchall()
            if users:
                print("Found users in database:", len(users))
            else:
                print("No users found in database")
            
    except Exception as e:
        print(f"Error connecting to database: {e}")

if __name__ == "__main__":
    test_connection() 