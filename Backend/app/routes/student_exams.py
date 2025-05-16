from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from typing import List
from datetime import datetime
import logging
from pydantic import BaseModel
import traceback

from app.core.database import get_db
from app.core.security import get_current_active_user, check_admin_permission, check_teacher_permission
from app.models.models import (
    StudentExam, StudentAnswer, ExamStatus, ExamResult,
    User, Exam, ExamQuestion, Answer, UserSubscription,
    SubscriptionStatus, ExamAttempt
)
from app.schemas.schemas import (
    StudentExam as StudentExamSchema,
    StudentExamCreate, StudentExamUpdate, StudentAnswerCreate, 
    StudentAnswerSimple, ExamResult as ExamResultSchema,
    RemainingAttemptsResponse, StudentExamResponse, ExamStatusEnum,
    StudentAnswerAttempt, StudentAnswersAllAttempts
)
from app.crud import student_exam as student_exam_crud
from app.crud import exam_attempt as exam_attempt_crud
from app.crud.student_exam import (
    get_student_exam, get_student_answers, create_student_answer,
    create_exam_result, get_exam_result_by_student_exam
)

logger = logging.getLogger(__name__)

# Create a simpler response model for create operations
class StudentAnswerResponse(BaseModel):
    id: int
    student_exam_id: int
    question_id: int
    answer_id: int = None
    is_correct: bool = None
    created_at: datetime
    updated_at: datetime = None
    
    model_config = {"from_attributes": True}

router = APIRouter(
    tags=["Student Exams"],
    responses={
        404: {"description": "Not found"},
        500: {"description": "Internal server error"},
        401: {"description": "Unauthorized - Authentication required"},
        403: {"description": "Forbidden - Insufficient permissions"}
    }
)

@router.get("/", response_model=List[StudentExamSchema])
def read_student_exams(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission)
):
    student_exams = student_exam_crud.get_student_exams(db, skip=skip, limit=limit)
    return student_exams

