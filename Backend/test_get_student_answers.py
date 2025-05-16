import requests
import json

url = 'http://127.0.0.1:8000/api/student-exams/student-exams/1/answers'
headers = {
    'accept': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJndXJ1IiwiZXhwIjoxNzQ4NzY4NDg5fQ.fP0B54nx8_whNLxgrqeLIEexbPHP0WSGWl5SIrNjXxQ'
}

response = requests.get(url, headers=headers)
print(f'Status code: {response.status_code}')
try:
    print(json.dumps(response.json(), indent=2))
except:
    print(response.text) 