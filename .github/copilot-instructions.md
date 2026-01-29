# BROMS Project - AI Coding Agent Instructions

## Project Overview
BROMS (Bore hole Remote Operation Monitoring System) is a production-ready SCADA application monitoring water infrastructure via OPC UA. The system reads telemetry from remote stations, evaluates thresholds in real-time, generates alarms/notifications, controls equipment via boolean tags, and provides a React dashboard for operators.

**Stack**: Django 4.2 + DRF (backend) | React 18 + TypeScript + Vite (frontend) | PostgreSQL/SQLite | OPC UA (asyncua) | Redis

**Deployment**: Hetzner VPS | Designed for multi-station scalability (unlimited OPC UA servers)

**Critical Dependencies**:
- Backend: `opcua==0.98.13`, `asyncua==1.1.6`, `channels==4.3.1`, `django-redis==6.0.0`, `celery==5.5.3`, `psycopg2-binary==2.9.10`
- Frontend: `@tanstack/react-query@5.87.4`, Radix UI components, Tailwind CSS, Recharts, Leaflet, `axios@1.12.2`

---

## Architecture Principles

### Backend-Driven Design
**Critical**: ALL business logic lives in Django backend, not frontend. Frontend is read-only UI for data visualization.

- ✅ Threshold evaluation → `roams_opcua_mgr/services.py::evaluate_threshold()`
- ✅ Breach logging → Django models create immutable `ThresholdBreach` records
- ✅ Alarm counts → Computed dynamically via serializers (never stored)
- ❌ Never implement logic in React components (no mock data, no calculations)

### OPC UA Background Service
**Key**: OPC UA clients run in background threads, started in `roams_opcua_mgr/apps.py::ready()`

```python
# roams_opcua_mgr/apps.py
def ready(self):
    from roams_opcua_mgr.opcua_client import start_opcua_clients
    thread = threading.Thread(target=start_opcua_clients, daemon=True)
    thread.start()
```

**Data Flow**: OPC UA servers → `read_data.py` (20s polling) → `services.py::evaluate_threshold()` → Database → API → React

**Background Threads**: OPC UA clients run as daemon threads, auto-started in `roams_opcua_mgr/apps.py::ready()`. Connection pooling is critical - always call `close_old_connections()` before database operations in threaded code.

### Database Models (roams_opcua_mgr & roams_api)
Models are split across `roams_opcua_mgr/models/` directory and defined in separate files:

**OPC UA Configuration** (`client_config_model.py`, `node_config_model.py`):
- `OpcUaClientConfig` - Station configurations (endpoint, credentials, sampling interval)
- `OPCUANode` - Tag definitions with thresholds (min/max/warning/critical levels)
  - Fields: `node_id`, `tag_name`, `data_type`, `threshold_active`, `is_alarm`, `is_control_node`
  - Advanced: `sample_on_whole_number_change`, `last_whole_number` (sampling optimization)
  - Located in: `roams_opcua_mgr/node_config_model.py`

**Data Logging** (`logging_model.py`):
- `OpcUaReadLog` - Historical telemetry (paginated, retention policies)
- `OpcUaWriteLog` - Control command audit trail

**Threshold & Alarms** (`roams_api/models.py`):
- `TagThreshold` - Threshold configurations per tag
- `ThresholdBreach` - Immutable alarm log (value, level, timestamp, acknowledged)
- `AlarmLog` - Enhanced alarm events with acknowledgment workflow
- `AlarmRetentionPolicy` - Configurable data retention rules

**Control System** (`control_state_model.py`):
- `ControlState` - Control node states with timestamp tracking, permissions, rate limiting
- `ControlStateHistory` - Audit trail for control operations
- `ControlPermission` - User permissions for each control (view/request/execute)
- `ControlStateRequest` - Pending control requests with confirmation tokens

**Notifications** (`notification_model.py`, `notification_schedule_model.py`):
- `NotificationRecipient` - Contact details for alerts (email/SMS)
- `NotificationSchedule` - Alert timing and delivery preferences

**User Management** (`roams_api/models.py`):
- `UserProfile` - Extended user model with roles (Admin/Operator/Viewer) and phone contacts

**Import Pattern**: Models are centralized in `roams_opcua_mgr/models/__init__.py` - always import from the models package:
```python
from roams_opcua_mgr.models import OPCUANode, ControlState, OpcUaClientConfig
# NOT: from roams_opcua_mgr.node_config_model import OPCUANode
```

