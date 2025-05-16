from pydantic import BaseModel, ConfigDict, model_validator
from typing import List, Optional
from datetime import datetime, timedelta
from .schemas import Question
from enum import Enum

class ExamActiveStatus(str, Enum):
    active = "active"
    inactive = "inactive"

class ExamBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_datetime: datetime
    end_datetime: Optional[datetime] = None
    duration_minutes: int
    max_marks: float
    max_questions: int = 0
    status: ExamActiveStatus = ExamActiveStatus.active
    course_id: Optional[int] = None
    class_id: Optional[int] = None
    subject_id: Optional[int] = None
    chapter_id: Optional[int] = None
    topic_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class ExamCreate(ExamBase):
    pass

class ExamUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    max_marks: Optional[float] = None
    max_questions: Optional[int] = None
    status: Optional[ExamActiveStatus] = None
    course_id: Optional[int] = None
    class_id: Optional[int] = None
    subject_id: Optional[int] = None
    chapter_id: Optional[int] = None
    topic_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class Exam(ExamBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Add relationships for the educational hierarchy
    # These will be populated with data when queried
    course: Optional[dict] = None
    class_: Optional[dict] = None
    subject: Optional[dict] = None
    chapter: Optional[dict] = None
    topic: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)

class ExamQuestionBase(BaseModel):
    exam_id: int
    question_id: int
    marks: float

    model_config = ConfigDict(from_attributes=True)

class ExamQuestionCreate(ExamQuestionBase):
    pass

class ExamQuestionUpdate(BaseModel):
    marks: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)

class ExamQuestion(ExamQuestionBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    question: Question

    model_config = ConfigDict(from_attributes=True)

class ExamQuestionResponse(BaseModel):
    id: int
    exam_id: int
    marks: float
    question: Question
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# Bulk operations schemas
class BulkExamQuestionCreate(BaseModel):
    exam_id: int
    question_ids: List[int]
    marks: float  # Default marks for all questions

    model_config = ConfigDict(from_attributes=True) 