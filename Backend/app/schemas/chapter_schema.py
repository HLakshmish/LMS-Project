from datetime import datetime
from typing import Optional, List, ForwardRef
from pydantic import BaseModel, ConfigDict

from .schemas import UserRoleEnum, UserRef, SimpleTopicRef

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

class TopicRef(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    chapter_id: int
    
    model_config = ConfigDict(from_attributes=True)

class CreatorInfo(BaseModel):
    id: int
    username: str
    email: str
    role: str
    
    model_config = ConfigDict(from_attributes=True)

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
    
    model_config = ConfigDict(from_attributes=True)

class Chapter(ChapterInDB):
    subject: Optional[SubjectInfo] = None
    topics: Optional[List[SimpleTopicRef]] = []
    creator: Optional[CreatorInfo] = None
    
    model_config = ConfigDict(from_attributes=True) 