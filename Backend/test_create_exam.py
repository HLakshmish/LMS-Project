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

# Data to send
data = {
    "title": "Test Exam",
    "description": "Test Description",
    "start_datetime": "2025-05-02T06:29:16.387Z",
    "end_datetime": "2025-05-03T06:29:16.387Z",
    "duration_minutes": 20,
    "max_marks": 100,
    "course_id": 1,
    "class_id": None,
    "subject_id": None,
    "chapter_id": None,
    "topic_id": None
}

# Send the POST request
response = requests.post(url, headers=headers, json=data)

# Print the response status and body
print(f"Status code: {response.status_code}")
print("Response body:")
print(json.dumps(response.json(), indent=2)) 