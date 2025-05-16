from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.auth import get_current_active_user, check_admin_permission, check_teacher_permission
from app.crud import question as question_crud
from app.schemas.schemas import Question, QuestionCreate, QuestionUpdate, Answer, AnswerCreate, User
from app.models.models import Topic, Chapter, Subject, Course
from app.utils.file_handler import save_upload_file

router = APIRouter(
    tags=["Questions"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[Question])
def read_questions(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    questions = question_crud.get_questions(db, skip=skip, limit=limit)
    return questions

@router.get("/course/{course_id}", response_model=List[Question])
def read_questions_by_course(
    course_id: int,
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    questions = question_crud.get_questions_by_course(db, course_id=course_id, skip=skip, limit=limit)
    return questions

@router.get("/subject/{subject_id}", response_model=List[Question])
def read_questions_by_subject(
    subject_id: int,
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    questions = question_crud.get_questions_by_subject(db, subject_id=subject_id, skip=skip, limit=limit)
    return questions

@router.get("/chapter/{chapter_id}", response_model=List[Question])
def read_questions_by_chapter(
    chapter_id: int,
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    questions = question_crud.get_questions_by_chapter(db, chapter_id=chapter_id, skip=skip, limit=limit)
    return questions

@router.get("/topic/{topic_id}", response_model=List[Question])
def read_questions_by_topic(
    topic_id: int,
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    questions = question_crud.get_questions_by_topic(db, topic_id=topic_id, skip=skip, limit=limit)
    return questions

@router.get("/difficulty/{difficulty_level}", response_model=List[Question])
def read_questions_by_difficulty(
    difficulty_level: str,
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    questions = question_crud.get_questions_by_difficulty(db, difficulty_level=difficulty_level, skip=skip, limit=limit)
    return questions

@router.get("/{question_id}", response_model=Question)
def read_question(
    question_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_question = question_crud.get_question(db, question_id=question_id)
    if db_question is None:
        raise HTTPException(status_code=404, detail="Question not found")
    return db_question

@router.post("/", response_model=Question)
def create_question(
    question: QuestionCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Create a new question with the following features:
    
    - Basic question information (content, difficulty level)
    - Educational hierarchy linking (topic, chapter, subject, course)
    - Answer options
    
    A question can only be associated with ONE level of the educational hierarchy at a time.
    You must specify only one of: topic_id, chapter_id, subject_id, or course_id.
    
    Example payload:
    ```json
    {
      "content": "What is the capital of France?",
      "difficulty_level": "easy",
      "topic_id": 0,
      "chapter_id": 1,
      "subject_id": 0,
      "course_id": 0,
      "answers": [
        {
          "content": "Paris",
          "is_correct": true
        },
        {
          "content": "London",
          "is_correct": false
        }
      ]
    }
    ```
    """
    try:
        # Log the request data for debugging
        print(f"Creating question with data: {question.model_dump()}")
        
        # Validate that we have at least one answer
        if not question.answers or len(question.answers) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one answer must be provided"
            )
            
        # Validate that at least one answer is marked as correct
        has_correct_answer = False
        for answer in question.answers:
            if answer.is_correct:
                has_correct_answer = True
                break
                
        if not has_correct_answer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one answer must be marked as correct"
            )
        
        # Convert 0 values to None for optional fields
        if question.topic_id == 0:
            question.topic_id = None
        if question.chapter_id == 0:
            question.chapter_id = None
        if question.subject_id == 0:
            question.subject_id = None
        if question.course_id == 0:
            question.course_id = None
            
        # Validate that only one educational hierarchy ID is specified
        hierarchy_ids = {
            'topic_id': question.topic_id,
            'chapter_id': question.chapter_id,
            'subject_id': question.subject_id,
            'course_id': question.course_id
        }
        
        non_zero_ids = {k: v for k, v in hierarchy_ids.items() if v is not None and v > 0}
        
        if len(non_zero_ids) > 1:
            non_zero_fields = ", ".join(non_zero_ids.keys())
            raise HTTPException(
                status_code=400, 
                detail=f"Only one educational hierarchy ID can be specified at a time. Multiple fields provided: {non_zero_fields}"
            )
        
        # Validate that at least one ID is provided
        if not any(hierarchy_ids.values()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one of topic_id, chapter_id, subject_id, or course_id must be provided"
            )
        
        # Validate that course, subject, chapter, and topic IDs exist if provided
        if question.course_id:
            course = db.query(Course).filter(Course.id == question.course_id).first()
            if not course:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Course with ID {question.course_id} not found"
                )
                
        if question.subject_id:
            subject = db.query(Subject).filter(Subject.id == question.subject_id).first()
            if not subject:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Subject with ID {question.subject_id} not found"
                )
                
        if question.chapter_id:
            chapter = db.query(Chapter).filter(Chapter.id == question.chapter_id).first()
            if not chapter:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Chapter with ID {question.chapter_id} not found"
                )
                
        if question.topic_id:
            topic = db.query(Topic).filter(Topic.id == question.topic_id).first()
            if not topic:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Topic with ID {question.topic_id} not found"
                )
        
        return question_crud.create_question(db=db, question=question, created_by=current_user.id)
    except HTTPException:
        # Re-raise HTTP exceptions as they already have proper status codes
        raise
    except Exception as e:
        import traceback
        print(f"Error creating question: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating question: {str(e)}"
        )

@router.put("/{question_id}", response_model=Question)
def update_question(
    question_id: int, 
    question: QuestionUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Update a question with new data.
    
    A question can only be associated with ONE level of the educational hierarchy at a time.
    You must specify only one of: topic_id, chapter_id, subject_id, or course_id.
    
    Example payload:
    ```json
    {
      "content": "What is the capital of France?",
      "difficulty_level": "easy",
      "topic_id": 0,
      "chapter_id": 1,
      "subject_id": 0,
      "course_id": 0
    }
    ```
    """
    db_question = question_crud.get_question(db, question_id=question_id)
    if db_question is None:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Check if user is the creator or an admin
    if db_question.created_by != current_user.id and current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    try:
        # Validate that only one educational hierarchy ID is specified
        hierarchy_ids = {
            'topic_id': getattr(question, 'topic_id', None),
            'chapter_id': getattr(question, 'chapter_id', None),
            'subject_id': getattr(question, 'subject_id', None),
            'course_id': getattr(question, 'course_id', None)
        }
        
        non_zero_ids = {k: v for k, v in hierarchy_ids.items() if v is not None and v > 0}
        
        if len(non_zero_ids) > 1:
            non_zero_fields = ", ".join(non_zero_ids.keys())
            raise HTTPException(
                status_code=400, 
                detail=f"Only one educational hierarchy ID can be specified at a time. Multiple fields provided: {non_zero_fields}"
            )
            
        # If validation passes, proceed with the update
        return question_crud.update_question(db=db, question_id=question_id, question=question)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error updating question: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating question: {str(e)}"
        )

@router.delete("/{question_id}", response_model=Question)
def delete_question(
    question_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    db_question = question_crud.get_question(db, question_id=question_id)
    if db_question is None:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Check if user is the creator or an admin
    if db_question.created_by != current_user.id and current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return question_crud.delete_question(db=db, question_id=question_id)

# Answer routes
@router.get("/{question_id}/answers", response_model=List[Answer])
def read_answers(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    answers = question_crud.get_answers_by_question(db, question_id=question_id)
    return answers

@router.post("/{question_id}/answers", response_model=Answer)
def create_answer(
    question_id: int,
    answer: AnswerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    # Check if question exists
    db_question = question_crud.get_question(db, question_id=question_id)
    if db_question is None:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Check if user is the creator of the question or an admin
    if db_question.created_by != current_user.id and current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return question_crud.create_answer(db=db, answer=answer, question_id=question_id)

@router.post("/upload-image")
async def upload_question_image(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Upload an image for a question and return the public URL.
    The URL can then be used when creating or updating a question.
    Maximum file size allowed is 10MB.
    """
    try:
        # Validate file is an image
        content_type = file.content_type
        if not content_type.startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail="File must be an image (JPEG, PNG, etc.)"
            )
            
        # Save the file and get relative path
        relative_path = await save_upload_file(file, "questions")
        
        # Create the full URL for storage
        base_url = str(request.base_url).rstrip('/')
        public_url = f"{base_url}/static/{relative_path}"
        
        return {"url": public_url, "filename": file.filename}
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error uploading question image: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading image: {str(e)}"
        )

@router.post("/with-image", response_model=Question)
async def create_question_with_image(
    request: Request,
    content: str = Form(...),
    difficulty_level: str = Form(...),
    topic_id: int = Form(0),
    chapter_id: int = Form(0),
    subject_id: int = Form(0),
    course_id: int = Form(0),
    image: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Create a question with an optional image upload.
    This endpoint handles both the question data and image upload in a single request.
    
    A question can only be associated with ONE level of the educational hierarchy at a time.
    You must specify only one of: topic_id, chapter_id, subject_id, or course_id.
    
    Maximum file size allowed is 10MB.
    
    Note: Answers must be added separately after creating the question.
    """
    try:
        # Handle image upload if provided
        image_url = None
        if image and image.filename:
            # Validate file is an image
            content_type = image.content_type
            if not content_type.startswith("image/"):
                raise HTTPException(
                    status_code=400,
                    detail="File must be an image (JPEG, PNG, etc.)"
                )
                
            # Save the file and get relative path
            relative_path = await save_upload_file(image, "questions")
            
            # Create the full URL for storage
            base_url = str(request.base_url).rstrip('/')
            image_url = f"{base_url}/static/{relative_path}"
        
        # Convert 0 values to None for optional fields
        topic_id = None if topic_id == 0 else topic_id
        chapter_id = None if chapter_id == 0 else chapter_id
        subject_id = None if subject_id == 0 else subject_id
        course_id = None if course_id == 0 else course_id
        
        # Validate that only one educational hierarchy ID is specified
        hierarchy_ids = {
            'topic_id': topic_id,
            'chapter_id': chapter_id,
            'subject_id': subject_id,
            'course_id': course_id
        }
        
        non_zero_ids = {k: v for k, v in hierarchy_ids.items() if v is not None and v > 0}
        
        if len(non_zero_ids) > 1:
            non_zero_fields = ", ".join(non_zero_ids.keys())
            raise HTTPException(
                status_code=400, 
                detail=f"Only one educational hierarchy ID can be specified at a time. Multiple fields provided: {non_zero_fields}"
            )
        
        # Validate that at least one ID is provided
        if not any([topic_id, chapter_id, subject_id, course_id]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one of topic_id, chapter_id, subject_id, or course_id must be provided"
            )
        
        # Validate that course, subject, chapter, and topic IDs exist if provided
        if course_id:
            course = db.query(Course).filter(Course.id == course_id).first()
            if not course:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Course with ID {course_id} not found"
                )
                
        if subject_id:
            subject = db.query(Subject).filter(Subject.id == subject_id).first()
            if not subject:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Subject with ID {subject_id} not found"
                )
                
        if chapter_id:
            chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
            if not chapter:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Chapter with ID {chapter_id} not found"
                )
                
        if topic_id:
            topic = db.query(Topic).filter(Topic.id == topic_id).first()
            if not topic:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Topic with ID {topic_id} not found"
                )
        
        # Create the question object with empty answers list (to be added later)
        question = QuestionCreate(
            content=content,
            image_url=image_url,
            difficulty_level=difficulty_level,
            topic_id=topic_id,
            chapter_id=chapter_id,
            subject_id=subject_id,
            course_id=course_id,
            answers=[]  # Empty list, answers will be added separately
        )
        
        # Create the question
        created_question = question_crud.create_question(db=db, question=question, created_by=current_user.id)
        
        return created_question
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error creating question with image: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating question: {str(e)}"
        )

@router.put("/{question_id}/with-image", response_model=Question)
async def update_question_with_image(
    request: Request,
    question_id: int,
    content: str = Form(None),
    difficulty_level: str = Form(None),
    topic_id: int = Form(None),
    chapter_id: int = Form(None),
    subject_id: int = Form(None),
    course_id: int = Form(None), 
    image: UploadFile = File(None),
    answer_contents: str = Form(None),  # Comma-separated answer contents
    answer_is_corrects: str = Form(None),  # Comma-separated boolean values (true/false)
    answer_ids: str = Form(None),  # Comma-separated answer IDs
    answer_images: List[UploadFile] = File([]),  # List of answer images
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Update a question with its answers and optional image upload.
    This endpoint handles both the question data, answers, and image uploads in a single request.
    
    Fields that are not provided (null/None) will not be updated.
    
    A question can only be associated with ONE level of the educational hierarchy at a time.
    You should specify only one of: topic_id, chapter_id, subject_id, or course_id.
    
    Maximum file size allowed is 10MB.
    
    The answer fields are:
    - answer_contents: Comma-separated list of answer contents
    - answer_is_corrects: Comma-separated list of boolean values (true/false) 
    - answer_ids: Comma-separated list of answer IDs (optional, for updating existing answers)
    - answer_images: List of image files for answers (optional)
    """
    # Check if question exists
    db_question = question_crud.get_question(db, question_id=question_id)
    if db_question is None:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Check if user is the creator or an admin
    if db_question.created_by != current_user.id and current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    try:
        # Validate that only one educational hierarchy ID is provided with non-zero value
        non_zero_ids = {}
        if topic_id is not None and topic_id > 0:
            non_zero_ids['topic_id'] = topic_id
        if chapter_id is not None and chapter_id > 0:
            non_zero_ids['chapter_id'] = chapter_id
        if subject_id is not None and subject_id > 0:
            non_zero_ids['subject_id'] = subject_id
        if course_id is not None and course_id > 0:
            non_zero_ids['course_id'] = course_id
        
        if len(non_zero_ids) > 1:
            non_zero_fields = ", ".join(non_zero_ids.keys())
            raise HTTPException(
                status_code=400,
                detail=f"Only one educational hierarchy ID can be specified at a time. Multiple fields provided: {non_zero_fields}"
            )
    
        # Handle image upload if provided
        image_url = None
        if image and image.filename:
            # Validate file is an image
            content_type = image.content_type
            if not content_type.startswith("image/"):
                raise HTTPException(
                    status_code=400,
                    detail="File must be an image (JPEG, PNG, etc.)"
                )
                
            # Save the file and get relative path
            relative_path = await save_upload_file(image, "questions")
            
            # Create the full URL for storage
            base_url = str(request.base_url).rstrip('/')
            image_url = f"{base_url}/static/{relative_path}"
        
        # Convert values for update
        update_data = {}
        if content is not None:
            update_data["content"] = content
        if difficulty_level is not None:
            update_data["difficulty_level"] = difficulty_level
        if image_url is not None:
            update_data["image_url"] = image_url
            
        # Handle IDs - convert 0 to None
        if topic_id == 0:
            update_data["topic_id"] = None
        elif topic_id is not None:
            update_data["topic_id"] = topic_id
            
        if chapter_id == 0:
            update_data["chapter_id"] = None
        elif chapter_id is not None:
            update_data["chapter_id"] = chapter_id
            
        if subject_id == 0:
            update_data["subject_id"] = None
        elif subject_id is not None:
            update_data["subject_id"] = subject_id
            
        if course_id == 0:
            update_data["course_id"] = None
        elif course_id is not None:
            update_data["course_id"] = course_id
        
        # Create update object
        question_update = QuestionUpdate(**update_data)
        
        # Process answers if provided
        if answer_contents and answer_is_corrects:
            # Split comma-separated strings into lists
            answer_contents_list = answer_contents.split(",")
            
            # Convert string representation to boolean values
            answer_is_corrects_list = []
            for val in answer_is_corrects.split(","):
                if val.lower() == "true":
                    answer_is_corrects_list.append(True)
                else:
                    answer_is_corrects_list.append(False)
            
            # Validate answers
            if len(answer_contents_list) != len(answer_is_corrects_list):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Number of answer contents ({len(answer_contents_list)}) and correctness flags ({len(answer_is_corrects_list)}) must match"
                )
            
            # Check if at least one answer is marked as correct
            if True not in answer_is_corrects_list:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="At least one answer must be marked as correct"
                )
            
            # Process answer IDs if provided
            answer_ids_list = None
            if answer_ids:
                answer_ids_list = [int(id) for id in answer_ids.split(",") if id.strip()]
                
            # Handle answer images
            answer_image_urls = [None] * len(answer_contents_list)
            
            if answer_images:
                # Filter out empty files
                valid_images = [img for img in answer_images if img and hasattr(img, 'filename') and img.filename]
                
                # Process each valid image
                for i, image in enumerate(valid_images):
                    # Only process if we have a corresponding answer
                    if i < len(answer_contents_list):
                        try:
                            # Validate file is an image
                            content_type = image.content_type
                            if not content_type.startswith("image/"):
                                print(f"Warning: Answer image '{image.filename}' is not an image file, skipping")
                                continue
                                
                            # Save the file and get relative path
                            relative_path = await save_upload_file(image, "answers")
                            
                            if relative_path:
                                # Create the full URL for storage
                                base_url = str(request.base_url).rstrip('/')
                                image_url = f"{base_url}/static/{relative_path}"
                                answer_image_urls[i] = image_url
                        except Exception as e:
                            print(f"Error saving answer image {i}: {str(e)}")
                            # Continue with other images instead of failing completely
            
            # Update question with answers
            return question_crud.update_question_with_answers(
                db=db,
                question_id=question_id,
                question=question_update,
                answer_contents=answer_contents_list,
                answer_is_corrects=answer_is_corrects_list,
                answer_ids=answer_ids_list,
                answer_image_urls=answer_image_urls
            )
        else:
            # If no answers provided, just update the question
            return question_crud.update_question(
                db=db, 
                question_id=question_id, 
                question=question_update
            )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error updating question with image: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating question: {str(e)}"
        )

@router.post("/complete-with-images", response_model=Question)
async def create_complete_question_with_images(
    request: Request,
    content: str = Form(...),
    difficulty_level: str = Form(...),
    topic_id: int = Form(0),
    chapter_id: int = Form(0),
    subject_id: int = Form(0),
    course_id: int = Form(0),
    question_image: Optional[UploadFile] = File(None),
    answer_contents: str = Form(...),  # Changed to str since it comes as comma-separated
    answer_is_corrects: str = Form(...),  # Changed to str since it comes as comma-separated
    answer_images: List[UploadFile] = File([]),  # Changed back to List to support multiple images
    testing_mode: bool = Form(False),  # Add testing mode flag
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Create a complete question with answers, supporting image uploads for both the question and answers.
    
    This endpoint handles:
    - Question content and metadata
    - Optional question image
    - Multiple answers with their content and correctness
    - Optional images for each answer (can have one image per answer option)
    
    A question can only be associated with ONE level of the educational hierarchy at a time.
    You must specify only one of: topic_id, chapter_id, subject_id, or course_id.
    
    Maximum file size allowed for all images (question and answers) is 10MB each.
    """
    try:
        print(f"Received request - content: {content}, difficulty: {difficulty_level}")
        print(f"answer_contents: {answer_contents}")
        print(f"answer_is_corrects: {answer_is_corrects}")
        print(f"Number of answer_images received: {len(answer_images) if answer_images else 0}")
        print(f"Testing mode: {testing_mode}")
        
        # Split comma-separated strings into lists
        answer_contents_list = answer_contents.split(",")
        
        # Convert string representation to boolean values
        answer_is_corrects_list = []
        for val in answer_is_corrects.split(","):
            if val.lower() == "true":
                answer_is_corrects_list.append(True)
            else:
                answer_is_corrects_list.append(False)
        
        print(f"Parsed answer_contents_list: {answer_contents_list}")
        print(f"Parsed answer_is_corrects_list: {answer_is_corrects_list}")
        
        # Validate difficulty level
        valid_difficulty_levels = ["easy", "moderate", "difficult"]
        if difficulty_level not in valid_difficulty_levels:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid difficulty level. Must be one of: {', '.join(valid_difficulty_levels)}"
            )
        
        # Handle question image upload if provided
        question_image_url = None
        if question_image and hasattr(question_image, 'filename') and question_image.filename:
            # Validate file is an image
            content_type = question_image.content_type
            if not content_type.startswith("image/") and not testing_mode:
                raise HTTPException(
                    status_code=400,
                    detail="Question image must be an image file (JPEG, PNG, etc.)"
                )
                
            try:
                # Save the file and get relative path
                relative_path = await save_upload_file(question_image, "questions")
                
                if relative_path:
                    # Create the full URL for storage
                    base_url = str(request.base_url).rstrip('/')
                    question_image_url = f"{base_url}/static/{relative_path}"
            except Exception as e:
                print(f"Error saving question image: {str(e)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Error saving question image: {str(e)}"
                )
        
        # Convert 0 values to None for optional fields
        topic_id = None if topic_id == 0 else topic_id
        chapter_id = None if chapter_id == 0 else chapter_id
        subject_id = None if subject_id == 0 else subject_id
        course_id = None if course_id == 0 else course_id
        
        # Validate that only one educational hierarchy ID is specified
        hierarchy_ids = {
            'topic_id': topic_id,
            'chapter_id': chapter_id,
            'subject_id': subject_id,
            'course_id': course_id
        }
        
        non_zero_ids = {k: v for k, v in hierarchy_ids.items() if v is not None and v > 0}
        
        if len(non_zero_ids) > 1:
            non_zero_fields = ", ".join(non_zero_ids.keys())
            raise HTTPException(
                status_code=400, 
                detail=f"Only one educational hierarchy ID can be specified at a time. Multiple fields provided: {non_zero_fields}"
            )
        
        # Validate that at least one ID is provided
        if not any([topic_id, chapter_id, subject_id, course_id]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one of topic_id, chapter_id, subject_id, or course_id must be provided"
            )
        
        # Validate that course, subject, chapter, and topic IDs exist if provided
        if course_id:
            course = db.query(Course).filter(Course.id == course_id).first()
            if not course:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Course with ID {course_id} not found"
                )
                
        if subject_id:
            subject = db.query(Subject).filter(Subject.id == subject_id).first()
            if not subject:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Subject with ID {subject_id} not found"
                )
                
        if chapter_id:
            chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
            if not chapter:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Chapter with ID {chapter_id} not found"
                )
                
        if topic_id:
            topic = db.query(Topic).filter(Topic.id == topic_id).first()
            if not topic:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Topic with ID {topic_id} not found"
                )
        
        # Validate answers
        if not answer_contents_list:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one answer must be provided"
            )
        
        if len(answer_contents_list) != len(answer_is_corrects_list):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Number of answer contents ({len(answer_contents_list)}) and correctness flags ({len(answer_is_corrects_list)}) must match"
            )
        
        # Check if at least one answer is marked as correct
        if True not in answer_is_corrects_list:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one answer must be marked as correct"
            )
        
        # Handle answer images - create a list to hold image URLs for each answer
        answer_image_urls = [None] * len(answer_contents_list)
        
        # Process each provided answer image
        if answer_images:
            # Filter out empty files
            valid_images = [img for img in answer_images if img and hasattr(img, 'filename') and img.filename]
            
            print(f"Processing {len(valid_images)} valid answer images")
            
            # Process each valid image
            for i, image in enumerate(valid_images):
                # Only process if we have a corresponding answer
                if i < len(answer_contents_list):
                    try:
                        # Validate file is an image, unless in testing mode
                        content_type = image.content_type
                        if not content_type.startswith("image/") and not testing_mode:
                            print(f"Warning: Answer image '{image.filename}' is not an image file, skipping")
                            continue
                            
                        # Save the file and get relative path
                        relative_path = await save_upload_file(image, "answers")
                        
                        if relative_path:
                            # Create the full URL for storage
                            base_url = str(request.base_url).rstrip('/')
                            image_url = f"{base_url}/static/{relative_path}"
                            answer_image_urls[i] = image_url
                            print(f"Saved answer image {i}: {image_url}")
                    except Exception as e:
                        print(f"Error saving answer image {i}: {str(e)}")
                        # Continue with other images instead of failing completely
        
        print(f"Processed answer_image_urls: {answer_image_urls}")
        
        # Create answer objects
        answers = []
        for i in range(len(answer_contents_list)):
            answers.append(
                AnswerCreate(
                    content=answer_contents_list[i],
                    image_url=answer_image_urls[i] if i < len(answer_image_urls) else None,
                    is_correct=answer_is_corrects_list[i]
                )
            )
        
        # Create the question object
        question = QuestionCreate(
            content=content,
            image_url=question_image_url,
            difficulty_level=difficulty_level,
            topic_id=topic_id,
            chapter_id=chapter_id,
            subject_id=subject_id,
            course_id=course_id,
            answers=answers
        )
        
        # Create the question
        created_question = question_crud.create_question(db=db, question=question, created_by=current_user.id)
        
        return created_question
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error creating question with images: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating question: {str(e)}"
        )
