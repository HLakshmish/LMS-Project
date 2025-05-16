import requests
import json
import sys

# Base URL
base_url = "http://127.0.0.1:8003"

# Auth token for student (replace with a valid token for your environment)
student_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJndXV1dXUiLCJleHAiOjE3NDkyNjA5NTJ9.9BSAM8QH63KLTguwWO0k-hyYZcUGD1k9-l1Hmm4blXk"

# Test the student report endpoint for a specific student
def test_student_report(student_id):
    print(f"\nTesting student report for student ID: {student_id}")
    print(f"Using URL: {base_url}/api/reports/student/{student_id}")
    
    headers = {
        "Authorization": f"Bearer {student_token}",
        "Accept": "application/json"
    }
    
    try:
        print("Sending request...")
        response = requests.get(
            f"{base_url}/api/reports/student/{student_id}",
            headers=headers
        )
        
        # Print status code
        print(f"Status Code: {response.status_code}")
        
        # If successful, print the response
        if response.status_code == 200:
            print("Success! Student report retrieved successfully.")
            data = response.json()
            
            # Print a summary of the report
            print("\nReport Summary:")
            print(f"Student ID: {data['student_id']}")
            print(f"Overall Performance:")
            print(f"  - Total Exams: {data['overall_performance']['total_exams']}")
            print(f"  - Average Score: {data['overall_performance']['average_score']}%")
            print(f"  - Highest Score: {data['overall_performance']['highest_score']}%")
            print(f"  - Total Passed: {data['overall_performance']['total_passed']}")
            
            print(f"\nSubject Performance: {len(data['subject_performance'])} subjects")
            for subject in data['subject_performance']:
                print(f"  - Subject ID: {subject['subject_id']}, Avg Score: {subject['average_score']}%")
            
            print(f"\nExam Results: {len(data['exam_results'])} exams")
            for exam in data['exam_results'][:3]:  # Show only first 3 exams for brevity
                print(f"  - {exam['exam_title']}: {exam['score_percentage']}%")
            
            print(f"\nSubscription: {'Active' if data['has_active_subscription'] else 'Inactive'}")
            if data['subscription_end_date']:
                print(f"  - Ends on: {data['subscription_end_date']}")
            
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Exception occurred: {str(e)}")

def test_exam_attempt_numbering():
    """
    Test that exam attempt numbers are correctly incremented when a student retakes an exam.
    This ensures that each attempt for the same student and exam has a sequential attempt_number.
    """
    # Import necessary modules
    from app.crud import student_exam as student_exam_crud
    from app.schemas.schemas import StudentExamCreate
    from app.models.models import StudentExam, ExamResult
    from sqlalchemy.orm import Session
    from app.core.database import get_db
    
    # Get DB session
    db = next(get_db())
    
    try:
        # Create test data
        # Note: This assumes you have test users and exams available
        student_id = 2  # Replace with a valid student ID
        exam_id = 1     # Replace with a valid exam ID
        
        # Create student exam
        student_exam_data = StudentExamCreate(
            student_id=student_id,
            exam_id=exam_id
        )
        
        # Create student exam
        student_exam = student_exam_crud.create_student_exam(db, student_exam=student_exam_data)
        student_exam_id = student_exam.id
        
        # Start exam
        student_exam_crud.start_student_exam(db, student_exam_id=student_exam_id)
        
        # Complete exam to create first result
        student_exam_crud.complete_student_exam(db, student_exam_id=student_exam_id)
        
        # Get first result
        first_result = db.query(ExamResult).filter(
            ExamResult.student_exam_id == student_exam_id
        ).order_by(ExamResult.attempt_number.desc()).first()
        
        # Verify first attempt number
        assert first_result is not None
        assert first_result.attempt_number == 1
        
        # Start exam again
        student_exam_crud.start_student_exam(db, student_exam_id=student_exam_id)
        
        # Complete exam again for second result
        student_exam_crud.complete_student_exam(db, student_exam_id=student_exam_id)
        
        # Get second result
        second_result = db.query(ExamResult).filter(
            ExamResult.student_exam_id == student_exam_id
        ).order_by(ExamResult.attempt_number.desc()).first()
        
        # Verify second attempt number
        assert second_result is not None
        assert second_result.attempt_number == 2
        
        print("Exam attempt numbering test passed!")
        
    except Exception as e:
        print(f"Exam attempt numbering test failed: {str(e)}")
        raise
    finally:
        # Clean up test data
        # Delete the created exam results
        db.query(ExamResult).filter(ExamResult.student_exam_id == student_exam_id).delete()
        # Delete the student exam
        db.query(StudentExam).filter(StudentExam.id == student_exam_id).delete()
        db.commit()

if __name__ == "__main__":
    # Get student ID from command line or use default
    student_id = int(sys.argv[1]) if len(sys.argv) > 1 else 2
    test_student_report(student_id) 