# This script is for manual testing purposes.
# To test the exam hierarchy validation:

print("""
MANUAL TESTING INSTRUCTIONS:

1. Create a valid exam with a single educational level
   - Use the Swagger UI at http://127.0.0.1:8000/docs
   - Authenticate with a teacher or admin account
   - Send a POST request to /api/exams/exams/ with this payload:
   
   {
     "title": "Math Test - Valid",
     "description": "Testing exam validation",
     "start_datetime": "2025-05-03T10:00:00",
     "end_datetime": "2025-05-03T11:00:00",
     "duration_minutes": 60,
     "max_marks": 100,
     "max_questions": 10,
     "course_id": 0,
     "class_id": 0, 
     "subject_id": 1,
     "chapter_id": 0,
     "topic_id": 0
   }
   
   - This should succeed with a 201 Created response

2. Try to create an invalid exam with multiple hierarchy levels
   - Send another POST request with this payload:
   
   {
     "title": "Math Test - Invalid",
     "description": "Testing exam validation",
     "start_datetime": "2025-05-03T10:00:00",
     "end_datetime": "2025-05-03T11:00:00",
     "duration_minutes": 60,
     "max_marks": 100,
     "max_questions": 10,
     "course_id": 1,
     "class_id": 0,
     "subject_id": 2,
     "chapter_id": 0,
     "topic_id": 0
   }
   
   - This should fail with a 400 Bad Request response
   - The error message should indicate that only one educational hierarchy level can be specified

3. Update an existing exam with a valid change
   - Find an existing exam ID (e.g., from step 1)
   - Send a PUT request to /api/exams/exams/{exam_id} with:
   
   {
     "title": "Updated Math Test",
     "course_id": 0,
     "class_id": 0,
     "subject_id": 0,
     "chapter_id": 0,
     "topic_id": 2
   }
   
   - This should succeed with a 200 OK response

4. Try to update an exam with multiple hierarchy levels
   - Use the same exam ID
   - Send a PUT request with:
   
   {
     "title": "Invalid Updated Math Test",
     "course_id": 1,
     "class_id": 0,
     "subject_id": 0,
     "chapter_id": 3,
     "topic_id": 0
   }
   
   - This should fail with a 400 Bad Request response
""") 