@router.get("/my-exams", response_model=List[StudentExamResponse])
def read_my_student_exams(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Use direct query to explicitly select all fields including status
    student_exams = db.query(StudentExam).filter(
        StudentExam.student_id == current_user.id
    ).options(
        joinedload(StudentExam.student),
        joinedload(StudentExam.exam)
    ).all()
    
    # Manually convert database models to response models
    # This handles the conversion from ExamStatus to ExamStatusEnum
    student_exam_responses = []
    for exam in student_exams:
        status_str = exam.status.value if exam.status else "not_started"
        # Map the status from database enum to schema enum
        status_schema = ExamStatusEnum(status_str)
        
        # Create StudentExamResponse with correct data
        response = {
            "id": exam.id,
            "student_id": exam.student_id,
            "exam_id": exam.exam_id,
            "status": status_schema,
            "created_at": exam.created_at,
            "updated_at": exam.updated_at,
            "student": exam.student,
            "exam": exam.exam
        }
        student_exam_responses.append(response)
        
    return student_exam_responses

# Legacy endpoint to handle the double student-exams URL pattern
@router.get("/student-exams/my-exams", response_model=List[StudentExamResponse])
def read_my_student_exams_legacy_url(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Legacy endpoint to handle the double student-exams URL pattern.
    Redirects to the standard endpoint.
    """
    return read_my_student_exams(skip=skip, limit=limit, db=db, current_user=current_user)

@router.get("/exam/{exam_id}", response_model=List[StudentExamSchema])
def read_student_exams_by_exam(
    exam_id: int,
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    student_exams = student_exam_crud.get_student_exams_by_exam(db, exam_id=exam_id, skip=skip, limit=limit)
    return student_exams

@router.get("/{student_exam_id}", response_model=StudentExamSchema)
def read_student_exam(
    student_exam_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_student_exam = student_exam_crud.get_student_exam(db, student_exam_id=student_exam_id)
    if db_student_exam is None:
        raise HTTPException(status_code=404, detail="Student exam not found")
    
    # Check if user is the student, a teacher, or an admin
    if db_student_exam.student_id != current_user.id and current_user.role not in ["teacher", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return db_student_exam

@router.post("/", response_model=StudentExamResponse)
def create_student_exam(
    student_exam: StudentExamCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        logger.info(f"Creating student exam: student_id={student_exam.student_id}, exam_id={student_exam.exam_id}")
        
        # Only allow students to create exams for themselves
        if student_exam.student_id != current_user.id:
            logger.warning(f"Permission denied: Cannot create exam for another student. Requested student_id={student_exam.student_id}, current_user_id={current_user.id}")
            raise HTTPException(status_code=403, detail="You can only create exams for yourself")
        
        # Check if exam exists
        exam = db.query(Exam).filter(Exam.id == student_exam.exam_id).first()
        if not exam:
            logger.error(f"Exam not found: exam_id={student_exam.exam_id}")
            raise HTTPException(status_code=404, detail=f"Exam with ID {student_exam.exam_id} not found")
        
        # Check for existing student exam for this exam
        existing_exam = db.query(StudentExam).filter(
            StudentExam.student_id == student_exam.student_id,
            StudentExam.exam_id == student_exam.exam_id
        ).first()
        
        if existing_exam:
            logger.info(f"Student already has an exam record for this exam: student_exam_id={existing_exam.id}")
            return existing_exam
        
        # Get active subscription to check max attempts
        active_subscription = db.query(UserSubscription).filter(
            and_(
                UserSubscription.user_id == current_user.id,
                UserSubscription.status == SubscriptionStatus.active,
                UserSubscription.end_date >= datetime.now()
            )
        ).first()

        if not active_subscription:
            raise HTTPException(status_code=403, detail="No active subscription found")

        # Get subscription details to check max_exams
        subscription = active_subscription.subscription_plan_package.subscription
        if not subscription:
            raise HTTPException(status_code=403, detail="Invalid subscription configuration")

        # Create the student exam
        result = student_exam_crud.create_student_exam(db=db, student_exam=student_exam)
        
        # Create or update exam attempt with max_attempts from subscription
        exam_attempt_crud.create_or_update_exam_attempt(
            db=db,
            user_subscription_id=active_subscription.id,
            exam_id=student_exam.exam_id,
            max_attempts=subscription.max_exams or 1  # Default to 1 if max_exams is not set
        )
        
        logger.info(f"Successfully created student exam with id={result.id}")
        return result
        
    except ValueError as ve:
        logger.error(f"Value error creating student exam: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error creating student exam: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500, 
            detail=f"An unexpected error occurred: {str(e)}"
        )

@router.put("/{student_exam_id}/start", response_model=StudentExamSchema)
def start_student_exam(
    student_exam_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Start or restart a student exam.
    
    This endpoint:
    1. Validates that the exam exists and belongs to the student
    2. Checks if the exam can be started (timing, status, etc.)
    3. Updates the exam status to in_progress
    
    Returns:
        The updated student exam record
    """
    try:
        logger.info(f"Attempting to start exam: student_exam_id={student_exam_id}, user_id={current_user.id}")
        
        # First check if the student exam exists
        db_student_exam = student_exam_crud.get_student_exam(db, student_exam_id=student_exam_id)
        if db_student_exam is None:
            logger.error(f"Student exam not found: {student_exam_id}")
            raise HTTPException(status_code=404, detail="Student exam not found")
        
        # Check if user is the student
        if db_student_exam.student_id != current_user.id:
            logger.error(f"Permission denied: user_id={current_user.id} attempting to access exam for student_id={db_student_exam.student_id}")
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        # Try to start the exam
        try:
            started_exam = student_exam_crud.start_student_exam(db=db, student_exam_id=student_exam_id)
            if not started_exam:
                logger.error(f"Failed to start exam: {student_exam_id}")
                raise HTTPException(status_code=500, detail="Failed to start exam")
                
            logger.info(f"Successfully started exam: {student_exam_id}")
            return started_exam
            
        except ValueError as e:
            # Handle specific validation errors from crud function
            logger.warning(f"Validation error starting exam {student_exam_id}: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
            
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log unexpected errors
        logger.error(f"Unexpected error starting exam {student_exam_id}: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while starting the exam"
        )

@router.put("/{student_exam_id}/complete", response_model=StudentExamSchema)
def complete_student_exam(
    student_exam_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_student_exam = student_exam_crud.get_student_exam(db, student_exam_id=student_exam_id)
    if db_student_exam is None:
        raise HTTPException(status_code=404, detail="Student exam not found")
    
    # Check if user is the student
    if db_student_exam.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return student_exam_crud.complete_student_exam(db=db, student_exam_id=student_exam_id)

@router.delete("/{student_exam_id}", response_model=StudentExamSchema)
def delete_student_exam(
    student_exam_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission)
):
    db_student_exam = student_exam_crud.delete_student_exam(db, student_exam_id=student_exam_id)
    if db_student_exam is None:
        raise HTTPException(status_code=404, detail="Student exam not found")
    return db_student_exam

# StudentAnswer routes
@router.get("/{student_exam_id}/answers", response_model=List[StudentAnswerSimple])
def read_student_answers(
    student_exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_student_exam = student_exam_crud.get_student_exam(db, student_exam_id=student_exam_id)
    if db_student_exam is None:
        raise HTTPException(status_code=404, detail="Student exam not found")
    
    # Check if user is the student, a teacher, or an admin
    if db_student_exam.student_id != current_user.id and current_user.role not in ["teacher", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    student_answers = student_exam_crud.get_student_answers(db, student_exam_id=student_exam_id)
    return student_answers

@router.post("/{student_exam_id}/answers", response_model=StudentAnswerSimple)
def create_student_answer(
    student_exam_id: int,
    student_answer: StudentAnswerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if student exam exists
    db_student_exam = student_exam_crud.get_student_exam(db, student_exam_id=student_exam_id)
    if db_student_exam is None:
        raise HTTPException(status_code=404, detail="Student exam not found")
    
    # Check if user is the student
    if db_student_exam.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Ensure the student_exam_id in the path matches the one in the request body
    if student_exam_id != student_answer.student_exam_id:
        raise HTTPException(status_code=400, detail="Student exam ID in path must match student exam ID in request body")
    
    return student_exam_crud.create_student_answer(db=db, student_answer=student_answer)

# Endpoint for the legacy URL pattern with double student-exams
@router.get("/student-exams/{student_exam_id}/answers", response_model=List[StudentAnswerSimple])
def read_student_answers_legacy_url(
    student_exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Legacy endpoint to handle the double student-exams URL pattern.
    Redirects to the standard endpoint.
    """
    db_student_exam = student_exam_crud.get_student_exam(db, student_exam_id=student_exam_id)
    if db_student_exam is None:
        raise HTTPException(status_code=404, detail="Student exam not found")
    
    # Check if user is the student, a teacher, or an admin
    if db_student_exam.student_id != current_user.id and current_user.role not in ["teacher", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    student_answers = student_exam_crud.get_student_answers(db, student_exam_id=student_exam_id)
    return student_answers

@router.post("/student-exams/{student_exam_id}/answers", response_model=StudentAnswerSimple)
def create_student_answer_legacy_url(
    student_exam_id: int,
    student_answer: StudentAnswerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Legacy endpoint to handle the double student-exams URL pattern.
    Redirects to the standard endpoint.
    """
    # Check if student exam exists
    db_student_exam = student_exam_crud.get_student_exam(db, student_exam_id=student_exam_id)
    if db_student_exam is None:
        raise HTTPException(status_code=404, detail="Student exam not found")
    
    # Check if user is the student
    if db_student_exam.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Ensure the student_exam_id in the path matches the one in the request body
    if student_exam_id != student_answer.student_exam_id:
        raise HTTPException(status_code=400, detail="Student exam ID in path must match student exam ID in request body")
    
    return student_exam_crud.create_student_answer(db=db, student_answer=student_answer)

# Exam Result routes
@router.get("/{student_exam_id}/result", 
    response_model=ExamResultSchema,
    summary="Get exam result",
    description="Retrieve the detailed result for a specific student exam including score, marks, and pass status.",
    tags=["Exam Results"]
)
def read_exam_result(
    student_exam_id: int,
    recalculate: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get the exam result for a specific student exam.
    
    This endpoint retrieves detailed result information including:
    - Total questions
    - Correct answers
    - Score percentage
    - Obtained marks
    - Maximum marks
    - Pass/fail status
    
    Parameters:
    - student_exam_id: The ID of the student exam to get results for
    - recalculate: Set to true to force recalculation of results even if they already exist
    """
    # First check if the student exam exists
    db_student_exam = student_exam_crud.get_student_exam(db, student_exam_id=student_exam_id)
    if db_student_exam is None:
        raise HTTPException(status_code=404, detail="Student exam not found")
    
    # Check if user is the student, a teacher, or an admin
    if db_student_exam.student_id != current_user.id and current_user.role not in ["teacher", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Get the exam result
    exam_result = student_exam_crud.get_exam_result_by_student_exam(db, student_exam_id=student_exam_id)
    
    # If recalculate flag is set, or no result exists, calculate results
    if recalculate or exam_result is None:
        # If the exam is completed but no result exists, calculate it on the fly
        if db_student_exam.status == "completed" or recalculate:
            # Call complete_student_exam which will create or update the result
            student_exam_crud.complete_student_exam(db, student_exam_id=student_exam_id)
            # Now try to get the result again
            exam_result = student_exam_crud.get_exam_result_by_student_exam(db, student_exam_id=student_exam_id)
            if exam_result is None:
                raise HTTPException(status_code=404, detail="Exam result not found")
        else:
            raise HTTPException(status_code=404, detail="Exam result not found. The exam must be completed first.")
    
    return exam_result

@router.get("/student/{student_id}/results", 
    response_model=List[ExamResultSchema],
    summary="Get all exam results for a student",
    description="Retrieve all exam results for a specific student.",
    tags=["Exam Results"]
)
def read_student_exam_results(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all exam results for a specific student.
    
    This endpoint retrieves a list of all exam results for the specified student.
    Teachers and admins can access any student's results.
    Students can only access their own results.
    """
    # Check if user is the student, a teacher, or an admin
    if student_id != current_user.id and current_user.role not in ["teacher", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Get all student exams for the student
    student_exams = student_exam_crud.get_student_exams_by_student(db, student_id=student_id)
    if not student_exams:
        return []
    
    # Get exam results for each student exam
    exam_results = []
    for student_exam in student_exams:
        result = student_exam_crud.get_exam_result_by_student_exam(db, student_exam_id=student_exam.id)
        if result:
            exam_results.append(result)
    
    return exam_results

@router.post("/{exam_id}/retake", response_model=RemainingAttemptsResponse)
def retake_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retake an exam if there are remaining attempts available.
    Updates the exam attempt record to decrease remaining attempts.
    """
    logger.info(f"Attempting to retake exam: exam_id={exam_id}, student_id={current_user.id}")
    
    # Get active subscription
    active_subscription = db.query(UserSubscription).filter(
        and_(
            UserSubscription.user_id == current_user.id,
            UserSubscription.status == SubscriptionStatus.active,
            UserSubscription.end_date >= datetime.now()
        )
    ).first()

    if not active_subscription:
        raise HTTPException(status_code=403, detail="No active subscription found")

    # Get subscription details
    subscription = active_subscription.subscription_plan_package.subscription
    if not subscription:
        raise HTTPException(status_code=403, detail="Invalid subscription configuration")

    # Get the exam attempt record directly using exam_id
    latest_attempt = db.query(ExamAttempt).filter(
        and_(
            ExamAttempt.exam_id == exam_id,
            ExamAttempt.user_subscription_id == active_subscription.id
        )
    ).first()

    if not latest_attempt:
        # If no attempt record exists, create one with max attempts from subscription
        latest_attempt = exam_attempt_crud.create_or_update_exam_attempt(
            db=db,
            user_subscription_id=active_subscription.id,
            exam_id=exam_id,
            max_attempts=subscription.max_exams or 1
        )

    if latest_attempt.remaining_attempts <= 0:
        raise HTTPException(
            status_code=403, 
            detail="No remaining attempts available for this exam"
        )
    
    # Update the exam attempt count
    latest_attempt.remaining_attempts -= 1
    db.commit()
    db.refresh(latest_attempt)
    
    logger.info(f"Updated exam attempt. Remaining attempts: {latest_attempt.remaining_attempts}")
    
    # Return the remaining attempts response
    return RemainingAttemptsResponse(
        remaining_attempts=latest_attempt.remaining_attempts,
        max_attempts=subscription.max_exams or 1,
        exam_id=exam_id,
        student_id=current_user.id
    )

@router.get("/{exam_id}/attempts", response_model=RemainingAttemptsResponse)
def get_remaining_attempts(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get remaining attempts for an exam.
    """
    try:
        logger.info(f"Checking remaining attempts: exam_id={exam_id}, student_id={current_user.id}")
        
        # Get active subscription
        active_subscription = db.query(UserSubscription).filter(
            and_(
                UserSubscription.user_id == current_user.id,
                UserSubscription.status == SubscriptionStatus.active,
                UserSubscription.end_date >= datetime.now()
            )
        ).first()

        if not active_subscription:
            raise HTTPException(
                status_code=403, 
                detail="No active subscription found"
            )

        # Get subscription details
        subscription = active_subscription.subscription_plan_package.subscription
        if not subscription:
            raise HTTPException(
                status_code=403, 
                detail="Invalid subscription configuration"
            )

        # Get the exam attempt record directly using exam_id
        exam_attempt = db.query(ExamAttempt).filter(
            and_(
                ExamAttempt.exam_id == exam_id,
                ExamAttempt.user_subscription_id == active_subscription.id
            )
        ).first()

        # If no attempt record exists yet, return max attempts from subscription
        if not exam_attempt:
            return RemainingAttemptsResponse(
                remaining_attempts=subscription.max_exams or 1,
                max_attempts=subscription.max_exams or 1,
                exam_id=exam_id,
                student_id=current_user.id
            )

        return RemainingAttemptsResponse(
            remaining_attempts=exam_attempt.remaining_attempts,
            max_attempts=subscription.max_exams or 1,
            exam_id=exam_id,
            student_id=current_user.id
        )

    except Exception as e:
        logger.error(f"Error checking remaining attempts: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while checking remaining attempts"
        )

@router.get("/{exam_id}/all-attempts", 
    response_model=List[ExamResultSchema],
    summary="Get all attempts for an exam",
    description="Retrieve all attempts made by the student for a specific exam, ordered by attempt number.",
    tags=["Exam Results"]
)
async def get_all_exam_attempts(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all attempts for a specific exam by the current student.
    Returns a list of exam results ordered by attempt number.
    """
    try:
        logger.info(f"Retrieving all attempts for exam_id={exam_id}, user_id={current_user.id}")
        
        # First check if the exam exists
        exam = db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            logger.warning(f"Exam not found: exam_id={exam_id}")
            raise HTTPException(status_code=404, detail=f"Exam not found with ID: {exam_id}")

        # Get all student exams for this exam and student
        student_exams = db.query(StudentExam).filter(
            and_(
                StudentExam.exam_id == exam_id,
                StudentExam.student_id == current_user.id
            )
        ).all()
        
        if not student_exams:
            logger.info(f"No attempts found for exam_id={exam_id}, user_id={current_user.id}")
            return []  # Return empty list instead of 404 error
        
        logger.info(f"Found {len(student_exams)} student exam records")
        
        # Get all results for these student exams with relationships loaded
        results = []
        for student_exam in student_exams:
            exam_results = db.query(ExamResult).options(
                joinedload(ExamResult.student_exam)
            ).filter(
                ExamResult.student_exam_id == student_exam.id
            ).order_by(ExamResult.attempt_number).all()
            
            if exam_results:
                logger.info(f"Found {len(exam_results)} results for student_exam_id={student_exam.id}")
                results.extend(exam_results)
        
        if not results:
            logger.info(f"No results found for any attempts of exam_id={exam_id}")
            return []  # Return empty list instead of 404 error
        
        # Sort all results by attempt number
        results.sort(key=lambda x: x.attempt_number)
        logger.info(f"Returning {len(results)} total results")
        
        return results
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Error retrieving exam attempts: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@router.get("/{student_exam_id}/all-results", 
    response_model=List[ExamResultSchema],
    summary="Get all attempt results for a student exam",
    description="Retrieve all attempt results for a specific student exam by student_exam_id.",
    tags=["Exam Results"]
)
async def get_all_student_exam_attempts(
    student_exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all attempt results for a specific student exam identified by student_exam_id.
    
    This endpoint retrieves a list of all exam results for different attempts of the
    same student exam, ordered by attempt number.
    """
    try:
        logger.info(f"Retrieving all attempt results for student_exam_id={student_exam_id}")
        
        # First check if the student exam exists
        db_student_exam = student_exam_crud.get_student_exam(db, student_exam_id=student_exam_id)
        if not db_student_exam:
            logger.warning(f"Student exam not found: student_exam_id={student_exam_id}")
            raise HTTPException(status_code=404, detail=f"Student exam not found with ID: {student_exam_id}")
        
        # Check if user is the student, a teacher, or an admin
        if db_student_exam.student_id != current_user.id and current_user.role not in ["teacher", "admin", "superadmin"]:
            logger.warning(f"Permission denied: user_id={current_user.id} attempting to access exam results for student_id={db_student_exam.student_id}")
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        # Get all exam results for this student exam with relationships loaded
        exam_results = db.query(ExamResult).options(
            joinedload(ExamResult.student_exam)
        ).filter(
            ExamResult.student_exam_id == student_exam_id
        ).order_by(ExamResult.attempt_number).all()
        
        if not exam_results:
            logger.info(f"No results found for student_exam_id={student_exam_id}")
            return []  # Return empty list instead of 404 error
        
        logger.info(f"Found {len(exam_results)} results for student_exam_id={student_exam_id}")
        return exam_results
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Error retrieving student exam results: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@router.get("/{student_exam_id}/all-attempts/answers", 
    response_model=StudentAnswersAllAttempts,
    summary="Get answers for all attempts of a student exam",
    description="Retrieve all answers from all attempts for a specific student exam by student_exam_id.",
    tags=["Student Answers"]
)
async def get_all_student_exam_attempt_answers(
    student_exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get answers from all attempts for a specific student exam identified by student_exam_id.
    
    This endpoint retrieves a list of all answers for different attempts of the
    same student exam, organized by attempt number.
    
    Note: For completed past attempts, only metadata is available (scores, marks, etc.)
    as answers are cleared when starting a new attempt.
    """
    try:
        logger.info(f"Retrieving all attempt answers for student_exam_id={student_exam_id}")
        
        # First check if the student exam exists
        db_student_exam = student_exam_crud.get_student_exam(db, student_exam_id=student_exam_id)
        if not db_student_exam:
            logger.warning(f"Student exam not found: student_exam_id={student_exam_id}")
            raise HTTPException(status_code=404, detail=f"Student exam not found with ID: {student_exam_id}")
        
        # Check if user is the student, a teacher, or an admin
        if db_student_exam.student_id != current_user.id and current_user.role not in ["teacher", "admin", "superadmin"]:
            logger.warning(f"Permission denied: user_id={current_user.id} attempting to access exam answers for student_id={db_student_exam.student_id}")
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        # Get answers with attempt information
        attempts_answers = student_exam_crud.get_student_answers_all_attempts(db, student_exam_id=student_exam_id)
        
        if attempts_answers is None:
            raise HTTPException(status_code=404, detail=f"Student exam not found with ID: {student_exam_id}")
        
        # Get all exam results to have complete information about each attempt
        exam_results = db.query(ExamResult).filter(
            ExamResult.student_exam_id == student_exam_id
        ).order_by(ExamResult.attempt_number).all()
        
        # Format the response
        attempts_list = []
        for attempt_num, data in attempts_answers.items():
            if isinstance(data, list):  # Current attempt with answers
                attempt_info = {
                    "attempt_number": attempt_num,
                    "answers": data
                }
                
                # Add result data if available for this attempt
                for result in exam_results:
                    if result.attempt_number == attempt_num:
                        attempt_info["total_questions"] = result.total_questions
                        attempt_info["correct_answers"] = result.correct_answers
                        attempt_info["score_percentage"] = result.score_percentage
                        attempt_info["obtained_marks"] = result.obtained_marks
                        attempt_info["max_marks"] = result.max_marks
                        attempt_info["passed_status"] = result.passed_status
                        attempt_info["created_at"] = result.created_at
                        break
            else:  # Past attempt with metadata
                attempt_info = {
                    "attempt_number": data["attempt_number"],
                    "answers": data["answers"],
                    "total_questions": data["total_questions"],
                    "correct_answers": data["correct_answers"],
                    "score_percentage": data["score_percentage"],
                    "obtained_marks": data["obtained_marks"],
                    "max_marks": data["max_marks"],
                    "passed_status": data["passed_status"],
                    "created_at": data["created_at"]
                }
            
            attempts_list.append(StudentAnswerAttempt(**attempt_info))
        
        # Create the full response - ensuring we don't have null values for required fields
        # Get the exam_id from the parent student_exam to avoid null values
        exam_id = db_student_exam.exam_id if db_student_exam.exam_id is not None else 0
        
        response = {
            "student_exam_id": db_student_exam.id,
            "student_id": db_student_exam.student_id,
            "exam_id": exam_id,
            "status": db_student_exam.status,
            "attempts": attempts_list
        }
        
        return StudentAnswersAllAttempts(**response)
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Error retrieving student exam attempt answers: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )
        
# Also add a legacy URL endpoint
@router.get("/student-exams/{student_exam_id}/all-attempts/answers", 
    response_model=StudentAnswersAllAttempts,
    summary="Get answers for all attempts of a student exam (Legacy URL)",
    description="Legacy URL pattern for retrieving all answers from all attempts for a specific student exam.",
    tags=["Student Answers"]
)
async def get_all_student_exam_attempt_answers_legacy_url(
    student_exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Legacy endpoint to handle the double student-exams URL pattern.
    Redirects to the standard endpoint.
    """
    try:
        # First check if the student exam exists
        db_student_exam = student_exam_crud.get_student_exam(db, student_exam_id=student_exam_id)
        if not db_student_exam:
            logger.warning(f"Student exam not found: student_exam_id={student_exam_id}")
            raise HTTPException(status_code=404, detail=f"Student exam not found with ID: {student_exam_id}")
        
        # Check if user is the student, a teacher, or an admin
        if db_student_exam.student_id != current_user.id and current_user.role not in ["teacher", "admin", "superadmin"]:
            logger.warning(f"Permission denied: user_id={current_user.id} attempting to access exam answers for student_id={db_student_exam.student_id}")
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        # Get answers with attempt information
        attempts_answers = student_exam_crud.get_student_answers_all_attempts(db, student_exam_id=student_exam_id)
        
        if attempts_answers is None:
            raise HTTPException(status_code=404, detail=f"Student exam not found with ID: {student_exam_id}")
        
        # Get all exam results to have complete information about each attempt
        exam_results = db.query(ExamResult).filter(
            ExamResult.student_exam_id == student_exam_id
        ).order_by(ExamResult.attempt_number).all()
        
        # Format the response
        attempts_list = []
        for attempt_num, data in attempts_answers.items():
            if isinstance(data, list):  # Current attempt with answers
                attempt_info = {
                    "attempt_number": attempt_num,
                    "answers": data
                }
                
                # Add result data if available for this attempt
                for result in exam_results:
                    if result.attempt_number == attempt_num:
                        attempt_info["total_questions"] = result.total_questions
                        attempt_info["correct_answers"] = result.correct_answers
                        attempt_info["score_percentage"] = result.score_percentage
                        attempt_info["obtained_marks"] = result.obtained_marks
                        attempt_info["max_marks"] = result.max_marks
                        attempt_info["passed_status"] = result.passed_status
                        attempt_info["created_at"] = result.created_at
                        break
            else:  # Past attempt with metadata
                attempt_info = {
                    "attempt_number": data["attempt_number"],
                    "answers": data["answers"],
                    "total_questions": data["total_questions"],
                    "correct_answers": data["correct_answers"],
                    "score_percentage": data["score_percentage"],
                    "obtained_marks": data["obtained_marks"],
                    "max_marks": data["max_marks"],
                    "passed_status": data["passed_status"],
                    "created_at": data["created_at"]
                }
            
            attempts_list.append(StudentAnswerAttempt(**attempt_info))
        
        # Create the full response - ensuring we don't have null values for required fields
        # Get the exam_id from the parent student_exam to avoid null values
        exam_id = db_student_exam.exam_id if db_student_exam.exam_id is not None else 0
        
        response = {
            "student_exam_id": db_student_exam.id,
            "student_id": db_student_exam.student_id,
            "exam_id": exam_id,
            "status": db_student_exam.status,
            "attempts": attempts_list
        }
        
        return StudentAnswersAllAttempts(**response)
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Error retrieving student exam attempt answers (legacy URL): {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )
