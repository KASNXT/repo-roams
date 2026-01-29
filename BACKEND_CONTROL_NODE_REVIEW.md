# Backend Review: Control State & Node Selection Architecture 🔍

## Executive Summary

The backend has solid infrastructure for OPC UA node management and control state tracking. However, there are **critical gaps** in the station-to-node-to-control mapping that prevent proper multi-station write operations. This review identifies the issues and provides implementation recommendations.

---

## Current Architecture

### 1. **Station Model** (`OpcUaClientConfig`)
```
OpcUaClientConfig (Station)
├─ station_name
├─ endpoint_url
├─ connection_status
└─ [One-to-Many] → OPCUANode
```

### 2. **Node Model** (`OPCUANode`)
```
OPCUANode (Tag/Node)
├─ client_config (FK to OpcUaClientConfig) ✅ Links to station
├─ node_id (e.g., "ns=2;i=12345")
├─ tag_name
├─ data_type (Float, Boolean, etc.)
├─ is_boolean_control (Boolean flag)
└─ [One-to-One] → ControlState
```

### 3. **Control State Model** (`ControlState`)
```
ControlState (Control Tag)
├─ node (OneToOneField to OPCUANode) ✅ Links to node
├─ current_value (Boolean)
├─ requires_confirmation
├─ rate_limit_seconds
└─ [Audit Trail] last_changed_by, last_changed_at
```

---

## Issues Identified 🚨

### Issue 1: Missing Control Node Filtering by Station
**Problem:**
When frontend requests control nodes for a station, the API doesn't properly filter nodes by:
- `data_type = "Boolean"` (control nodes)
- `client_config = selected_station` (station-specific)

**Current Implementation:**
```python
# In views.py - OPCUANodeViewSet.get_queryset()
def get_queryset(self):
    qs = super().get_queryset()
    is_alarm = self.request.query_params.get("is_alarm")
    if is_alarm is not None:
        qs = qs.filter(is_alarm=is_alarm.lower() == "true")
    return qs
```

**Issues:**
- ❌ No filtering by `client_config__station_name` parameter
- ❌ No filtering by `data_type = "Boolean"`
- ❌ Returns ALL nodes regardless of type/station
- ❌ `is_boolean_control` field exists but isn't used in filtering

---

### Issue 2: Write Action Missing Station Context
**Problem:**
The write action retrieves the OPCUANode but doesn't validate that the requesting user has access to write to that specific station's nodes.

**Current Implementation:**
```python
@action(detail=True, methods=['post'], url_path='write')
def write(self, request, pk=None):
    node = self.get_object()  # Gets node by ID
    # ⚠️ No validation that node belongs to a valid station
    # ⚠️ No permission check for station access
    client = get_active_client(node.client_config)  # Gets client
```

**Issues:**
- ❌ No validation that `client_config` is active/connected
- ❌ No check that user has write permission for this station
- ❌ No confirmation of node's `access_level = "Write_only"` or `"Read_write"`
- ⚠️ `requires_confirmation` on ControlState is checked, but logic might be in control_viewsets.py

---

### Issue 3: No Control State Registration Mechanism
**Problem:**
Not all Boolean nodes are linked to ControlState. The relationship is `OneToOneField` but there's no guarantee control nodes have a ControlState entry.

**Current Data Flow:**
```
Frontend → Select Station
Frontend → Get Nodes filtered by station (missing logic)
Frontend → Select Node
Frontend → Toggle ON/OFF
  ↓
Backend: POST /api/opcua_node/{id}/write/
  ├─ Get OPCUANode by ID
  ├─ Get OPCUAClientConfig (station)
  ├─ Get OPC UA client
  ├─ Write value via opcua_client
  └─ Create OpcUaWriteLog
  
❌ Missing: ControlState update
❌ Missing: Confirmation workflow
❌ Missing: Rate limiting
❌ Missing: Audit in ControlState
```

---

### Issue 4: ControlState Logic is in Wrong ViewSet
**Problem:**
Control state changes should go through `ControlStateViewSet`, but we're writing directly via `OPCUANodeViewSet.write()`.

**Current Structure:**
- `roams_api/views.py` → `OPCUANodeViewSet` has `.write()` action (NEW)
- `roams_api/control_viewsets.py` → `ControlStateViewSet` has the "proper" workflow

**Conflict:**
```
Two different code paths for state changes:
1. OPCUANodeViewSet.write() → Directly writes OPC UA value
2. ControlStateViewSet → Has confirmation, audit trail, rate limiting

Frontend uses path #1, but business logic expects path #2!
```

---

## Recommendations 📋

### Recommendation 1: Fix Node Filtering in OPCUANodeViewSet
**Update:** `roams_api/views.py` → `OPCUANodeViewSet.get_queryset()`

