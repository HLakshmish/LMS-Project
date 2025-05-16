import requests
import json

# API endpoint
url = "http://localhost:8000/api/subscription-packages/bulk"

# Headers
headers = {
    "accept": "application/json",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc0NjY3OTI0Nn0.H8mInbaB9X-IZoUJ34drgVjbDNCo5f-5zNff_kH1M1g",
    "Content-Type": "application/json"
}

# Data
data = {
    "subscription_id": 1,
    "package_ids": [1, 2]
}

# Make the request
try:
    response = requests.post(url, headers=headers, json=data)
    print(f"Status code: {response.status_code}")
    print("Response:")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
except Exception as e:
    print(f"Error: {str(e)}") 