from sqlalchemy.orm import Session
from sqlalchemy import func, and_, Integer
from datetime import datetime
from typing import List, Optional
from app.models.models import (
    StudentExam, StudentAnswer, ExamStatus, ExamResult, 
    Exam, ExamQuestion, Answer, UserSubscription, 
    SubscriptionStatus, ExamAttempt
)
from app.schemas.schemas import (
    StudentExamCreate, StudentExamUpdate, 
    StudentAnswerCreate, ExamResultCreate, 
    ExamResultUpdate
)
import logging
import traceback

logger = logging.getLogger(__name__)

def get_student_exam(db: Session, student_exam_id: int):
    return db.query(StudentExam).filter(StudentExam.id == student_exam_id).first()

def get_student_exams(db: Session, skip: int = 0, limit: int = 100):
    return db.query(StudentExam).offset(skip).limit(limit).all()

def get_student_exams_by_student(
    db: Session, 
    student_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> List[StudentExam]:
    """Get all exams taken by a student within the specified date range."""
    query = db.query(StudentExam).filter(StudentExam.student_id == student_id)
    
    if start_date:
        query = query.filter(StudentExam.created_at >= start_date)
    if end_date:
        query = query.filter(StudentExam.created_at <= end_date)
    
    return query.all()

def get_student_exams_by_exam(db: Session, exam_id: int, skip: int = 0, limit: int = 100):
    return db.query(StudentExam).filter(StudentExam.exam_id == exam_id).offset(skip).limit(limit).all()

def create_student_exam(db: Session, student_exam: StudentExamCreate):
    # Create master student exam record
    db_student_exam = StudentExam(
        student_id=student_exam.student_id,
        exam_id=student_exam.exam_id,
        status=student_exam.status  # Explicitly setting the status field
    )
    db.add(db_student_exam)
    db.commit()
    db.refresh(db_student_exam)

    # Get active subscription to check max attempts
    active_subscription = db.query(UserSubscription).filter(
        and_(
            UserSubscription.user_id == student_exam.student_id,
            UserSubscription.status == SubscriptionStatus.active,
            UserSubscription.end_date >= datetime.now()
        )
    ).first()

    if not active_subscription:
        raise ValueError("No active subscription found")

    # Get subscription details to check max_exams
    subscription = active_subscription.subscription_plan_package.subscription
    if not subscription:
        raise ValueError("Invalid subscription configuration")

    # Calculate initial remaining attempts
    max_attempts = subscription.max_exams or 1
    initial_remaining = max_attempts - 1  # First attempt uses one
    
    logger.info(f"Creating first exam attempt - Max attempts from subscription: {max_attempts}")
    logger.info(f"Initial remaining attempts after first attempt: {initial_remaining}")

    # Create first attempt record
    exam_attempt = ExamAttempt(
        user_subscription_id=active_subscription.id,
        exam_id=student_exam.exam_id,
        remaining_attempts=initial_remaining
    )
    db.add(exam_attempt)
    db.commit()

    return db_student_exam

def update_student_exam(db: Session, student_exam_id: int, student_exam: StudentExamUpdate):
    db_student_exam = get_student_exam(db, student_exam_id)
    if not db_student_exam:
        return None
    
    update_data = student_exam.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_student_exam, key, value)
    
    db.commit()
    db.refresh(db_student_exam)
    return db_student_exam

