import requests

# API endpoint
url = "http://127.0.0.1:8000/api/questions/complete-with-images"

# Headers
headers = {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc0ODcxMDA1MH0.RDQxC0Wxle5aFZlWHGAWZ6Tzr0p_1LGPgx4Tf72P334"
}

# Form data - exactly as in curl
data = {
    "content": "Test Question from test_curl.py",
    "difficulty_level": "easy",
    "topic_id": 1,
    "chapter_id": 0,
    "subject_id": 0,
    "course_id": 0,
    "answer_contents": "Option A,Option B,Option C,Option D",
    "answer_is_corrects": "true,false,false,false"
}

# Send POST request
print("Sending request to:", url)
print("Data:", data)
response = requests.post(url, headers=headers, data=data)

# Print response
print(f"Status code: {response.status_code}")
try:
    print(f"Response body: {response.json()}")
except:
    print(f"Response text: {response.text}") 