import logging
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional, List
from datetime import datetime

from app.models.models import ExamAttempt, UserSubscription, Exam, SubscriptionStatus, PackageCourse, StudentExam
from app.schemas.schemas import ExamAttemptCreate, ExamAttemptUpdate

logger = logging.getLogger(__name__)

def get_exam_attempt(db: Session, user_subscription_id: int, exam_id: int) -> Optional[ExamAttempt]:
    """Get exam attempt for a specific subscription and exam"""
    return db.query(ExamAttempt).filter(
        and_(
            ExamAttempt.user_subscription_id == user_subscription_id,
            ExamAttempt.exam_id == exam_id
        )
    ).first()

def get_remaining_attempts(db: Session, user_subscription_id: int, exam_id: int) -> int:
    """Get the remaining attempts for a specific exam in a subscription"""
    attempt = get_exam_attempt(db, user_subscription_id, exam_id)
    return attempt.remaining_attempts if attempt else 0

def create_or_update_exam_attempt(
    db: Session,
    user_subscription_id: int,
    exam_id: int,
    max_attempts: int
) -> ExamAttempt:
    """
    Create or update an exam attempt record.
    Now uses exam_id instead of student_exam_id to track attempts.
    """
    # Check if an attempt record already exists
    exam_attempt = db.query(ExamAttempt).filter(
        and_(
            ExamAttempt.user_subscription_id == user_subscription_id,
            ExamAttempt.exam_id == exam_id
        )
    ).first()
    
    if exam_attempt:
        # Update existing record if needed
        if exam_attempt.remaining_attempts < max_attempts:
            exam_attempt.remaining_attempts = max_attempts
            db.commit()
            db.refresh(exam_attempt)
    else:
        # Create new record
        exam_attempt = ExamAttempt(
            user_subscription_id=user_subscription_id,
            exam_id=exam_id,
            remaining_attempts=max_attempts
        )
        db.add(exam_attempt)
        db.commit()
        db.refresh(exam_attempt)
    
    return exam_attempt

def check_exam_access(db: Session, user_id: int, exam_id: int) -> tuple[bool, str, Optional[UserSubscription]]:
    """
    Check if a user has access to take an exam based on their subscription and attempt limits
    Returns: (has_access: bool, message: str, active_subscription: Optional[UserSubscription])
    """
    logger.info(f"=== Starting exam access check ===")
    logger.info(f"Parameters: user_id={user_id}, exam_id={exam_id}")
    
    # Get active subscription
    active_subscription = db.query(UserSubscription).filter(
        and_(
            UserSubscription.user_id == user_id,
            UserSubscription.status == SubscriptionStatus.active,
            UserSubscription.end_date >= datetime.now()
        )
    ).first()

    if not active_subscription:
        logger.warning(f"No active subscription found for user_id={user_id}")
        return False, "No active subscription found", None

    logger.info(f"Found active subscription id={active_subscription.id}, end_date={active_subscription.end_date}")

    # Get subscription details to check max_exams
    subscription = active_subscription.subscription_plan_package.subscription
    if not subscription:
        logger.warning(f"Invalid subscription configuration for subscription_id={active_subscription.id}")
        return False, "Invalid subscription configuration", None

    logger.info(f"Found subscription plan id={subscription.id}, max_exams={subscription.max_exams}")

    # Get the student exam and check if it exists
    student_exam = db.query(StudentExam).filter(StudentExam.id == exam_id).first()
    if not student_exam:
        logger.warning(f"Student exam not found: exam_id={exam_id}")
        return False, "Student exam not found", None
        
    logger.info(f"Found student exam id={student_exam.id}")

    # Check remaining attempts
    attempt = get_exam_attempt(db, active_subscription.id, exam_id)
    if attempt and attempt.remaining_attempts <= 0:
        logger.warning(f"No remaining attempts for student exam {exam_id}")
        return False, "No remaining attempts for this exam", None

    logger.info("Access granted")
    return True, "Access granted", active_subscription 

def update_remaining_attempts(
    db: Session,
    user_subscription_id: int,
    exam_id: int,
    remaining_attempts: int
) -> ExamAttempt:
    """
    Update the remaining attempts for an exam attempt record.
    """
    exam_attempt = get_exam_attempt(db, user_subscription_id, exam_id)
    if exam_attempt:
        exam_attempt.remaining_attempts = remaining_attempts
        db.commit()
        db.refresh(exam_attempt)
    return exam_attempt 