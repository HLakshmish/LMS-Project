import requests
import json

# API endpoint URL - replace 7 with your actual exam ID
exam_id = 7
url = f"http://127.0.0.1:8000/api/exams/exams/{exam_id}"

# Authentication token
headers = {
    "accept": "application/json",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc0ODc1MDYyM30.Yw9uuTR_M_1Bu7xLDo0H5qPrBs0p609BZWppcK4X0eU",
    "Content-Type": "application/json"
}

# More complex update data
data = {
    "title": "Fully Updated Exam",
    "description": "This is a complete update test",
    "max_marks": 200,
    "course_id": 1,   # Set to a valid course ID 
    "topic_id": 0     # This should set the topic_id to NULL
}

# Send the PUT request
response = requests.put(url, headers=headers, json=data)

# Print the response status and body
print(f"Status code: {response.status_code}")
print("Response body:")
try:
    print(json.dumps(response.json(), indent=2))
except:
    print(response.text) 