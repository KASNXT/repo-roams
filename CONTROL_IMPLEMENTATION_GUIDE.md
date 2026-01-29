# Boolean Tag Control System - Implementation Guide

## Quick Start

### 1. Backend Setup (Already Completed)
- ✅ Control models created (`ControlState`, `ControlStateHistory`, `ControlPermission`, `ControlStateRequest`)
- ✅ Migrations applied to database
- ✅ API viewsets and serializers implemented
- ✅ OPC UA write functionality integrated
- ✅ Admin panel configured

### 2. Frontend Components (Ready to Use)

Three main React components are provided:

#### a) ControlToggle Component
Located: `src/components/ControlToggle.tsx`

```typescript
import { ControlToggle } from '@/components/ControlToggle';

<ControlToggle
  control={controlState}
  onStateChange={(newValue) => console.log('State changed to:', newValue)}
/>
```

**Features:**
- Toggle button with immediate or confirmation-based changes
- Real-time rate limiting status
- Danger level display with color coding
- Last change information
- PLC sync status indicator
- Permission validation

#### b) ControlHistory Component
Located: `src/components/ControlHistory.tsx`

```typescript
import { ControlHistory } from '@/components/ControlHistory';

<ControlHistory controlId={1} limit={10} />
```

**Features:**
- Displays last N control changes
- Color-coded change types
- User information for each change
- Error messages for failed changes
- IP address tracking
- Auto-refreshing every 10 seconds

#### c) PendingRequests Component
Located: `src/components/PendingRequests.tsx`

```typescript
import { PendingRequests } from '@/components/PendingRequests';

// For admins to confirm pending requests
<PendingRequests showPendingOnly={true} refreshInterval={5000} />
```

**Features:**
- Shows pending control change requests (admin only)
- Confirmation dialogs with change details
- Time-to-expiry countdown
- IP and user tracking
- One-click confirmation and execution

#### d) ControlsPage
Located: `src/pages/ControlsPage.tsx`

Complete dashboard page with:
- Grid view of all controls
- Search and filtering
- Pending requests tab (admin)
- Control history tab (admin)
- Sync status alerts
- Critical control warnings

### 3. Integration Steps

#### Step 1: Add Controls to Your App Router

In `src/App.tsx` or your routing file:

```typescript
import ControlsPage from '@/pages/ControlsPage';

export function App() {
  return (
    <Routes>
      {/* ... other routes */}
      <Route
        path="/controls"
        element={
          <PrivateRoute>
            <ControlsPage />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
```

#### Step 2: Add Navigation Link

Add to your navigation menu:

```typescript
<Link to="/controls" className="nav-link">
  <Zap className="w-4 h-4" />
  Controls
</Link>
```

#### Step 3: Create Control States in Django Admin

1. Go to: `http://localhost:8000/admin/roams_opcua_mgr/controlstate/`
2. Click "Add Control State"
3. Select an OPC UA Node (must be writable boolean tag)
4. Configure:
   - **Tag Type**: Select from pump, valve, alarm, emergency, mode, reset, door, or other
   - **Description**: What this control does
   - **Danger Level**: 0 (safe) to 3 (critical emergency only)
   - **Requires Confirmation**: Enable for high-risk controls
   - **Confirmation Timeout**: Seconds to wait for admin approval (default: 30)
   - **Rate Limit Seconds**: Minimum seconds between changes (default: 5)

#### Step 4: Grant Permissions

For each user who should control a device:

1. Go to: `http://localhost:8000/admin/roams_opcua_mgr/controlpermission/`
2. Click "Add Control Permission"
3. Select **User** and **Control State**
4. Choose **Permission Level**:
   - **View Only**: Can see but not change
   - **Request Change**: Can request (requires confirmation)
   - **Execute Change**: Can change immediately (no confirmation)
5. Optionally set **Expires At** date
6. Save

### 4. API Documentation

#### List Controls
```bash
curl -H "Authorization: Token YOUR_TOKEN" \
  http://localhost:8000/api/control-states/
```

#### Request Control Change (With Confirmation)
```bash
curl -X POST \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requested_value": true,
    "reason": "Starting pump for maintenance"
  }' \
  http://localhost:8000/api/control-states/1/request_change/
```

**Response:**
```json
{
  "message": "Confirmation required",
  "request_id": 42,
  "confirmation_token": "uuid-here",
  "expires_in_seconds": 30,
  "danger_level": "⛔ Critical - Emergency only"
}
```

#### Confirm Request (Admin Only)
```bash
curl -X POST \
  -H "Authorization: Token ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "confirmation_token": "uuid-here"
  }' \
  http://localhost:8000/api/control-states/confirm_change/
```

#### View Control History
```bash
curl -H "Authorization: Token YOUR_TOKEN" \
  http://localhost:8000/api/control-states/1/history/
```

#### View Pending Requests
```bash
curl -H "Authorization: Token YOUR_TOKEN" \
  http://localhost:8000/api/control-state-requests/
```

