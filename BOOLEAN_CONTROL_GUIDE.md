# Boolean Tag Control System - User Guide

## Overview

The ROAMS Boolean Tag Control System enables safe, audited control of plant equipment through OPC UA boolean tags. The system includes:

- **Persistent State**: Control states survive system restarts
- **Permission-Based Access**: Admins assign who can control each tag
- **Safety Features**: Confirmation dialogs, rate limiting, audit trails
- **OPC UA Integration**: Direct write capability to PLC via OPC UA

## System Features

### 1. Control Types
Controls can be categorized as:
- 🚰 **Pump Control** - Pump start/stop
- 🚪 **Valve Control** - Valve open/close
- 🔔 **Alarm Control** - Alarm arm/disarm
- 🚨 **Emergency Stop** - Emergency shutdown
- ⚙️ **Mode Selection** - Mode switching
- 🔄 **System Reset** - System reset
- 🚪 **Door Control** - Door lock/unlock
- 📊 **Other Control** - Custom controls

### 2. Safety Levels
Each control has a danger level:
- 🟢 **Safe** (0) - No safety impact
- 🟡 **Caution** (1) - Minor risk
- 🔴 **Danger** (2) - Major risk
- ⛔ **Critical** (3) - Emergency only

### 3. Permission Levels
Admins can grant three types of permissions:
- **View Only** - Can see the control state but cannot change it
- **Request Change** - Can request a change (requires admin confirmation)
- **Execute Change** - Can change immediately (no confirmation needed)

### 4. Safety Features

#### Confirmation Requirement
When `requires_confirmation=True`:
1. User requests a change
2. System creates a pending request with confirmation token
3. Admin must confirm the change within timeout period (default: 30 seconds)
4. Change is executed after confirmation

#### Rate Limiting
Each control has a `rate_limit_seconds` setting (default: 5 seconds) to prevent rapid toggling and equipment damage.

#### Audit Trail
Every change is logged with:
- Who requested the change
- Who confirmed it (if required)
- Previous and requested values
- Actual final value
- Timestamp and IP address
- Any error messages

## API Endpoints

### 1. List Control States
```
GET /api/control-states/
```

Returns all control states with current user's permissions.

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "node": 123,
      "node_tag_name": "Pump_Main",
      "tag_type": "pump",
      "tag_type_display": "Pump Control",
      "current_value": false,
      "plc_value": false,
      "is_synced_with_plc": true,
      "last_changed_at": "2024-01-15T10:30:00Z",
      "last_changed_by": "admin_user",
      "last_changed_by_username": "admin",
      "requires_confirmation": true,
      "confirmation_timeout": 30,
      "rate_limit_seconds": 5,
      "sync_error_message": "",
      "description": "Main system pump",
      "danger_level": 1,
      "danger_display": "🟡 Caution - Minor risk",
      "can_user_change": true,
      "is_rate_limited": false,
      "time_until_allowed": 0.0,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 2. Get Single Control State
```
GET /api/control-states/{id}/
```

Returns details of a specific control state.

### 3. Request Control State Change

**Case 1: Requires Confirmation (requires_confirmation=True)**

```
POST /api/control-states/{id}/request_change/
Content-Type: application/json

{
  "requested_value": true,
  "reason": "Starting pump for maintenance"
}
```

**Response:**
```json
{
  "message": "Confirmation required",
  "request_id": 42,
  "confirmation_token": "550e8400-e29b-41d4-a716-446655440000",
  "expires_in_seconds": 30,
  "danger_level": "🟡 Caution - Minor risk"
}
```

**Case 2: No Confirmation Required (requires_confirmation=False)**

```
POST /api/control-states/{id}/request_change/
Content-Type: application/json

{
  "requested_value": false,
  "reason": "Stopping pump"
}
```

**Response:**
```json
{
  "message": "Control state changed successfully",
  "control_state": {
    "id": 1,
    "current_value": false,
    ...
  },
  "request_id": null
}
```

### 4. Confirm Pending Request

**Admin Only:**

```
POST /api/control-states/confirm_change/
Content-Type: application/json

{
  "confirmation_token": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "message": "Control state changed successfully",
  "control_state": { ... },
  "request_id": 42
}
```

### 5. View Control History
```
GET /api/control-states/{id}/history/
```

Returns last 50 changes for this control.