---

## Development Workflows

### Backend Setup & Testing
```bash
cd roams_backend
source venv_new/bin/activate
python manage.py migrate
python manage.py runserver 0.0.0.0:8000 --nothreading --noreload
```

**Auth**: All API endpoints require Token authentication
```bash
# Get token
curl -X POST http://localhost:8000/api-token-auth/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "yourpass"}'

# Use in requests
curl http://localhost:8000/api/breaches/ \
  -H "Authorization: Token YOUR_TOKEN_HERE"
```

### Frontend Setup
```bash
cd roams_frontend
npm install
npm run dev  # Vite dev server on http://localhost:5173
```

**Configuration**: Server URL is in `roams_frontend/src/services/api.ts` via `getServerUrl()` (reads from localStorage `roams_server_url`, defaults to `http://localhost:8000`)

**UI Components**: Settings page has NetworkTab for configuring backend URL - supports dev/staging/prod presets

### Key Files to Check Before Edits
1. **API contract**: `roams_backend/roams_api/urls.py` - All available endpoints
2. **Serializers**: `roams_backend/roams_api/serializers.py` - API response structure
3. **Control system**: 
   - `roams_backend/roams_api/control_viewsets.py` - Control panel endpoints
   - `roams_backend/roams_api/control_serializers.py` - Control request/response formats
4. **Frontend API client**: `roams_frontend/src/services/api.ts` - All fetch functions
5. **Pages**: `roams_frontend/src/pages/` - Main application views (Analysis, Overview, control, Settings, Notifications)
6. **Background workers**: `roams_backend/roams_opcua_mgr/{read_data.py,write_data.py,opcua_client.py}`
7. **Models**: `roams_backend/roams_opcua_mgr/models/` - All database models split by domain

---

## Common Patterns

### Adding New API Endpoints
1. Create ViewSet in `roams_api/views.py`
2. Register in router in `roams_api/urls.py`
3. Create/update serializer in `roams_api/serializers.py`
4. Add fetch function in `roams_frontend/src/services/api.ts`

Example:
```python
# roams_api/views.py
class MyViewSet(viewsets.ModelViewSet):
    queryset = MyModel.objects.all()
    serializer_class = MySerializer
    permission_classes = [IsAuthenticated]

# roams_api/urls.py
router.register(r'my-endpoint', MyViewSet, basename='my-endpoint')
```

### OPC UA Node Configuration
**Admin panel**: `http://localhost:8000/admin/roams_opcua_mgr/opccuaclientconfig/`

Sampling interval in milliseconds (1000-60000ms range):
```python
# Via Django shell
from roams_opcua_mgr.models import OpcUaClientConfig
station = OpcUaClientConfig.objects.get(station_name="MyStation")
station.subscription_interval = 2000  # 2 seconds
station.save()
```

### Writing Values to OPC UA Nodes
The write endpoint supports multiple data types (Boolean, Integer, Float):
```python
# POST /api/opcua_node/{id}/write/
{
    "value": 1,           # For Boolean: 0/1, For Int/Float: any number
    "command": "START"    # Optional command label
}
```

Supported data types:
- **Boolean**: Values 0/1 converted to True/False
- **Integer** (Int16, Int32, Int64, UInt16, UInt32, UInt64): Numeric values
- **Float/Double**: Decimal values

**Control System**: For boolean control nodes, use the dedicated control endpoints:
```python
# POST /api/control-states/{id}/request_change/
{
    "requested_value": true,   # true/false for boolean controls
    "confirmation_token": null  # Optional token for confirmation workflow
}
```

The control system provides:
- Permission-based access (admin/staff/user roles)
- Confirmation workflow for critical operations
- Rate limiting to prevent rapid toggling
- Complete audit trail in `ControlStateHistory`
- Safety features (danger levels, timeout protection)

### Threshold Configuration Pattern
Thresholds are configured per node in `OPCUANode` model fields:
- `threshold_active` (bool) - Enable/disable threshold checks
- `min_value`, `max_value` - Range limits
- `warning_level`, `critical_level` - Alarm thresholds
- Breaches logged automatically in `read_data.py` → `evaluate_threshold()`

---

## Project-Specific Conventions

### Environment & Timezone
- **Timezone**: `Africa/Kampala` (UTC+3) - Set in `settings.py::TIME_ZONE`
- **Environment vars**: Loaded from `.env` using `django-environ`
- **Virtual env**: Always `venv_new/` (NOT `venv/`)

