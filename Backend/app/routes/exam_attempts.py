from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Optional
from datetime import datetime
from pydantic import BaseModel
import json

from app.core.database import get_db
from app.core.auth import get_current_active_user, check_admin_permission
from app.crud import exam_attempt as exam_attempt_crud
from app.schemas.schemas import ExamAttempt, User
from app.models.models import (
    UserSubscription, 
    SubscriptionStatus, 
    Exam, 
    Course, 
    Class, 
    Subject, 
    Chapter, 
    Topic, 
    SubscriptionPlanPackage, 
    Subscription,
    Package
)

class StreamDetail(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}

class ClassDetail(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    streams: List[StreamDetail]

    model_config = {"from_attributes": True}

class SubjectDetail(BaseModel):
    id: int
    name: str
    description: Optional[str]
    code: str
    credits: Optional[int]
    stream_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    stream: StreamDetail

    model_config = {"from_attributes": True}

class ChapterDetail(BaseModel):
    id: int
    name: str
    description: Optional[str]
    chapter_number: int
    is_active: bool
    subject_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    subject: SubjectDetail

    model_config = {"from_attributes": True}

class TopicDetail(BaseModel):
    id: int
    name: str
    description: Optional[str]
    topic_number: int
    is_active: bool
    estimated_time: Optional[int]
    chapter_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    chapter: ChapterDetail

    model_config = {"from_attributes": True}

class CourseDetail(BaseModel):
    id: int
    name: str
    description: str
    duration: int
    is_active: bool
    stream_id: Optional[int]
    subject_id: Optional[int]
    chapter_id: Optional[int]
    topic_id: Optional[int]
    level: str
    created_at: datetime
    updated_at: Optional[datetime]
    stream: Optional[StreamDetail]
    subject: Optional[SubjectDetail]
    chapter: Optional[ChapterDetail]
    topic: Optional[TopicDetail]

    model_config = {"from_attributes": True}

class PackageDetail(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    courses: List[CourseDetail]

    model_config = {"from_attributes": True}

class ExamDetail(BaseModel):
    id: int
    title: str
    description: Optional[str]
    start_datetime: datetime
    end_datetime: Optional[datetime]
    duration_minutes: int
    max_marks: float
    max_questions: int
    status: str
    course_id: Optional[int]
    class_id: Optional[int]
    subject_id: Optional[int]
    chapter_id: Optional[int]
    topic_id: Optional[int]
    created_at: datetime
    updated_at: Optional[datetime]
    # Add nested relationships
    course: Optional[CourseDetail]
    class_: Optional[ClassDetail]
    subject: Optional[SubjectDetail]
    chapter: Optional[ChapterDetail]
    topic: Optional[TopicDetail]

    model_config = {"from_attributes": True}

class SubscriptionDetail(BaseModel):
    id: int
    name: str
    description: str
    duration_days: int
    price: float
    max_exams: Optional[int]
    features: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}

class SubscriptionPlanPackageDetail(BaseModel):
    id: int
    subscription_id: int
    package_ids: Optional[str]
    packages: List[PackageDetail]
    created_at: datetime
    updated_at: Optional[datetime]
    subscription: SubscriptionDetail

    model_config = {"from_attributes": True}

class UserSubscriptionDetail(BaseModel):
    id: int
    user_id: int
    subscription_plan_packages_id: int
    start_date: datetime
    end_date: datetime
    status: str
    created_at: datetime
    updated_at: Optional[datetime]
    subscription_plan_package: SubscriptionPlanPackageDetail

    model_config = {"from_attributes": True}

class DetailedExamAttempt(BaseModel):
    id: int
    user_subscription_id: int
    exam_id: int
    attempt_count: int
    created_at: datetime
    updated_at: Optional[datetime]
    exam: ExamDetail
    user_subscription: UserSubscriptionDetail

    model_config = {"from_attributes": True}

# Add new response model for remaining attempts
class RemainingAttempts(BaseModel):
    exam_id: int
    exam_title: str
    max_attempts: int
    attempts_used: int
    attempts_remaining: int
    
    model_config = {"from_attributes": True}

router = APIRouter(
    prefix="/exam-attempts",
    tags=["Exam Attempts"],
    responses={404: {"description": "Not found"}},
)

@router.get("/my-attempts/{exam_id}", response_model=DetailedExamAttempt)
def get_my_exam_attempts(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get the current user's attempts for a specific exam with detailed exam and subscription information
    """
    # Get user's active subscription
    active_subscription = db.query(UserSubscription).filter(
        UserSubscription.user_id == current_user.id,
        UserSubscription.status == SubscriptionStatus.active,
        UserSubscription.end_date >= datetime.now()
    ).first()

    if not active_subscription:
        raise HTTPException(status_code=404, detail="No active subscription found")

    # Get attempt with related exam and subscription details, including all nested relationships
    attempt = db.query(ExamAttempt)\
        .join(Exam, ExamAttempt.exam_id == Exam.id)\
        .join(UserSubscription, ExamAttempt.user_subscription_id == UserSubscription.id)\
        .join(SubscriptionPlanPackage, UserSubscription.subscription_plan_packages_id == SubscriptionPlanPackage.id)\
        .join(Subscription, SubscriptionPlanPackage.subscription_id == Subscription.id)\
        .options(
            joinedload(ExamAttempt.exam).joinedload(Exam.course).joinedload(Course.stream),
            joinedload(ExamAttempt.exam).joinedload(Exam.course).joinedload(Course.subject),
            joinedload(ExamAttempt.exam).joinedload(Exam.course).joinedload(Course.chapter),
            joinedload(ExamAttempt.exam).joinedload(Exam.course).joinedload(Course.topic),
            joinedload(ExamAttempt.exam).joinedload(Exam.class_).joinedload(Class.streams),
            joinedload(ExamAttempt.exam).joinedload(Exam.subject).joinedload(Subject.stream),
            joinedload(ExamAttempt.exam).joinedload(Exam.chapter).joinedload(Chapter.subject),
            joinedload(ExamAttempt.exam).joinedload(Exam.topic).joinedload(Topic.chapter),
            joinedload(ExamAttempt.user_subscription).joinedload(UserSubscription.subscription_plan_package).joinedload(SubscriptionPlanPackage.subscription)
        )\
        .filter(
            ExamAttempt.user_subscription_id == active_subscription.id,
            ExamAttempt.exam_id == exam_id
        ).first()

    if not attempt:
        raise HTTPException(status_code=404, detail="No attempts found for this exam")

    # Get package details
    if attempt.user_subscription.subscription_plan_package.package_ids:
        try:
            package_ids = json.loads(attempt.user_subscription.subscription_plan_package.package_ids)
            packages = db.query(Package)\
                .options(
                    joinedload(Package.courses).joinedload(Course.stream),
                    joinedload(Package.courses).joinedload(Course.subject),
                    joinedload(Package.courses).joinedload(Course.chapter),
                    joinedload(Package.courses).joinedload(Course.topic)
                )\
                .filter(Package.id.in_(package_ids))\
                .all()
            # Set the packages on the subscription_plan_package
            setattr(attempt.user_subscription.subscription_plan_package, 'packages', packages)
        except json.JSONDecodeError:
            setattr(attempt.user_subscription.subscription_plan_package, 'packages', [])
    else:
        setattr(attempt.user_subscription.subscription_plan_package, 'packages', [])

    return attempt

@router.get("/user/{user_id}/exam/{exam_id}", response_model=DetailedExamAttempt)
def get_user_exam_attempts(
    user_id: int,
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific user's attempts for a specific exam.
    Only accessible by the user themselves or admin/teacher.
    """
    # Check permissions
    if current_user.id != user_id and current_user.role not in ["admin", "superadmin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Get user's active subscription
    active_subscription = db.query(UserSubscription).filter(
        UserSubscription.user_id == user_id,
        UserSubscription.status == SubscriptionStatus.active,
        UserSubscription.end_date >= datetime.now()
    ).first()

    if not active_subscription:
        raise HTTPException(status_code=404, detail="No active subscription found")

    # Get attempt with related exam and subscription details, including all nested relationships
    attempt = db.query(ExamAttempt)\
        .join(Exam, ExamAttempt.exam_id == Exam.id)\
        .join(UserSubscription, ExamAttempt.user_subscription_id == UserSubscription.id)\
        .join(SubscriptionPlanPackage, UserSubscription.subscription_plan_packages_id == SubscriptionPlanPackage.id)\
        .join(Subscription, SubscriptionPlanPackage.subscription_id == Subscription.id)\
        .options(
            joinedload(ExamAttempt.exam).joinedload(Exam.course).joinedload(Course.stream),
            joinedload(ExamAttempt.exam).joinedload(Exam.course).joinedload(Course.subject),
            joinedload(ExamAttempt.exam).joinedload(Exam.course).joinedload(Course.chapter),
            joinedload(ExamAttempt.exam).joinedload(Exam.course).joinedload(Course.topic),
            joinedload(ExamAttempt.exam).joinedload(Exam.class_).joinedload(Class.streams),
            joinedload(ExamAttempt.exam).joinedload(Exam.subject).joinedload(Subject.stream),
            joinedload(ExamAttempt.exam).joinedload(Exam.chapter).joinedload(Chapter.subject),
            joinedload(ExamAttempt.exam).joinedload(Exam.topic).joinedload(Topic.chapter),
            joinedload(ExamAttempt.user_subscription).joinedload(UserSubscription.subscription_plan_package).joinedload(SubscriptionPlanPackage.subscription)
        )\
        .filter(
            ExamAttempt.user_subscription_id == active_subscription.id,
            ExamAttempt.exam_id == exam_id
        ).first()

    if not attempt:
        raise HTTPException(status_code=404, detail="No attempts found for this exam")

    # Get package details
    if attempt.user_subscription.subscription_plan_package.package_ids:
        try:
            package_ids = json.loads(attempt.user_subscription.subscription_plan_package.package_ids)
            packages = db.query(Package)\
                .options(
                    joinedload(Package.courses).joinedload(Course.stream),
                    joinedload(Package.courses).joinedload(Course.subject),
                    joinedload(Package.courses).joinedload(Course.chapter),
                    joinedload(Package.courses).joinedload(Course.topic)
                )\
                .filter(Package.id.in_(package_ids))\
                .all()
            # Set the packages on the subscription_plan_package
            setattr(attempt.user_subscription.subscription_plan_package, 'packages', packages)
        except json.JSONDecodeError:
            setattr(attempt.user_subscription.subscription_plan_package, 'packages', [])
    else:
        setattr(attempt.user_subscription.subscription_plan_package, 'packages', [])

    return attempt

@router.get("/exam/{exam_id}", response_model=List[DetailedExamAttempt])
def get_all_exam_attempts(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission)
):
    """
    Get all attempts for a specific exam.
    Only accessible by admin.
    """
    attempts = db.query(ExamAttempt)\
        .join(Exam, ExamAttempt.exam_id == Exam.id)\
        .join(UserSubscription, ExamAttempt.user_subscription_id == UserSubscription.id)\
        .join(SubscriptionPlanPackage, UserSubscription.subscription_plan_packages_id == SubscriptionPlanPackage.id)\
        .join(Subscription, SubscriptionPlanPackage.subscription_id == Subscription.id)\
        .options(
            joinedload(ExamAttempt.exam).joinedload(Exam.course).joinedload(Course.stream),
            joinedload(ExamAttempt.exam).joinedload(Exam.course).joinedload(Course.subject),
            joinedload(ExamAttempt.exam).joinedload(Exam.course).joinedload(Course.chapter),
            joinedload(ExamAttempt.exam).joinedload(Exam.course).joinedload(Course.topic),
            joinedload(ExamAttempt.exam).joinedload(Exam.class_).joinedload(Class.streams),
            joinedload(ExamAttempt.exam).joinedload(Exam.subject).joinedload(Subject.stream),
            joinedload(ExamAttempt.exam).joinedload(Exam.chapter).joinedload(Chapter.subject),
            joinedload(ExamAttempt.exam).joinedload(Exam.topic).joinedload(Topic.chapter),
            joinedload(ExamAttempt.user_subscription).joinedload(UserSubscription.subscription_plan_package).joinedload(SubscriptionPlanPackage.subscription)
        )\
        .filter(ExamAttempt.exam_id == exam_id)\
        .all()

    # Get package details for each attempt
    for attempt in attempts:
        if attempt.user_subscription.subscription_plan_package.package_ids:
            try:
                package_ids = json.loads(attempt.user_subscription.subscription_plan_package.package_ids)
                packages = db.query(Package)\
                    .options(
                        joinedload(Package.courses).joinedload(Course.stream),
                        joinedload(Package.courses).joinedload(Course.subject),
                        joinedload(Package.courses).joinedload(Course.chapter),
                        joinedload(Package.courses).joinedload(Course.topic)
                    )\
                    .filter(Package.id.in_(package_ids))\
                    .all()
                setattr(attempt.user_subscription.subscription_plan_package, 'packages', packages)
            except json.JSONDecodeError:
                setattr(attempt.user_subscription.subscription_plan_package, 'packages', [])
        else:
            setattr(attempt.user_subscription.subscription_plan_package, 'packages', [])

    return attempts

@router.get("/user-subscription/{user_subscription_id}", response_model=List[DetailedExamAttempt])
def get_user_subscription_attempts(
    user_subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all exam attempts for a specific user subscription.
    Users can only access their own subscription attempts.
    Admins, superadmins, and teachers can access any user's subscription attempts.
    """
    # Check if user has permission to access this subscription
    user_subscription = db.query(UserSubscription).filter(
        UserSubscription.id == user_subscription_id
    ).first()

    if not user_subscription:
        raise HTTPException(status_code=404, detail="User subscription not found")

    if current_user.id != user_subscription.user_id and current_user.role not in ["admin", "superadmin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    attempts = db.query(ExamAttempt)\
        .join(Exam, ExamAttempt.exam_id == Exam.id)\
        .join(UserSubscription, ExamAttempt.user_subscription_id == UserSubscription.id)\
        .join(SubscriptionPlanPackage, UserSubscription.subscription_plan_packages_id == SubscriptionPlanPackage.id)\
        .join(Subscription, SubscriptionPlanPackage.subscription_id == Subscription.id)\
        .options(
            joinedload(ExamAttempt.exam).joinedload(Exam.course).joinedload(Course.stream),
            joinedload(ExamAttempt.exam).joinedload(Exam.course).joinedload(Course.subject),
            joinedload(ExamAttempt.exam).joinedload(Exam.course).joinedload(Course.chapter),
            joinedload(ExamAttempt.exam).joinedload(Exam.course).joinedload(Course.topic),
            joinedload(ExamAttempt.exam).joinedload(Exam.class_).joinedload(Class.streams),
            joinedload(ExamAttempt.exam).joinedload(Exam.subject).joinedload(Subject.stream),
            joinedload(ExamAttempt.exam).joinedload(Exam.chapter).joinedload(Chapter.subject),
            joinedload(ExamAttempt.exam).joinedload(Exam.topic).joinedload(Topic.chapter),
            joinedload(ExamAttempt.user_subscription).joinedload(UserSubscription.subscription_plan_package).joinedload(SubscriptionPlanPackage.subscription)
        )\
        .filter(ExamAttempt.user_subscription_id == user_subscription_id)\
        .all()

    # Get package details for each attempt
    for attempt in attempts:
        if attempt.user_subscription.subscription_plan_package.package_ids:
            try:
                package_ids = json.loads(attempt.user_subscription.subscription_plan_package.package_ids)
                packages = db.query(Package)\
                    .options(
                        joinedload(Package.courses).joinedload(Course.stream),
                        joinedload(Package.courses).joinedload(Course.subject),
                        joinedload(Package.courses).joinedload(Course.chapter),
                        joinedload(Package.courses).joinedload(Course.topic)
                    )\
                    .filter(Package.id.in_(package_ids))\
                    .all()
                setattr(attempt.user_subscription.subscription_plan_package, 'packages', packages)
            except json.JSONDecodeError:
                setattr(attempt.user_subscription.subscription_plan_package, 'packages', [])
        else:
            setattr(attempt.user_subscription.subscription_plan_package, 'packages', [])

    return attempts

@router.get("/user/{user_id}/remaining-attempts", response_model=List[RemainingAttempts])
def get_user_remaining_attempts(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get remaining attempts for all exams available to a specific user.
    Returns a list of exams with their attempt limits and remaining attempts.
    Only accessible by the user themselves or admin/teacher.
    """
    # Check permissions
    if current_user.id != user_id and current_user.role not in ["admin", "superadmin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Get user's active subscription with all related details
    active_subscription = db.query(UserSubscription)\
        .join(SubscriptionPlanPackage)\
        .join(Subscription)\
        .options(
            joinedload(UserSubscription.subscription_plan_package).joinedload(SubscriptionPlanPackage.subscription)
        )\
        .filter(
            UserSubscription.user_id == user_id,
            UserSubscription.status == SubscriptionStatus.active,
            UserSubscription.end_date >= datetime.now()
        ).first()

    if not active_subscription:
        raise HTTPException(status_code=404, detail="No active subscription found")

    # Get subscription details to check max_exams
    subscription = active_subscription.subscription_plan_package.subscription
    if not subscription:
        raise HTTPException(status_code=404, detail="Invalid subscription configuration")

    # Get all available exams from the subscription package
    package_ids = json.loads(active_subscription.subscription_plan_package.package_ids) if active_subscription.subscription_plan_package.package_ids else []
    available_exams = db.query(Exam)\
        .options(
            joinedload(Exam.course).joinedload(Course.stream),
            joinedload(Exam.course).joinedload(Course.subject),
            joinedload(Exam.course).joinedload(Course.chapter),
            joinedload(Exam.course).joinedload(Course.topic),
            joinedload(Exam.class_).joinedload(Class.streams),
            joinedload(Exam.subject).joinedload(Subject.stream),
            joinedload(Exam.chapter).joinedload(Chapter.subject),
            joinedload(Exam.topic).joinedload(Topic.chapter)
        )\
        .filter(Exam.package_id.in_(package_ids) if package_ids else False)\
        .all()

    remaining_attempts_list = []
    max_attempts = subscription.max_exams or 0

    for exam in available_exams:
        # Get current attempt count
        attempt = exam_attempt_crud.get_exam_attempt(
            db=db,
            user_subscription_id=active_subscription.id,
            exam_id=exam.id
        )
        attempts_used = attempt.attempt_count if attempt else 0
        attempts_remaining = max(0, max_attempts - attempts_used) if max_attempts > 0 else float('inf')

        remaining_attempts_list.append(
            RemainingAttempts(
                exam_id=exam.id,
                exam_title=exam.title,
                max_attempts=max_attempts,
                attempts_used=attempts_used,
                attempts_remaining=attempts_remaining
            )
        )

    return remaining_attempts_list

@router.get("/user-subscription/{user_subscription_id}/exam/{exam_id}/count", response_model=dict)
def get_user_subscription_exam_attempts_count(
    user_subscription_id: int,
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get attempt count for a specific exam under a specific user subscription.
    Returns total attempts made and maximum allowed attempts.
    Users can only access their own subscription attempts.
    Admins, superadmins, and teachers can access any subscription's attempts.
    """
    # Check if user subscription exists and get details
    user_subscription = db.query(UserSubscription)\
        .join(SubscriptionPlanPackage)\
        .join(Subscription)\
        .filter(
            UserSubscription.id == user_subscription_id,
            UserSubscription.status == SubscriptionStatus.active,
            UserSubscription.end_date >= datetime.now()
        ).first()

    if not user_subscription:
        raise HTTPException(status_code=404, detail="Active user subscription not found")

    # Check permissions
    if current_user.id != user_subscription.user_id and current_user.role not in ["admin", "superadmin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Get subscription details to check max_exams
    subscription = user_subscription.subscription_plan_package.subscription
    if not subscription:
        raise HTTPException(status_code=404, detail="Invalid subscription configuration")

    # Get attempt count
    attempt = db.query(ExamAttempt).filter(
        ExamAttempt.user_subscription_id == user_subscription_id,
        ExamAttempt.exam_id == exam_id
    ).first()

    attempts_made = attempt.attempt_count if attempt else 0
    max_attempts = subscription.max_exams or float('inf')  # If max_exams is None, set to infinity
    attempts_remaining = max(0, max_attempts - attempts_made) if max_attempts != float('inf') else float('inf')

    return {
        "exam_id": exam_id,
        "user_subscription_id": user_subscription_id,
        "user_id": user_subscription.user_id,
        "attempts_made": attempts_made,
        "max_attempts": max_attempts if max_attempts != float('inf') else None,
        "attempts_remaining": attempts_remaining if attempts_remaining != float('inf') else None,
        "subscription_name": subscription.name,
        "subscription_end_date": user_subscription.end_date.isoformat()
    } 