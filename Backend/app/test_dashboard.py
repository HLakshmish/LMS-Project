import requests
import json

# Base URL
base_url = "http://127.0.0.1:8003"

# Auth tokens
admin_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc0OTIwMTA5MH0.y5UcwaVBKVpRUMPZq6a4dmAPjdIFskhxSrq3YoCksXo"  # Original working token
teacher_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZWFjaGVyIiwiZXhwIjoxNzc4MjA0Njg2fQ.uFMaH7_fq5IMHyKADexgIiC35FHJy4SJSiGKAVP1ruk"  # Generated token

# Test the dashboard endpoint with a specific role
def test_dashboard_access(role, token):
    print(f"\nTesting dashboard access with {role} role...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json"
    }
    
    try:
        response = requests.get(
            f"{base_url}/api/reports/dashboard?time_period=last_month",
            headers=headers
        )
        
        # Print status code
        print(f"Status Code: {response.status_code}")
        
        # If successful, print the response
        if response.status_code == 200:
            print(f"Success! {role.capitalize()} can access the dashboard.")
            data = response.json()
            print(f"Dashboard statistics summary:")
            print(f"- Total students: {data['total_students']}")
            print(f"- Total exams: {data['total_exams']}")
            print(f"- Average score: {data['average_score']}%")
            print(f"- Recent exams: {len(data['recent_exams'])}")
            print(f"- Top performers: {len(data['top_performers'])}")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Exception occurred: {str(e)}")

if __name__ == "__main__":
    # Test with admin token
    test_dashboard_access("admin", admin_token)
    
    # Test with teacher token
    test_dashboard_access("teacher", teacher_token) 