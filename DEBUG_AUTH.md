# BROMS Authentication Debug Guide

## Step 1: Open Browser Console (F12)

Visit: `http://144.91.79.167`

## Step 2: Check Token in Console

```javascript
// 1. Check if token exists
const token = localStorage.getItem("token");
console.log("Token:", token);

// 2. Check server URL
console.log("Current hostname:", window.location.hostname);

// 3. Test API call with token
const serverUrl = window.location.hostname === '144.91.79.167' 
  ? 'http://144.91.79.167:8000' 
  : 'http://localhost:8000';

fetch(`${serverUrl}/api/opcua_clientconfig/`, {
  headers: {
    'Authorization': `Token ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log("✅ API Response:", data))
.catch(err => console.error("❌ API Error:", err));
```

## Step 3: Expected Results

**If token exists:**
- `Token: "your-token-here"` (long string)
- API call should return data (not 403)

**If no token:**
- `Token: null`
- Need to logout and login again

## Step 4: Force Re-login

If token exists but still getting 403:

```javascript
// Clear everything
localStorage.clear();
```

Then **logout** and **login again**.

## Step 5: Monitor Network Tab

1. Open DevTools → Network tab
2. Login
3. Watch for POST to `/api-token-auth/`
4. Check if subsequent requests have `Authorization: Token xxx` header

---

## Common Issues

### Issue 1: Token Not Being Sent
**Symptom**: Token in localStorage but requests don't have Authorization header
**Fix**: Some components use separate axios instances - need to consolidate

### Issue 2: Wrong Server URL
**Symptom**: Requests go to localhost instead of 144.91.79.167
**Fix**: Already fixed with getServerUrl()

### Issue 3: Token Expired/Invalid
**Symptom**: Have token but backend returns 403
**Fix**: Logout and login again to get fresh token

---

## Quick Test

Run this in console after logging in:

```javascript
// This should show your token
console.log("Token:", localStorage.getItem("token"));

// This should show the auth header being sent
fetch('http://144.91.79.167:8000/api/opcua_clientconfig/', {
  headers: {
    'Authorization': `Token ${localStorage.getItem("token")}`,
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log("Status:", response.status);
  return response.json();
})
.then(data => console.log("Data:", data))
.catch(error => console.error("Error:", error));
```

**Expected**: Status 200, Data with stations list
**If 403**: Token is invalid or not being accepted by backend