def start_student_exam(db: Session, student_exam_id: int):
    """
    Start or restart a student exam by updating its status to in_progress.
    Also validates that the exam can be started.
    Preserves old attempt results while creating a new attempt.
    """
    try:
        logger.info(f"Starting exam with student_exam_id={student_exam_id}")
        
        # Get student exam with relationships loaded
        db_student_exam = db.query(StudentExam).filter(StudentExam.id == student_exam_id).first()
        if not db_student_exam:
            logger.error(f"Student exam not found: student_exam_id={student_exam_id}")
            raise ValueError(f"Student exam not found with ID: {student_exam_id}")
        
        logger.info(f"Found student exam: student_id={db_student_exam.student_id}, exam_id={db_student_exam.exam_id}")
        
        # Get the exam to check timing
        exam = db.query(Exam).filter(Exam.id == db_student_exam.exam_id).first()
        if not exam:
            logger.error(f"Associated exam not found: exam_id={db_student_exam.exam_id}")
            raise ValueError(f"Associated exam not found with ID: {db_student_exam.exam_id}")
        
        logger.info(f"Found exam: id={exam.id}, start_time={exam.start_datetime}, end_time={exam.end_datetime}")
        
        # Check if exam is within its time window
        # Convert to timezone-aware datetime
        current_time = datetime.now().astimezone()
        exam_start = exam.start_datetime.astimezone() if exam.start_datetime else None
        exam_end = exam.end_datetime.astimezone() if exam.end_datetime else None
        
        if exam_start and current_time < exam_start:
            msg = f"Exam has not started yet. Current time: {current_time}, Start time: {exam_start}"
            logger.warning(msg)
            raise ValueError(msg)
        if exam_end and current_time > exam_end:
            msg = f"Exam has ended. Current time: {current_time}, End time: {exam_end}"
            logger.warning(msg)
            raise ValueError(msg)
        
        # Get active subscription to check attempts
        active_subscription = db.query(UserSubscription).filter(
            and_(
                UserSubscription.user_id == db_student_exam.student_id,
                UserSubscription.status == SubscriptionStatus.active,
                UserSubscription.end_date >= current_time
            )
        ).first()

        if not active_subscription:
            logger.error(f"No active subscription found for user_id={db_student_exam.student_id}")
            raise ValueError("No active subscription found")

        logger.info(f"Found active subscription: id={active_subscription.id}")

        # Get subscription details
        subscription = active_subscription.subscription_plan_package.subscription
        if not subscription:
            logger.error("Invalid subscription configuration")
            raise ValueError("Invalid subscription configuration")

        # Check remaining attempts
        exam_attempt = db.query(ExamAttempt).filter(
            and_(
                ExamAttempt.exam_id == db_student_exam.exam_id,
                ExamAttempt.user_subscription_id == active_subscription.id
            )
        ).first()

        if not exam_attempt:
            # Create new exam attempt if none exists
            logger.info(f"Creating new exam attempt for exam_id={db_student_exam.exam_id}")
            exam_attempt = ExamAttempt(
                user_subscription_id=active_subscription.id,
                exam_id=db_student_exam.exam_id,
                remaining_attempts=subscription.max_exams or 1
            )
            db.add(exam_attempt)
        elif exam_attempt.remaining_attempts <= 0:
            msg = f"No remaining attempts. Current attempts: {exam_attempt.remaining_attempts}"
            logger.warning(msg)
            raise ValueError(msg)
        
        logger.info(f"Remaining attempts: {exam_attempt.remaining_attempts}")
        
        # If exam was previously started, preserve results but clear answers
        if db_student_exam.status != ExamStatus.not_started:
            logger.info(f"Clearing previous answers for new attempt. Current status: {db_student_exam.status}")
            
            # Get the latest attempt number
            latest_result = db.query(ExamResult).filter(
                ExamResult.student_exam_id == student_exam_id
            ).order_by(ExamResult.attempt_number.desc()).first()
            
            # Only delete answers, keep the results
            deleted_answers = db.query(StudentAnswer).filter(
                StudentAnswer.student_exam_id == student_exam_id
            ).delete()
            logger.info(f"Deleted {deleted_answers} previous answers for new attempt")
            
            logger.info(f"Preserved previous results. Latest attempt number: {latest_result.attempt_number if latest_result else 0}")
        
        # Update exam status to in_progress
        db_student_exam.status = ExamStatus.in_progress
        db_student_exam.updated_at = current_time
        
        # Decrement remaining attempts
        exam_attempt.remaining_attempts -= 1
        exam_attempt.updated_at = current_time
    
        try:
            db.commit()
            db.refresh(db_student_exam)
            logger.info(f"Successfully started/restarted exam: student_exam_id={student_exam_id}, status={db_student_exam.status}, remaining_attempts={exam_attempt.remaining_attempts}")
            return db_student_exam
        except Exception as commit_error:
            db.rollback()
            logger.error(f"Database commit error: {str(commit_error)}")
            logger.error(traceback.format_exc())
            raise ValueError("Failed to save exam start changes to database")
        
    except ValueError as ve:
        # Re-raise ValueError with the same message
        raise
    except Exception as e:
        logger.error(f"Unexpected error in start_student_exam: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise ValueError(f"Failed to start exam: {str(e)}")

def complete_student_exam(db: Session, student_exam_id: int):
    """
    Complete a student exam and calculate results.
    """
    try:
        logger.info(f"Completing exam: student_exam_id={student_exam_id}")
        
        db_student_exam = get_student_exam(db, student_exam_id)
        if not db_student_exam:
            logger.error(f"Student exam not found: {student_exam_id}")
            raise ValueError("Student exam not found")
        
        # Get student answers and related info
        student_answers = get_student_answers(db, student_exam_id)
        logger.info(f"Found {len(student_answers)} student answers")
        
        # Load the exam with its questions and their marks
        exam = db.query(Exam).filter(Exam.id == db_student_exam.exam_id).first()
        if not exam:
            logger.error(f"Associated exam not found: exam_id={db_student_exam.exam_id}")
            raise ValueError("Associated exam not found")
        
        # Get all exam questions with their marks
        exam_questions = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam.id).all()
        logger.info(f"Found {len(exam_questions)} exam questions")
        
        # Create a dictionary mapping question_id to its marks for quick lookup
        question_marks = {eq.question_id: eq.marks for eq in exam_questions}
        
        # Use exam.max_questions directly for total questions
        # This ensures we use the configured value from the exam table
        total_questions = exam.max_questions
        logger.info(f"Total questions from exam configuration: {total_questions}")
        
        # Count attempted questions, correct answers and calculate obtained marks
        correct_answers = 0
        obtained_marks = 0.0
        attempted_questions = len(student_answers)
        
        # Create a dictionary of answered questions for quick lookup
        answered_questions = {answer.question_id: answer for answer in student_answers}
        
        # Calculate total possible marks for all questions
        total_possible_marks = sum(eq.marks for eq in exam_questions)
        
        # Calculate per-question average mark if needed for normalization
        avg_mark_per_question = total_possible_marks / len(exam_questions) if exam_questions else 0
        
        # Calculate max marks based on total_questions (from exam configuration)
        # This ensures that max_marks corresponds to the number of questions the student should answer
        max_marks = avg_mark_per_question * total_questions
        logger.info(f"Max marks (based on {total_questions} questions): {max_marks}")
        
        # Process each exam question that was attempted
        for exam_question in exam_questions:
            question_id = exam_question.question_id
            question_mark = question_marks[question_id]  # Get marks from the dictionary
            
            # Check if this question was answered
            if question_id in answered_questions:
                answer = answered_questions[question_id]
                if answer.is_correct:
                    correct_answers += 1
                    obtained_marks += question_mark  # Add the full marks for the question
                    logger.info(f"Question {question_id} correct, adding {question_mark} marks")
        
        logger.info(f"Attempted questions: {attempted_questions}, Correct answers: {correct_answers}, Obtained marks: {obtained_marks}")
        
        # Calculate score percentage (correctly answered divided by total available)
        score_percentage = (obtained_marks / max_marks * 100) if max_marks > 0 else 0
        score_percentage = round(score_percentage, 2)  # Round to 2 decimal places
        
        logger.info(f"Score percentage: {score_percentage}%")
        
        # Determine pass/fail status (assuming 40% as passing score)
        passing_percentage = 40.0
        passed_status = score_percentage >= passing_percentage
        
        # Get the current attempt number
        latest_result = db.query(ExamResult).filter(
            ExamResult.student_exam_id == student_exam_id
        ).order_by(ExamResult.attempt_number.desc()).first()
        
        attempt_number = (latest_result.attempt_number + 1) if latest_result else 1
        
        # Create result data
        result_data = {
            "student_exam_id": student_exam_id,
            "attempt_number": attempt_number,
            "total_questions": total_questions,
            "correct_answers": correct_answers,
            "score_percentage": score_percentage,
            "obtained_marks": round(obtained_marks, 2),
            "max_marks": round(max_marks, 2),
            "passed_status": passed_status
        }
        
        # Create new exam result
        create_exam_result(db, ExamResultCreate(**result_data))
        logger.info(f"Created exam result for attempt {attempt_number}")
        
        # Update student exam status
        db_student_exam.status = ExamStatus.completed
        db_student_exam.updated_at = datetime.now()
        
        db.commit()
        db.refresh(db_student_exam)
        
        logger.info(f"Successfully completed exam: student_exam_id={student_exam_id}")
        return db_student_exam
        
    except Exception as e:
        logger.error(f"Error completing exam: {str(e)}")
        logger.error(traceback.format_exc())
        raise ValueError(f"Failed to complete exam: {str(e)}")

