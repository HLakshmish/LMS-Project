import requests
import json

url = 'http://127.0.0.1:8001/api/student-exams/student-exams/1/answers'
headers = {
    'accept': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJndXJ1IiwiZXhwIjoxNzQ4NzY4NDg5fQ.fP0B54nx8_whNLxgrqeLIEexbPHP0WSGWl5SIrNjXxQ',
    'Content-Type': 'application/json'
}
data = {
    'student_exam_id': 1,
    'question_id': 17,
    'answer_id': 2,
    'is_correct': True
}

response = requests.post(url, headers=headers, json=data)
print(f'Status code: {response.status_code}')
try:
    print(json.dumps(response.json(), indent=2))
except:
    print(response.text) 