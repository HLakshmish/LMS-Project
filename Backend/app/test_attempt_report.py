import requests
import json
import sys
from datetime import datetime

# Base URL
base_url = "http://127.0.0.1:8003"

# Auth tokens - replace with valid tokens for your environment
student_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJndXV1dXUiLCJleHAiOjE3NDkyNjA5NTJ9.9BSAM8QH63KLTguwWO0k-hyYZcUGD1k9-l1Hmm4blXk"
teacher_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZWFjaGVyMSIsImV4cCI6MTc0OTI2MDk1Mn0.O6N8UcnAc9sW_lwSl9YYwFmIzR8xKPT9GcyRE7dB5v0"


def format_date(date_str):
    """Format date string for easier reading"""
    try:
        date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        return date_obj.strftime("%Y-%m-%d %H:%M:%S")
    except:
        return date_str


def test_exam_attempts_report(exam_id, student_id=None):
    """
    Test the exam attempts report endpoint
    This endpoint provides a comprehensive report of student attempts for a specific exam
    """
    print(f"\nTesting exam attempts report for exam ID: {exam_id}")
    
    url = f"{base_url}/api/reports/exam/{exam_id}/attempts"
    if student_id:
        url += f"?student_id={student_id}"
        print(f"Filtering for student ID: {student_id}")
    
    print(f"Using URL: {url}")
    
    headers = {
        "Authorization": f"Bearer {teacher_token}",
        "Accept": "application/json"
    }
    
    try:
        print("Sending request...")
        response = requests.get(url, headers=headers)
        
        # Print status code
        print(f"Status Code: {response.status_code}")
        
        # If successful, print the response
        if response.status_code == 200:
            print("Success! Exam attempts report retrieved successfully.")
            data = response.json()
            
            # Print a summary of the report
            print(f"\nFound {len(data)} students with attempts on this exam")
            
            for student_report in data:
                print("\n==== Student Attempt Report ====")
                print(f"Student: {student_report['student_name']} (ID: {student_report['student_id']})")
                print(f"Exam: {student_report['exam_title']} (ID: {student_report['exam_id']})")
                print(f"Total Attempts: {student_report['total_attempts']}")
                print(f"Average Score: {student_report['avg_score']}%")
                print(f"Best Score: {student_report['best_score']}%")
                print(f"Remaining Attempts: {student_report['attempts_remaining']} of {student_report['max_attempts']}")
                
                if student_report['improvement_percentage'] is not None:
                    print(f"Improvement: {student_report['improvement_percentage']}%")
                
                print("\nAttempt Details:")
                for attempt in student_report['attempts']:
                    attempt_date = format_date(attempt['attempt_date'])
                    print(f"  - Attempt {attempt['attempt_number']}: Score {attempt['score_percentage']}%, " +
                          f"Marks {attempt['obtained_marks']}/{attempt['max_marks']}, " +
                          f"Correct {attempt['correct_answers']}/{attempt['total_questions']}, " +
                          f"Date: {attempt_date}, " +
                          f"Passed: {'Yes' if attempt['passed'] else 'No'}")
                
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Exception occurred: {str(e)}")


def test_student_attempts_report(student_id, exam_id=None, time_period=None):
    """
    Test the student attempts report endpoint
    This endpoint provides a comprehensive report of all exam attempts for a specific student
    """
    print(f"\nTesting student attempts report for student ID: {student_id}")
    
    url = f"{base_url}/api/reports/student/{student_id}/attempts"
    
    # Add query parameters if provided
    params = {}
    if exam_id:
        params["exam_id"] = exam_id
        print(f"Filtering for exam ID: {exam_id}")
    if time_period:
        params["time_period"] = time_period
        print(f"Filtering for time period: {time_period}")
    
    print(f"Using URL: {url}")
    
    headers = {
        "Authorization": f"Bearer {student_token if student_id == 2 else teacher_token}",
        "Accept": "application/json"
    }
    
    try:
        print("Sending request...")
        response = requests.get(url, headers=headers, params=params)
        
        # Print status code
        print(f"Status Code: {response.status_code}")
        
        # If successful, print the response
        if response.status_code == 200:
            print("Success! Student attempts report retrieved successfully.")
            data = response.json()
            
            # Print a summary of the report
            print(f"\nFound {len(data)} exams with attempts for this student")
            
            for exam_report in data:
                print("\n==== Exam Attempt Report ====")
                print(f"Exam: {exam_report['exam_title']} (ID: {exam_report['exam_id']})")
                print(f"Student: {exam_report['student_name']} (ID: {exam_report['student_id']})")
                print(f"Total Attempts: {exam_report['total_attempts']}")
                print(f"Average Score: {exam_report['avg_score']}%")
                print(f"Best Score: {exam_report['best_score']}%")
                print(f"Remaining Attempts: {exam_report['attempts_remaining']} of {exam_report['max_attempts']}")
                
                if exam_report['improvement_percentage'] is not None:
                    print(f"Improvement: {exam_report['improvement_percentage']}%")
                
                print("\nAttempt Details:")
                for attempt in exam_report['attempts']:
                    attempt_date = format_date(attempt['attempt_date'])
                    print(f"  - Attempt {attempt['attempt_number']}: Score {attempt['score_percentage']}%, " +
                          f"Marks {attempt['obtained_marks']}/{attempt['max_marks']}, " +
                          f"Correct {attempt['correct_answers']}/{attempt['total_questions']}, " +
                          f"Date: {attempt_date}, " +
                          f"Passed: {'Yes' if attempt['passed'] else 'No'}")
                
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Exception occurred: {str(e)}")


if __name__ == "__main__":
    # Default values
    exam_id = 1
    student_id = 2
    
    # Parse command line arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == "exam":
            # Test exam attempts report
            exam_id = int(sys.argv[2]) if len(sys.argv) > 2 else 1
            student_id = int(sys.argv[3]) if len(sys.argv) > 3 else None
            test_exam_attempts_report(exam_id, student_id)
            
        elif sys.argv[1] == "student":
            # Test student attempts report
            student_id = int(sys.argv[2]) if len(sys.argv) > 2 else 2
            exam_id = int(sys.argv[3]) if len(sys.argv) > 3 else None
            time_period = sys.argv[4] if len(sys.argv) > 4 else None
            test_student_attempts_report(student_id, exam_id, time_period)
            
        else:
            print("Invalid command. Use 'exam' or 'student' as the first argument.")
    
    else:
        # Run both tests with default values
        test_exam_attempts_report(exam_id)
        test_student_attempts_report(student_id) 