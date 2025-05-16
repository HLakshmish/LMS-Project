from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import Optional, Dict, Any, List
from datetime import datetime

class ClassInfo(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class StreamBase(BaseModel):
    name: str = Field(
        ...,  # ... means required
        min_length=3,
        max_length=100,
        description="Name of the stream (e.g., 'Science Stream', 'Commerce Stream')",
        example="Science Stream"
    )
    description: Optional[str] = Field(
        None,
        max_length=500,
        description="Detailed description of the stream",
        example="Stream for students interested in pursuing science and technology"
    )
    class_id: int = Field(
        ...,
        gt=0,
        description="ID of the class this stream belongs to"
    )

class StreamCreate(StreamBase):
    """
    Schema for creating a new stream.
    Required fields:
    - name: string (3-100 characters)
    - class_id: integer (greater than 0)
    Optional fields:
    - description: string (max 500 characters)
    """
    pass

class StreamUpdate(BaseModel):
    """
    Schema for updating a stream.
    All fields are optional:
    - name: string (3-100 characters)
    - description: string (max 500 characters)
    - class_id: integer (greater than 0)
    """
    name: Optional[str] = Field(
        None,
        min_length=3,
        max_length=100,
        description="Updated name of the stream"
    )
    description: Optional[str] = Field(
        None,
        max_length=500,
        description="Updated description of the stream"
    )
    class_id: Optional[int] = Field(
        None,
        gt=0,
        description="Updated class ID for the stream"
    )

class Stream(StreamBase):
    """
    Schema for stream response.
    Includes all fields from StreamBase plus:
    - id: integer
    - created_at: datetime
    - updated_at: datetime (optional)
    - class_: class details (optional)
    """
    id: int = Field(..., gt=0)
    created_at: datetime
    updated_at: Optional[datetime] = None
    class_: Optional[ClassInfo] = None

    model_config = ConfigDict(from_attributes=True)
    
    @model_validator(mode='after')
    def validate_class(self):
        # If class_ is None, ensure it's excluded from the response
        if self.class_ is None:
            self.__dict__['class_'] = None
        return self 