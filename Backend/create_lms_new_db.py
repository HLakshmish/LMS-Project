import psycopg2
from psycopg2 import sql
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Database parameters - directly specified
user = "postgres"
password = "Password"
host = "localhost"
port = "5432"
dbname = "lms_new"

print(f"Attempting to create database: {dbname}")

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