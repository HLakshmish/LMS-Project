import requests
import json

def test_create_student_exam():
    url = "http://127.0.0.1:8000/api/student-exams/"
    headers = {
        "accept": "application/json",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJndXV1dXUiLCJleHAiOjE3NDk2OTk5MTJ9.mvbx9-oe4kUnWM_-Ti8lSARvXB-zWfmbhobVqTpth6k",
        "Content-Type": "application/json"
    }
    data = {
        "student_id": 2,
        "exam_id": 5,
        "status": "not_started"
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {response.headers}")
        print(f"Response Body:")
        try:
            response_json = response.json()
            print(json.dumps(response_json, indent=4))
        except:
            print(response.text)
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    test_create_student_exam() 