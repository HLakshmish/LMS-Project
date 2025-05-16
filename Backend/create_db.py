import psycopg2
from psycopg2 import sql
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get connection parameters from environment
db_url = os.environ.get("DATABASE_URL", "")
print(f"Database URL from environment: {db_url}")

if not db_url.startswith("postgresql://"):
    print("Error: Only PostgreSQL URLs are supported")
    exit(1)

# Parse the database URL
# Format: postgresql://user:password@host:port/dbname
parts = db_url.replace("postgresql://", "").split("@")
if len(parts) != 2:
    print("Error: Invalid PostgreSQL URL format")
    exit(1)

auth_part = parts[0].split(":")
host_part = parts[1].split("/")

user = auth_part[0]
password = auth_part[1] if len(auth_part) > 1 else ""
host_port = host_part[0].split(":")
host = host_port[0]
port = host_port[1] if len(host_port) > 1 else "5432"
dbname = host_part[1] if len(host_part) > 1 and host_part[1] else "lms_new"

print(f"Preparing to create database: {dbname}")

# Connect to PostgreSQL server
try:
    # Connect to default database (postgres)
    conn = psycopg2.connect(
        user=user,
        password=password,
        host=host,
        port=port,
        dbname="postgres"
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    # Check if database exists
    cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s", (dbname,))
    exists = cursor.fetchone()
    
    # Create database if it doesn't exist
    if not exists:
        cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(dbname)))
        print(f"Database {dbname} created successfully")
    else:
        print(f"Database {dbname} already exists")
    
    cursor.close()
    conn.close()
    print("Connection to PostgreSQL closed")
    
except Exception as e:
    print(f"Error creating database: {e}") 