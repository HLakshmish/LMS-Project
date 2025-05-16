import sys
import logging
from sqlalchemy.orm import Session
from pydantic import ValidationError

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import models and schemas
from app.core.database import get_db
from app.models.models import Package, PackageCourse, Course, User
from app.schemas.schemas import Package as PackageSchema

def debug_packages():
    """Debug packages and their serialization"""
    try:
        # Get a database session
        db = next(get_db())
        
        # Query packages
        packages = db.query(Package).all()
        print(f"Found {len(packages)} packages in database")
        
        # Test serialization of each package
        for pkg in packages:
            print(f"\nPackage ID: {pkg.id}, Name: {pkg.name}")
            
            # Check creator
            if hasattr(pkg, 'created_by'):
                creator = db.query(User).filter(User.id == pkg.created_by).first()
                print(f"Creator: {creator.username if creator else 'None'}")
            
            # Check courses
            package_courses = db.query(PackageCourse).filter(PackageCourse.package_id == pkg.id).all()
            print(f"Associated courses: {len(package_courses)}")
            
            for pc in package_courses:
                course = db.query(Course).filter(Course.id == pc.course_id).first()
                print(f"  - Course ID: {pc.course_id}, Name: {course.name if course else 'Unknown'}")
            
            # Try to convert to Pydantic model
            try:
                # Print the schema definition
                print(f"Package Schema fields: {PackageSchema.__fields__.keys()}")
                
                # Get the creator and courses
                creator = db.query(User).filter(User.id == pkg.created_by).first()
                courses = []
                for pc in package_courses:
                    course = db.query(Course).filter(Course.id == pc.course_id).first()
                    if course:
                        courses.append(course)
                
                # Build a dict representation
                pkg_dict = {
                    "id": pkg.id,
                    "name": pkg.name,
                    "description": pkg.description,
                    "created_by": pkg.created_by,
                    "created_at": pkg.created_at,
                    "updated_at": pkg.updated_at,
                    "creator": creator,
                    "courses": courses
                }
                
                print("Package dict representation:", pkg_dict)
                
                # Try to create a schema instance
                pkg_schema = PackageSchema.from_orm(pkg)
                print("Successfully converted to schema")
                
            except ValidationError as e:
                print(f"Validation error: {e}")
            except Exception as e:
                print(f"Error during serialization: {e}")
        
    except Exception as e:
        print(f"Error debugging packages: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("Running package debugging script...")
    debug_packages() 