"""
Database seeder script for LAMS
This script populates the database with sample data for testing and development
"""
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.models.models import (
    User, UserRole, Class, Stream, Subject, Chapter, Topic, Course, CourseLevel
)
from app.core.auth import get_password_hash
import random
from datetime import datetime, timedelta

def seed_db():
    db = SessionLocal()
    try:
        print("Starting database seeding...")
        
        # Create users with different roles
        users = []
        # Only create users if none exist
        if db.query(User).count() == 0:
            print("Adding users...")
            
            # Create a superadmin
            superadmin = User(
                username="superadmin",
                email="superadmin@lams.com",
                password_hash=get_password_hash("password123"),
                role=UserRole.superadmin
            )
            db.add(superadmin)
            db.flush()  # Flush to get the ID
            users.append(superadmin)
            
            # Create an admin
            admin = User(
                username="admin",
                email="admin@lams.com",
                password_hash=get_password_hash("password123"),
                role=UserRole.admin
            )
            db.add(admin)
            db.flush()
            users.append(admin)
            
            # Create teachers
            for i in range(3):
                teacher = User(
                    username=f"teacher{i+1}",
                    email=f"teacher{i+1}@lams.com",
                    password_hash=get_password_hash("password123"),
                    role=UserRole.teacher
                )
                db.add(teacher)
                db.flush()
                users.append(teacher)
            
            # Create students
            for i in range(5):
                student = User(
                    username=f"student{i+1}",
                    email=f"student{i+1}@lams.com",
                    password_hash=get_password_hash("password123"),
                    role=UserRole.student
                )
                db.add(student)
                db.flush()
                users.append(student)
            
            print(f"Added {len(users)} users")
        else:
            # If users already exist, fetch them
            users = db.query(User).all()
            print(f"Using {len(users)} existing users")
        
        # Get a teacher user for creating content
        teacher_user = next((user for user in users if user.role == UserRole.teacher), users[0])
        
        # Create classes if none exist
        classes = []
        if db.query(Class).count() == 0:
            print("Adding classes...")
            class_data = [
                {"name": "Primary School", "description": "Classes 1-5"},
                {"name": "Middle School", "description": "Classes 6-8"},
                {"name": "High School", "description": "Classes 9-10"},
                {"name": "Senior Secondary", "description": "Classes 11-12"}
            ]
            
            for class_info in class_data:
                class_obj = Class(
                    name=class_info["name"],
                    description=class_info["description"],
                    created_by=teacher_user.id
                )
                db.add(class_obj)
                db.flush()
                classes.append(class_obj)
            
            print(f"Added {len(classes)} classes")
        else:
            # If classes already exist, fetch them
            classes = db.query(Class).all()
            print(f"Using {len(classes)} existing classes")
        
        # Create streams if none exist
        streams = []
        if db.query(Stream).count() == 0:
            print("Adding streams...")
            stream_data = [
                {"name": "Science", "description": "Science stream for senior classes", "class": "Senior Secondary"},
                {"name": "Commerce", "description": "Commerce stream for senior classes", "class": "Senior Secondary"},
                {"name": "Arts", "description": "Arts stream for senior classes", "class": "Senior Secondary"},
                {"name": "General", "description": "General studies for all classes", "class": "Primary School"},
                {"name": "General", "description": "General studies for all classes", "class": "Middle School"},
                {"name": "General", "description": "General studies for all classes", "class": "High School"}
            ]
            
            for stream_info in stream_data:
                # Find the class for this stream
                class_obj = next((c for c in classes if c.name == stream_info["class"]), classes[0])
                
                stream = Stream(
                    name=stream_info["name"],
                    description=stream_info["description"],
                    class_id=class_obj.id
                )
                db.add(stream)
                db.flush()
                streams.append(stream)
            
            print(f"Added {len(streams)} streams")
        else:
            # If streams already exist, fetch them
            streams = db.query(Stream).all()
            print(f"Using {len(streams)} existing streams")
        
        # Create subjects if none exist
        subjects = []
        if db.query(Subject).count() == 0:
            print("Adding subjects...")
            subject_data = [
                # Science stream subjects
                {"name": "Physics", "description": "Study of matter and energy", "code": "PHY101", "stream": "Science", "class": "Senior Secondary"},
                {"name": "Chemistry", "description": "Study of substances and their interactions", "code": "CHM101", "stream": "Science", "class": "Senior Secondary"},
                {"name": "Biology", "description": "Study of living organisms", "code": "BIO101", "stream": "Science", "class": "Senior Secondary"},
                
                # Commerce stream subjects
                {"name": "Accounting", "description": "Study of financial accounts", "code": "ACC101", "stream": "Commerce", "class": "Senior Secondary"},
                {"name": "Economics", "description": "Study of resource allocation", "code": "ECO101", "stream": "Commerce", "class": "Senior Secondary"},
                
                # Arts stream subjects
                {"name": "History", "description": "Study of past events", "code": "HIS101", "stream": "Arts", "class": "Senior Secondary"},
                {"name": "Literature", "description": "Study of written works", "code": "LIT101", "stream": "Arts", "class": "Senior Secondary"},
                
                # Common subjects across streams (for different classes)
                {"name": "Mathematics", "description": "Study of numbers and patterns", "code": "MAT101", "stream": "General", "class": "Primary School"},
                {"name": "Mathematics", "description": "Study of numbers and patterns", "code": "MAT201", "stream": "General", "class": "Middle School"},
                {"name": "Mathematics", "description": "Study of numbers and patterns", "code": "MAT301", "stream": "General", "class": "High School"},
                {"name": "Mathematics", "description": "Advanced study of mathematics", "code": "MAT401", "stream": "Science", "class": "Senior Secondary"},
                
                {"name": "English", "description": "Study of English language", "code": "ENG101", "stream": "General", "class": "Primary School"},
                {"name": "English", "description": "Study of English language", "code": "ENG201", "stream": "General", "class": "Middle School"},
                {"name": "English", "description": "Study of English language", "code": "ENG301", "stream": "General", "class": "High School"},
                {"name": "English", "description": "Advanced study of English", "code": "ENG401", "stream": "General", "class": "Senior Secondary"}
            ]
            
            for subject_info in subject_data:
                # Find the stream and class for this subject
                class_obj = next((c for c in classes if c.name == subject_info["class"]), classes[0])
                stream_obj = next((s for s in streams if s.name == subject_info["stream"] and s.class_id == class_obj.id), streams[0])
                
                subject = Subject(
                    name=subject_info["name"],
                    description=subject_info["description"],
                    code=subject_info["code"],
                    stream_id=stream_obj.id,
                    created_by=teacher_user.id
                )
                db.add(subject)
                db.flush()
                subjects.append(subject)
            
            print(f"Added {len(subjects)} subjects")
        else:
            # If subjects already exist, fetch them
            subjects = db.query(Subject).all()
            print(f"Using {len(subjects)} existing subjects")
        
        # Create chapters if none exist
        chapters = []
        if db.query(Chapter).count() == 0:
            print("Adding chapters...")
            
            # Create 3-5 chapters for each subject
            for subject in subjects:
                num_chapters = random.randint(3, 5)
                for i in range(num_chapters):
                    chapter = Chapter(
                        name=f"Chapter {i+1}: {subject.name} Fundamentals {i+1}",
                        description=f"Essential concepts of {subject.name} - Part {i+1}",
                        chapter_number=i+1,
                        subject_id=subject.id,
                        created_by=teacher_user.id
                    )
                    db.add(chapter)
                    db.flush()
                    chapters.append(chapter)
            
            print(f"Added {len(chapters)} chapters")
        else:
            # If chapters already exist, fetch them
            chapters = db.query(Chapter).all()
            print(f"Using {len(chapters)} existing chapters")
        
        # Create topics if none exist
        topics = []
        if db.query(Topic).count() == 0:
            print("Adding topics...")
            
            # Create 3-7 topics for each chapter
            for chapter in chapters:
                num_topics = random.randint(3, 7)
                for i in range(num_topics):
                    topic = Topic(
                        name=f"Topic {i+1}: {chapter.name} Concept {i+1}",
                        description=f"Detailed explanation of {chapter.name} concept {i+1}",
                        topic_number=i+1,
                        estimated_time=random.randint(30, 120),  # 30 to 120 minutes
                        chapter_id=chapter.id,
                        created_by=teacher_user.id
                    )
                    db.add(topic)
                    db.flush()
                    topics.append(topic)
            
            print(f"Added {len(topics)} topics")
        else:
            # If topics already exist, fetch them
            topics = db.query(Topic).all()
            print(f"Using {len(topics)} existing topics")
        
        # Create courses if none exist
        if db.query(Course).count() == 0:
            print("Adding courses...")
            
            # Create courses at different levels of the hierarchy
            courses = []
            
            # Stream-level courses
            for stream in streams:
                course = Course(
                    name=f"{stream.name} Foundation Course",
                    description=f"Comprehensive foundation course for {stream.name}",
                    duration=random.randint(40, 100),  # 40 to 100 hours
                    is_active=True,
                    stream_id=stream.id,
                    level=random.choice(list(CourseLevel)),
                    created_by=teacher_user.id
                )
                db.add(course)
                courses.append(course)
            
            # Subject-level courses
            for subject in subjects:
                course = Course(
                    name=f"{subject.name} Comprehensive Course",
                    description=f"Complete course covering all aspects of {subject.name}",
                    duration=random.randint(30, 80),  # 30 to 80 hours
                    is_active=True,
                    subject_id=subject.id,
                    level=random.choice(list(CourseLevel)),
                    created_by=teacher_user.id
                )
                db.add(course)
                courses.append(course)
            
            # Chapter-level courses
            chapter_sample = random.sample(chapters, min(len(chapters), 20))  # Take a sample of chapters
            for chapter in chapter_sample:
                course = Course(
                    name=f"{chapter.name} Detailed Study",
                    description=f"In-depth study of {chapter.name}",
                    duration=random.randint(10, 40),  # 10 to 40 hours
                    is_active=True,
                    chapter_id=chapter.id,
                    level=random.choice(list(CourseLevel)),
                    created_by=teacher_user.id
                )
                db.add(course)
                courses.append(course)
            
            # Topic-level courses
            topic_sample = random.sample(topics, min(len(topics), 30))  # Take a sample of topics
            for topic in topic_sample:
                course = Course(
                    name=f"{topic.name} Mastery",
                    description=f"Mastery course for {topic.name}",
                    duration=random.randint(5, 15),  # 5 to 15 hours
                    is_active=True,
                    topic_id=topic.id,
                    level=random.choice(list(CourseLevel)),
                    created_by=teacher_user.id
                )
                db.add(course)
                courses.append(course)
            
            print(f"Added {len(courses)} courses")
        else:
            print(f"Using {db.query(Course).count()} existing courses")
        
        # Commit all changes
        db.commit()
        print("Database seeding completed successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_db() 