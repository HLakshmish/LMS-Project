# API Changes Request: Student Exams API

## Background
Currently, our frontend application is calculating exam status on the client side using time-based logic. This creates inconsistency and requires duplicating logic across multiple components.

## Proposed API Change

We would like to modify the response from the Student Exams API endpoint to include the exam status directly from the backend.

### Current API Endpoint
`GET /api/student-exams/my-exams?skip=0&limit=100`

### Current Response

```json
[
  {
    "student_id": 0,
    "exam_id": 0,
    "id": 0,
    "created_at": "2025-05-13T03:30:49.897Z",
    "updated_at": "2025-05-13T03:30:49.897Z",
    "student": {
      "email": "string",
      "username": "string",
      "role": "superadmin",
      "id": 0,
      "full_name": "string",
      "created_at": "2025-05-13T03:30:49.897Z",
      "updated_at": "2025-05-13T03:30:49.897Z",
      "last_login": "2025-05-13T03:30:49.897Z"
    },
    "exam": {
      "title": "string",
      "description": "string",
      "start_datetime": "2025-05-13T03:30:49.897Z",
      "end_datetime": "2025-05-13T03:30:49.897Z",
      "duration_minutes": 0,
      "max_marks": 0,
      "max_questions": 0,
      "course_id": 0,
      "class_id": 0,
      "subject_id": 0,
      "chapter_id": 0,
      "topic_id": 0,
      "id": 0,
      "created_by": 0,
      "created_at": "2025-05-13T03:30:49.897Z",
      "updated_at": "2025-05-13T03:30:49.897Z",
      "creator": {
        "email": "string",
        "username": "string",
        "role": "superadmin",
        "id": 0,
        "full_name": "string",
        "created_at": "2025-05-13T03:30:49.897Z",
        "updated_at": "2025-05-13T03:30:49.897Z",
        "last_login": "2025-05-13T03:30:49.897Z"
      }
    }
  }
]
```

### Proposed Response Changes

Add the following fields to each student exam object:

```json
{
  "student_id": 0,
  "exam_id": 0,
  "status": "not_started", // existing field
  "ui_status": "upcoming", // new field - one of: "upcoming", "available", "in_progress", "completed", "expired"
  "id": 0,
  "created_at": "2025-05-13T03:30:49.897Z",
  "updated_at": "2025-05-13T03:30:49.897Z",
  ...
}
```

## Status Definitions

The `ui_status` field should be calculated based on the following logic:

- `upcoming`: Current time is before exam start_datetime and the exam is not marked as completed
- `available`: Current time is between start_datetime and end_datetime, and the exam has not been started yet
- `in_progress`: Exam has been started but not completed, and current time is between start_datetime and end_datetime
- `completed`: Exam has been marked as completed
- `expired`: Current time is after end_datetime and the exam was not completed

## Benefits

1. Consistent status calculation across all UI components 
2. Reduced client-side logic for determining exam status
3. More efficient UI rendering
4. Improved user experience with accurate exam status

## Additional Notes

This change should be backward compatible as we're only adding new fields, not changing existing ones.

Our current frontend implementation uses a helper function to determine exam status based on time and the existing status field. The backend implementation should follow similar logic.

## Implementation Timeline

We would like to have this API change implemented within the next sprint to support our upcoming exam status UI improvements.

Thank you for your help! 