import requests

url = "http://localhost:8000/api/auth/login"
payload = {
    "email": "hifsashafique8@gmail.com",
    "password": "password123"
}

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
