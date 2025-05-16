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

# Test subscription package creation
def test_create_subscription(test_db, admin_token):
    response = client.post(
        "/api/subscriptions/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Basic Plan",
            "description": "Basic subscription plan",
            "price": 9.99,
            "duration_days": 30,
            "features": ["Access to basic courses", "Limited exam attempts"],
            "is_active": True
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Basic Plan"
    assert data["price"] == 9.99
    assert data["duration_days"] == 30
    assert "id" in data
    
    return data["id"]

# Test subscription retrieval
def test_get_subscriptions(test_db, admin_token):
    # Create a subscription first
    subscription_id = test_create_subscription(test_db, admin_token)
    
    # Get all subscriptions
    response = client.get(
        "/api/subscriptions/",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    
    # Get specific subscription
    response = client.get(
        f"/api/subscriptions/{subscription_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Basic Plan"
    assert data["id"] == subscription_id

# Test subscription update
def test_update_subscription(test_db, admin_token):
    # Create a subscription first
    subscription_id = test_create_subscription(test_db, admin_token)
    
    # Update the subscription
    response = client.put(
        f"/api/subscriptions/{subscription_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Premium Plan",
            "description": "Premium subscription plan with more features",
            "price": 19.99,
            "duration_days": 30,
            "features": ["Access to all courses", "Unlimited exam attempts", "Certificate of completion"],
            "is_active": True
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Premium Plan"
    assert data["price"] == 19.99
    assert len(data["features"]) == 3

# Test user subscription creation
def test_create_user_subscription(test_db, admin_token):
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
    
    # Get student user ID
    user_response = client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    user_id = user_response.json()["id"]
    
    # Create a subscription
    subscription_id = test_create_subscription(test_db, admin_token)
    
    # Create user subscription
    response = client.post(
        "/api/user-subscriptions/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "user_id": user_id,
            "subscription_id": subscription_id
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["user_id"] == user_id
    assert data["subscription_id"] == subscription_id
    assert data["is_active"] == True
    assert "start_date" in data
    assert "end_date" in data
    
    return data["id"]

# Test user subscription retrieval
def test_get_user_subscriptions(test_db, admin_token):
    # Create a user subscription first
    user_subscription_id = test_create_user_subscription(test_db, admin_token)
    
    # Get all user subscriptions
    response = client.get(
        "/api/user-subscriptions/",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    
    # Get specific user subscription
    response = client.get(
        f"/api/user-subscriptions/{user_subscription_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == user_subscription_id
    assert data["is_active"] == True

# Test user subscription cancellation
def test_cancel_user_subscription(test_db, admin_token):
    # Create a user subscription first
    user_subscription_id = test_create_user_subscription(test_db, admin_token)
    
    # Cancel the subscription
    response = client.post(
        f"/api/user-subscriptions/{user_subscription_id}/cancel",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_active"] == False