def delete_student_exam(db: Session, student_exam_id: int):
    db_student_exam = get_student_exam(db, student_exam_id)
    if not db_student_exam:
        return None
    
    # Delete associated student answers first
    db.query(StudentAnswer).filter(StudentAnswer.student_exam_id == student_exam_id).delete()
    
    db.delete(db_student_exam)
    db.commit()
    return db_student_exam

# StudentAnswer CRUD operations
def get_student_answer(db: Session, student_answer_id: int):
    return db.query(StudentAnswer).filter(StudentAnswer.id == student_answer_id).first()

def get_student_answers(db: Session, student_exam_id: int):
    return db.query(StudentAnswer).filter(StudentAnswer.student_exam_id == student_exam_id).all()

def create_student_answer(db: Session, student_answer: StudentAnswerCreate):
    # Check if the selected answer is correct by querying the Answer table
    is_correct = False
    if student_answer.answer_id:
        # Look up the correct answer from the database
        db_answer = db.query(Answer).filter(Answer.id == student_answer.answer_id).first()
        if db_answer:
            is_correct = db_answer.is_correct
    
    # Create the student answer with the verified is_correct flag
    db_student_answer = StudentAnswer(
        student_exam_id=student_answer.student_exam_id,
        question_id=student_answer.question_id,
        answer_id=student_answer.answer_id,
        is_correct=is_correct  # Use the verified value, not the one from the request
    )
    db.add(db_student_answer)
    db.commit()
    db.refresh(db_student_answer)
    return db_student_answer

