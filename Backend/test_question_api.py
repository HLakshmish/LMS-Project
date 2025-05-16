import requests

# API endpoint
url = "http://127.0.0.1:8000/api/questions/complete-with-images"

# Headers
headers = {
    "accept": "application/json",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc0ODcxMDA1MH0.RDQxC0Wxle5aFZlWHGAWZ6Tzr0p_1LGPgx4Tf72P334"
}

# Form data - using the same format as the curl command
data = {
    "content": "Test question from Python script",
    "difficulty_level": "easy",
    "topic_id": 1,
    "chapter_id": 0,
    "subject_id": 0,
    "course_id": 0,
    # Pass answer contents as a comma-separated string just like in curl
    "answer_contents": "Option A,Option B,Option C,Option D",
    # Pass answer_is_corrects as a comma-separated string just like in curl
    "answer_is_corrects": "true,false,false,false"
}

# Create empty files
files = {
    # Pass empty files for testing
    "question_image": ("", "", "application/octet-stream"),
    "answer_images": ("", "", "application/octet-stream")
}

print("Sending request to:", url)
print("Data:", data)
print("Files:", files)

# Send POST request
response = requests.post(url, headers=headers, data=data, files=files)

# Print response
print(f"Status code: {response.status_code}")
print(f"Response body: {response.json() if response.status_code == 200 else response.text}") 