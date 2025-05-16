import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from sqlalchemy import text
from app.main import app
from app.core.database import Base, engine, get_db
from sqlalchemy.orm import Session
from app.models.models import User, Course, Subject, Exam, Question, Answer, UserSubscription, SubscriptionPlanPackage, Subscription
from app.core.security import get_password_hash
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = TestClient(app)

# Test database setup
def setup_module(module):
    # Drop all tables with CASCADE
    with engine.begin() as connection:
        connection.execute(text("DROP SCHEMA public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))
    Base.metadata.create_all(bind=engine)

def teardown_module(module):
    # Drop all tables with CASCADE
    with engine.begin() as connection:
        connection.execute(text("DROP SCHEMA public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))

@pytest.fixture(scope="function")
def test_db():
    # Drop all tables with CASCADE
    with engine.begin() as connection:
        connection.execute(text("DROP SCHEMA public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))
    Base.metadata.create_all(bind=engine)
    yield
    # Drop all tables with CASCADE
    with engine.begin() as connection:
        connection.execute(text("DROP SCHEMA public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))

@pytest.fixture(scope="function")
def admin_token(test_db):
    # Create admin user
    client.post(
        "/api/auth/register",
        json={
            "name": "Admin User",
            "email": "admin@example.com",
            "username": "adminuser",
            "password": "password123",
            "role": "admin"
        }
    )
    
    # Login as admin
    response = client.post(
        "/api/auth/login",
        json={
            "email": "admin@example.com",
            "password": "password123"
        }
    )
    return response.json()["access_token"]

@pytest.fixture(scope="function")
def teacher_token(test_db):
    # Create teacher user
    client.post(
        "/api/auth/register",
        json={
            "name": "Teacher User",
            "email": "teacher@example.com",
            "username": "teacheruser",
            "password": "password123",
            "role": "teacher"
        }
    )
    
    # Login as teacher
    response = client.post(
        "/api/auth/login",
        json={
            "email": "teacher@example.com",
            "password": "password123"
        }
    )
    return response.json()["access_token"]

@pytest.fixture(scope="function")
def student_with_subscription(test_db, admin_token):
    # 1. Create student user
    register_response = client.post(
        "/api/auth/register",
        json={
            "name": "Student User",
            "email": "student@example.com",
            "username": "studentuser",
            "password": "password123",
            "role": "student"
        }
    )
    student_id = register_response.json()["id"]
    
    # 2. Create subscription plan
    subscription_response = client.post(
        "/api/subscriptions/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Basic Plan",
            "description": "Basic subscription plan",
            "duration_days": 365,
            "price": 99.99,
            "max_exams": 3,
            "features": "Access to all exams",
            "is_active": True
        }
    )
    subscription_id = subscription_response.json()["id"]
    
    # 3. Create subscription plan package
    package_response = client.post(
        "/api/subscription-plan-packages/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Basic Package",
            "description": "Basic package with exam access",
            "subscription_id": subscription_id,
            "price": 99.99
        }
    )
    package_id = package_response.json()["id"]
    
    # 4. Create user subscription
    user_sub_response = client.post(
        "/api/user-subscriptions/",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "user_id": student_id,
            "subscription_plan_packages_id": package_id,
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=365)).isoformat(),
            "status": "active"
        }
    )
    
    # Login as student
    login_response = client.post(
        "/api/auth/login",
        data={
            "username": "student@example.com",
            "password": "password123"
        }
    )
    return {
        "token": login_response.json()["access_token"],
        "user_id": student_id,
        "subscription_id": subscription_id
    }

def test_complete_exam_workflow(test_db, teacher_token, student_with_subscription):
    """
    Test the complete exam workflow from creation to completion
    """
    logger.info("Starting complete exam workflow test")
    
    # 1. Create a course
    course_response = client.post(
        "/api/courses/",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "name": "Mathematics",
            "description": "Advanced Mathematics Course"
        }
    )
    assert course_response.status_code == 201
    course_id = course_response.json()["id"]
    logger.info(f"Created course with ID: {course_id}")

    # 2. Create a subject
    subject_response = client.post(
        "/api/subjects/",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "name": "Algebra",
            "description": "Advanced Algebra",
            "course_id": course_id
        }
    )
    assert subject_response.status_code == 201
    subject_id = subject_response.json()["id"]
    logger.info(f"Created subject with ID: {subject_id}")

    # 3. Create an exam
    exam_data = {
        "title": "Algebra Final Exam",
        "description": "Final examination for Algebra",
        "start_datetime": (datetime.now() + timedelta(days=1)).isoformat(),
        "end_datetime": (datetime.now() + timedelta(days=2)).isoformat(),
        "duration_minutes": 60,
        "max_marks": 100,
        "max_questions": 2,
        "subject_id": subject_id,
        "status": "active"
    }
    exam_response = client.post(
        "/api/exams/",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json=exam_data
    )
    assert exam_response.status_code == 201
    exam_id = exam_response.json()["id"]
    logger.info(f"Created exam with ID: {exam_id}")

    # 4. Create questions for the exam
    questions = [
        {
            "text": "What is 2 + 2?",
            "question_type": "multiple_choice",
            "marks": 50,
            "answers": [
                {"text": "3", "is_correct": False},
                {"text": "4", "is_correct": True},
                {"text": "5", "is_correct": False}
            ]
        },
        {
            "text": "What is 5 x 5?",
            "question_type": "multiple_choice",
            "marks": 50,
            "answers": [
                {"text": "20", "is_correct": False},
                {"text": "25", "is_correct": True},
                {"text": "30", "is_correct": False}
            ]
        }
    ]
    
    question_ids = []
    for q in questions:
        question_response = client.post(
            "/api/questions/",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json=q
        )
        assert question_response.status_code == 201
        question_ids.append(question_response.json()["id"])
    logger.info(f"Created {len(question_ids)} questions")

    # 5. Add questions to exam
    for question_id in question_ids:
        exam_question_response = client.post(
            "/api/exam-questions/",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "exam_id": exam_id,
                "question_id": question_id,
                "marks": 50
            }
        )
        assert exam_question_response.status_code == 201
    logger.info("Added questions to exam")

    # 6. Student creates exam attempt
    student_token = student_with_subscription["token"]
    student_exam_response = client.post(
        "/api/student-exams/",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "exam_id": exam_id,
            "student_id": student_with_subscription["user_id"]
        }
    )
    assert student_exam_response.status_code == 201
    student_exam_id = student_exam_response.json()["id"]
    logger.info(f"Created student exam with ID: {student_exam_id}")

    # 7. Start the exam
    start_response = client.put(
        f"/api/student-exams/{student_exam_id}/start",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert start_response.status_code == 200
    logger.info("Started the exam")

    # 8. Submit answers
    for i, question_id in enumerate(question_ids):
        answer_response = client.post(
            "/api/student-answers/",
            headers={"Authorization": f"Bearer {student_token}"},
            json={
                "student_exam_id": student_exam_id,
                "question_id": question_id,
                "answer_id": question_id + 1  # Assuming second answer is correct
            }
        )
        assert answer_response.status_code == 201
    logger.info("Submitted answers")

    # 9. Complete the exam
    complete_response = client.post(
        f"/api/student-exams/{student_exam_id}/complete",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert complete_response.status_code == 200
    logger.info("Completed the exam")

    # 10. Check exam results
    results_response = client.get(
        f"/api/student-exams/{exam_id}/all-attempts",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert results_response.status_code == 200
    results = results_response.json()
    assert len(results) > 0
    logger.info("Retrieved exam results")

    # 11. Check remaining attempts
    attempts_response = client.get(
        f"/api/student-exams/{exam_id}/attempts",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert attempts_response.status_code == 200
    attempts_data = attempts_response.json()
    assert attempts_data["remaining_attempts"] == 2  # Should be max_exams - 1
    logger.info(f"Remaining attempts: {attempts_data['remaining_attempts']}")

    # 12. Try to retake the exam
    retake_response = client.post(
        f"/api/student-exams/{exam_id}/retake",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert retake_response.status_code == 200
    logger.info("Successfully requested exam retake")

    logger.info("Complete exam workflow test completed successfully") 