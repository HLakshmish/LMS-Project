# Student Exam Attempts Reporting

## Overview

This module introduces comprehensive exam attempt reporting to the LMS backend, providing detailed analytics on student performance across multiple attempts of the same exam. The implementation ensures that each attempt's attempt_number is properly incremented as per requirements.

## Key Features

- **Per-Student Attempt History**: Detailed view of a student's performance across multiple attempts of the same exam
- **Performance Improvement Tracking**: Calculate improvement percentages between first and latest attempts
- **Attempt Numbering Validation**: Ensures sequential attempt numbering for the same student-exam pair
- **Remaining Attempts Management**: Shows how many attempts remain based on subscription limits
- **Time-Based Filtering**: Filter reports by time period (last week, month, 3 months, 6 months, year)

## API Endpoints

### 1. Get Exam Attempts Report

```
GET /api/reports/exam/{exam_id}/attempts
```

Returns attempt details for all students who have taken a specific exam.

**Query Parameters:**
- `student_id` (optional): Filter results for a specific student

**Access Control:**
- Teachers and administrators only

**Response:**
```json
[
  {
    "exam_id": 1,
    "exam_title": "Sample Exam",
    "student_id": 2,
    "student_name": "John Doe",
    "total_attempts": 3,
    "avg_score": 75.5,
    "best_score": 85.0,
    "attempts_remaining": 2,
    "max_attempts": 5,
    "attempts": [
      {
        "attempt_number": 1,
        "score_percentage": 65.0,
        "obtained_marks": 13.0,
        "max_marks": 20.0,
        "total_questions": 10,
        "correct_answers": 7,
        "passed": true,
        "attempt_date": "2023-08-15T14:30:00"
      },
      {
        "attempt_number": 2,
        "score_percentage": 75.0,
        "obtained_marks": 15.0,
        "max_marks": 20.0,
        "total_questions": 10,
        "correct_answers": 8,
        "passed": true,
        "attempt_date": "2023-08-16T10:45:00"
      },
      {
        "attempt_number": 3,
        "score_percentage": 85.0,
        "obtained_marks": 17.0,
        "max_marks": 20.0,
        "total_questions": 10,
        "correct_answers": 9,
        "passed": true,
        "attempt_date": "2023-08-17T09:15:00"
      }
    ],
    "improvement_percentage": 30.77
  }
]
```

### 2. Get Student Attempts Report

```
GET /api/reports/student/{student_id}/attempts
```

Returns attempt details for all exams taken by a specific student.

**Query Parameters:**
- `exam_id` (optional): Filter results for a specific exam
- `time_period` (optional): Filter by time period: 'last_week', 'last_month', 'last_3_months', 'last_6_months', 'last_year', 'all'

**Access Control:**
- Students can view only their own reports
- Teachers and administrators can view any student's reports

**Response:**
```json
[
  {
    "exam_id": 1,
    "exam_title": "Math Midterm",
    "student_id": 2,
    "student_name": "John Doe",
    "total_attempts": 2,
    "avg_score": 77.5,
    "best_score": 85.0,
    "attempts_remaining": 3,
    "max_attempts": 5,
    "attempts": [
      {
        "attempt_number": 1,
        "score_percentage": 70.0,
        "obtained_marks": 14.0,
        "max_marks": 20.0,
        "total_questions": 10,
        "correct_answers": 7,
        "passed": true,
        "attempt_date": "2023-08-10T13:20:00"
      },
      {
        "attempt_number": 2,
        "score_percentage": 85.0,
        "obtained_marks": 17.0,
        "max_marks": 20.0,
        "total_questions": 10,
        "correct_answers": 9,
        "passed": true,
        "attempt_date": "2023-08-12T11:30:00"
      }
    ],
    "improvement_percentage": 21.43
  },
  {
    "exam_id": 2,
    "exam_title": "Science Quiz",
    "student_id": 2,
    "student_name": "John Doe",
    "total_attempts": 1,
    "avg_score": 80.0,
    "best_score": 80.0,
    "attempts_remaining": 4,
    "max_attempts": 5,
    "attempts": [
      {
        "attempt_number": 1,
        "score_percentage": 80.0,
        "obtained_marks": 8.0,
        "max_marks": 10.0,
        "total_questions": 5,
        "correct_answers": 4,
        "passed": true,
        "attempt_date": "2023-08-15T09:45:00"
      }
    ],
    "improvement_percentage": null
  }
]
```

## Testing the Functionality

A dedicated test script is provided in `app/test_attempt_report.py` to help you test the attempt report endpoints. This script can be run from the command line using Python:

```bash
# Test exam attempts report
python app/test_attempt_report.py exam 1

# Test exam attempts for a specific student
python app/test_attempt_report.py exam 1 2

# Test student attempts report
python app/test_attempt_report.py student 2

# Test student attempts for a specific exam with time period
python app/test_attempt_report.py student 2 1 last_month
```

## Attempt Number Implementation

The system has been updated to ensure that the `attempt_number` in the `ExamResult` table is correctly incremented each time a student retakes the same exam. This is handled in the `complete_student_exam` function in `app/crud/student_exam.py`.

Key logic includes:

1. When a student first attempts an exam, `attempt_number` is set to 1
2. For subsequent attempts, the system fetches the latest attempt number and increments it by 1
3. The `attempt_number` field is included in the `ExamResult` creation process

This ensures that each attempt for the same student-exam pair has a sequential attempt number, allowing for accurate tracking of student performance across multiple attempts. 