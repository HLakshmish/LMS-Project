from datetime import datetime
from typing import Optional, List, ForwardRef
from pydantic import BaseModel, ConfigDict, model_validator
from enum import Enum

# Define enums locally to avoid circular imports
class CourseLevelEnum(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"

# Reference classes for relationships
class ClassInfo(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class StreamInfo(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    class_id: int
    class_: Optional[ClassInfo] = None
    
    model_config = ConfigDict(from_attributes=True)

class SubjectInfo(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    stream_id: int
    stream: Optional[StreamInfo] = None
    
    model_config = ConfigDict(from_attributes=True)

class ChapterInfo(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    subject_id: int
    chapter_number: Optional[int] = None
    subject: Optional[SubjectInfo] = None
    
    model_config = ConfigDict(from_attributes=True)

class TopicInfo(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    chapter_id: int
    chapter: Optional[ChapterInfo] = None
    
    model_config = ConfigDict(from_attributes=True)

class CreatorInfo(BaseModel):
    id: int
    username: str
    email: str
    role: str
    
    model_config = ConfigDict(from_attributes=True)

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
        if not any([self.stream_id, self.subject_id, self.chapter_id, self.topic_id]):
            raise ValueError("At least one of stream_id, subject_id, chapter_id, or topic_id must be provided")
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

    model_config = ConfigDict(from_attributes=True)

class Course(CourseInDB):
    creator: Optional[CreatorInfo] = None
    stream: Optional[StreamInfo] = None
    subject: Optional[SubjectInfo] = None
    chapter: Optional[ChapterInfo] = None
    topic: Optional[TopicInfo] = None
    
    model_config = ConfigDict(from_attributes=True)

class SimpleCourseRef(BaseModel):
    """
    A simplified reference to a course, with minimal fields to 
    break circular references in the schema
    """
    id: int
    name: str
    description: str
    
    model_config = ConfigDict(from_attributes=True)

class FullCourseInfo(BaseModel):
    """
    Full course information for use in Package responses
    """
    id: int
    name: str
    description: str
    duration: int
    is_active: bool
    level: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Relationships
    stream: Optional[StreamInfo] = None
    subject: Optional[SubjectInfo] = None
    chapter: Optional[ChapterInfo] = None
    topic: Optional[TopicInfo] = None
    creator: Optional[CreatorInfo] = None
    
    model_config = ConfigDict(from_attributes=True) 