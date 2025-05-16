from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import get_db
from app.core.auth import get_current_active_user, check_admin_permission, check_teacher_permission
from app.crud import exam as exam_crud
from app.schemas.schemas import Exam, ExamCreate, ExamUpdate, ExamQuestion, ExamQuestionCreate, User
from app.models.models import Course, Class, Subject, Chapter, Topic

router = APIRouter(
    prefix="/exams",
    tags=["Exams"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[Exam])
def read_exams(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    exams = exam_crud.get_exams(db, skip=skip, limit=limit)
    return exams

@router.get("/my-exams", response_model=List[Exam])
def read_user_exams(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    exams = exam_crud.get_exams_by_user(db, user_id=current_user.id, skip=skip, limit=limit)
    return exams

# Add a new route to handle the incorrect URL pattern
@router.get("/exams/my-exams", response_model=List[Exam], include_in_schema=False)
def read_user_exams_legacy_url(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Legacy endpoint to support the incorrect URL pattern with double 'exams' in the path.
    Calls the main handler directly.
    """
    return read_user_exams(skip=skip, limit=limit, db=db, current_user=current_user)

@router.get("/{exam_id}", response_model=Exam)
def read_exam(
    exam_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_exam = exam_crud.get_exam(db, exam_id=exam_id)
    if db_exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")
    return db_exam

# Also add a route for the incorrect pattern for specific exam
@router.get("/exams/{exam_id}", response_model=Exam, include_in_schema=False)
def read_exam_legacy_url(
    exam_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Legacy endpoint to support the incorrect URL pattern with double 'exams' in the path.
    Calls the main handler directly.
    """
    return read_exam(exam_id=exam_id, db=db, current_user=current_user)

@router.post("/", response_model=Exam)
def create_exam(
    exam: ExamCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Create a new exam with the following features:
    
    - Basic exam information (title, description, dates, duration, max marks, max questions)
    - Educational hierarchy linking (course, class, subject, chapter, topic)
    
    All ID fields (course_id, class_id, etc.) are optional, but if provided they must exist in the database.
    Use 0 or null for fields you don't want to set.
    
    An exam can only be associated with ONE level of the educational hierarchy at a time.
    You must specify only one of: course_id, class_id, subject_id, chapter_id, or topic_id.
    
    Example payload:
    ```json
    {
      "title": "Maths Final Test",
      "description": "Final assessment for Algebra",
      "start_datetime": "2025-05-03T10:00:00",
      "end_datetime": "2025-05-03T11:00:00",
      "duration_minutes": 60,
      "max_marks": 100,
      "max_questions": 20,
      "course_id": 0,
      "class_id": 0,
      "subject_id": 1,
      "chapter_id": 0,
      "topic_id": 0
    }
    ```
    """
    try:
        # Validate that only one educational hierarchy ID is specified
        hierarchy_ids = {
            'course_id': exam.course_id,
            'class_id': exam.class_id,
            'subject_id': exam.subject_id,
            'chapter_id': exam.chapter_id,
            'topic_id': exam.topic_id
        }
        
        non_zero_ids = {k: v for k, v in hierarchy_ids.items() if v is not None and v > 0}
        
        if len(non_zero_ids) > 1:
            non_zero_fields = ", ".join(non_zero_ids.keys())
            raise HTTPException(
                status_code=400, 
                detail=f"Only one educational hierarchy ID can be specified at a time. Multiple fields provided: {non_zero_fields}"
            )
            
        # Convert 0 values to None for optional IDs
        if exam.course_id == 0:
            exam.course_id = None
        if exam.class_id == 0:
            exam.class_id = None
        if exam.subject_id == 0:
            exam.subject_id = None
        if exam.chapter_id == 0:
            exam.chapter_id = None
        if exam.topic_id == 0:
            exam.topic_id = None
        
        # Validate that course, class, subject, chapter, topic IDs exist if provided
        if exam.course_id:
            course = db.query(Course).filter(Course.id == exam.course_id).first()
            if not course:
                raise HTTPException(status_code=404, detail=f"Course with ID {exam.course_id} not found")
                
        if exam.class_id:
            class_ = db.query(Class).filter(Class.id == exam.class_id).first()
            if not class_:
                raise HTTPException(status_code=404, detail=f"Class with ID {exam.class_id} not found")
                
        if exam.subject_id:
            subject = db.query(Subject).filter(Subject.id == exam.subject_id).first()
            if not subject:
                raise HTTPException(status_code=404, detail=f"Subject with ID {exam.subject_id} not found")
                
        if exam.chapter_id:
            chapter = db.query(Chapter).filter(Chapter.id == exam.chapter_id).first()
            if not chapter:
                raise HTTPException(status_code=404, detail=f"Chapter with ID {exam.chapter_id} not found")
                
        if exam.topic_id:
            topic = db.query(Topic).filter(Topic.id == exam.topic_id).first()
            if not topic:
                raise HTTPException(status_code=404, detail=f"Topic with ID {exam.topic_id} not found")
        
        return exam_crud.create_exam(db=db, exam=exam, user_id=current_user.id)
    except SQLAlchemyError as e:
        # Convert SQLAlchemy error to a user-friendly message
        error_detail = str(e)
        if "foreign key constraint" in error_detail.lower():
            # Try to extract the constraint name from the error
            if "course_id" in error_detail:
                error_msg = f"Invalid course_id: {exam.course_id}. This course does not exist."
            elif "class_id" in error_detail:
                error_msg = f"Invalid class_id: {exam.class_id}. This class does not exist."
            elif "subject_id" in error_detail:
                error_msg = f"Invalid subject_id: {exam.subject_id}. This subject does not exist."
            elif "chapter_id" in error_detail:
                error_msg = f"Invalid chapter_id: {exam.chapter_id}. This chapter does not exist."
            elif "topic_id" in error_detail:
                error_msg = f"Invalid topic_id: {exam.topic_id}. This topic does not exist."
            else:
                error_msg = "A database constraint error occurred. Please verify all IDs are valid."
        else:
            error_msg = "A database error occurred while creating the exam."
        
        raise HTTPException(status_code=400, detail=error_msg)

@router.put("/{exam_id}", response_model=Exam,
    summary="Update an exam",
    description="Update an existing exam. All fields are optional.",
    responses={
        200: {
            "description": "Exam updated successfully",
            "content": {
                "application/json": {
                    "example": {
                        "title": "Updated Math Exam",
                        "description": "Updated exam description",
                        "start_datetime": "2025-05-08T12:17:39.944Z",
                        "end_datetime": "2025-05-08T14:17:39.944Z",
                        "duration_minutes": 120,
                        "max_marks": 100,
                        "max_questions": 50,
                        "status": "active",
                        "course_id": 0,
                        "class_id": 0,
                        "subject_id": 0,
                        "chapter_id": 0,
                        "topic_id": 0
                    }
                }
            }
        },
        404: {"description": "Exam not found"},
        403: {"description": "Not enough permissions"}
    }
)
def update_exam(
    exam_id: int, 
    exam: ExamUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Update an existing exam.
    
    You can update any combination of fields, as only the provided fields will be changed.
    For ID fields (course_id, class_id, etc.), use 0 or null for fields you want to clear.
    
    An exam can only be associated with ONE level of the educational hierarchy at a time.
    You must specify only one of: course_id, class_id, subject_id, chapter_id, or topic_id.
    
    Example payload:
    ```json
    {
      "title": "Updated Exam Title",
      "description": "Updated Description",
      "course_id": 0,
      "class_id": 0,
      "subject_id": 1,
      "chapter_id": 0,
      "topic_id": 0,
      "max_marks": 120,
      "max_questions": 25
    }
    ```
    """
    try:
        # Check if exam exists
        db_exam = exam_crud.get_exam(db, exam_id=exam_id)
        if db_exam is None:
            raise HTTPException(status_code=404, detail="Exam not found")
        
        # Check if user is the creator or an admin
        if db_exam.created_by != current_user.id and current_user.role not in ["admin", "superadmin"]:
            raise HTTPException(status_code=403, detail="Not enough permissions")
        
        # Validate that only one educational hierarchy ID is specified
        hierarchy_ids = {
            'course_id': getattr(exam, 'course_id', None),
            'class_id': getattr(exam, 'class_id', None),
            'subject_id': getattr(exam, 'subject_id', None),
            'chapter_id': getattr(exam, 'chapter_id', None),
            'topic_id': getattr(exam, 'topic_id', None)
        }
        
        non_zero_ids = {k: v for k, v in hierarchy_ids.items() if v is not None and v > 0}
        
        if len(non_zero_ids) > 1:
            non_zero_fields = ", ".join(non_zero_ids.keys())
            raise HTTPException(
                status_code=400, 
                detail=f"Only one educational hierarchy ID can be specified at a time. Multiple fields provided: {non_zero_fields}"
            )
        
        # Convert 0 values to None for optional IDs
        update_data = {}
        if hasattr(exam, 'course_id') and exam.course_id == 0:
            update_data['course_id'] = None
        elif hasattr(exam, 'course_id') and exam.course_id is not None:
            # Validate course_id exists
            if exam.course_id > 0:
                course = db.query(Course).filter(Course.id == exam.course_id).first()
                if not course:
                    raise HTTPException(status_code=404, detail=f"Course with ID {exam.course_id} not found")
            update_data['course_id'] = exam.course_id
        
        if hasattr(exam, 'class_id') and exam.class_id == 0:
            update_data['class_id'] = None
        elif hasattr(exam, 'class_id') and exam.class_id is not None:
            # Validate class_id exists
            if exam.class_id > 0:
                class_ = db.query(Class).filter(Class.id == exam.class_id).first()
                if not class_:
                    raise HTTPException(status_code=404, detail=f"Class with ID {exam.class_id} not found")
            update_data['class_id'] = exam.class_id
        
        if hasattr(exam, 'subject_id') and exam.subject_id == 0:
            update_data['subject_id'] = None
        elif hasattr(exam, 'subject_id') and exam.subject_id is not None:
            # Validate subject_id exists
            if exam.subject_id > 0:
                subject = db.query(Subject).filter(Subject.id == exam.subject_id).first()
                if not subject:
                    raise HTTPException(status_code=404, detail=f"Subject with ID {exam.subject_id} not found")
            update_data['subject_id'] = exam.subject_id
        
        if hasattr(exam, 'chapter_id') and exam.chapter_id == 0:
            update_data['chapter_id'] = None
        elif hasattr(exam, 'chapter_id') and exam.chapter_id is not None:
            # Validate chapter_id exists
            if exam.chapter_id > 0:
                chapter = db.query(Chapter).filter(Chapter.id == exam.chapter_id).first()
                if not chapter:
                    raise HTTPException(status_code=404, detail=f"Chapter with ID {exam.chapter_id} not found")
            update_data['chapter_id'] = exam.chapter_id
        
        if hasattr(exam, 'topic_id') and exam.topic_id == 0:
            update_data['topic_id'] = None
        elif hasattr(exam, 'topic_id') and exam.topic_id is not None:
            # Validate topic_id exists
            if exam.topic_id > 0:
                topic = db.query(Topic).filter(Topic.id == exam.topic_id).first()
                if not topic:
                    raise HTTPException(status_code=404, detail=f"Topic with ID {exam.topic_id} not found")
            update_data['topic_id'] = exam.topic_id
        
        # Copy other fields from the update schema
        for field in ['title', 'description', 'start_datetime', 'end_datetime', 'duration_minutes', 'max_marks', 'max_questions']:
            value = getattr(exam, field, None)
            if value is not None:
                update_data[field] = value
        
        # Create a new ExamUpdate object with the processed data
        validated_exam = ExamUpdate(**update_data)
        
        # Update the exam
        return exam_crud.update_exam(db=db, exam_id=exam_id, exam=validated_exam)
    except SQLAlchemyError as e:
        # Convert SQLAlchemy error to a user-friendly message
        error_detail = str(e)
        if "foreign key constraint" in error_detail.lower():
            # Try to extract the constraint name from the error
            if "course_id" in error_detail:
                error_msg = f"Invalid course_id: {getattr(exam, 'course_id', None)}. This course does not exist."
            elif "class_id" in error_detail:
                error_msg = f"Invalid class_id: {getattr(exam, 'class_id', None)}. This class does not exist."
            elif "subject_id" in error_detail:
                error_msg = f"Invalid subject_id: {getattr(exam, 'subject_id', None)}. This subject does not exist."
            elif "chapter_id" in error_detail:
                error_msg = f"Invalid chapter_id: {getattr(exam, 'chapter_id', None)}. This chapter does not exist."
            elif "topic_id" in error_detail:
                error_msg = f"Invalid topic_id: {getattr(exam, 'topic_id', None)}. This topic does not exist."
            else:
                error_msg = "A database constraint error occurred. Please verify all IDs are valid."
        else:
            error_msg = f"A database error occurred while updating the exam: {str(e)}"
        
        raise HTTPException(status_code=400, detail=error_msg)

@router.delete("/{exam_id}", response_model=Exam)
def delete_exam(
    exam_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    db_exam = exam_crud.get_exam(db, exam_id=exam_id)
    if db_exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Check if user is the creator or an admin
    if db_exam.created_by != current_user.id and current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return exam_crud.delete_exam(db=db, exam_id=exam_id)

# ExamQuestion routes
@router.get("/{exam_id}/questions", response_model=List[ExamQuestion])
def read_exam_questions(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if exam exists
    db_exam = exam_crud.get_exam(db, exam_id=exam_id)
    if db_exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    exam_questions = exam_crud.get_exam_questions(db, exam_id=exam_id)
    return exam_questions

@router.post("/{exam_id}/questions", response_model=ExamQuestion)
def add_question_to_exam(
    exam_id: int,
    exam_question: ExamQuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    # Check if exam exists
    db_exam = exam_crud.get_exam(db, exam_id=exam_id)
    if db_exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Check if user is the creator of the exam or an admin
    if db_exam.created_by != current_user.id and current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Ensure the exam_id in the path matches the one in the request body
    if exam_id != exam_question.exam_id:
        raise HTTPException(status_code=400, detail="Exam ID in path must match exam ID in request body")
    
    return exam_crud.add_question_to_exam(db=db, exam_question=exam_question)

# Also add a route for POST operation with incorrect URL
@router.post("/exams/", response_model=Exam, include_in_schema=False)
def create_exam_legacy_url(
    exam: ExamCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Legacy endpoint to support the incorrect URL pattern with double 'exams' in the path.
    Calls the main handler directly.
    """
    return create_exam(exam=exam, db=db, current_user=current_user)

# Legacy route for PUT operation
@router.put("/exams/{exam_id}", response_model=Exam, include_in_schema=False)
def update_exam_legacy_url(
    exam_id: int, 
    exam: ExamUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Legacy endpoint to support the incorrect URL pattern with double 'exams' in the path.
    Calls the main handler directly.
    """
    return update_exam(exam_id=exam_id, exam=exam, db=db, current_user=current_user)

# Legacy route for DELETE operation
@router.delete("/exams/{exam_id}", response_model=Exam, include_in_schema=False)
def delete_exam_legacy_url(
    exam_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Legacy endpoint to support the incorrect URL pattern with double 'exams' in the path.
    Calls the main handler directly.
    """
    return delete_exam(exam_id=exam_id, db=db, current_user=current_user)

# Legacy route for exam questions
@router.get("/exams/{exam_id}/questions", response_model=List[ExamQuestion], include_in_schema=False)
def read_exam_questions_legacy_url(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Legacy endpoint to support the incorrect URL pattern with double 'exams' in the path.
    Calls the main handler directly.
    """
    return read_exam_questions(exam_id=exam_id, db=db, current_user=current_user)

# Legacy route for adding a question to an exam
@router.post("/exams/{exam_id}/questions", response_model=ExamQuestion, include_in_schema=False)
def add_question_to_exam_legacy_url(
    exam_id: int,
    exam_question: ExamQuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Legacy endpoint to support the incorrect URL pattern with double 'exams' in the path.
    Calls the main handler directly.
    """
    return add_question_to_exam(exam_id=exam_id, exam_question=exam_question, db=db, current_user=current_user)

# Legacy route for removing a question from an exam
@router.delete("/exams/{exam_id}/questions/{question_id}", include_in_schema=False)
def remove_question_from_exam_legacy_url(
    exam_id: int,
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Legacy endpoint to support the incorrect URL pattern with double 'exams' in the path.
    This allows removal of a question from an exam.
    """
    # Check if exam exists
    db_exam = exam_crud.get_exam(db, exam_id=exam_id)
    if db_exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Check if user is the creator of the exam or an admin
    if db_exam.created_by != current_user.id and current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    result = exam_crud.remove_question_from_exam(db=db, exam_id=exam_id, question_id=question_id)
    if not result:
        raise HTTPException(status_code=404, detail="Question not found in exam")
    
    return {"message": "Question removed from exam"}
