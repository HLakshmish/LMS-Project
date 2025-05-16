from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

class ClassInfo(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class StreamInfo(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    class_: Optional[ClassInfo] = None
    
    model_config = ConfigDict(from_attributes=True)

class SubjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    code: str = Field(..., min_length=2, max_length=20, pattern="^[A-Z0-9]+$")
    credits: Optional[int] = Field(0, ge=0)
    stream_id: int = Field(..., gt=0)  # Changed from class_id to stream_id

class SubjectCreate(SubjectBase):
    pass

class SubjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    code: Optional[str] = Field(None, min_length=2, max_length=20, pattern="^[A-Z0-9]+$")
    credits: Optional[int] = Field(None, ge=0)
    stream_id: Optional[int] = Field(None, gt=0)

class Subject(SubjectBase):
    id: int = Field(..., gt=0)
    created_by: int = Field(..., gt=0)
    created_at: datetime
    updated_at: Optional[datetime] = None
    stream: Optional[StreamInfo] = None

    model_config = ConfigDict(from_attributes=True) 