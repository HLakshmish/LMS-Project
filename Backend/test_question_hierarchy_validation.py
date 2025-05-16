# This script is for manual testing purposes.
# To test the question hierarchy validation:

print("""
MANUAL TESTING INSTRUCTIONS FOR QUESTION HIERARCHY VALIDATION:

1. Create a valid question with a single educational level
   - Use the Swagger UI at http://127.0.0.1:8000/docs
   - Authenticate with a teacher or admin account
   - Send a POST request to /api/questions/ with this payload:
   
   {
     "content": "What is the capital of France?",
     "difficulty_level": "easy",
     "topic_id": 0,
     "chapter_id": 1,
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
   
   - This should succeed with a 201 Created response

2. Try to create an invalid question with multiple hierarchy levels
   - Send another POST request with this payload:
   
   {
     "content": "What is the capital of England?",
     "difficulty_level": "easy",
     "topic_id": 1,
     "chapter_id": 0,
     "subject_id": 2,
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
   
   - This should fail with a 400 Bad Request response
   - The error message should indicate that only one educational hierarchy level can be specified

3. Update an existing question with a valid change
   - Find an existing question ID (e.g., from step 1)
   - Send a PUT request to /api/questions/{question_id} with:
   
   {
     "content": "Updated question content",
     "topic_id": 0,
     "chapter_id": 0,
     "subject_id": 0,
     "course_id": 2
   }
   
   - This should succeed with a 200 OK response

4. Try to update a question with multiple hierarchy levels
   - Use the same question ID
   - Send a PUT request with:
   
   {
     "content": "Invalid updated content",
     "topic_id": 1,
     "chapter_id": 0,
     "subject_id": 2,
     "course_id": 0
   }
   
   - This should fail with a 400 Bad Request response
""") 