### CORS & Authentication
```python
# settings.py
CORS_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
}
```

### Database Best Practices
**PostgreSQL in Production**: Always use connection pooling and close connections in background threads:
```python
from django.db import close_old_connections
close_old_connections()  # Before DB operations in background threads
```

### Frontend State Management
- **Auth**: Context API in `roams_frontend/src/hooks/useAuth.tsx`
- **API calls**: `@tanstack/react-query` for caching and refetching
- **Persistence**: localStorage for user preferences (e.g., selected station in `selectedWell` key)
- **Server URL**: Configurable via Settings → Network tab, stored in `roams_server_url` localStorage key

---

## Testing & Debugging

### Verify OPC UA Connection
```bash
cd roams_backend
source venv_new/bin/activate
python diagnose_opcua.py  # Check active clients and subscriptions
```

### Check Recent Telemetry
```bash
sqlite3 db.sqlite3 "SELECT tag_name, value, timestamp FROM roams_opcua_mgr_opcuareadlog ORDER BY timestamp DESC LIMIT 10;"
```

### API Testing Scripts
- `test_api.sh` - Test authentication and basic endpoints
- `verify_opcua_fixes.sh` - Validate OPC UA client health

### Common Issues & Fixes

**`ERR_CONNECTION_REFUSED` on port 8000**:
```bash
# Backend not running. Start it:
cd roams_backend
source venv_new/bin/activate
python manage.py runserver 0.0.0.0:8000 --nothreading --noreload
```

**Frontend can't reach backend**:
- Check `roams_frontend/src/services/api.ts::getServerUrl()` - Server URL stored in localStorage `roams_server_url`
- Configure via Settings → Network tab in UI (dev/staging/prod presets)
- Verify CORS settings in `settings.py::CORS_ALLOWED_ORIGINS`
- Ensure Token in localStorage (check DevTools → Application → Local Storage)

**OPC UA clients not connecting**:
```bash
python diagnose_opcua.py  # Shows active connections and errors
```

**`BadTooManySessions` error**:
OPC UA server has too many open sessions. Solutions:
1. **Restart OPC UA server** to clear all sessions (quickest fix)
2. **Wait 5 minutes** for old sessions to timeout automatically
3. **Code fix** (already implemented): Session timeout set to 5 minutes in `opcua_client.py`
4. **Check server limits**: Some servers limit sessions to 2-5 concurrent connections

```python
# Session timeout is configured in opcua_client.py:
self.client.session_timeout = 300000  # 5 minutes
```

**500 error when writing to control nodes**:
- Verify node exists and is a boolean control type
- Check station is connected (use `diagnose_opcua.py`)
- OpcUaWriteLog is created automatically by `write_station_node()` - don't create it manually in views

---

## Critical Don'ts
1. ❌ Never add business logic to React components (use Django services)
2. ❌ Never modify database schema without migrations
3. ❌ Never use `python manage.py runserver` with threading enabled in production (OPC UA conflicts)
4. ❌ Never hardcode URLs/tokens (use env vars and config files)
5. ❌ Never commit `.env`, `db.sqlite3`, or `venv_new/`

---

## Documentation Strategy
This project has **extensive markdown documentation** in root directory covering:
- `ARCHITECTURE_DIAGRAMS.md` - System design and data flows
- `API_ENDPOINTS_GUIDE.md` - API usage examples
- `THRESHOLD_ARCHITECTURE.md` - Alarm system design
- `QUICK_START_NEXT_ACTIONS.md` - Production deployment guide (Hetzner VPS)

**When making changes**: Check existing docs first. Major features already have detailed implementation guides.

---

## Quick Reference: File Locations

```
roams_backend/
  ├── roams_api/          # REST API (views, serializers, URLs)
  ├── roams_opcua_mgr/    # OPC UA client, background threads, services
  ├── roams_pro/          # Django settings, main URLconf
  └── manage.py

roams_frontend/
  ├── src/
  │   ├── pages/          # Main views (Analysis, Overview, control, Settings, Notifications)
  │   ├── components/     # Reusable UI components
  │   ├── services/api.ts # API client with all fetch functions
  │   └── hooks/useAuth.tsx # Authentication context
  └── package.json
```

**Most frequently edited**: `roams_api/views.py`, `roams_api/serializers.py`, `src/pages/*.tsx`, `src/services/api.ts`