**Changes:**
```python
def get_queryset(self):
    qs = super().get_queryset()
    
    # ✅ NEW: Filter by station name
    station_name = self.request.query_params.get("client_config__station_name")
    if station_name:
        qs = qs.filter(client_config__station_name=station_name)
    
    # ✅ NEW: Filter for control nodes only
    is_control = self.request.query_params.get("is_control")
    if is_control is not None:
        qs = qs.filter(is_boolean_control=is_control.lower() == "true")
    
    # Existing alarm filter
    is_alarm = self.request.query_params.get("is_alarm")
    if is_alarm is not None:
        qs = qs.filter(is_alarm=is_alarm.lower() == "true")
    
    return qs
```

**Updated Filterset:**
```python
filterset_fields = [
    'client_config',
    'client_config__station_name',  # ✅ NEW
    'tag_name',
    'last_updated',
    'data_type',  # ✅ NEW
    'is_boolean_control',  # ✅ NEW
]
```

---

### Recommendation 2: Route Writes Through ControlStateViewSet
**Problem:** Current `.write()` action bypasses confirmation and audit logic.

**Solution:** Integrate with existing `ControlStateViewSet.request_change()` workflow.

**Option A (Recommended): Merge Logic**
Change the write action to validate through ControlState:

```python
@action(detail=True, methods=['post'], url_path='write')
def write(self, request, pk=None):
    """Write to OPC UA node - validates through ControlState if available."""
    from roams_opcua_mgr.models import ControlState
    
    node = self.get_object()
    value = request.data.get('value')
    
    # ✅ NEW: Validate node type
    if not node.is_boolean_control or node.data_type != "Boolean":
        return Response(
            {"error": f"Node {node.node_id} is not a control node"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
    # ✅ NEW: Check access level
    if node.access_level == "Read_only":
        return Response(
            {"error": f"Node {node.node_id} is read-only"},
            status=status.HTTP_403_FORBIDDEN,
        )
    
    # ✅ NEW: Check for ControlState and validate confirmation requirement
    try:
        control_state = node.control_state
        if control_state.requires_confirmation:
            return Response(
                {"error": "This control requires confirmation", "requires_confirmation": True},
                status=status.HTTP_428_PRECONDITION_REQUIRED,
            )
        
        # Check rate limiting
        if control_state.rate_limit_seconds > 0:
            time_since_change = (now() - control_state.last_changed_at).total_seconds()
            if time_since_change < control_state.rate_limit_seconds:
                return Response(
                    {"error": f"Rate limited. Wait {control_state.rate_limit_seconds}s between changes"},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
    except ControlState.DoesNotExist:
        logger.warning(f"Node {node.node_id} has no ControlState entry")
    
    # ✅ Continue with write...
```

---

### Recommendation 3: Add Station Access Control
**Add validation** to ensure user has permission to write to this station:

```python
@action(detail=True, methods=['post'], url_path='write')
def write(self, request, pk=None):
    node = self.get_object()
    station = node.client_config
    
    # ✅ NEW: Check station permissions
    if not station.active:
        return Response(
            {"error": f"Station {station.station_name} is not active"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    
    if station.connection_status != "connected":
        return Response(
            {"error": f"Station {station.station_name} is {station.connection_status}"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    
    # ✅ NEW: Check user permissions for this station
    # (would require station-permission model, but add if available)
```

---

### Recommendation 4: Create ControlNode Serializer with Station Info
**Add serializer** that includes station context:

```python
class ControlNodeSerializer(serializers.ModelSerializer):
    """Serializer for control nodes with station info"""
    station_name = serializers.CharField(
        source='client_config.station_name',
        read_only=True
    )
    station_id = serializers.IntegerField(
        source='client_config.id',
        read_only=True
    )
    tag_name_display = serializers.CharField(
        source='tag_name',
        read_only=True
    )
    
    class Meta:
        model = OPCUANode
        fields = [
            'id',
            'node_id',
            'tag_name_display',
            'station_name',
            'station_id',
            'data_type',
            'access_level',
            'is_boolean_control',
            'current_value',
            'last_value',
            'last_updated',
        ]
```

---

### Recommendation 5: Update Frontend API Call
**Current:** Frontend sends station name string
**Recommended:** Send explicit filter parameters

```typescript
// Current
const response = await axios.get(
  `${serverUrl}/api/opcua_node/`,
  { params: { client_config__station_name: selectedStation } }
);

// Improved (with explicit filtering)
const response = await axios.get(
  `${serverUrl}/api/opcua_node/`,
  { 
    params: { 
      client_config__station_name: selectedStation,
      is_control: 'true',  // ✅ NEW: Only control nodes
      data_type: 'Boolean',  // ✅ NEW: Only Boolean types
    },
  }
);
```

---

## Data Flow - Current vs. Recommended

### Current Flow ❌
```
Frontend: Select Station → GET /api/opcua_node/
Backend: Returns ALL nodes for station
Frontend: Filter locally by Boolean type
Frontend: Select node → POST /api/opcua_node/{id}/write/
Backend: Write directly to OPC UA
Backend: Create OpcUaWriteLog
❌ Missing: ControlState update, confirmation, rate limiting, access control
```

