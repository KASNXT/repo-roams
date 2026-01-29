# ROAMS Alarm API Reference

## Base URL
```
http://localhost:8000/api/
```

## Authentication
All requests require a Bearer token in the Authorization header:
```
Authorization: Token YOUR_AUTH_TOKEN
```

---

## Alarm Endpoints

### 1. List All Alarms
```http
GET /api/alarms/
```

**Query Parameters:**
```
?station_name=Station-01      # Filter by station
?severity=High                 # Filter by severity (High/Normal)
?acknowledged=false            # Filter by acknowledgement status
?from_date=2025-12-01T00:00:00Z  # Start date (ISO 8601)
?to_date=2025-12-31T23:59:59Z    # End date (ISO 8601)
?ordering=-timestamp           # Sort by timestamp (newest first)
?limit=100                     # Pagination limit
&offset=0                      # Pagination offset
```

**Example Request:**
```bash
curl -H "Authorization: Token abc123xyz" \
  "http://localhost:8000/api/alarms/?station_name=Station-01&severity=High&ordering=-timestamp"
```

**Example Response:**
```json
{
  "count": 42,
  "next": "http://localhost:8000/api/alarms/?offset=20",
  "previous": null,
  "results": [
    {
      "id": 156,
      "node": 5,
      "node_tag_name": "Temperature",
      "station_name": "Station-01",
      "message": "Temperature too high",
      "severity": "High",
      "timestamp": "2025-12-27T14:30:45Z",
      "acknowledged": false
    },
    {
      "id": 155,
      "node": 8,
      "node_tag_name": "Pressure",
      "station_name": "Station-01",
      "message": "Pressure warning",
      "severity": "Normal",
      "timestamp": "2025-12-27T13:15:20Z",
      "acknowledged": true
    }
  ]
}
```

### 2. Get Single Alarm
```http
GET /api/alarms/{id}/
```

**Example:**
```bash
curl -H "Authorization: Token abc123xyz" \
  "http://localhost:8000/api/alarms/156/"
```

---

## Alarm Retention Policy Endpoints

### 1. Get Current Policy
```http
GET /api/alarm-retention-policy/
```

**Example Request:**
```bash
curl -H "Authorization: Token abc123xyz" \
  "http://localhost:8000/api/alarm-retention-policy/"
```

**Example Response:**
```json
{
  "id": 1,
  "alarm_log_retention_days": 90,
  "breach_retention_days": 90,
  "keep_unacknowledged": true,
  "auto_cleanup_enabled": true,
  "last_cleanup_at": "2025-12-27T02:00:15Z",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-12-27T14:00:00Z"
}
```

### 2. Update Policy
```http
PATCH /api/alarm-retention-policy/1/
Content-Type: application/json
Authorization: Token YOUR_AUTH_TOKEN
```

**Request Body:**
```json
{
  "alarm_log_retention_days": 120,
  "breach_retention_days": 100,
  "keep_unacknowledged": true,
  "auto_cleanup_enabled": true
}
```

**Example Request:**
```bash
curl -X PATCH \
  -H "Authorization: Token abc123xyz" \
  -H "Content-Type: application/json" \
  -d '{
    "alarm_log_retention_days": 120,
    "breach_retention_days": 100
  }' \
  "http://localhost:8000/api/alarm-retention-policy/1/"
```

**Example Response:**
```json
{
  "id": 1,
  "alarm_log_retention_days": 120,
  "breach_retention_days": 100,
  "keep_unacknowledged": true,
  "auto_cleanup_enabled": true,
  "last_cleanup_at": "2025-12-27T02:00:15Z",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-12-27T15:30:45Z"
}
```

### 3. Trigger Cleanup (if endpoint available)
```http
POST /api/alarms/cleanup/
Authorization: Token YOUR_AUTH_TOKEN
```

---

## Data Filtering Examples

