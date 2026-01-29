# Boolean Tag Control System - File Structure & Reference

## Complete File Listing

### Documentation Files

#### Main Documentation
| File | Purpose |
|------|---------|
| `CONTROL_SYSTEM_COMPLETE.md` | ✅ Implementation summary and overview |
| `BOOLEAN_CONTROL_GUIDE.md` | Complete user guide and API reference |
| `CONTROL_IMPLEMENTATION_GUIDE.md` | Technical details, architecture, troubleshooting |
| `CONTROL_INTEGRATION_EXAMPLES.md` | 10 practical integration examples with code |
| `CONTROL_SYSTEM_FILES.md` | This file - complete file structure |

### Backend Files

#### Models & Database
```
roams_backend/roams_opcua_mgr/models/
├── control_state_model.py          ← ControlState, History, Permission, Request
├── __init__.py                     ← Exports all models
└── [other model files]
```

**Key Classes in control_state_model.py:**
- `ControlState` - Represents a boolean control tag
- `ControlStateHistory` - Audit trail of changes
- `ControlPermission` - User permissions per control
- `ControlStateRequest` - Pending confirmation requests

#### Migrations
```
roams_backend/roams_opcua_mgr/migrations/
└── 0012_control_state_models.py    ← Creates all control tables
```

#### API Endpoints
```
roams_backend/roams_api/
├── control_serializers.py          ← ControlState, History, Permission serializers
├── control_viewsets.py             ← ControlState, History, Permission viewsets
├── urls.py                         ← Updated to include control routes
└── [other API files]
```

**API Routes Added:**
- `POST /api/control-states/{id}/request_change/` - Request state change
- `POST /api/control-states/confirm_change/` - Confirm pending request
- `GET /api/control-states/{id}/history/` - View change history
- `GET/POST/PUT/DELETE /api/control-permissions/` - Manage permissions
- `GET /api/control-state-requests/` - View pending requests

#### Admin Panel
```
roams_backend/roams_opcua_mgr/
└── admin.py                        ← Django admin configuration
```

**Admin Classes Added:**
- `ControlStateAdmin` - Manage control definitions
- `ControlStateHistoryAdmin` - View/audit audit trail
- `ControlPermissionAdmin` - Manage user permissions
- `ControlStateRequestAdmin` - View pending requests

#### OPC UA Integration
```
roams_backend/roams_opcua_mgr/
└── opcua_client.py                 ← Contains write_node_value() method
```

**Method Used:**
- `OPCUAClientHandler.write_node_value(node, value)` - Writes boolean to PLC

### Frontend Files

#### React Components
```
roams_frontend/src/components/
├── ControlToggle.tsx               ← Main toggle component with confirmation
├── ControlHistory.tsx              ← History display with auto-refresh
├── PendingRequests.tsx             ← Pending requests (admin only)
└── [other component files]
```

**Component: ControlToggle**
- Props: `control: ControlState`, `onStateChange?: callback`
- Features: Toggle, confirmation dialog, rate limit display, danger indicator
- Auto-updates every 5 seconds

**Component: ControlHistory**
- Props: `controlId: number`, `limit?: number`
- Features: Last N changes, color-coded types, user tracking
- Auto-refreshes every 10 seconds

**Component: PendingRequests**
- Props: `showPendingOnly?: boolean`, `refreshInterval?: number`
- Features: Pending request list, confirmation dialog, expiry countdown
- Admin-only component

#### Pages
```
roams_frontend/src/pages/
└── ControlsPage.tsx                ← Full dashboard with grid & tabs
```

**Features:**
- Grid view of all controls
- Search and filter by type/sync status
- Admin tabs for pending requests & history
- Real-time statistics
- Sync status alerts
- Critical control warnings

#### Hooks (Expected to Exist)
```
roams_frontend/src/hooks/
├── useApi.ts                       ← API client hook (used by all components)
├── useAuth.ts                      ← Auth/user info hook (used by page)
└── [other hooks]
```

**useApi Hook Requirements:**
- `api.get(url)` - GET requests
- `api.post(url, data)` - POST requests
- `api.patch(url, data)` - PATCH requests
- `api.put(url, data)` - PUT requests
- `api.delete(url)` - DELETE requests
- Must handle authentication tokens

**useAuth Hook Requirements:**
- `user` - Current user object with `is_staff` property
- `isAuthenticated` - Boolean flag

#### UI Components (shadcn/ui)
Used by control components:
- `Button` - Toggle and action buttons
- `Card` - Container cards
- `Badge` - Status badges
- `AlertDialog` - Confirmation dialogs
- `Tabs` - Page tabs
- `Input` - Text input for reason
- `Textarea` - Multi-line reason input
- `Select` - Filter dropdowns
- `Label` - Form labels

