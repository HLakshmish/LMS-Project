from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import logging
from ..models.models import Package, Course, PackageCourse, User, Stream, Subject, Chapter, Topic, Class
from ..schemas.schemas import PackageCreate, PackageUpdate, SimpleCourseRef

logger = logging.getLogger(__name__)

def get_package(db: Session, package_id: int) -> Optional[Package]:
    """
    Get a package by ID with joined courses and creator
    """
    return db.query(Package).filter(Package.id == package_id).first()

def load_course_relationships(db: Session, course):
    """Helper function to load all relationships for a course"""
    try:
        # Load creator
        creator = db.query(User).filter(User.id == course.created_by).first()
        setattr(course, 'creator', creator)
        
        # Load stream and its class
        if course.stream_id:
            stream = db.query(Stream).filter(Stream.id == course.stream_id).first()
            if stream:
                # Load stream's class if it exists
                if hasattr(stream, 'class_id') and stream.class_id:
                    class_ = db.query(Class).filter(Class.id == stream.class_id).first()
                    setattr(stream, 'class_', class_)
                
                setattr(course, 'stream', stream)
        
        # Load subject and its stream
        if course.subject_id:
            subject = db.query(Subject).filter(Subject.id == course.subject_id).first()
            if subject:
                # Load subject's stream
                if hasattr(subject, 'stream_id') and subject.stream_id:
                    stream = db.query(Stream).filter(Stream.id == subject.stream_id).first()
                    
                    # Load stream's class if it exists
                    if stream and hasattr(stream, 'class_id') and stream.class_id:
                        class_ = db.query(Class).filter(Class.id == stream.class_id).first()
                        setattr(stream, 'class_', class_)
                    
                    setattr(subject, 'stream', stream)
                
                setattr(course, 'subject', subject)
        
        # Load chapter and its subject
        if course.chapter_id:
            chapter = db.query(Chapter).filter(Chapter.id == course.chapter_id).first()
            if chapter:
                # Load chapter's subject
                if hasattr(chapter, 'subject_id') and chapter.subject_id:
                    subject = db.query(Subject).filter(Subject.id == chapter.subject_id).first()
                    
                    # Load subject's stream
                    if subject and hasattr(subject, 'stream_id') and subject.stream_id:
                        stream = db.query(Stream).filter(Stream.id == subject.stream_id).first()
                        setattr(subject, 'stream', stream)
                    
                    setattr(chapter, 'subject', subject)
                
                setattr(course, 'chapter', chapter)
        
        # Load topic and its chapter
        if course.topic_id:
            topic = db.query(Topic).filter(Topic.id == course.topic_id).first()
            if topic:
                # Load topic's chapter
                if hasattr(topic, 'chapter_id') and topic.chapter_id:
                    chapter = db.query(Chapter).filter(Chapter.id == topic.chapter_id).first()
                    
                    # Load chapter's subject
                    if chapter and hasattr(chapter, 'subject_id') and chapter.subject_id:
                        subject = db.query(Subject).filter(Subject.id == chapter.subject_id).first()
                        setattr(chapter, 'subject', subject)
                    
                    setattr(topic, 'chapter', chapter)
                
                setattr(course, 'topic', topic)
    
    except Exception as e:
        logger.error(f"Error loading relationships for course {course.id}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
    
    return course

def get_package_with_courses(db: Session, package_id: int) -> Optional[Package]:
    """
    Get a package by ID with preloaded courses and all relationships
    """
    package = db.query(Package).filter(Package.id == package_id).first()
    
    if package:
        # Load the creator
        creator = db.query(User).filter(User.id == package.created_by).first()
        setattr(package, 'creator', creator)
        
        # Load the courses with full information
        course_ids = db.query(PackageCourse.course_id).filter(
            PackageCourse.package_id == package_id
        ).all()
        
        course_ids = [c[0] for c in course_ids]
        courses = []
        
        if course_ids:
            # Load each course with all its relationships
            for course_id in course_ids:
                course = db.query(Course).filter(Course.id == course_id).first()
                if course:
                    # Load all relationships
                    course = load_course_relationships(db, course)
                    courses.append(course)
        
        # Set courses attribute
        setattr(package, 'courses', courses)
    
    return package

def get_packages(
    db: Session, 
    skip: int = 0, 
    limit: int = 100
) -> List[Package]:
    """
    Get all packages with pagination and full course information
    """
    packages = db.query(Package).offset(skip).limit(limit).all()
    
    # Load relationships for each package
    for package in packages:
        try:
            # Load the creator
            creator = db.query(User).filter(User.id == package.created_by).first()
            setattr(package, 'creator', creator)
            
            # Load the courses with full information
            course_ids = db.query(PackageCourse.course_id).filter(
                PackageCourse.package_id == package.id
            ).all()
            
            course_ids = [c[0] for c in course_ids]
            courses = []
            
            if course_ids:
                # Load each course with all its relationships
                for course_id in course_ids:
                    course = db.query(Course).filter(Course.id == course_id).first()
                    if course:
                        # Load all relationships
                        course = load_course_relationships(db, course)
                        courses.append(course)
            
            # Set courses attribute
            setattr(package, 'courses', courses)
        except Exception as e:
            logger.error(f"Error loading relationships for package {package.id}: {str(e)}")
    
    return packages

def create_package(db: Session, package: PackageCreate, user_id: int) -> Package:
    """
    Create a new package with associated courses
    """
    # Create the package
    db_package = Package(
        name=package.name,
        description=package.description,
        created_by=user_id
    )
    db.add(db_package)
    db.commit()
    db.refresh(db_package)

    # Add course associations
    for course_id in package.course_ids:
        db_package_course = PackageCourse(
            package_id=db_package.id,
            course_id=course_id
        )
        db.add(db_package_course)
    
    db.commit()
    db.refresh(db_package)
    return db_package

def update_package(db: Session, package_id: int, package: PackageUpdate) -> Optional[Package]:
    """
    Update a package and its course associations
    """
    db_package = get_package(db, package_id)
    if db_package:
        # Update package fields
        update_data = package.model_dump(exclude={'course_ids'}, exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_package, field, value)

        # Update course associations if provided
        if package.course_ids is not None:
            # Remove existing associations
            db.query(PackageCourse).filter(PackageCourse.package_id == package_id).delete()
            
            # Add new associations
            for course_id in package.course_ids:
                db_package_course = PackageCourse(
                    package_id=package_id,
                    course_id=course_id
                )
                db.add(db_package_course)

        db.commit()
        db.refresh(db_package)
    return db_package

def delete_package(db: Session, package_id: int) -> Optional[Package]:
    """
    Delete a package and its course associations
    """
    db_package = get_package(db, package_id)
    if db_package:
        # The course associations will be automatically deleted due to cascade
        db.delete(db_package)
        db.commit()
        return db_package
    return None

def get_packages_by_user(
    db: Session, 
    user_id: int, 
    skip: int = 0, 
    limit: int = 100
) -> List[Package]:
    """
    Get all packages created by a specific user
    """
    return db.query(Package).filter(Package.created_by == user_id).offset(skip).limit(limit).all()

def get_packages_by_ids(
    db: Session, 
    package_ids: List[int]
) -> List[Package]:
    """
    Get packages by their IDs
    
    Args:
        db: Database session
        package_ids: List of package IDs to retrieve
        
    Returns:
        List of Package objects corresponding to the provided IDs
    """
    if not package_ids:
        return []
        
    packages = db.query(Package).filter(Package.id.in_(package_ids)).all()
    
    # Load relationships for each package
    for package in packages:
        try:
            # Load the creator
            creator = db.query(User).filter(User.id == package.created_by).first()
            setattr(package, 'creator', creator)
            
            # Load the courses with full information
            course_ids = db.query(PackageCourse.course_id).filter(
                PackageCourse.package_id == package.id
            ).all()
            
            course_ids = [c[0] for c in course_ids]
            courses = []
            
            if course_ids:
                # Load each course with all its relationships
                for course_id in course_ids:
                    course = db.query(Course).filter(Course.id == course_id).first()
                    if course:
                        # Load all relationships
                        course = load_course_relationships(db, course)
                        courses.append(course)
            
            # Set courses attribute
            setattr(package, 'courses', courses)
        except Exception as e:
            logger.error(f"Error loading relationships for package {package.id}: {str(e)}")
    
    return packages 