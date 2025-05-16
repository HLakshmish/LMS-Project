import requests
import os

# API endpoint
url = "http://127.0.0.1:8000/api/questions/complete-with-images"

# Headers
headers = {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc0ODcxMDA1MH0.RDQxC0Wxle5aFZlWHGAWZ6Tzr0p_1LGPgx4Tf72P334"
}

# Create a few test image files (empty text files)
test_images = []
for i in range(5):
    filename = f"test_image_{i}.txt"
    with open(filename, "w") as f:
        f.write(f"Test image content {i}")
    test_images.append(filename)

# Basic data
data = {
    "content": "Question with multiple answer images",
    "difficulty_level": "easy",
    "topic_id": "1",
    "chapter_id": "0",
    "subject_id": "0",
    "course_id": "0",
    "answer_contents": "Option A,Option B,Option C,Option D",
    "answer_is_corrects": "true,false,false,false",
    "testing_mode": "true"
}

# The correct way to handle multiple files with the same field name
# For requests library, we use a list of tuples with the same key name
files = []

# Add question image
files.append(('question_image', ('question.txt', open(test_images[0], 'rb'), 'text/plain')))

# Add answer images - each with the same field name 'answer_images'
for i in range(1, min(len(test_images), 5)):
    files.append(('answer_images', (f'answer{i}.txt', open(test_images[i], 'rb'), 'text/plain')))

print("Sending request to:", url)
print("Data:", data)
print("Number of files:", len(files))
print("File field names:", [f[0] for f in files])

try:
    # Send POST request with data and files
    response = requests.post(url, headers=headers, data=data, files=files)

    # Print response
    print(f"Status code: {response.status_code}")
    try:
        print(f"Response body: {response.json()}")
    except:
        print(f"Response text: {response.text}")
finally:
    # Close all open files
    for _, file_tuple in files:
        file_tuple[1].close()
    
    # Clean up test files
    for filename in test_images:
        if os.path.exists(filename):
            try:
                os.remove(filename)
            except:
                print(f"Couldn't remove {filename}") 