#### Manage Permissions (Admin)
```bash
# List
curl -H "Authorization: Token ADMIN_TOKEN" \
  http://localhost:8000/api/control-permissions/

# Create
curl -X POST \
  -H "Authorization: Token ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user": 5,
    "control_state": 1,
    "permission_level": "request",
    "is_active": true
  }' \
  http://localhost:8000/api/control-permissions/

# Update
curl -X PUT \
  -H "Authorization: Token ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permission_level": "execute",
    "is_active": true
  }' \
  http://localhost:8000/api/control-permissions/1/

# Delete
curl -X DELETE \
  -H "Authorization: Token ADMIN_TOKEN" \
  http://localhost:8000/api/control-permissions/1/
```

## Architecture

### Database Schema

#### ControlState
Represents a single boolean control tag with current state and configuration.

**Fields:**
- `node` (FK) - Links to OPCUANode (must be writable boolean)
- `current_value` (Boolean) - Current state
- `plc_value` (Boolean) - Last known PLC state
- `is_synced_with_plc` (Boolean) - Whether states match
- `requires_confirmation` (Boolean) - Needs admin approval
- `confirmation_timeout` (Integer) - Seconds for approval window
- `rate_limit_seconds` (Integer) - Min seconds between changes
- `danger_level` (Integer) - Safety risk (0-3)
- `last_changed_by` (FK User) - Who made last change
- `last_changed_at` (DateTime) - When last changed

#### ControlStateHistory
Complete audit trail of all changes.

**Fields:**
- `control_state` (FK)
- `change_type` (Choice) - requested, confirmed, executed, failed, synced, timeout, cancelled
- `requested_by` (FK User)
- `confirmed_by` (FK User, nullable)
- `previous_value` (Boolean)
- `requested_value` (Boolean)
- `final_value` (Boolean, nullable)
- `reason` (Text) - Why change was requested
- `error_message` (Text, nullable)
- `ip_address` (GenericIPAddress)
- `timestamp` (DateTime)

#### ControlPermission
Defines who can control what and at what level.

**Fields:**
- `user` (FK)
- `control_state` (FK)
- `permission_level` (Choice) - view, request, execute
- `is_active` (Boolean)
- `expires_at` (DateTime, nullable) - Temporal permissions
- `granted_by` (FK User, Admin)
- `granted_at` (DateTime)

**Unique Constraint:** `(user, control_state)` - Each user can have one permission per control

#### ControlStateRequest
Pending confirmation requests.

**Fields:**
- `control_state` (FK)
- `requested_by` (FK User)
- `requested_value` (Boolean)
- `reason` (Text)
- `status` (Choice) - pending, confirmed, cancelled, expired
- `confirmation_token` (UUID, unique)
- `expires_at` (DateTime)
- `confirmed_by` (FK User, nullable)
- `confirmed_at` (DateTime, nullable)
- `ip_address` (GenericIPAddress)
- `created_at` (DateTime)

### Data Flow

1. **Request Change**
   ```
   User → API → Validation → Permission Check → Rate Limit Check
   ↓
   Requires Confirmation?
   ├─ YES: Create ControlStateRequest (pending) → Return confirmation_token
   └─ NO: Execute Change → Update ControlState → Create History (executed)
   ```

2. **Confirm Request**
   ```
   Admin → API → Validate Token → Check Expiry → Permission Check
   ↓
   Update Request Status (confirmed) → Execute Change
   ↓
   Write to OPC UA → Update ControlState → Create History (executed)
   ```

3. **Audit Trail**
   ```
   Every action (request, confirm, execute, fail) → ControlStateHistory
   ↓
   Includes: User, IP, Timestamp, Values, Reason, Errors
   ```

## Safety Features Explained

### 1. Confirmation Requirement
Critical controls require admin confirmation:

```python
# In ControlState configuration
requires_confirmation = True
confirmation_timeout = 30  # seconds
```

**Flow:**
- User requests change
- System creates pending request with token
- User sees "awaiting confirmation" message
- Admin reviews and confirms
- Change executes within timeout window
- If no confirmation within timeout, request expires

### 2. Rate Limiting
Prevents rapid toggling that could damage equipment:

```python
# In ControlState configuration
rate_limit_seconds = 5
```

**Behavior:**
- First change succeeds
- Subsequent changes rejected with retry-after time
- Timer resets on each successful change
- UI displays countdown to user

### 3. Audit Trail
Every change is permanently logged:

```python
ControlStateHistory.objects.create(
    control_state=control,
    change_type='executed',
    requested_by=user,
    previous_value=old_value,
    requested_value=new_value,
    final_value=actual_value,
    reason=user_reason,
    ip_address=request.ip,
    timestamp=now()
)
```

**Queryable by:**
- Control
- User (requester or confirmer)
- Change type
- Timestamp range
- IP address

### 4. Permission Levels

| Level | View | Request | Execute |
|-------|------|---------|---------|
| View Only | ✅ | ❌ | ❌ |
| Request | ✅ | ✅ (needs confirmation) | ❌ |
| Execute | ✅ | ✅ (immediate) | ✅ |

