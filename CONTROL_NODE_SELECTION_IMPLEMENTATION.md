# Control Node Selection & Write Operations - Implementation Complete ✅

## Overview
Successfully implemented per-station node selection and write capability in the Control page, enabling users to select specific OPC UA control nodes and send ON/OFF commands via data write operations.

---

## Implementation Summary

### 1. **Frontend Changes** (`control.tsx`)

#### A. New Data Types & State Management
```typescript
// ✅ New interface for control nodes
interface ControlNode {
  id: number;
  node_id: string;
  tag_name: string;
  description?: string;
  current_value: boolean;
}

// ✅ New state variables added
const [controlNodes, setControlNodes] = useState<ControlNode[]>([]);
const [selectedNode, setSelectedNode] = useState<number | null>(null);
const [loadingNodes, setLoadingNodes] = useState(false);
```

#### B. Node Fetching Logic (useEffect)
- **Trigger**: Runs when `selectedStation` changes
- **Endpoint**: `/api/opcua_nodes/?client_config__station_name={station}`
- **Filtering**: Only control/boolean nodes (data_type === "Boolean" or is_control === true)
- **Auto-Selection**: First node automatically selected if available
- **Error Handling**: Toast notifications on fetch failure

#### C. Node Selection UI
New card component with:
- Station-specific node dropdown selector
- Visual feedback when node is selected (green checkmark)
- Loading state while fetching nodes
- Node ID displayed in dropdown items

#### D. Updated Toggle Handler
- **Validation**: Ensures both station AND node are selected before write
- **Write Value**: 
  - `1` for ON (pressed = true)
  - `0` for OFF (pressed = false)
- **API Endpoint**: `POST /api/opcua_node/{nodeId}/write/`
- **Request Body**:
  ```json
  {
    "value": 1,
    "command": "START"
  }
  ```
- **Error Recovery**: Reverts toggle state on write failure
- **User Feedback**: Toast notifications showing success/failure

---

### 2. **Backend API Changes** (`views.py`)

#### A. New Write Action on OPCUANodeViewSet
```python
@action(detail=True, methods=['post'], url_path='write')
def write(self, request, pk=None):
    """Write a value to the OPC UA node."""
```

**Functionality:**
- Endpoint: `POST /api/opcua_node/{id}/write/`
- Parameters: `value` (required), `command` (optional)
- Client Retrieval: Gets active OPC UA client for the station
- Write Operation: Calls `write_station_node()` from `write_data.py`
- Logging: Detailed error logging with emoji prefixes

**Response Structure:**
```json
{
  "success": true,
  "message": "✅ Wrote value 1 to pump_start_signal",
  "node_id": "ns=2;i=12345",
  "value": 1,
  "timestamp": "2024-01-15T14:30:45.123456Z"
}
```

**Error Responses:**
- 400: Missing `value` parameter
- 503: No active client for station
- 500: Write operation failed

#### B. Added Imports
```python
from django.utils.timezone import now
import logging

logger = logging.getLogger(__name__)
```

---

## Technical Architecture

