import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine, get_db
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from typing import Generator

# Set up test database
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test.db"

test_engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Create test client
client = TestClient(app)

# Override the get_db dependency
def override_get_db() -> Generator[Session, None, None]:
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# Setup and teardown for each test
@pytest.fixture(scope="function")
def test_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

# Test fixtures for authenticated requests
@pytest.fixture(scope="function")
def teacher_token(test_db):
    # Register a teacher user
    client.post(
        "/api/auth/register",
        json={
            "name": "Teacher User",
            "email": "teacher@example.com",
            "username": "teacheruser",
            "password": "password123",
            "role": "teacher"
        },
    )
    
    # Login and get token
    login_response = client.post(
        "/api/auth/login",
        data={
            "username": "teacher@example.com",
            "password": "password123"
        },
    )
    return login_response.json()["access_token"]

# Test fixtures for course and subject
@pytest.fixture(scope="function")
def course_id(test_db, teacher_token):
    # Create a course
    course_response = client.post(
        "/api/courses/",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "title": "Test Course",
            "description": "This is a test course",
            "thumbnail": "https://example.com/thumbnail.jpg"
        },
    )
    return course_response.json()["id"]

# Test exam creation
def test_create_exam(test_db, teacher_token, course_id):
    # Create a subject first
    subject_response = client.post(
        "/api/subjects/",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "name": "Test Subject",
            "description": "This is a test subject",
            "course_id": course_id
        },
    )
    subject_id = subject_response.json()["id"]
    
    # Create an exam
    response = client.post(
        "/api/exams/",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "title": "Test Exam",
            "description": "This is a test exam",
            "duration": 60,
            "total_marks": 100,
            "passing_percentage": 60,
            "start_date": "2025-05-01T10:00:00Z",
            "end_date": "2025-05-01T11:00:00Z",
            "is_active": True,
            "subject_id": subject_id
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Exam"
    assert data["duration"] == 60
    assert data["total_marks"] == 100
    assert "id" in data
    
    return data["id"]

# Test exam retrieval
def test_get_exams(test_db, teacher_token, course_id):
    # Create a subject
    subject_response = client.post(
        "/api/subjects/",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "name": "Test Subject",
            "description": "This is a test subject",
            "course_id": course_id
        },
    )
    subject_id = subject_response.json()["id"]
    
    # Create an exam
    exam_response = client.post(
        "/api/exams/",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "title": "Test Exam",
            "description": "This is a test exam",
            "duration": 60,
            "total_marks": 100,
            "passing_percentage": 60,
            "start_date": "2025-05-01T10:00:00Z",
            "end_date": "2025-05-01T11:00:00Z",
            "is_active": True,
            "subject_id": subject_id
        },
    )
    exam_id = exam_response.json()["id"]
    
    # Get all exams
    response = client.get(
        "/api/exams/",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    
    # Get specific exam
    response = client.get(
        f"/api/exams/{exam_id}",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Exam"
    assert data["id"] == exam_id

# Test adding questions to exam
def test_add_questions_to_exam(test_db, teacher_token, course_id):
    # Create a subject
    subject_response = client.post(
        "/api/subjects/",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "name": "Test Subject",
            "description": "This is a test subject",
            "course_id": course_id
        },
    )
    subject_id = subject_response.json()["id"]
    
    # Create an exam
    exam_response = client.post(
        "/api/exams/",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "title": "Test Exam",
            "description": "This is a test exam",
            "duration": 60,
            "total_marks": 100,
            "passing_percentage": 60,
            "start_date": "2025-05-01T10:00:00Z",
            "end_date": "2025-05-01T11:00:00Z",
            "is_active": True,
            "subject_id": subject_id
        },
    )
    exam_id = exam_response.json()["id"]
    
    # Create a question
    question_response = client.post(
        "/api/questions/",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "content": "What is 2+2?",
            "difficulty": "easy",
            "question_type": "multiple_choice",
            "subject_id": subject_id
        },
    )
    question_id = question_response.json()["id"]
    
    # Add question to exam
    response = client.post(
        f"/api/exams/{exam_id}/questions",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "question_id": question_id,
            "marks": 10,
            "order": 1
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["exam_id"] == exam_id
    assert data["question_id"] == question_id
    assert data["marks"] == 10
    
    # Get exam questions
    response = client.get(
        f"/api/exams/{exam_id}/questions",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["question_id"] == question_id

# Test student exam attempt
def test_student_exam_attempt(test_db, teacher_token, course_id):
    # Register a student user
    client.post(
        "/api/auth/register",
        json={
            "name": "Student User",
            "email": "student@example.com",
            "username": "studentuser",
            "password": "password123",
            "role": "student"
        },
    )
    
    # Login as student
    login_response = client.post(
        "/api/auth/login",
        data={
            "username": "student@example.com",
            "password": "password123"
        },
    )
    student_token = login_response.json()["access_token"]
    
    # Create a subject
    subject_response = client.post(
        "/api/subjects/",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "name": "Test Subject",
            "description": "This is a test subject",
            "course_id": course_id
        },
    )
    subject_id = subject_response.json()["id"]
    
    # Create an exam
    exam_response = client.post(
        "/api/exams/",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "title": "Test Exam",
            "description": "This is a test exam",
            "duration": 60,
            "total_marks": 100,
            "passing_percentage": 60,
            "start_date": "2025-05-01T10:00:00Z",
            "end_date": "2025-05-01T11:00:00Z",
            "is_active": True,
            "subject_id": subject_id
        },
    )
    exam_id = exam_response.json()["id"]
    
    # Create a student exam attempt
    response = client.post(
        "/api/student-exams/",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "exam_id": exam_id
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["exam_id"] == exam_id
    assert data["status"] == "pending"
    student_exam_id = data["id"]
    
    # Start the exam
    response = client.post(
        f"/api/student-exams/{student_exam_id}/start",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "in_progress"
    assert data["start_time"] is not None
    
    # Complete the exam
    response = client.post(
        f"/api/student-exams/{student_exam_id}/complete",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["end_time"] is not None
