import requests
import json

# Base URL for the API
BASE_URL = "http://127.0.0.1:8000/api/questions"

# Authentication token for a teacher or admin account
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc0ODc3NjA5MH0.P6DklESqSp0AUh3wJWji9YGRT8kF7lKwBaCt-tWFEEs"
HEADERS = {
    "accept": "application/json",
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def print_response(response):
    print(f"Status code: {response.status_code}")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
    print("\n" + "-"*50 + "\n")

# Test updating a question with zero values for hierarchy IDs
def test_update_with_zeros():
    question_id = 1  # Change this to an existing question ID if needed
    update_payload = {
        "content": "What is the capital of France? (Updated)",
        "difficulty_level": "easy",
        "topic_id": 1,  # Setting only one valid hierarchy ID
        "chapter_id": 0,  # These should be converted to NULL in the database
        "subject_id": 0,  # These should be converted to NULL in the database
        "course_id": 0    # These should be converted to NULL in the database
    }
    
    print(f"Testing update with zero values for question ID {question_id}")
    response = requests.put(f"{BASE_URL}/{question_id}", headers=HEADERS, json=update_payload)
    print_response(response)
    
    if response.status_code == 200:
        print("✅ Success! Update with zero values works correctly.")
    else:
        print("❌ Failed! Update with zero values still has issues.")

# Run the test
if __name__ == "__main__":
    test_update_with_zeros() 