## Database Schema

### ControlState Table
```
id              INTEGER PRIMARY KEY
node_id         INTEGER FOREIGN KEY → OPCUANode
tag_type        VARCHAR (pump, valve, alarm, emergency, mode, reset, door, other)
current_value   BOOLEAN (current state)
plc_value       BOOLEAN (PLC confirmed state)
is_synced_with_plc BOOLEAN
last_changed_by_id INTEGER FOREIGN KEY → User (nullable)
last_changed_at DATETIME
requires_confirmation BOOLEAN
confirmation_timeout INTEGER (seconds)
rate_limit_seconds INTEGER (seconds)
sync_error_message TEXT
description     TEXT
danger_level    INTEGER (0=safe, 1=caution, 2=danger, 3=critical)
created_at      DATETIME
updated_at      DATETIME

Indexes:
- (node_id)
- (tag_type)
- (last_changed_at)
```

### ControlStateHistory Table
```
id              INTEGER PRIMARY KEY
control_state_id INTEGER FOREIGN KEY → ControlState
change_type     VARCHAR (requested, confirmed, executed, failed, synced, timeout, cancelled)
requested_by_id INTEGER FOREIGN KEY → User (nullable)
confirmed_by_id INTEGER FOREIGN KEY → User (nullable)
previous_value  BOOLEAN
requested_value BOOLEAN
final_value     BOOLEAN (nullable)
reason          TEXT
error_message   TEXT
ip_address      INET
timestamp       DATETIME

Indexes:
- (control_state_id, timestamp DESC)
- (requested_by_id, timestamp DESC)
- (change_type)
```

### ControlPermission Table
```
id              INTEGER PRIMARY KEY
user_id         INTEGER FOREIGN KEY → User
control_state_id INTEGER FOREIGN KEY → ControlState
permission_level VARCHAR (view, request, execute)
is_active       BOOLEAN
granted_by_id   INTEGER FOREIGN KEY → User
granted_at      DATETIME
expires_at      DATETIME (nullable)

Unique Constraint: (user_id, control_state_id)
Indexes:
- (user_id, is_active)
- (control_state_id)
```

### ControlStateRequest Table
```
id              INTEGER PRIMARY KEY
control_state_id INTEGER FOREIGN KEY → ControlState
requested_by_id INTEGER FOREIGN KEY → User (nullable)
requested_value BOOLEAN
reason          TEXT
status          VARCHAR (pending, confirmed, cancelled, expired)
confirmation_token VARCHAR (unique)
expires_at      DATETIME
confirmed_by_id INTEGER FOREIGN KEY → User (nullable)
confirmed_at    DATETIME (nullable)
ip_address      INET (nullable)
created_at      DATETIME

Indexes:
- (status, expires_at)
- (control_state_id, status)
```

## API Endpoints Reference

### Control States
```
GET    /api/control-states/                    List all
GET    /api/control-states/{id}/               Get one
POST   /api/control-states/{id}/request_change/   Request state change
POST   /api/control-states/confirm_change/    Confirm pending request
GET    /api/control-states/{id}/history/      Get change history
```

### Control History
```
GET    /api/control-state-history/             List all history
```

### Control Permissions (Admin)
```
GET    /api/control-permissions/               List all
POST   /api/control-permissions/               Create
GET    /api/control-permissions/{id}/          Get one
PUT    /api/control-permissions/{id}/          Update
DELETE /api/control-permissions/{id}/          Delete
```

### Pending Requests
```
GET    /api/control-state-requests/            List all
GET    /api/control-state-requests/{id}/       Get one
```

## Key Constants & Enums

### Tag Types
```python
('pump', 'Pump Control')
('valve', 'Valve Control')
('alarm', 'Alarm Control')
('emergency', 'Emergency Stop')
('mode', 'Mode Selection')
('reset', 'System Reset')
('door', 'Door Control')
('other', 'Other Control')
```

### Permission Levels
```python
('view', 'View Only')
('request', 'Request Change (requires confirmation)')
('execute', 'Execute Change (immediate, no confirmation)')
```

### Change Types
```python
('requested', 'Change Requested')
('confirmed', 'Change Confirmed')
('executed', 'Change Executed')
('failed', 'Change Failed')
('synced', 'State Synced from PLC')
('timeout', 'Confirmation Timeout')
('cancelled', 'Change Cancelled')
```

### Request Status
```python
('pending', 'Pending Confirmation')
('confirmed', 'Confirmed - Executing')
('cancelled', 'Cancelled')
('expired', 'Confirmation Expired')
```

### Danger Levels
```python
(0, '🟢 Safe - No safety impact')
(1, '🟡 Caution - Minor risk')
(2, '🔴 Danger - Major risk')
(3, '⛔ Critical - Emergency only')
```