def update_student_answer(db: Session, student_answer_id: int, answer_id: int, is_correct: bool = None):
    db_student_answer = get_student_answer(db, student_answer_id)
    if not db_student_answer:
        return None
    
    # Check if the selected answer is correct by querying the Answer table
    if answer_id:
        # Look up the correct answer from the database
        db_answer = db.query(Answer).filter(Answer.id == answer_id).first()
        if db_answer:
            # Use the is_correct value from the database, not the provided one
            is_correct = db_answer.is_correct
    
    db_student_answer.answer_id = answer_id
    db_student_answer.is_correct = is_correct
    
    db.commit()
    db.refresh(db_student_answer)
    return db_student_answer

def delete_student_answer(db: Session, student_answer_id: int):
    db_student_answer = get_student_answer(db, student_answer_id)
    if not db_student_answer:
        return None
    
    db.delete(db_student_answer)
    db.commit()
    return db_student_answer

# ExamResult CRUD operations
def get_exam_result(db: Session, result_id: int):
    return db.query(ExamResult).filter(ExamResult.id == result_id).first()

def get_exam_result_by_student_exam(
    db: Session, 
    student_exam_id: int
) -> Optional[ExamResult]:
    """Get the exam result for a specific student exam."""
    return db.query(ExamResult).filter(
        ExamResult.student_exam_id == student_exam_id
    ).first()

