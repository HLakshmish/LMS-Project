from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.models.models import StudentExam, ExamStatus
import json
from datetime import datetime

def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    if hasattr(obj, '__dict__'):
        return obj.__dict__
    return str(obj)

def test_student_exam_status():
    db = next(get_db())
    
    # Query all student exams with their relationships
    student_exams = db.query(StudentExam).options(
        joinedload(StudentExam.student),
        joinedload(StudentExam.exam)
    ).all()
    
    # Print the results as JSON to ensure all fields are included
    result = []
    for exam in student_exams:
        exam_dict = {
            "id": exam.id,
            "student_id": exam.student_id,
            "exam_id": exam.exam_id,
            "status": exam.status.value,  # Convert enum to string value
            "created_at": exam.created_at,
            "updated_at": exam.updated_at
        }
        result.append(exam_dict)
    
    print(json.dumps(result, default=json_serial, indent=2))
    
    # Test creating a student exam with status
    new_exam = StudentExam(
        student_id=student_exams[0].student_id if student_exams else 1,
        exam_id=student_exams[0].exam_id if student_exams else 1,
        status=ExamStatus.in_progress  # Explicitly set status
    )
    
    # Print object to verify status is set
    print(f"\nNew exam status: {new_exam.status}")
    
    # Don't actually commit to avoid affecting the database

if __name__ == "__main__":
    test_student_exam_status() 