## Type Definitions (TypeScript)

### ControlState Interface
```typescript
interface ControlState {
  id: number;
  node: number;
  node_tag_name: string;
  node_id: number;
  tag_type: string;
  tag_type_display: string;
  current_value: boolean;
  plc_value: boolean;
  is_synced_with_plc: boolean;
  last_changed_at: string;
  last_changed_by: number | null;
  last_changed_by_username: string | null;
  requires_confirmation: boolean;
  confirmation_timeout: number;
  rate_limit_seconds: number;
  sync_error_message: string;
  description: string;
  danger_level: number;
  danger_display: string;
  can_user_change: boolean;
  is_rate_limited: boolean;
  time_until_allowed: number;
  created_at: string;
  updated_at: string;
}
```

## Configuration Requirements

### Environment Variables
No special environment variables needed - uses existing Django/API configuration.

### Django Settings
Ensure these are in `roams_pro/settings.py`:
```python
INSTALLED_APPS = [
    # ...
    'roams_api',
    'roams_opcua_mgr',
]

# REST Framework configuration (should already exist)
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
}
```

### Database
Requires running migrations:
```bash
python manage.py migrate roams_opcua_mgr
```

## Dependencies

### Backend Dependencies
- Django 4.0+
- Django REST Framework
- python-opcua (for OPC UA client)
- Django authentication (built-in)

### Frontend Dependencies
- React 18+
- TypeScript
- shadcn/ui components
- lucide-react icons
- sonner (toast notifications)
- react-router-dom

## Performance Considerations

### Database Performance
- All frequently queried fields are indexed
- Foreign keys indexed automatically
- History queries filtered by control_state and timestamp
- Permission checks use indexed user/control_state fields

### API Performance
- Serializers use `select_related()` and `prefetch_related()`
- Pagination available (default 100 items)
- Filtering uses database queries (not in-memory)

### Frontend Performance
- Real-time updates every 5-10 seconds (not real-time WebSocket)
- Virtual scrolling for large lists (if using react-window)
- Component memoization recommended for performance
- Auto-cleanup of intervals on unmount

## Security

### Authentication
- All endpoints require valid auth token
- Token validation on each request
- User must be authenticated and active

### Authorization
- Permission level checked on each request
- Superusers bypass permission checks
- Temporal permissions checked for expiry
- Is_active flag must be true

### Audit Trail
- Every action logged with user
- IP address captured for traceability
- Timestamps for complete history
- Error messages preserved for debugging

### CSRF Protection
- Standard Django CSRF tokens on forms
- Token auth for API calls
- Secure confirmation tokens (UUIDs)

## Version Information

- **Version:** 1.0
- **Status:** Production Ready ✅
- **Last Updated:** 2024
- **License:** Same as ROAMS project

## Support Resources

1. **API Documentation:** `BOOLEAN_CONTROL_GUIDE.md`
2. **Technical Details:** `CONTROL_IMPLEMENTATION_GUIDE.md`
3. **Integration Examples:** `CONTROL_INTEGRATION_EXAMPLES.md`
4. **Django Admin:** `/admin/roams_opcua_mgr/`
5. **API Documentation:** `/api/` (Swagger/Redoc if configured)

## Quick Reference Commands

### Django Shell
```bash
cd roams_backend
python manage.py shell

# View all controls
from roams_opcua_mgr.models import ControlState
ControlState.objects.all()

# Create permission
from roams_api.models import User
from roams_opcua_mgr.models import ControlPermission
user = User.objects.get(username='john')
perm = ControlPermission.objects.create(
    user=user,
    control_state_id=1,
    permission_level='execute'
)
```

### Django Admin
```
http://localhost:8000/admin/roams_opcua_mgr/controlstate/
http://localhost:8000/admin/roams_opcua_mgr/controlpermission/
http://localhost:8000/admin/roams_opcua_mgr/controlstatehistory/
http://localhost:8000/admin/roams_opcua_mgr/controlstaterequest/
```

### API Testing
```bash
# Get auth token
curl -X POST http://localhost:8000/api/api-token-auth/ \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"pass"}'

# List controls
curl -H "Authorization: Token YOUR_TOKEN" \
  http://localhost:8000/api/control-states/
```

## Deployment Checklist

- [ ] Run migrations on production
- [ ] Configure OPC UA connections
- [ ] Create control definitions in admin
- [ ] Grant permissions to users
- [ ] Test complete workflow
- [ ] Configure logging (logs in /logs/)
- [ ] Set up backups for audit trail
- [ ] Train admins on confirmation process
- [ ] Document control procedures for operators
- [ ] Monitor for issues in first week

---

**Last Updated:** 2024
**Maintained By:** ROAMS Development Team
