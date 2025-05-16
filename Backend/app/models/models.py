from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, DateTime, Enum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from datetime import datetime

from app.core.database import Base

# Enums
class UserRole(str, enum.Enum):
    superadmin = "superadmin"
    admin = "admin"
    teacher = "teacher"
    student = "student"

class DifficultyLevel(str, enum.Enum):
    easy = "easy"
    moderate = "moderate"
    difficult = "difficult"

class ExamStatus(str, enum.Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    completed = "completed"

class ContentType(str, enum.Enum):
    video = "video"
    pdf = "pdf"
    document = "document"

class SubscriptionStatus(str, enum.Enum):
    active = "active"
    expired = "expired"
    cancelled = "cancelled"

class CourseLevel(str, enum.Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"

class OTPPurpose(str, enum.Enum):
    REGISTRATION = "registration"
    LOGIN = "login"
    PASSWORD_RESET = "password_reset"

class ExamActiveStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"

# Models
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(Enum(UserRole))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    full_name = Column(String, nullable=True)  # Adding full_name field
    last_login = Column(DateTime(timezone=True), nullable=True)  # Track last login

    # Relationships
    created_courses = relationship("Course", back_populates="creator")
    created_questions = relationship("Question", back_populates="creator")
    created_exams = relationship("Exam", back_populates="creator")
    student_exams = relationship("StudentExam", back_populates="student")
    created_content = relationship("ContentItem", back_populates="creator")
    created_classes = relationship("Class", back_populates="creator")
    created_subjects = relationship("Subject", back_populates="creator")
    created_chapters = relationship("Chapter", back_populates="creator")
    created_topics = relationship("Topic", back_populates="creator")
    created_packages = relationship("Package", back_populates="creator")
    subscriptions = relationship("UserSubscription", back_populates="user")

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    duration = Column(Integer, nullable=True)  # Duration in hours
    is_active = Column(Boolean, default=True)
    # Allow association with different levels of the hierarchy
    stream_id = Column(Integer, ForeignKey("streams.id"), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    level = Column(Enum(CourseLevel), default=CourseLevel.beginner)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    stream = relationship("Stream", back_populates="courses")
    subject = relationship("Subject", back_populates="courses")
    chapter = relationship("Chapter", back_populates="courses")
    topic = relationship("Topic", back_populates="courses")
    creator = relationship("User", back_populates="created_courses")
    packages = relationship("Package", secondary="package_courses", back_populates="courses")
    questions = relationship("Question", back_populates="course")
    content_items = relationship("ContentItem", back_populates="course")

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    code = Column(String, index=True, unique=True)  # Subject code like "MATH101"
    credits = Column(Integer, default=0)
    stream_id = Column(Integer, ForeignKey("streams.id"))  # Changed from class_id to stream_id
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    stream = relationship("Stream", back_populates="subjects")  # Changed from class_ to stream
    creator = relationship("User", back_populates="created_subjects")
    chapters = relationship("Chapter", back_populates="subject")
    questions = relationship("Question", back_populates="subject")
    content_items = relationship("ContentItem", back_populates="subject")
    courses = relationship("Course", back_populates="subject") # Added courses relationship

class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    chapter_number = Column(Integer)  # To maintain order of chapters
    is_active = Column(Boolean, default=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    subject = relationship("Subject", back_populates="chapters")
    creator = relationship("User", back_populates="created_chapters")
    topics = relationship("Topic", back_populates="chapter")
    questions = relationship("Question", back_populates="chapter")
    content_items = relationship("ContentItem", back_populates="chapter")
    courses = relationship("Course", back_populates="chapter") # Added courses relationship

class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    topic_number = Column(Integer)  # To maintain order of topics within a chapter
    is_active = Column(Boolean, default=True)
    estimated_time = Column(Integer, nullable=True)  # Estimated time in minutes
    chapter_id = Column(Integer, ForeignKey("chapters.id"))
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    chapter = relationship("Chapter", back_populates="topics")
    creator = relationship("User", back_populates="created_topics")
    questions = relationship("Question", back_populates="topic")
    courses = relationship("Course", back_populates="topic")
    content_items = relationship("ContentItem", back_populates="topic")

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text)
    image_url = Column(String, nullable=True)
    difficulty_level = Column(Enum(DifficultyLevel))
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    topic = relationship("Topic", back_populates="questions")
    chapter = relationship("Chapter", back_populates="questions")
    subject = relationship("Subject", back_populates="questions")
    course = relationship("Course", back_populates="questions")
    creator = relationship("User", back_populates="created_questions")
    answers = relationship("Answer", back_populates="question")
    exam_questions = relationship("ExamQuestion", back_populates="question")
    student_answers = relationship("StudentAnswer", back_populates="question")

class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"))
    content = Column(Text)
    image_url = Column(String, nullable=True)
    is_correct = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    question = relationship("Question", back_populates="answers")
    student_answers = relationship("StudentAnswer", back_populates="answer")

class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    start_datetime = Column(DateTime(timezone=True))
    end_datetime = Column(DateTime(timezone=True), nullable=True)
    duration_minutes = Column(Integer)
    max_marks = Column(Float)
    max_questions = Column(Integer, default=0)
    status = Column(Enum(ExamActiveStatus), default=ExamActiveStatus.active)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    creator = relationship("User", back_populates="created_exams")
    exam_questions = relationship("ExamQuestion", back_populates="exam")
    student_exams = relationship("StudentExam", back_populates="exam")
    course = relationship("Course", backref="exams")
    class_ = relationship("Class", backref="exams")
    subject = relationship("Subject", backref="exams")
    chapter = relationship("Chapter", backref="exams")
    topic = relationship("Topic", backref="exams")

class ExamQuestion(Base):
    __tablename__ = "exam_questions"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id"))
    question_id = Column(Integer, ForeignKey("questions.id"))
    marks = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    exam = relationship("Exam", back_populates="exam_questions")
    question = relationship("Question", back_populates="exam_questions")

class StudentExam(Base):
    __tablename__ = "student_exams"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    exam_id = Column(Integer, ForeignKey("exams.id"))
    status = Column(Enum(ExamStatus), default=ExamStatus.not_started)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    student = relationship("User", back_populates="student_exams")
    exam = relationship("Exam", back_populates="student_exams")
    student_answers = relationship("StudentAnswer", back_populates="student_exam")
    exam_results = relationship("ExamResult", back_populates="student_exam")

class StudentAnswer(Base):
    __tablename__ = "student_answers"

    id = Column(Integer, primary_key=True, index=True)
    student_exam_id = Column(Integer, ForeignKey("student_exams.id"))
    question_id = Column(Integer, ForeignKey("questions.id"))
    answer_id = Column(Integer, ForeignKey("answers.id"), nullable=True)
    is_correct = Column(Boolean, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    student_exam = relationship("StudentExam", back_populates="student_answers")
    question = relationship("Question", back_populates="student_answers")
    answer = relationship("Answer", back_populates="student_answers")

class ExamResult(Base):
    __tablename__ = "exam_results"

    id = Column(Integer, primary_key=True, index=True)
    student_exam_id = Column(Integer, ForeignKey("student_exams.id"))
    attempt_number = Column(Integer, default=1)
    total_questions = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    score_percentage = Column(Float, default=0)
    obtained_marks = Column(Float, default=0)
    max_marks = Column(Float, default=0)
    passed_status = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    student_exam = relationship("StudentExam", back_populates="exam_results")

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text)
    duration_days = Column(Integer)
    price = Column(Float)
    max_exams = Column(Integer, nullable=True)
    features = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    packages = relationship("SubscriptionPlanPackage", back_populates="subscription")

class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    subscription_plan_packages_id = Column(Integer, ForeignKey("subscription_plan_packages.id"))
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.active)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="subscriptions")
    subscription_plan_package = relationship("SubscriptionPlanPackage", back_populates="user_subscriptions")
    exam_attempts = relationship("ExamAttempt", back_populates="user_subscription")

class ContentItem(Base):
    __tablename__ = "content_items"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    type = Column(Enum(ContentType))
    url = Column(String)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    course = relationship("Course", back_populates="content_items")
    topic = relationship("Topic", back_populates="content_items")
    chapter = relationship("Chapter", back_populates="content_items")
    subject = relationship("Subject", back_populates="content_items")
    creator = relationship("User", back_populates="created_content")

class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = relationship("User", back_populates="created_classes")
    streams = relationship("Stream", back_populates="class_")

class Stream(Base):
    __tablename__ = "streams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    class_ = relationship("Class", back_populates="streams")
    subjects = relationship("Subject", back_populates="stream")  # Added subjects relationship
    courses = relationship("Course", back_populates="stream") # Added courses relationship

class Package(Base):
    __tablename__ = "packages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    creator = relationship("User", back_populates="created_packages")
    courses = relationship("Course", secondary="package_courses", back_populates="packages")

# Junction table for many-to-many relationship between Package and Course
class PackageCourse(Base):
    __tablename__ = "package_courses"

    package_id = Column(Integer, ForeignKey("packages.id"), primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id"), primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# After the UserSubscription class
class SubscriptionPlanPackage(Base):
    __tablename__ = "subscription_plan_packages"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False)
    package_ids = Column(Text, nullable=True)  # JSON array of package IDs
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    subscription = relationship("Subscription", back_populates="packages")
    user_subscriptions = relationship("UserSubscription", back_populates="subscription_plan_package")

class OTP(Base):
    __tablename__ = "otps"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    otp_code = Column(String)
    purpose = Column(Enum(OTPPurpose))
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime)
    
    def is_expired(self) -> bool:
        """Check if the OTP has expired."""
        return datetime.utcnow() > self.expires_at

class ExamAttempt(Base):
    __tablename__ = "exam_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_subscription_id = Column(Integer, ForeignKey("user_subscriptions.id"))
    exam_id = Column(Integer, ForeignKey("exams.id"))
    remaining_attempts = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user_subscription = relationship("UserSubscription", back_populates="exam_attempts")
    exam = relationship("Exam", back_populates="exam_attempts")

# Add relationship to UserSubscription class
UserSubscription.exam_attempts = relationship("ExamAttempt", back_populates="user_subscription")

# Add relationship to Exam class
Exam.exam_attempts = relationship("ExamAttempt", back_populates="exam")
