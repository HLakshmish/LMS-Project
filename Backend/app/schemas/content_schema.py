from pydantic import BaseModel, ConfigDict, model_validator, Field
from typing import Optional
from datetime import datetime
from enum import Enum
from .schemas import User, Course, Topic, Chapter, Subject
from fastapi import UploadFile, File

class ContentType(str, Enum):
    video = "video"
    pdf = "pdf"
    document = "document"

class ContentItemBase(BaseModel):
    title: str
    description: Optional[str] = None
    type: ContentType
    url: Optional[str] = None
    course_id: Optional[int] = None
    topic_id: Optional[int] = None
    chapter_id: Optional[int] = None
    subject_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='after')
    def check_at_least_one_level(self):
        if not any([
            self.course_id,
            self.topic_id,
            self.chapter_id,
            self.subject_id
        ]):
            raise ValueError('At least one of course_id, topic_id, chapter_id, or subject_id must be provided')
        return self

class ContentItemCreate(ContentItemBase):
    pass

class ContentItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[ContentType] = None
    url: Optional[str] = None
    course_id: Optional[int] = None
    topic_id: Optional[int] = None
    chapter_id: Optional[int] = None
    subject_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class ContentItem(ContentItemBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    creator: Optional[User] = None
    course: Optional[Course] = None
    topic: Optional[Topic] = None
    chapter: Optional[Chapter] = None
    subject: Optional[Subject] = None
    url: str

    model_config = ConfigDict(from_attributes=True) 