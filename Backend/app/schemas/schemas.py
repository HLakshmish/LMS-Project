from pydantic import BaseModel, EmailStr, Field, ConfigDict, model_validator, constr
from typing import Optional, List, Any, Dict, Union, Annotated, ForwardRef
from datetime import datetime, timedelta
from enum import Enum
from pydantic import field_validator

# Import specific schema modules
from .subject_schema import Subject as SubjectSchema
from .subject_schema import SubjectCreate as SubjectCreateSchema
from .subject_schema import SubjectUpdate as SubjectUpdateSchema
from .stream_schema import Stream as StreamSchema
from .stream_schema import StreamCreate as StreamCreateSchema
from .stream_schema import StreamUpdate as StreamUpdateSchema
from .course_schema import SimpleCourseRef, FullCourseInfo

# Simple reference schemas to break circular dependencies
class SimpleTopicRef(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class SimpleChapterRef(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class SimpleSubjectRef(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    code: str
    
    model_config = ConfigDict(from_attributes=True)

# Forward references for relationships
UserRef = ForwardRef("User")
StreamRef = ForwardRef("Stream")
QuestionRef = ForwardRef("Question")
AnswerRef = ForwardRef("Answer")

# Enums
class UserRoleEnum(str, Enum):
    superadmin = "superadmin"
    admin = "admin"
    teacher = "teacher"
    student = "student"

class DifficultyLevelEnum(str, Enum):
    easy = "easy"
    moderate = "moderate"
    difficult = "difficult"

class ExamStatusEnum(str, Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    completed = "completed"

class ContentTypeEnum(str, Enum):
    video = "video"
    pdf = "pdf"
    document = "document"

class SubscriptionStatusEnum(str, Enum):
    active = "active"
    expired = "expired"
    cancelled = "cancelled"

class CourseLevelEnum(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"

# Base model with common config
class BaseModelWithConfig(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# User schemas
class UserBase(BaseModel):
    email: str
    username: str
    role: UserRoleEnum
    
    model_config = ConfigDict(from_attributes=True)

class UserCreate(UserBase):
    password: str
    full_name: Optional[str] = None

class UserUpdate(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    role: Optional[UserRoleEnum] = None
    password: Optional[str] = None
    full_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class UserInDB(UserBase):
    id: int
    full_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

class User(UserInDB):
    pass

# Define UserRef as User to resolve forward reference
UserRef = User

# Class schemas
class ClassBase(BaseModel):
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ClassCreate(ClassBase):
    pass

class ClassUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ClassInDB(ClassBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

class Class(ClassInDB):
    model_config = ConfigDict(from_attributes=True)
    creator: Optional[UserRef] = None

# Use imported stream schemas
Stream = StreamSchema
StreamCreate = StreamCreateSchema
StreamUpdate = StreamUpdateSchema

# Use imported subject schemas
Subject = SubjectSchema
SubjectCreate = SubjectCreateSchema
SubjectUpdate = SubjectUpdateSchema

# Chapter schemas
class ChapterBase(BaseModel):
    name: str
    description: Optional[str] = None
    subject_id: int
    chapter_number: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class ChapterCreate(ChapterBase):
    pass

class ChapterUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    subject_id: Optional[int] = None
    chapter_number: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class ChapterInDB(ChapterBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

class Chapter(ChapterInDB):
    model_config = ConfigDict(from_attributes=True)
    subject: Optional[SimpleSubjectRef] = None
    topics: Optional[List[SimpleTopicRef]] = []
    creator: Optional[UserRef] = None

# Topic schemas
class TopicBase(BaseModel):
    name: str
    description: Optional[str] = None
    chapter_id: int

    model_config = ConfigDict(from_attributes=True)

class TopicCreate(TopicBase):
    pass

class TopicUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    chapter_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class TopicInDB(TopicBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

class Topic(TopicInDB):
    model_config = ConfigDict(from_attributes=True)
    chapter: Optional[SimpleChapterRef] = None

# Course schemas
class CourseBase(BaseModel):
    name: str
    description: str
    duration: int
    is_active: bool = True
    # Make these optional but require at least one
    stream_id: Optional[int] = None
    subject_id: Optional[int] = None
    chapter_id: Optional[int] = None
    topic_id: Optional[int] = None
    level: CourseLevelEnum = CourseLevelEnum.beginner

    model_config = ConfigDict(from_attributes=True)
    
    @model_validator(mode='after')
    def check_at_least_one_level(self):
        if not any([
            self.stream_id,
            self.subject_id,
            self.chapter_id,
            self.topic_id
        ]):
            raise ValueError('At least one of stream_id, subject_id, chapter_id, or topic_id must be provided')
        return self

class CourseCreate(CourseBase):
    pass

class CourseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[int] = None
    is_active: Optional[bool] = None
    stream_id: Optional[int] = None
    subject_id: Optional[int] = None
    chapter_id: Optional[int] = None
    topic_id: Optional[int] = None
    level: Optional[CourseLevelEnum] = None

    model_config = ConfigDict(from_attributes=True)

class CourseInDB(CourseBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

# Now define the main schemas
class Course(CourseInDB):
    model_config = ConfigDict(from_attributes=True)
    creator: Optional[UserRef] = None
    stream: Optional[StreamRef] = None
    subject: Optional[SimpleSubjectRef] = None
    chapter: Optional[SimpleChapterRef] = None
    topic: Optional[SimpleTopicRef] = None

# Answer schemas
class AnswerBase(BaseModel):
    content: str
    image_url: Optional[str] = None
    is_correct: bool
    
    model_config = ConfigDict(from_attributes=True)

class AnswerCreate(AnswerBase):
    pass

class AnswerUpdate(BaseModel):
    content: Optional[str] = None
    image_url: Optional[str] = None
    is_correct: Optional[bool] = None

class AnswerInDB(AnswerBase):
    id: int
    question_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

class Answer(AnswerInDB):
    pass

# Define AnswerRef as Answer to resolve forward reference
AnswerRef = Answer

# Question schemas
class QuestionBase(BaseModel):
    content: str
    image_url: Optional[str] = None
    difficulty_level: DifficultyLevelEnum
    topic_id: Optional[int] = None
    chapter_id: Optional[int] = None
    subject_id: Optional[int] = None
    course_id: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='after')
    def check_at_least_one_id(self):
        if not any([self.topic_id, self.chapter_id, self.subject_id, self.course_id]):
            raise ValueError("At least one of topic_id, chapter_id, subject_id, or course_id must be provided")
        return self

class QuestionCreate(QuestionBase):
    answers: List[AnswerCreate]

class QuestionUpdate(BaseModel):
    content: Optional[str] = None
    image_url: Optional[str] = None
    difficulty_level: Optional[DifficultyLevelEnum] = None
    topic_id: Optional[int] = None
    chapter_id: Optional[int] = None
    subject_id: Optional[int] = None
    course_id: Optional[int] = None

class QuestionInDB(QuestionBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

class Question(QuestionInDB):
    answers: List[Answer]
    creator: UserRef
    topic: Optional[SimpleTopicRef] = None
    chapter: Optional[SimpleChapterRef] = None
    subject: Optional[SimpleSubjectRef] = None
    course: Optional[SimpleCourseRef] = None

# Now define the relationship models at the end
# Update them with proper relationships

# Exam schemas
class ExamBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_datetime: datetime
    end_datetime: Optional[datetime] = None
    duration_minutes: int
    max_marks: float
    max_questions: int = 0
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
    course_id: Optional[int] = None
    class_id: Optional[int] = None
    subject_id: Optional[int] = None
    chapter_id: Optional[int] = None
    topic_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class ExamInDB(ExamBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

class Exam(ExamInDB):
    creator: UserRef

# ExamQuestion schemas
class ExamQuestionBase(BaseModel):
    exam_id: int
    question_id: int
    marks: float

class ExamQuestionCreate(ExamQuestionBase):
    pass

class ExamQuestionUpdate(BaseModel):
    marks: Optional[float] = None

class ExamQuestionInDB(ExamQuestionBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

class ExamQuestion(ExamQuestionInDB):
    exam: Exam
    question: QuestionRef

# StudentExam schemas
class StudentExamBase(BaseModel):
    student_id: int
    exam_id: int
    status: ExamStatusEnum = ExamStatusEnum.not_started
    
    model_config = ConfigDict(from_attributes=True)

class StudentExamCreate(StudentExamBase):
    pass

class StudentExamUpdate(BaseModel):
    status: Optional[ExamStatusEnum] = None
    
    model_config = ConfigDict(from_attributes=True)

class StudentExamInDB(StudentExamBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

class StudentExam(StudentExamInDB):
    student: UserRef
    exam: Exam

# StudentExam response schema to explicitly include status field
class StudentExamResponse(StudentExam):
    status: ExamStatusEnum = ExamStatusEnum.not_started
    
    model_config = ConfigDict(from_attributes=True)

# StudentAnswer schemas
class StudentAnswerBase(BaseModel):
    student_exam_id: int
    question_id: int
    answer_id: Optional[int] = None
    is_correct: Optional[bool] = None

class StudentAnswerCreate(StudentAnswerBase):
    pass

class StudentAnswerUpdate(BaseModel):
    answer_id: Optional[int] = None
    is_correct: Optional[bool] = None

class StudentAnswerInDB(StudentAnswerBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

# Simple version without relationships for API responses
class StudentAnswerSimple(StudentAnswerInDB):
    model_config = ConfigDict(from_attributes=True)

class StudentAnswer(StudentAnswerInDB):
    student_exam: StudentExam
    question: QuestionRef
    answer: Optional[AnswerRef] = None

# Exam Result schemas
class ExamResultBase(BaseModel):
    student_exam_id: int
    attempt_number: int
    total_questions: int
    correct_answers: int
    score_percentage: float
    obtained_marks: float
    max_marks: float
    passed_status: bool

    model_config = ConfigDict(from_attributes=True)

class ExamResultCreate(ExamResultBase):
    pass

class ExamResultUpdate(BaseModel):
    attempt_number: Optional[int] = None
    total_questions: Optional[int] = None
    correct_answers: Optional[int] = None
    score_percentage: Optional[float] = None
    obtained_marks: Optional[float] = None
    max_marks: Optional[float] = None
    passed_status: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)

class ExamResultInDB(ExamResultBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

class ExamResult(ExamResultInDB):
    student_exam: Optional[StudentExam] = None
    model_config = ConfigDict(from_attributes=True)

# Subscription schemas
class SubscriptionBase(BaseModel):
    name: str
    description: str
    duration_days: int
    price: float
    max_exams: Optional[int] = None
    features: str
    is_active: bool = True

class SubscriptionCreate(SubscriptionBase):
    pass

class SubscriptionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    duration_days: Optional[int] = None
    price: Optional[float] = None
    max_exams: Optional[int] = None
    features: Optional[str] = None
    is_active: Optional[bool] = None

class SubscriptionInDB(SubscriptionBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

class Subscription(SubscriptionInDB):
    pass

# UserSubscription schemas
class UserSubscriptionBase(BaseModel):
    user_id: int
    subscription_plan_packages_id: int
    start_date: datetime
    end_date: datetime
    status: SubscriptionStatusEnum = SubscriptionStatusEnum.active

class UserSubscriptionCreate(UserSubscriptionBase):
    pass

class UserSubscriptionUpdate(BaseModel):
    end_date: Optional[datetime] = None
    status: Optional[SubscriptionStatusEnum] = None

class UserSubscriptionInDB(UserSubscriptionBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

class UserSubscription(UserSubscriptionInDB):
    user: UserRef
    subscription_plan_package: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)

# ContentItem schemas
class ContentItemBase(BaseModel):
    title: str
    description: Optional[str] = None
    type: ContentTypeEnum
    url: str
    chapter_id: Optional[int] = None
    subject_id: Optional[int] = None

class ContentItemCreate(ContentItemBase):
    pass

class ContentItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[ContentTypeEnum] = None
    url: Optional[str] = None
    chapter_id: Optional[int] = None
    subject_id: Optional[int] = None

class ContentItemInDB(ContentItemBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

class ContentItem(ContentItemBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]
    creator: UserRef

    model_config = ConfigDict(from_attributes=True)

# Token schemas
class Token(BaseModelWithConfig):
    access_token: str
    token_type: str

class TokenData(BaseModelWithConfig):
    username: Optional[str] = None
    role: Optional[UserRoleEnum] = None

# Login schema
class EmailPasswordLogin(BaseModel):
    email: str
    password: str

# Package schemas
class PackageBase(BaseModel):
    name: str
    description: str

    model_config = ConfigDict(from_attributes=True)

class PackageCreate(PackageBase):
    course_ids: List[int]  # List of course IDs to include in the package

class PackageUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    course_ids: Optional[List[int]] = None

class PackageInDB(PackageBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

class Package(PackageInDB):
    creator: UserRef
    courses: List[FullCourseInfo]  # Changed from SimpleCourseRef to FullCourseInfo
    
    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)

# Add RemainingAttemptsResponse schema
class RemainingAttemptsResponse(BaseModel):
    remaining_attempts: int
    max_attempts: int
    exam_id: int
    student_id: int
    
    model_config = ConfigDict(from_attributes=True)

# Update forward references at the end of the file
User.update_forward_refs()
Class.update_forward_refs()
Topic.update_forward_refs()
Chapter.update_forward_refs()
Subject = SubjectSchema  # Ensure we use the imported schema
Stream = StreamSchema    # Ensure we use the imported schema
Course.update_forward_refs()
Question.update_forward_refs()
ExamQuestion.update_forward_refs()
StudentAnswer.update_forward_refs()

class OTPRequest(BaseModel):
    email: EmailStr
    purpose: str = "login"  # login, registration, password_reset

class OTPVerify(BaseModel):
    email: EmailStr
    otp_code: constr(min_length=6, max_length=6)
    purpose: str = "login"

class OTPResponse(BaseModel):
    message: str
    email: EmailStr
    expires_in: int  # seconds

class UserExistsCheck(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None

class UserExistsResponse(BaseModel):
    exists: bool
    username_taken: Optional[bool] = None
    email_taken: Optional[bool] = None

class ResetPassword(BaseModel):
    email: EmailStr
    new_password: str = Field(..., min_length=8, description="New password must be at least 8 characters long")

    model_config = ConfigDict(from_attributes=True)

class ExamAttemptBase(BaseModel):
    user_subscription_id: int
    student_exam_id: int
    remaining_attempts: int = 1

class ExamAttemptCreate(ExamAttemptBase):
    pass

class ExamAttemptUpdate(BaseModel):
    remaining_attempts: Optional[int] = None

class ExamAttempt(ExamAttemptBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# Add schema for student answers with attempt information
class StudentAnswerAttempt(BaseModel):
    attempt_number: int
    answers: List[StudentAnswerSimple] = []
    total_questions: Optional[int] = None
    correct_answers: Optional[int] = None
    score_percentage: Optional[float] = None
    obtained_marks: Optional[float] = None
    max_marks: Optional[float] = None
    passed_status: Optional[bool] = None
    created_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

class StudentAnswersAllAttempts(BaseModel):
    student_exam_id: int
    student_id: int
    exam_id: int
    status: ExamStatusEnum
    attempts: List[StudentAnswerAttempt]
    
    model_config = ConfigDict(from_attributes=True)