### 5. Temporal Permissions
Permissions can expire automatically:

```python
permission.expires_at = datetime.now() + timedelta(days=7)
permission.save()
```

After expiration, permission becomes invalid even if `is_active=True`.

## Troubleshooting

### Controls Not Changing State

**Check 1: OPC UA Connection**
```python
# In Django shell
from roams_opcua_mgr.opcua_client import active_clients
from roams_opcua_mgr.models import OpcUaClientConfig

# View active connections
print(active_clients)

# Check last connection attempt
config = OpcUaClientConfig.objects.get(station_name='Your Station')
print(f"Status: {config.connection_status}")
print(f"Last connected: {config.last_connected}")
```

**Check 2: Node Configuration**
```python
from roams_opcua_mgr.models import OPCUANode

node = OPCUANode.objects.get(tag_name='Your Tag')
print(f"Access Level: {node.access_level}")  # Should be 'Write_only' or 'Read_write'
print(f"Data Type: {node.data_type}")        # Should be 'Boolean'
print(f"Node ID: {node.node_id}")            # Format: ns=2;i=12345
```

**Check 3: Control Permissions**
```python
from roams_api.models import User
from roams_opcua_mgr.models import ControlState, ControlPermission

user = User.objects.get(username='john_doe')
control = ControlState.objects.get(id=1)

# Check permission
perm = ControlPermission.objects.filter(user=user, control_state=control).first()
if perm:
    print(f"Permission: {perm.permission_level}")
    print(f"Active: {perm.is_active}")
    print(f"Expired: {perm.is_expired()}")
else:
    print("No permission found!")
```

**Check 4: Rate Limiting**
```python
control = ControlState.objects.get(id=1)
print(f"Is rate limited: {control.is_rate_limited()}")
print(f"Time until allowed: {control.get_time_until_allowed():.1f}s")
print(f"Last changed at: {control.last_changed_at}")
```

### Confirmation Timeout Issues

**Check pending requests:**
```python
from roams_opcua_mgr.models import ControlStateRequest
from django.utils import timezone

# View all pending
pending = ControlStateRequest.objects.filter(status='pending')

for req in pending:
    time_left = (req.expires_at - timezone.now()).total_seconds()
    print(f"{req.control_state.node.tag_name}: {time_left:.0f}s remaining")
    
    if time_left <= 0:
        req.status = 'expired'
        req.save()
```

### Permission Denied Errors

**List user's permissions:**
```python
from roams_api.models import User
from roams_opcua_mgr.models import ControlPermission

user = User.objects.get(username='john_doe')
perms = ControlPermission.objects.filter(user=user, is_active=True)

for perm in perms:
    print(f"{perm.control_state.node.tag_name}: {perm.permission_level}")
    if perm.is_expired():
        print("  ⚠️ EXPIRED")
```

## Testing Checklist

- [ ] Create a test control with `requires_confirmation=False`
- [ ] Test immediate toggle as user with "execute" permission
- [ ] Create a test control with `requires_confirmation=True`
- [ ] Test confirmation flow as user with "request" permission
- [ ] Confirm as admin and verify execution
- [ ] Test rate limiting with short timeout (5 seconds)
- [ ] Test permission denial for unauthorized user
- [ ] Verify audit trail in ControlStateHistory
- [ ] Test out-of-sync detection
- [ ] Test OPC UA write failure handling
- [ ] Test confirmation timeout expiration
- [ ] Test temporal permission expiration

## Performance Notes

- Controls are cached in React state and refreshed every 5 seconds
- History is loaded on-demand and auto-refreshes every 10 seconds
- Pending requests refresh every 5 seconds (configurable)
- Database queries use indexed fields for fast filtering
- No N+1 query issues (all related data pre-fetched via serializers)
- History deletion can be done in batches to avoid memory issues

## Security Considerations

1. **Authentication:** All endpoints require Django auth token
2. **Authorization:** Check permission_level on each request
3. **CSRF Protection:** API uses standard Django CSRF tokens
4. **Audit Trail:** All actions logged with user and IP
5. **Confirmation Tokens:** UUIDs - cryptographically random
6. **IP Tracking:** Useful for detecting unauthorized access patterns
7. **Temporal Permissions:** Automatically expire old access grants

## Next Steps

1. ✅ Run migrations (already done)
2. ✅ Create control models in Django admin
3. ✅ Grant permissions to users
4. ✅ Integrate React components into your app
5. ✅ Add route to ControlsPage
6. ✅ Test the full workflow
7. ✅ Monitor audit trails for issues
8. ✅ Adjust safety levels based on actual equipment risk

## Support

For issues or questions:
1. Check the BOOLEAN_CONTROL_GUIDE.md for API details
2. Review logs in `/logs/debug.log*`
3. Check Django admin: `/admin/roams_opcua_mgr/controlstate/`
4. Verify OPC UA connection status
5. Review permission configuration for the user
