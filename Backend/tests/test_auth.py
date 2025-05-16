import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine, get_db
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import sys
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

# Test user registration
def test_register_user(test_db):
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Test User",
            "email": "test@example.com",
            "username": "testuser",
            "password": "password123",
            "role": "student"
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["role"] == "student"
    assert "id" in data

# Test user login
def test_login_user(test_db):
    # First register a user
    client.post(
        "/api/auth/register",
        json={
            "name": "Test User",
            "email": "test@example.com",
            "username": "testuser",
            "password": "password123",
            "role": "student"
        },
    )
    
    # Then try to login
    response = client.post(
        "/api/auth/login",
        data={
            "username": "test@example.com",
            "password": "password123"
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

# Test invalid login
def test_invalid_login(test_db):
    response = client.post(
        "/api/auth/login",
        data={
            "username": "nonexistent@example.com",
            "password": "wrongpassword"
        },
    )
    assert response.status_code == 401

# Test get current user
def test_get_current_user(test_db):
    # First register and login
    client.post(
        "/api/auth/register",
        json={
            "name": "Test User",
            "email": "test@example.com",
            "username": "testuser",
            "password": "password123",
            "role": "student"
        },
    )
    
    login_response = client.post(
        "/api/auth/login",
        data={
            "username": "test@example.com",
            "password": "password123"
        },
    )
    token = login_response.json()["access_token"]
    
    # Get current user with token
    response = client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["role"] == "student"

# Test unauthorized access
def test_unauthorized_access(test_db):
    response = client.get("/api/users/me")
    assert response.status_code == 401