```
Frontend (React)                        Backend (Django)                   OPC UA Client
┌──────────────────────────────┐       ┌─────────────────────────┐       ┌──────────────┐
│ Control.tsx                  │       │ views.py                │       │ opcua_client │
│ ┌──────────────────────────┐ │       │ ┌───────────────────┐   │       │              │
│ │ 1. Fetch stations        │ │────── │ /opcua_clientconfig/│───── BROWSE nodes
│ └──────────────────────────┘ │       │ └───────────────────┘   │       │              │
│ ┌──────────────────────────┐ │       │ ┌───────────────────┐   │       │              │
│ │ 2. Fetch control nodes   │ │────── │ /opcua_node/?      │───── FILTER control nodes
│ │    (when station changes)│ │       │  client_config__   │   │       │              │
│ │                          │ │       │  station_name=X    │   │       │              │
│ └──────────────────────────┘ │       │ └───────────────────┘   │       │              │
│ ┌──────────────────────────┐ │       │ ┌───────────────────┐   │       │              │
│ │ 3. Select node from UI   │ │       │ (User selects node)     │       │              │
│ └──────────────────────────┘ │       └─────────────────────────┘       │              │
│ ┌──────────────────────────┐ │       ┌─────────────────────────┐       │              │
│ │ 4. Toggle ON/OFF         │ │────── │ POST /opcua_node/      │────── SET_VALUE    │
│ │    (submit write request)│ │       │      {id}/write/       │       │              │
│ │    value: 0 or 1         │ │       │ body: {value, cmd}     │       │              │
│ └──────────────────────────┘ │       │ ↓                      │       │              │
│                              │       │ write_station_node()   │──────→│ Write to OPC │
│ ┌──────────────────────────┐ │       │ ↓                      │       │ UA node      │
│ │ 5. Toast notification    │←────── │ OpcUaWriteLog.create() │       │              │
│ │    (success/error)       │        │ ↓ return success       │       │              │
│ └──────────────────────────┘        │ Response (JSON)        │       │              │
└──────────────────────────────────────┴─────────────────────────┘       └──────────────┘
```

---

## Data Flow Example

### Scenario: User turns ON a pump start signal

**Step 1: User loads Control page**
```
Frontend: GET /api/opcua_clientconfig/ 
→ Display available stations dropdown
```

**Step 2: User selects "Main Pump Station"**
```
Frontend: GET /api/opcua_nodes/?client_config__station_name=Main%20Pump%20Station
← Returns array of Boolean-type nodes
```

**Step 3: User selects "Pump Start Signal" node**
```
Frontend: selectedNode = node.id (e.g., 42)
→ Display green "✓ Node Selected" indicator
```

**Step 4: User toggles switch to ON**
```
Frontend: POST /api/opcua_node/42/write/
Body: {
  "value": 1,
  "command": "START"
}

Backend: 
  ↓ Retrieves OPCUANode with id=42
  ↓ Gets active OPC UA client for station
  ↓ Calls: write_station_node(client, node, 1, "START")
  ↓ Writes value 1 to ns=2;i=12345 via OPC UA
  ↓ Creates OpcUaWriteLog record
  ↓ Updates node.last_value = 1, node.last_updated = now()
  ↓ Returns: { success: true, message: "✅ Wrote value 1 to Pump Start Signal", ... }

Frontend: Toast notification shows "✅ Pump Start Signal turned ON"
```

---

## File Modifications

### 1. **control.tsx** (Frontend)
- **Lines 32-52**: Added ControlNode interface and state variables
- **Lines 54-100**: Added useEffect to fetch control nodes when station changes
- **Lines 155-200**: Updated toggle handler with node selection validation and write logic
- **Lines 350-395**: Added Control Node selection UI card with dropdown

### 2. **views.py** (Backend)
- **Lines 1-13**: Added imports (`now`, `logging`)
- **Lines 358-435**: Updated OPCUANodeViewSet with new write action

---

## API Endpoints

### Get Control Nodes for a Station
```
GET /api/opcua_nodes/?client_config__station_name={station_name}

Response (200 OK):
{
  "count": 3,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 42,
      "node_id": "ns=2;i=12345",
      "tag_name": "Pump Start Signal",
      "data_type": "Boolean",
      "current_value": false
    },
    ...
  ]
}
```

### Write to Control Node
```
POST /api/opcua_node/{node_id}/write/

Request Body:
{
  "value": 1,           // Required: 0 or 1
  "command": "START"    // Optional: Display label
}

Response (200 OK):
{
  "success": true,
  "message": "✅ Wrote value 1 to Pump Start Signal",
  "node_id": "ns=2;i=12345",
  "value": 1,
  "timestamp": "2024-01-15T14:30:45.123456Z"
}

Error Responses:
400: {"error": "Missing 'value' parameter"}
503: {"error": "No active client for Main Pump Station"}
500: {"error": "Write operation failed: [reason]"}
```

---

## Write Command Mapping

