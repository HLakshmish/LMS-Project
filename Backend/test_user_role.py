import requests
import json

def test_user_role():
    url = "http://localhost:8000/api/auth/me"
    headers = {
        "accept": "application/json",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJndXV1dXUiLCJleHAiOjE3NDk2OTk5MTJ9.mvbx9-oe4kUnWM_-Ti8lSARvXB-zWfmbhobVqTpth6k"
    }
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {response.headers}")
        print(f"Response Body:")
        try:
            response_json = response.json()
            print(json.dumps(response_json, indent=4))
            if "role" in response_json:
                print(f"\nUser Role: {response_json['role']}")
        except:
            print(response.text)
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    test_user_role() 