### Recommended Flow ✅
```
Frontend: Select Station → GET /api/opcua_node/
Params: ?client_config__station_name=Station&is_control=true&data_type=Boolean
Backend: Filter by station, control flag, Boolean type
Backend: Return only control nodes
Frontend: Display control nodes (all pre-filtered)
Frontend: Select node → POST /api/opcua_node/{id}/write/
Backend: Validate:
  ├─ Node type is Boolean ✅
  ├─ Node is control node ✅
  ├─ Access level allows write ✅
  ├─ Station is active/connected ✅
  ├─ ControlState exists ✅
  ├─ Not rate-limited ✅
  └─ Confirmation not required (or provided) ✅
Backend: Write to OPC UA ✅
Backend: Update ControlState ✅
Backend: Create OpcUaWriteLog ✅
Backend: Log in ControlState audit trail ✅
Frontend: Show success toast ✅
```

---

## Implementation Checklist 📋

### Phase 1: Backend Validation (Immediate)
- [ ] Update `OPCUANodeViewSet.get_queryset()` to filter by station and control type
- [ ] Update `OPCUANodeViewSet.filterset_fields` to include station_name and data_type
- [ ] Add validation in write action:
  - [ ] Check `data_type == "Boolean"`
  - [ ] Check `is_boolean_control == True`
  - [ ] Check `access_level` allows write
  - [ ] Check station is active/connected
  - [ ] Check ControlState exists (warn if not)

### Phase 2: ControlState Integration (Important)
- [ ] Update write action to check ControlState:
  - [ ] Check `requires_confirmation`
  - [ ] Check rate limiting
  - [ ] Update state after write
  - [ ] Log change to ControlState audit trail
- [ ] Add ControlNode serializer with station info
- [ ] Update API response to include station context

### Phase 3: Permissions & Security (Recommended)
- [ ] Add station-level permission checks
- [ ] Validate user has write permission for station
- [ ] Add audit logging for who wrote what and when

### Phase 4: Error Handling (Enhancement)
- [ ] Return specific error codes:
  - [ ] 400: Invalid node type
  - [ ] 403: Access denied
  - [ ] 404: Node not found
  - [ ] 428: Confirmation required
  - [ ] 429: Rate limited
  - [ ] 503: Station offline

---

## Test Cases

### Unit Tests Needed
```python
def test_filter_control_nodes_by_station():
    # Get only control nodes for specific station
    
def test_filter_boolean_nodes_only():
    # Get only Boolean data type nodes
    
def test_write_to_read_only_node():
    # Should return 403 Forbidden
    
def test_rate_limiting():
    # Second write within rate limit should fail
    
def test_station_offline():
    # Write to offline station should fail
    
def test_controlstate_update_on_write():
    # ControlState should be updated after write
```

---

## Database Fields Summary

### OPCUANode - Fields Used for Control
```
✅ client_config (FK) → Station reference
✅ node_id (str) → OPC UA node address
✅ tag_name (FK) → Tag definition
✅ data_type (choice) → Boolean for controls
✅ is_boolean_control (bool) → Control flag
✅ access_level (choice) → Read/Write permissions
✅ last_value (str) → Current value
✅ last_updated (datetime) → Last read time
```

### OpcUaClientConfig - Station Fields
```
✅ station_name (str) → Station identifier
✅ endpoint_url (str) → OPC UA server URL
✅ active (bool) → Station enabled
✅ connection_status (str) → Connected/Offline
✅ last_connected (datetime) → Last successful connection
```

### ControlState - Control Fields
```
✅ node (OneToOne) → Link to OPCUANode
✅ current_value (bool) → Current state
✅ requires_confirmation (bool) → Needs approval
✅ rate_limit_seconds (int) → Minimum between changes
✅ last_changed_at (datetime) → When changed
✅ last_changed_by (FK User) → Who changed it
✅ is_synced_with_plc (bool) → State match
```

---

## Summary

**Current Status:**
- ✅ Basic OPC UA write infrastructure works
- ✅ Models have necessary fields
- ❌ Missing station-to-node filtering
- ❌ Missing ControlState integration
- ❌ Missing access control validation
- ⚠️ Confirmation logic may be bypassed

**Priority Fixes:**
1. **HIGH:** Add station/control filtering to node GET requests
2. **HIGH:** Add validation in write action
3. **MEDIUM:** Integrate ControlState checks
4. **MEDIUM:** Add permission/access control
5. **LOW:** Enhanced error codes and logging

**Estimated Effort:**
- Phase 1: 2-3 hours
- Phase 2: 4-5 hours
- Phase 3: 3-4 hours
- Phase 4: 2-3 hours
- **Total: 11-15 hours**

---

*Backend Architecture Review - January 9, 2026*