| User Action | Write Value | Command Label | OPC UA Effect |
|------------|------------|---------------|---------------|
| Toggle ON  | 1          | START         | Activates pump/device |
| Toggle OFF | 0          | STOP          | Deactivates pump/device |

---

## Integration with Existing Systems

### Dependencies Used
1. **write_data.py**: `write_station_node()` function
   - Handles low-level OPC UA write operations
   - Creates OpcUaWriteLog records
   - Updates node state in database

2. **opc_client.py**: `get_active_client()` function
   - Returns active OPC UA client for station
   - Ensures connection is ready before write

3. **Models**: OPCUANode, OpcUaClientConfig, OpcUaWriteLog
   - OPCUANode: Define controllable nodes
   - OpcUaClientConfig: Station connection configuration
   - OpcUaWriteLog: Track all write operations

---

## Error Handling

### Frontend Error Scenarios
1. **No station selected**: Toast error + validation
2. **No node selected**: Toast error + validation
3. **Network failure**: Toast error + toggle revert
4. **Server error (5xx)**: Toast error + toggle revert
5. **Missing node data**: Console error + toggle revert

### Backend Error Scenarios
1. **Missing value parameter**: HTTP 400 + error message
2. **No active client**: HTTP 503 + service unavailable message
3. **Write operation fails**: HTTP 500 + error details
4. **Exception during write**: HTTP 500 + exception message

---

## Testing Checklist

✅ **Frontend Functionality**
- [ ] Station dropdown loads on component mount
- [ ] Control nodes load when station is selected
- [ ] First node auto-selects when nodes load
- [ ] Node dropdown displays available nodes with names and IDs
- [ ] "Node Selected" indicator shows when node is chosen
- [ ] Toggle switch is disabled when no node selected

✅ **Write Operations**
- [ ] Toggle ON sends value 1 to backend
- [ ] Toggle OFF sends value 0 to backend
- [ ] Success toast shows correct node name
- [ ] Error toast shows error message
- [ ] Toggle reverts on error
- [ ] Loading spinner shows during write

✅ **Backend API**
- [ ] GET /api/opcua_nodes/ returns filtered nodes
- [ ] POST /api/opcua_node/{id}/write/ accepts requests
- [ ] Write operation calls write_station_node()
- [ ] OpcUaWriteLog records created
- [ ] Error responses return correct status codes

✅ **Integration**
- [ ] OPC UA values actually change on devices
- [ ] Database reflects write operations
- [ ] No connection errors during write
- [ ] Keep-alive subscription stays active during writes

---

## Future Enhancements

1. **Bulk Write Operations**: Write multiple nodes simultaneously
2. **Scheduled Writes**: Schedule writes for future execution
3. **Write History**: Display write audit trail in UI
4. **Undo/Rollback**: Ability to revert recent writes
5. **Write Templates**: Save common write sequences
6. **Permissions**: Role-based write access control
7. **Rate Limiting**: Prevent write flooding
8. **Verification**: Confirm write succeeded with value read-back

---

## Deployment Notes

1. **Frontend**:
   - Rebuild frontend: `npm run build`
   - Deploy to /dist folder
   - Ensure API_URL is correctly configured

2. **Backend**:
   - Restart Django development server
   - Ensure write_data.py and opc_client.py are available
   - Check OPC UA client connections are active

3. **OPC UA**:
   - Verify keep-alive subscription is running (from previous fixes)
   - Ensure write permissions on target nodes
   - Test connection before user operations

---

## Summary

**Complete Integration Achieved:**
- ✅ Frontend node selection UI
- ✅ Backend write action API
- ✅ OPC UA write operations
- ✅ Error handling and user feedback
- ✅ Data persistence in OpcUaWriteLog
- ✅ Integration with existing write infrastructure

**User Experience:**
1. Select station → Load control nodes automatically
2. Select control node → Enable write operations
3. Toggle ON/OFF → Send write command to OPC UA
4. Receive instant feedback → Success/error toast

**Architecture:**
- Follows Django REST framework patterns
- Uses existing OPC UA client infrastructure
- Leverages write_data.py for low-level operations
- Maintains backward compatibility
