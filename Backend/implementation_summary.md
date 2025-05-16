# Educational Hierarchy Validation Implementation

## Overview

We've implemented validation in the exam and question APIs to ensure that these resources can only be associated with one level of the educational hierarchy at a time. The educational hierarchy levels are:

- `course_id`
- `class_id` (exams only)
- `subject_id`
- `chapter_id`
- `topic_id`

## Changes Made for Exams

1. Modified the `create_exam` endpoint to:
   - Check if multiple hierarchy IDs are non-zero
   - Return a 400 Bad Request error if multiple levels are specified
   - Updated the documentation to clarify that only one level can be specified

2. Modified the `update_exam` endpoint to:
   - Check if multiple hierarchy IDs are non-zero
   - Return a 400 Bad Request error if multiple levels are specified
   - Updated the documentation to clarify that only one level can be specified

## Changes Made for Questions

1. Modified the following question endpoints to enforce the same validation:
   - `create_question`
   - `update_question`
   - `create_question_with_image`
   - `update_question_with_image`
   - `create_complete_question_with_images`

2. Added comprehensive validation in each endpoint to:
   - Check if multiple hierarchy IDs are non-zero
   - Return a 400 Bad Request error if multiple levels are specified
   - Updated the documentation to clarify that only one level can be specified

## API Usage Examples

### Valid Request (One Hierarchy Level)

```json
// Example for exams
{
  "title": "Math Test",
  "description": "Final assessment for Algebra",
  "start_datetime": "2025-05-03T10:00:00",
  "end_datetime": "2025-05-03T11:00:00",
  "duration_minutes": 60,
  "max_marks": 100,
  "max_questions": 20,
  "course_id": 0,
  "class_id": 0,
  "subject_id": 1,  // Only one hierarchy level is specified
  "chapter_id": 0,
  "topic_id": 0
}

// Example for questions
{
  "content": "What is the capital of France?",
  "difficulty_level": "easy",
  "topic_id": 0,
  "chapter_id": 1,  // Only one hierarchy level is specified
  "subject_id": 0,
  "course_id": 0,
  "answers": [
    {
      "content": "Paris",
      "is_correct": true
    },
    {
      "content": "London",
      "is_correct": false
    }
  ]
}
```

### Invalid Request (Multiple Hierarchy Levels)

```json
// Example for exams
{
  "title": "Math Test",
  "description": "Final assessment for Algebra",
  "start_datetime": "2025-05-03T10:00:00",
  "end_datetime": "2025-05-03T11:00:00",
  "duration_minutes": 60,
  "max_marks": 100,
  "max_questions": 20,
  "course_id": 1,  // Multiple hierarchy levels specified
  "class_id": 0,
  "subject_id": 2,  // Multiple hierarchy levels specified
  "chapter_id": 0,
  "topic_id": 0
}

// Example for questions
{
  "content": "What is the capital of England?",
  "difficulty_level": "easy",
  "topic_id": 1,  // Multiple hierarchy levels specified
  "chapter_id": 0,
  "subject_id": 2,  // Multiple hierarchy levels specified
  "course_id": 0,
  "answers": [
    {
      "content": "London",
      "is_correct": true
    },
    {
      "content": "Paris",
      "is_correct": false
    }
  ]
}
```

## How to Test

You can test the functionality using the Swagger UI at `http://127.0.0.1:8000/docs`:

1. Authenticate with a teacher or admin account
2. Try creating an exam or question with only one educational hierarchy level (should succeed)
3. Try creating an exam or question with multiple educational hierarchy levels (should fail with a 400 error)
4. Try updating an exam or question with only one educational hierarchy level (should succeed)
5. Try updating an exam or question with multiple educational hierarchy levels (should fail with a 400 error)

## Error Message Example

When trying to specify multiple hierarchy levels, you will receive an error like:

```json
{
  "detail": "Only one educational hierarchy ID can be specified at a time. Multiple fields provided: course_id, subject_id"
}
``` 