def create_exam_result(db: Session, exam_result: ExamResultCreate):
    # Ensure values are correct type and properly rounded
    obtained_marks = round(float(exam_result.obtained_marks) if exam_result.obtained_marks is not None else 0.0, 2)
    max_marks = round(float(exam_result.max_marks) if exam_result.max_marks is not None else 0.0, 2)
    score_percentage = round(float(exam_result.score_percentage) if exam_result.score_percentage is not None else 0.0, 2)
    
    db_exam_result = ExamResult(
        student_exam_id=exam_result.student_exam_id,
        attempt_number=exam_result.attempt_number,
        total_questions=exam_result.total_questions,
        correct_answers=exam_result.correct_answers,
        score_percentage=score_percentage,
        obtained_marks=obtained_marks,
        max_marks=max_marks,
        passed_status=exam_result.passed_status
    )
    db.add(db_exam_result)
    db.commit()
    db.refresh(db_exam_result)
    return db_exam_result

def update_exam_result(db: Session, result_id: int, exam_result: ExamResultUpdate):
    db_exam_result = get_exam_result(db, result_id)
    if not db_exam_result:
        return None
    
    update_data = exam_result.model_dump(exclude_unset=True)
    
    # Handle floating-point values with proper rounding
    if 'obtained_marks' in update_data:
        update_data['obtained_marks'] = round(float(update_data['obtained_marks']) if update_data['obtained_marks'] is not None else 0.0, 2)
    if 'max_marks' in update_data:
        update_data['max_marks'] = round(float(update_data['max_marks']) if update_data['max_marks'] is not None else 0.0, 2)
    if 'score_percentage' in update_data:
        update_data['score_percentage'] = round(float(update_data['score_percentage']) if update_data['score_percentage'] is not None else 0.0, 2)
    
    for key, value in update_data.items():
        setattr(db_exam_result, key, value)
    
    db.commit()
    db.refresh(db_exam_result)
    return db_exam_result

def delete_exam_result(db: Session, result_id: int):
    db_exam_result = get_exam_result(db, result_id)
    if not db_exam_result:
        return None
    
    db.delete(db_exam_result)
    db.commit()
    return db_exam_result

def get_active_subscription(
    db: Session, 
    student_id: int
) -> Optional[UserSubscription]:
    """Get the active subscription for a student."""
    return db.query(UserSubscription).filter(
        and_(
            UserSubscription.user_id == student_id,
            UserSubscription.status == SubscriptionStatus.active,
            UserSubscription.end_date >= datetime.now()
        )
    ).first()

