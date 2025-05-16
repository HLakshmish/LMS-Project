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
def admin_token(test_db):
    # Register an admin user
    client.post(
        "/api/auth/register",
        json={
            "name": "Admin User",
            "email": "admin@example.com",
            "username": "adminuser",
            "password": "password123",
            "role": "admin"
        },
    )
    
    # Login and get token
    login_response = client.post(
        "/api/auth/login",
        data={
            "username": "admin@example.com",
            "password": "password123"
        },
    )
    return login_response.json()["access_token"]

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

@pytest.fixture(scope="function")
def student_token(test_db):
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
    
    # Login and get token
    login_response = client.post(
        "/api/auth/login",
        data={
            "username": "student@example.com",
            "password": "password123"
        },
    )
    return login_response.json()["access_token"]

# Test course creation
def test_create_course(test_db, teacher_token):
    response = client.post(
        "/api/courses/",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "title": "Test Course",
            "description": "This is a test course",
            "thumbnail": "https://example.com/thumbnail.jpg"
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Course"
    assert data["description"] == "This is a test course"
    assert "id" in data

# Test course retrieval
def test_get_courses(test_db, teacher_token, student_token):
    # Create a course first
    course_response = client.post(
        "/api/courses/",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "title": "Test Course",
            "description": "This is a test course",
            "thumbnail": "https://example.com/thumbnail.jpg"
        },
    )
    course_id = course_response.json()["id"]
    
    # Get all courses
    response = client.get("/api/courses/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    
    # Get specific course
    response = client.get(f"/api/courses/{course_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Course"
    assert data["id"] == course_id

# Test course update
def test_update_course(test_db, teacher_token):
    # Create a course first
    course_response = client.post(
        "/api/courses/",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "title": "Test Course",
            "description": "This is a test course",
            "thumbnail": "https://example.com/thumbnail.jpg"
        },
    )
    course_id = course_response.json()["id"]
    
    # Update the course
    response = client.put(
        f"/api/courses/{course_id}",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "title": "Updated Course",
            "description": "This is an updated test course",
            "thumbnail": "https://example.com/updated-thumbnail.jpg"
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Course"
    assert data["description"] == "This is an updated test course"

# Test course deletion
def test_delete_course(test_db, teacher_token):
    # Create a course first
    course_response = client.post(
        "/api/courses/",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "title": "Test Course",
            "description": "This is a test course",
            "thumbnail": "https://example.com/thumbnail.jpg"
        },
    )
    course_id = course_response.json()["id"]
    
    # Delete the course
    response = client.delete(
        f"/api/courses/{course_id}",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    assert response.status_code == 204
    
    # Verify course is deleted
    response = client.get(f"/api/courses/{course_id}")
    assert response.status_code == 404

# Test role-based access control
def test_role_based_access(test_db, teacher_token, student_token):
    # Create a course as teacher
    course_response = client.post(
        "/api/courses/",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "title": "Test Course",
            "description": "This is a test course",
            "thumbnail": "https://example.com/thumbnail.jpg"
        },
    )
    course_id = course_response.json()["id"]
    
    # Try to update course as student (should fail)
    response = client.put(
        f"/api/courses/{course_id}",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "title": "Student Updated Course",
            "description": "This should not work",
            "thumbnail": "https://example.com/student-thumbnail.jpg"
        },
    )
    assert response.status_code in [401, 403]  # Either unauthorized or forbidden
    
    # Try to delete course as student (should fail)
    response = client.delete(
        f"/api/courses/{course_id}",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert response.status_code in [401, 403]  # Either unauthorized or forbidden
