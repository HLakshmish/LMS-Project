from sqlalchemy.orm import Session, joinedload
from datetime import datetime
from typing import List
from app.models.models import Exam, ExamQuestion, Question
from app.schemas.exam_schema import ExamCreate, ExamUpdate, ExamQuestionCreate, BulkExamQuestionCreate

def get_exam(db: Session, exam_id: int):
    return (
        db.query(Exam)
        .options(
            joinedload(Exam.exam_questions)
            .joinedload(ExamQuestion.question)
            .joinedload(Question.answers),
            joinedload(Exam.course),
            joinedload(Exam.class_),
            joinedload(Exam.subject),
            joinedload(Exam.chapter),
            joinedload(Exam.topic)
        )
        .filter(Exam.id == exam_id)
        .first()
    )

def get_exams(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(Exam)
        .options(
            joinedload(Exam.exam_questions)
            .joinedload(ExamQuestion.question)
            .joinedload(Question.answers),
            joinedload(Exam.course),
            joinedload(Exam.class_),
            joinedload(Exam.subject),
            joinedload(Exam.chapter),
            joinedload(Exam.topic)
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_exams_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(Exam).filter(Exam.created_by == user_id).offset(skip).limit(limit).all()

def create_exam(db: Session, exam: ExamCreate, user_id: int):
    db_exam = Exam(
        title=exam.title,
        description=exam.description,
        start_datetime=exam.start_datetime,
        end_datetime=exam.end_datetime,
        duration_minutes=exam.duration_minutes,
        max_marks=exam.max_marks,
        max_questions=exam.max_questions,
        course_id=exam.course_id,
        class_id=exam.class_id,
        subject_id=exam.subject_id,
        chapter_id=exam.chapter_id,
        topic_id=exam.topic_id,
        created_by=user_id
    )
    db.add(db_exam)
    db.commit()
    db.refresh(db_exam)
    return db_exam

def update_exam(db: Session, exam_id: int, exam: ExamUpdate):
    db_exam = get_exam(db, exam_id)
    if not db_exam:
        return None
    
    # Get the fields to update, making sure to use exclude_unset to only update
    # fields that were explicitly provided in the request
    try:
        # For Pydantic v2
        update_data = exam.model_dump(exclude_unset=True)
    except AttributeError:
        # Fallback for older Pydantic versions
        update_data = exam.dict(exclude_unset=True)
    
    # Apply updates to the database model
    for key, value in update_data.items():
        setattr(db_exam, key, value)
    
    # Commit the changes
    db.commit()
    db.refresh(db_exam)
    return db_exam

def delete_exam(db: Session, exam_id: int):
    db_exam = get_exam(db, exam_id)
    if not db_exam:
        return None
    
    # Delete associated exam questions first
    db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam_id).delete()
    
    db.delete(db_exam)
    db.commit()
    return db_exam

# ExamQuestion CRUD operations
def get_exam_question(db: Session, exam_question_id: int):
    return db.query(ExamQuestion).filter(ExamQuestion.id == exam_question_id).first()

def get_exam_questions(db: Session, exam_id: int, skip: int = 0, limit: int = 100):
    """Get all questions for a specific exam with their details"""
    return (
        db.query(ExamQuestion)
        .options(
            joinedload(ExamQuestion.question)
            .joinedload(Question.answers)
        )
        .filter(ExamQuestion.exam_id == exam_id)
        .offset(skip)
        .limit(limit)
        .all()
    )

def add_question_to_exam(db: Session, exam_question: ExamQuestionCreate):
    """Add a single question to an exam"""
    # Check if question already exists in exam
    existing = (
        db.query(ExamQuestion)
        .filter(
            ExamQuestion.exam_id == exam_question.exam_id,
            ExamQuestion.question_id == exam_question.question_id
        )
        .first()
    )
    
    if existing:
        return existing

    db_exam_question = ExamQuestion(
        exam_id=exam_question.exam_id,
        question_id=exam_question.question_id,
        marks=exam_question.marks
    )
    db.add(db_exam_question)
    db.commit()
    db.refresh(db_exam_question)
    
    # Reload with relationships
    return (
        db.query(ExamQuestion)
        .options(
            joinedload(ExamQuestion.question)
            .joinedload(Question.answers)
        )
        .filter(ExamQuestion.id == db_exam_question.id)
        .first()
    )

def bulk_add_questions_to_exam(db: Session, bulk_create: BulkExamQuestionCreate) -> List[ExamQuestion]:
    """Add multiple questions to an exam at once"""
    # Get existing questions for this exam
    existing_questions = {
        eq.question_id: eq for eq in 
        db.query(ExamQuestion)
        .filter(ExamQuestion.exam_id == bulk_create.exam_id)
        .all()
    }
    
    results = []
    for question_id in bulk_create.question_ids:
        if question_id in existing_questions:
            results.append(existing_questions[question_id])
            continue
            
        db_exam_question = ExamQuestion(
            exam_id=bulk_create.exam_id,
            question_id=question_id,
            marks=bulk_create.marks
        )
        db.add(db_exam_question)
        results.append(db_exam_question)
    
    db.commit()
    
    # Refresh all objects
    for result in results:
        db.refresh(result)
    
    # Reload all with relationships
    question_ids = [eq.id for eq in results]
    return (
        db.query(ExamQuestion)
        .options(
            joinedload(ExamQuestion.question)
            .joinedload(Question.answers)
        )
        .filter(ExamQuestion.id.in_(question_ids))
        .all()
    )

def remove_question_from_exam(db: Session, exam_id: int, question_id: int):
    """Remove a specific question from an exam"""
    db_exam_question = (
        db.query(ExamQuestion)
        .filter(
            ExamQuestion.exam_id == exam_id,
            ExamQuestion.question_id == question_id
        )
        .first()
    )
    
    if db_exam_question:
        db.delete(db_exam_question)
        db.commit()
    
    return db_exam_question

def update_exam_question_marks(db: Session, exam_id: int, question_id: int, marks: float):
    """Update the marks for a specific question in an exam"""
    db_exam_question = (
        db.query(ExamQuestion)
        .filter(
            ExamQuestion.exam_id == exam_id,
            ExamQuestion.question_id == question_id
        )
        .first()
    )
    
    if db_exam_question:
        db_exam_question.marks = marks
        db.commit()
        db.refresh(db_exam_question)
        
        # Reload with relationships
        return (
            db.query(ExamQuestion)
            .options(
                joinedload(ExamQuestion.question)
                .joinedload(Question.answers)
            )
            .filter(ExamQuestion.id == db_exam_question.id)
            .first()
        )
    
    return None