**Response:**
```json
{
  "results": [
    {
      "id": 1,
      "control_state": 1,
      "control_state_name": "Pump_Main",
      "change_type": "executed",
      "change_type_display": "Change Executed",
      "requested_by": 5,
      "requested_by_username": "john_doe",
      "confirmed_by": 1,
      "confirmed_by_username": "admin",
      "previous_value": false,
      "requested_value": true,
      "final_value": true,
      "reason": "Starting pump for maintenance",
      "error_message": "",
      "ip_address": "192.168.1.100",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 6. List All Control History
```
GET /api/control-state-history/
```

Filter by control_state, change_type, or requested_by.

### 7. View Pending Requests
```
GET /api/control-state-requests/
```

Shows all pending requests (admins see all, users see only their own).

### 8. Manage Permissions (Admin Only)
```
GET /api/control-permissions/           # List all permissions
POST /api/control-permissions/          # Create new permission
PUT /api/control-permissions/{id}/      # Update permission
DELETE /api/control-permissions/{id}/   # Delete permission
```

**Create Permission Example:**
```json
{
  "user": 5,
  "control_state": 1,
  "permission_level": "request",
  "is_active": true,
  "expires_at": "2024-12-31T23:59:59Z"
}
```

## Error Handling

### Rate Limit Error
```json
{
  "detail": "This control is rate-limited. Wait 3.2s before next change.",
  "retry_after": 3.2
}
```

### Permission Denied
```json
{
  "detail": "You don't have permission to control Pump_Main"
}
```

### OPC UA Connection Failed
```json
{
  "detail": "No active OPC UA client for Station_Name",
  "error": "client_not_available"
}
```

### Write Failed
```json
{
  "detail": "❌ Node 'Pump_Main' is not writable (access_level: Read_only)",
  "error": "write_failed"
}
```

## Installation & Setup

### 1. Create Control States (Admin)

Use Django Admin:
1. Navigate to: `/admin/roams_opcua_mgr/controlstate/`
2. Click "Add Control State"
3. Select an OPC UA Node (must be writable boolean)
4. Configure:
   - Tag Type (pump, valve, etc.)
   - Description
   - Danger Level (0-3)
   - Requires Confirmation (True/False)
   - Confirmation Timeout (seconds)
   - Rate Limit (seconds)
5. Save

### 2. Grant Permissions (Admin)

Use Django Admin:
1. Navigate to: `/admin/roams_opcua_mgr/controlpermission/`
2. Click "Add Control Permission"
3. Select User and Control State
4. Set Permission Level (view, request, or execute)
5. Optionally set expiration date
6. Save

### 3. Monitor Control Activity (Admin)

Use Django Admin:
1. View Control States: `/admin/roams_opcua_mgr/controlstate/`
2. View History: `/admin/roams_opcua_mgr/controlstatehistory/`
3. View Pending Requests: `/admin/roams_opcua_mgr/controlstaterequest/`

## Frontend Integration

### React Component Usage

```typescript
import { ControlToggle } from '@/components/ControlToggle';

export function PumpControl() {
  return (
    <ControlToggle
      control={{
        id: 1,
        node_tag_name: 'Pump_Main',
        current_value: false,
        requires_confirmation: true,
        danger_level: 1,
        danger_display: '🟡 Caution',
        can_user_change: true,
        is_rate_limited: false
      }}
    />
  );
}
```

## Testing

### Test Control State Change
```bash
# 1. Get auth token
curl -X POST http://localhost:8000/api/api-token-auth/ \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "password"}'

# 2. Request change (requires confirmation)
curl -X POST http://localhost:8000/api/control-states/1/request_change/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requested_value": true,
    "reason": "Testing pump startup"
  }'

# Expected response includes: confirmation_token

# 3. Confirm as admin
curl -X POST http://localhost:8000/api/control-states/confirm_change/ \
  -H "Authorization: Token ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "confirmation_token": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

## Best Practices

1. **Set Appropriate Safety Levels**: Assign danger levels that match actual risk
2. **Use Confirmation for Critical**: Critical controls should require confirmation
3. **Rate Limit Risky Controls**: Set higher rate limits for equipment that can be damaged
4. **Regular Permission Review**: Audit and revoke permissions regularly
5. **Monitor History**: Review control history for suspicious activity
6. **Document Changes**: Always provide a reason for changes
7. **Use PLC Validation**: Ensure PLC side also validates boolean tag changes

## Troubleshooting

### Control not changing state
1. Check PLC connection: View control state's `is_synced_with_plc`
2. Verify OPC UA node access: Ensure node has "Write_only" or "Read_write" access
3. Check rate limiting: Review `is_rate_limited` and `time_until_allowed`

### Confirmation timing out
- Default timeout is 30 seconds
- Increase `confirmation_timeout` in control settings if needed
- Ensure admin checks pending requests regularly

### Permission denied
1. Verify user has a ControlPermission record for the control
2. Check `is_active` is True
3. Check `expires_at` hasn't passed
4. Use Django Admin to add/modify permissions

### OPC UA write failed
1. Verify PLC is connected and reachable
2. Check node access_level: `ns=..;i=.. access_level=Read_write`
3. Verify node data type is Boolean
4. Check PLC logs for any errors

## Performance Considerations

- Control state changes are fast (< 1 second typically)
- Audit trail is logged asynchronously
- Rate limiting prevents equipment damage
- Confirmation timeout prevents stuck requests

## Security Notes

- Confirmation tokens are UUIDs (cryptographically secure)
- IP addresses are logged for audit trails
- Only staff users can confirm changes
- Permissions use Django's authentication system
- All API endpoints require authentication
