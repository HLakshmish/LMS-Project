from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.auth import get_current_active_user, check_teacher_permission
from app.crud import exam as exam_crud
from app.crud import question as question_crud
from app.schemas.exam_schema import (
    ExamQuestion,
    ExamQuestionCreate,
    ExamQuestionResponse,
    BulkExamQuestionCreate
)
from app.schemas.schemas import User

router = APIRouter(
    prefix="/exams/{exam_id}/questions",
    tags=["Exam Questions"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[ExamQuestionResponse])
def read_exam_questions(
    exam_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all questions for a specific exam.
    """
    # Check if exam exists
    exam = exam_crud.get_exam(db, exam_id=exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    return exam_crud.get_exam_questions(db, exam_id=exam_id, skip=skip, limit=limit)

@router.post("/", response_model=ExamQuestionResponse)
def add_question_to_exam(
    exam_id: int,
    exam_question: ExamQuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Add a single question to an exam.
    """
    # Check if exam exists
    exam = exam_crud.get_exam(db, exam_id=exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Check if user is the creator of the exam or an admin
    if exam.created_by != current_user.id and current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Check if question exists
    question = question_crud.get_question(db, question_id=exam_question.question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Ensure exam_id in path matches exam_id in request body
    if exam_id != exam_question.exam_id:
        raise HTTPException(
            status_code=400,
            detail="Exam ID in path must match exam ID in request body"
        )
    
    return exam_crud.add_question_to_exam(db=db, exam_question=exam_question)

@router.post("/bulk", response_model=List[ExamQuestionResponse])
def bulk_add_questions_to_exam(
    exam_id: int,
    bulk_create: BulkExamQuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Add multiple questions to an exam at once.
    """
    # Check if exam exists
    exam = exam_crud.get_exam(db, exam_id=exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Check if user is the creator of the exam or an admin
    if exam.created_by != current_user.id and current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Ensure exam_id in path matches exam_id in request body
    if exam_id != bulk_create.exam_id:
        raise HTTPException(
            status_code=400,
            detail="Exam ID in path must match exam ID in request body"
        )
    
    # Check if all questions exist
    for question_id in bulk_create.question_ids:
        question = question_crud.get_question(db, question_id=question_id)
        if not question:
            raise HTTPException(
                status_code=404,
                detail=f"Question with ID {question_id} not found"
            )
    
    return exam_crud.bulk_add_questions_to_exam(db=db, bulk_create=bulk_create)

@router.delete("/{question_id}")
def remove_question_from_exam(
    exam_id: int,
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Remove a question from an exam.
    """
    # Check if exam exists
    exam = exam_crud.get_exam(db, exam_id=exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Check if user is the creator of the exam or an admin
    if exam.created_by != current_user.id and current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    result = exam_crud.remove_question_from_exam(db=db, exam_id=exam_id, question_id=question_id)
    if not result:
        raise HTTPException(status_code=404, detail="Question not found in exam")
    
    return {"message": "Question removed from exam"}

@router.put("/{question_id}/marks", response_model=ExamQuestionResponse)
def update_question_marks(
    exam_id: int,
    question_id: int,
    marks: float,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Update the marks for a specific question in an exam.
    """
    # Check if exam exists
    exam = exam_crud.get_exam(db, exam_id=exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Check if user is the creator of the exam or an admin
    if exam.created_by != current_user.id and current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    result = exam_crud.update_exam_question_marks(
        db=db,
        exam_id=exam_id,
        question_id=question_id,
        marks=marks
    )
    if not result:
        raise HTTPException(status_code=404, detail="Question not found in exam")
    
    return result 