def get_student_performance_stats(
    db: Session, 
    student_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> dict:
    """Get comprehensive performance statistics for a student."""
    # Base query for exam results
    query = db.query(
        func.count(ExamResult.id).label('total_exams'),
        func.avg(ExamResult.score_percentage).label('average_score'),
        func.max(ExamResult.score_percentage).label('highest_score'),
        func.min(ExamResult.score_percentage).label('lowest_score'),
        func.sum(ExamResult.passed_status.cast(Integer)).label('total_passed')
    ).join(
        StudentExam, StudentExam.id == ExamResult.student_exam_id
    ).filter(
        StudentExam.student_id == student_id
    )

    # Apply date filters if provided
    if start_date:
        query = query.filter(ExamResult.created_at >= start_date)
    if end_date:
        query = query.filter(ExamResult.created_at <= end_date)

    # Execute query
    result = query.first()

    return {
        'total_exams': result.total_exams or 0,
        'average_score': float(result.average_score or 0),
        'highest_score': float(result.highest_score or 0),
        'lowest_score': float(result.lowest_score or 0),
        'total_passed': result.total_passed or 0
    }

def get_subject_performance(
    db: Session, 
    student_id: int
) -> List[dict]:
    """Get subject-wise performance statistics for a student."""
    results = []
    
    # Get all completed exams grouped by subject
    exams = db.query(
        Exam.subject_id,
        func.count(ExamResult.id).label('total_exams'),
        func.avg(ExamResult.score_percentage).label('average_score'),
        func.max(ExamResult.score_percentage).label('highest_score'),
        func.sum(ExamResult.passed_status.cast(Integer)).label('total_passed')
    ).join(
        StudentExam, StudentExam.exam_id == Exam.id
    ).join(
        ExamResult, ExamResult.student_exam_id == StudentExam.id
    ).filter(
        StudentExam.student_id == student_id,
        StudentExam.status == ExamStatus.completed
    ).group_by(
        Exam.subject_id
    ).all()

    for exam in exams:
        results.append({
            'subject_id': exam.subject_id,
            'total_exams': exam.total_exams,
            'average_score': float(exam.average_score),
            'highest_score': float(exam.highest_score),
            'total_passed': exam.total_passed
        })

    return results

def get_class_performance(
    db: Session,
    class_id: int,
    subject_id: Optional[int] = None
) -> List[dict]:
    """Get performance statistics for an entire class."""
    # Base query for class performance
    query = db.query(
        StudentExam.student_id,
        func.count(ExamResult.id).label('total_exams'),
        func.avg(ExamResult.score_percentage).label('average_score'),
        func.sum(ExamResult.passed_status.cast(Integer)).label('total_passed')
    ).join(
        ExamResult, ExamResult.student_exam_id == StudentExam.id
    ).join(
        Exam, Exam.id == StudentExam.exam_id
    ).filter(
        Exam.class_id == class_id
    )

    # Add subject filter if provided
    if subject_id:
        query = query.filter(Exam.subject_id == subject_id)

    # Group by student
    query = query.group_by(StudentExam.student_id)

    results = []
    for result in query.all():
        results.append({
            'student_id': result.student_id,
            'total_exams': result.total_exams,
            'average_score': float(result.average_score),
            'total_passed': result.total_passed
        })

    return results

def get_student_answers_all_attempts(db: Session, student_exam_id: int):
    """
    Get all student answers for all attempts of a specific student exam, with attempt information.
    
    This function returns a dictionary where the keys are attempt numbers and the values are
    lists of student answers corresponding to each attempt.
    """
    # First check if the student exam exists
    db_student_exam = get_student_exam(db, student_exam_id=student_exam_id)
    if not db_student_exam:
        return None
    
    # Get all exam results for this student exam to determine the attempts
    exam_results = db.query(ExamResult).filter(
        ExamResult.student_exam_id == student_exam_id
    ).order_by(ExamResult.attempt_number).all()
    
    # If there are no results yet, return empty dictionary
    if not exam_results:
        return {}
    
    # For the current (active) attempt, get the current answers
    current_answers = db.query(StudentAnswer).filter(
        StudentAnswer.student_exam_id == student_exam_id
    ).all()
    
    # Format and organize results by attempt number
    attempts_answers = {}
    
    # Get the maximum attempt number
    max_attempt = max([result.attempt_number for result in exam_results]) if exam_results else 0
    
    # Check if the current exam is in progress (has a new attempt that isn't in results yet)
    current_attempt = max_attempt + 1 if db_student_exam.status == ExamStatus.in_progress else max_attempt
    
    # Add current answers to the appropriate attempt
    if current_answers:
        attempts_answers[current_attempt] = current_answers
    
    # For older attempts, we need to reconstruct based on results
    # Since answers get deleted between attempts, we rely on exam results
    for result in exam_results:
        # Skip the current attempt as it's already handled
        if result.attempt_number == current_attempt:
            continue
            
        # Add an entry for this attempt with its results metadata
        attempts_answers[result.attempt_number] = {
            "attempt_number": result.attempt_number,
            "total_questions": result.total_questions,
            "correct_answers": result.correct_answers,
            "score_percentage": result.score_percentage,
            "obtained_marks": result.obtained_marks,
            "max_marks": result.max_marks,
            "passed_status": result.passed_status,
            "created_at": result.created_at,
            # No actual answers are available for past attempts since they get deleted
            "answers": []
        }
    
    return attempts_answers
