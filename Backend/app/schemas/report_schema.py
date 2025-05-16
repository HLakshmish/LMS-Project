from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class PerformanceStats(BaseModel):
    total_exams: int
    average_score: float
    highest_score: float
    lowest_score: float
    total_passed: int
    
    model_config = ConfigDict(from_attributes=True)

class SubjectPerformance(BaseModel):
    subject_id: int
    total_exams: int
    average_score: float
    highest_score: float
    total_passed: int
    
    model_config = ConfigDict(from_attributes=True)

class ExamResult(BaseModel):
    exam_id: int
    exam_title: str
    date_taken: datetime
    score_percentage: float
    obtained_marks: float
    max_marks: float
    total_questions: int
    correct_answers: int
    passed: bool
    
    model_config = ConfigDict(from_attributes=True)

class StudentReport(BaseModel):
    student_id: int
    overall_performance: PerformanceStats
    subject_performance: List[SubjectPerformance]
    exam_results: List[ExamResult]
    has_active_subscription: bool
    subscription_end_date: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

class StudentPerformance(BaseModel):
    student_id: int
    total_exams: int
    average_score: float
    total_passed: int
    
    model_config = ConfigDict(from_attributes=True)

class ClassReport(BaseModel):
    class_id: int
    subject_id: Optional[int] = None
    total_students: int
    average_class_score: float
    highest_average_score: float
    lowest_average_score: float
    passing_students: int
    passing_rate: float
    student_performances: List[StudentPerformance]
    
    model_config = ConfigDict(from_attributes=True)

class StudentReportSummary(BaseModel):
    student_id: int
    name: str
    total_exams: int
    average_score: float
    last_exam_date: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

class RecentExam(BaseModel):
    id: int
    title: str
    total_attempts: int
    average_score: float
    
    model_config = ConfigDict(from_attributes=True)

class DashboardStats(BaseModel):
    total_students: int
    total_exams: int
    average_score: float
    recent_exams: List[RecentExam]
    top_performers: List[StudentReportSummary]
    
    model_config = ConfigDict(from_attributes=True)

class AttemptDetails(BaseModel):
    attempt_number: int
    score_percentage: float
    obtained_marks: float
    max_marks: float
    total_questions: int
    correct_answers: int
    passed: bool
    attempt_date: datetime
    
    model_config = ConfigDict(from_attributes=True)

class AttemptReport(BaseModel):
    exam_id: int
    exam_title: str
    student_id: int
    student_name: str
    total_attempts: int
    avg_score: float
    best_score: float
    attempts_remaining: int
    max_attempts: int
    attempts: List[AttemptDetails]
    improvement_percentage: Optional[float] = None
    
    model_config = ConfigDict(from_attributes=True) 