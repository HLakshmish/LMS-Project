import requests
import json

def test_dashboard_api():
    url = "http://localhost:8000/api/reports/dashboard"
    params = {
        "time_period": "last_month"
    }
    headers = {
        "accept": "application/json",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJndXV1dXUiLCJleHAiOjE3NDk2OTk5MTJ9.mvbx9-oe4kUnWM_-Ti8lSARvXB-zWfmbhobVqTpth6k"
    }
    
    try:
        response = requests.get(url, params=params, headers=headers)
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
    test_dashboard_api() 