### Get Critical Alarms from Last 24 Hours
```bash
curl -H "Authorization: Token abc123xyz" \
  "http://localhost:8000/api/alarms/?severity=High&from_date=$(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%SZ)"
```

### Get Unacknowledged Alarms by Station
```bash
curl -H "Authorization: Token abc123xyz" \
  "http://localhost:8000/api/alarms/?station_name=Station-01&acknowledged=false&ordering=-timestamp"
```

### Get Alarms in Date Range
```bash
curl -H "Authorization: Token abc123xyz" \
  "http://localhost:8000/api/alarms/?from_date=2025-12-01T00:00:00Z&to_date=2025-12-31T23:59:59Z"
```

### Get Paginated Results
```bash
# First page (20 results)
curl -H "Authorization: Token abc123xyz" \
  "http://localhost:8000/api/alarms/?limit=20&offset=0"

# Second page
curl -H "Authorization: Token abc123xyz" \
  "http://localhost:8000/api/alarms/?limit=20&offset=20"
```

---

## Python SDK Examples

### Using requests library
```python
import requests
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api"
TOKEN = "your_auth_token_here"

headers = {
    "Authorization": f"Token {TOKEN}",
    "Content-Type": "application/json"
}

# Get all alarms
response = requests.get(
    f"{BASE_URL}/alarms/",
    headers=headers
)
alarms = response.json()
print(f"Total alarms: {alarms['count']}")

# Get critical alarms from today
today = datetime.now().replace(hour=0, minute=0, second=0)
response = requests.get(
    f"{BASE_URL}/alarms/",
    params={
        "severity": "High",
        "from_date": today.isoformat() + "Z",
        "ordering": "-timestamp"
    },
    headers=headers
)
critical = response.json()["results"]
print(f"Critical alarms today: {len(critical)}")

# Update retention policy
new_policy = {
    "alarm_log_retention_days": 120,
    "breach_retention_days": 100,
    "keep_unacknowledged": True,
    "auto_cleanup_enabled": True
}
response = requests.patch(
    f"{BASE_URL}/alarm-retention-policy/1/",
    json=new_policy,
    headers=headers
)
updated = response.json()
print(f"Policy updated: {updated['alarm_log_retention_days']} days")
```

### Using httpx (async)
```python
import httpx
from datetime import datetime

BASE_URL = "http://localhost:8000/api"
TOKEN = "your_auth_token_here"

async def get_alarms(station=None, severity=None):
    async with httpx.AsyncClient() as client:
        params = {}
        if station:
            params["station_name"] = station
        if severity:
            params["severity"] = severity
        params["ordering"] = "-timestamp"
        
        response = await client.get(
            f"{BASE_URL}/alarms/",
            headers={"Authorization": f"Token {TOKEN}"},
            params=params
        )
        return response.json()

# Usage
# alarms = await get_alarms(station="Station-01", severity="High")
```

---

## Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Alarm retrieved/updated |
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Alarm doesn't exist |
| 500 | Server Error | Database issue |

---

## Error Responses

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

### 400 Bad Request
```json
{
  "alarm_log_retention_days": [
    "Ensure this value is greater than or equal to 7."
  ]
}
```

---

## Rate Limiting

Currently no rate limiting is enforced. However, it's recommended to:
- Limit polling to once every 30 seconds
- Use appropriate pagination (limit: 20-100)
- Cache results when appropriate

---

## Changelog

### Version 1.0 (Dec 27, 2025)
- Initial alarm API release
- Alarm listing with filtering
- Retention policy management
- Support for date range queries
- Severity and acknowledgement filtering

---

## Related Endpoints

### Threshold Breaches (related)
```
GET /api/breaches/          # Threshold breach events
GET /api/breaches/{id}/     # Single breach
```

### Nodes (for context)
```
GET /api/opcua_node/        # OPC UA node config
GET /api/opcua_node/{id}/   # Single node
```

### Telemetry Data (historical)
```
GET /api/telemetry/         # Historical readings
```

---

Last Updated: December 27, 2025
