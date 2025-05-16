import logging
from fastapi import FastAPI
from app.routes import packages
from app.core.database import get_db
from app.models.models import Package
from sqlalchemy.orm import Session

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create a test app
app = FastAPI()
app.include_router(packages.router, prefix='/api/packages')

# Print all registered routes
print("\nRegistered routes in the packages router:")
for route in app.routes:
    if hasattr(route, "path"):
        print(f"Path: {route.path}, Methods: {route.methods}")

# Check the database for packages
def check_packages():
    try:
        db = next(get_db())
        packages_list = db.query(Package).all()
        print(f"\nFound {len(packages_list)} packages in the database")
        for pkg in packages_list:
            print(f"ID: {pkg.id}, Name: {pkg.name}")
    except Exception as e:
        print(f"Error querying packages: {str(e)}")

if __name__ == "__main__":
    print("Running diagnostic script...")
    try:
        check_packages()
    except Exception as e:
        print(f"Diagnostic failed: {str(e)}") 