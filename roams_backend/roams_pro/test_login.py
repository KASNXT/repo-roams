import requests

# --- Configuration ---
API_URL = "http://localhost:8000/api/api-token-auth/"
USERNAME = "kasmic"
PASSWORD = "MBHA.123"

# --- Make POST request to get token ---
try:
    response = requests.post(API_URL, data={"username": USERNAME, "password": PASSWORD})
    response.raise_for_status()  # Raise error if status is 4xx/5xx

    data = response.json()
    token = data.get("token")

    if token:
        print("✅ Login successful!")
        print("Token:", token)
    else:
        print("❌ Login failed! No token returned.")
        print("Response:", data)

except requests.exceptions.HTTPError as http_err:
    print(f"❌ HTTP error occurred: {http_err}")
except requests.exceptions.ConnectionError:
    print("❌ Could not connect to server. Is it running?")
except Exception as err:
    print(f"❌ Other error occurred: {err}")
