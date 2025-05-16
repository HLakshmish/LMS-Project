import requests
import json

# API endpoint URL
url = "http://127.0.0.1:8000/api/exams/exams/"

# Authentication token
headers = {
    "accept": "application/json",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc0ODc1MDYyM30.Yw9uuTR_M_1Bu7xLDo0H5qPrBs0p609BZWppcK4X0eU",
    "Content-Type": "application/json"
}

# Data to send with max_questions field
data = {
    "title": "Exam with Max Questions",
    "description": "This exam has a maximum number of questions",
    "start_datetime": "2025-05-02T08:14:11.088Z",
    "end_datetime": "2025-05-02T10:14:11.088Z",
    "duration_minutes": 120,
    "max_marks": 100,
    "max_questions": 25,
    "course_id": 1,
    "class_id": 0,
    "subject_id": 0,
    "chapter_id": 0,
    "topic_id": 0
}

# Send the POST request
response = requests.post(url, headers=headers, json=data)

# Print the response status and body
print(f"Status code: {response.status_code}")
print("Response body:")
try:
    print(json.dumps(response.json(), indent=2))
except:
    print(response.text) 