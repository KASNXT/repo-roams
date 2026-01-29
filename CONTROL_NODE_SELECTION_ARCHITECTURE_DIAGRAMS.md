# Control Node Selection - Architecture & Flow Diagrams 📊

## System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         ROAMS CONTROL PAGE                               │
└──────────────────────────────────────────────────────────────────────────┘

┌─ FRONTEND LAYER ──────────────────────────────────────────────────────┐
│                                                                         │
│  ┌─ Component: Control.tsx ─────────────────────────────────────────┐ │
│  │                                                                   │ │
│  │  State Management:                                              │ │
│  │  ├─ stations: Station[]                  (from API)            │ │
│  │  ├─ selectedStation: string              (station name)        │ │
│  │  ├─ controlNodes: ControlNode[]          ✨ NEW                │ │
│  │  ├─ selectedNode: number | null          ✨ NEW                │ │
│  │  ├─ isRunning: boolean                   (toggle state)        │ │
│  │  └─ loadingNodes: boolean                ✨ NEW                │ │
│  │                                                                   │ │
│  │  Hooks:                                                         │ │
│  │  ├─ useEffect (load stations)            (on mount)            │ │
│  │  ├─ useEffect (load nodes)               ✨ NEW - on station  │ │
│  │  └─ handleToggle()                       ✨ UPDATED            │ │
│  │                                                                   │ │
│  │  UI Components:                                                 │ │
│  │  ├─ Station Selection Card               (existing)            │ │
│  │  ├─ Control Node Selection Card          ✨ NEW                │ │
│  │  └─ Control Panel Card                   (existing)            │ │
│  │                                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Data Flow:                                                            │
│  1. useEffect on mount → GET /api/opcua_clientconfig/                │
│  2. User selects station → GET /api/opcua_nodes/?station={name}      │
│  3. Node list loads → Auto-select first node → Show dropdown        │
│  4. User clicks toggle → POST /api/opcua_node/{id}/write/            │
│  5. Response received → Show toast → Update UI state                │
│                                                                         │
└──────────────────────────────────────────────────────────────────────────┘
                                    ↓↑
┌─ REST API LAYER ──────────────────────────────────────────────────────┐
│                                                                         │
│  Django REST Framework                                               │
│  ┌─ OPCUANodeViewSet ─────────────────────────────────────────────┐ │
│  │                                                                 │ │
│  │  Endpoints:                                                   │ │
│  │  ├─ GET /api/opcua_nodes/                (existing)          │ │
│  │  │  Filters: client_config__station_name                    │ │
│  │  │  Returns: [ControlNode]                                  │ │
│  │  │  Status: 200 OK                                          │ │
│  │  │                                                           │ │
│  │  └─ POST /api/opcua_node/{id}/write/     ✨ NEW              │ │
│  │     Body: {"value": 1, "command": "START"}                  │ │
│  │     Validation:                                             │ │
│  │     ├─ Check: value exists (required)                       │ │
│  │     ├─ Check: node exists                                  │ │
│  │     ├─ Check: client exists for station                    │ │
│  │     └─ Check: permissions                                  │ │
│  │     Processing:                                             │ │
│  │     ├─ Get OPCUANode                                        │ │
│  │     ├─ Get active OPC UA client                            │ │
│  │     ├─ Call write_station_node()                           │ │
│  │     ├─ Create OpcUaWriteLog record                         │ │
│  │     └─ Return response (200, 400, 503, 500)               │ │
│  │                                                             │ │
│  │  Permissions:                                               │ │
│  │  ├─ IsAuthenticated                                         │ │
│  │  └─ IsFrontendApp                                          │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                         │
└──────────────────────────────────────────────────────────────────────────┘
                                    ↓↑
┌─ OPC UA CLIENT LAYER ─────────────────────────────────────────────────┐
│                                                                         │
│  ┌─ opcua_client.py ──────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  Functions:                                                    │  │
│  │  ├─ get_active_client(station_config)                         │  │
│  │  │  Returns: OPC UA client (if active)                       │  │
│  │  │  Or: None (if offline)                                    │  │
│  │  │                                                            │  │
│  │  └─ Connection Management:                                   │  │
│  │     ├─ Keep-alive subscription (15s interval)               │  │
│  │     ├─ Health check (25s interval) ← From previous work    │  │
│  │     ├─ Session timeout (60s) ← From previous work          │  │
│  │     └─ Auto-reconnect on failure                           │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─ write_data.py ────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  Function: write_station_node(client, node, value, command)  │  │
│  │                                                                  │  │
│  │  Process:                                                      │  │
│  │  1. Get OPC UA node: client.get_node(node.node_id)           │  │
│  │  2. Set value: node.set_value(value)   [0 or 1]             │  │
│  │  3. Create log: OpcUaWriteLog.objects.create(...)           │  │
│  │  4. Update node: node.last_value = value                    │  │
│  │  5. Return: True on success, False on error                 │  │
│  │                                                                  │  │
│  │  Logging:                                                      │  │
│  │  ├─ Success → logger.info()                                  │  │
│  │  ├─ Error → logger.error()                                   │  │
│  │  └─ All writes to OpcUaWriteLog model (audit trail)        │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└──────────────────────────────────────────────────────────────────────────┘
                                    ↓↑
┌─ OPC UA SERVER LAYER ─────────────────────────────────────────────────┐
│                                                                         │
│  OPC UA Server (Industrial Device)                                    │
│                                                                         │
│  Receives: Write command to node ns=2;i=12345                        │
│  Value: 1 (ON) or 0 (OFF)                                            │
│                                                                         │
│  Processing:                                                           │
│  1. Validate write permissions                                       │
│  2. Update node value in memory                                     │
│  3. Execute device command                                          │
│  4. Device changes state (pump on/off, etc.)                       │
│                                                                         │
│  Verification:                                                         │
│  ├─ Node value updated in OPC UA namespace                        │
│  ├─ Device/hardware responds to command                           │
│  └─ (Optional) Read back to confirm write succeeded              │
│                                                                         │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Complete Request-Response Cycle

```
USER ACTION                    FRONTEND                  BACKEND              OPC UA
     │                            │                        │                   │
     │ 1. Select Station          │                        │                   │
     │────────────────────────────→                        │                   │
     │                            │                        │                   │
     │                         (show spinner)              │                   │
     │                            │                        │                   │
     │                            │ 2. GET /api/           │                   │
     │                            │    opcua_nodes/        │                   │
     │                            │    ?station={name}     │                   │
     │                            ├───────────────────────→│                   │
     │                            │                        │                   │
     │                            │                        │ 3. Query DB:     │
     │                            │                        │    OPCUANode    │
     │                            │                        │    .filter()    │
     │                            │                        │    .values()    │
     │                            │                        │                   │
     │                            │ 4. Return nodes list   │                   │
     │                         [node1, node2...]          │                   │
     │                            │←───────────────────────┤                   │
     │                            │                        │                   │
     │ 5. Nodes render in         │                        │                   │
     │    dropdown                │                        │                   │
     │←────────────────────────────                        │                   │
     │                            │                        │                   │
     │ 6. Auto-select first       │                        │                   │
     │    node or user select     │                        │                   │
     │────────────────────────────→                        │                   │
     │                            │ (show green indicator) │                   │
     │                            │                        │                   │
     │ 7. Toggle ON               │                        │                   │
     │────────────────────────────→                        │                   │
     │                            │                        │                   │
     │                         (show spinner)              │                   │
     │                            │                        │                   │
     │                            │ 8. POST /api/opcua_node│                   │
     │                            │    /42/write/          │                   │
     │                            │    {value:1,cmd:STR}   │                   │
     │                            ├───────────────────────→│                   │
     │                            │                        │                   │
     │                            │                        │ 9. OPCUANodeVSet │
     │                            │                        │    .write() {    │
     │                            │                        │      node=get()  │
     │                            │                        │      client=get()│
     │                            │                        │                   │
     │                            │                        │ 10. write_station│
     │                            │                        │     _node(...)   │
     │                            │                        ├──────────────────→│
     │                            │                        │                   │
     │                            │                        │                   │ 11. Write:
     │                            │                        │                   │ set_value(1)
     │                            │                        │                   │
     │                            │                        │                   │ 12. Device
     │                            │                        │                   │ activates
     │                            │                        │                   │
     │                            │                        │ 13. Return ✓     │
     │                            │                        │←──────────────────┤
     │                            │                        │                   │
     │                            │                        │ 14. Log write:   │
     │                            │                        │ OpcUaWriteLog    │
     │                            │                        │ .create(...)     │
     │                            │                        │                   │
     │                            │ 15. Return {success:   │                   │
     │                            │ true, message:..., ts} │                   │
     │                            │←───────────────────────┤                   │
     │ 16. Toast:                 │                        │                   │
     │ "✅ Pump Start ON"         │                        │                   │
     │←────────────────────────────                        │                   │
     │                            │                        │                   │
     │ 17. Toggle shows ON        │                        │                   │
     │←────────────────────────────                        │                   │
     │                            │                        │                   │
     │ 18. Device status          │                        │                   │
     │     updates on screen      │                        │                   │
     │←────────────────────────────                        │                   │
```

---

## UI Component Hierarchy

```
Control Page
│
├─ Header
│  ├─ Title: "Pump House"
│  └─ Subtitle: "Station Control & Operations"
│
├─ Station Selection Card
│  ├─ Title: "Station Selection"
│  │  ├─ Icon: Power
│  │  └─ Label: "Select Station"
│  │
│  ├─ Select Dropdown
│  │  ├─ Value: selectedStation
│  │  ├─ Options:
│  │  │  ├─ Station 1 (Online) ✓
│  │  │  ├─ Station 2 (Offline) ✗
│  │  │  └─ Station 3 (Online) ✓
│  │  └─ On Change: setSelectedStation() → Load nodes
│  │
│  └─ Status Display
│     ├─ Station Name
│     ├─ Connection Icon
│     └─ Running Badge
│
├─ ✨ Control Node Selection Card (NEW)
│  ├─ Title: "Select Control Node"
│  │  ├─ Icon: Sliders
│  │  └─ Label: "Available Control Nodes"
│  │
│  ├─ Loading State
│  │  ├─ Spinner: ⏳
│  │  └─ Text: "Loading control nodes..."
│  │
│  ├─ No Nodes State
│  │  └─ Text: "No control nodes available"
│  │
│  ├─ Select Dropdown
│  │  ├─ Value: selectedNode
│  │  ├─ Options:
│  │  │  ├─ Pump Start Signal (ns=2;i=12345)
│  │  │  ├─ Pump Stop Signal (ns=2;i=12346)
│  │  │  └─ Emergency Stop (ns=2;i=12347)
│  │  └─ On Change: setSelectedNode()
│  │
│  └─ Selected Indicator
│     ├─ Color: Green
│     ├─ Icon: ✓
│     ├─ Text: "Node Selected"
│     └─ Status: "Ready to control"
│
└─ Control Panel Card
   ├─ Title: "Control Panel"
   │  ├─ Icon: Settings
   │  └─ Label: "Control Panel"
   │
   ├─ Station Operation Card
   │  ├─ Title: "Station Operation"
   │  ├─ Description: "Toggle pump operation on or off"
   │  │
   │  ├─ Power Icon (Animated)
   │  │  └─ Color: Green (ON) / Red (OFF)
   │  │
   │  ├─ Toggle Switch
   │  │  ├─ State: pressed={isRunning}
   │  │  ├─ On Change: handleToggle(pressed)
   │  │  ├─ Disabled: loading || station offline || !selectedNode
   │  │  ├─ Icon: Power (animated spinner while loading)
   │  │  └─ Styling: Green when ON, Gray when OFF
   │  │
   │  └─ Labels
   │     ├─ Left: "Off"
   │     └─ Right: "On"
   │
   └─ Action Buttons
      ├─ Reset Button (existing)
      └─ Status Badge (existing)
```

---

## State Machine Diagram

```
┌─ Initial State ─────────────────────┐
│ station: null                       │
│ node: null                          │
│ isRunning: false                    │
│ controlNodes: []                    │
│ loadingNodes: false                 │
└─────────────────────────────────────┘
           ↓
        [Load Page]
           ↓
┌─ Stations Loading ──────────────────┐
│ loading: true                       │
│ Fetch: GET /api/opcua_clientconfig/ │
└─────────────────────────────────────┘
           ↓
┌─ Stations Loaded ───────────────────┐
│ stations: [...] (populated)         │
│ selectedStation: first_station_id   │
│ loading: false                      │
└─────────────────────────────────────┘
           ↓
        [useEffect triggered by selectedStation]
           ↓
┌─ Nodes Loading ─────────────────────┐
│ loadingNodes: true                  │
│ Fetch: GET /api/opcua_nodes/...     │
└─────────────────────────────────────┘
           ↓
┌─ Nodes Loaded ──────────────────────┐
│ controlNodes: [...] (populated)     │
│ selectedNode: first_node_id         │
│ loadingNodes: false                 │
└─────────────────────────────────────┘
           ↓
┌─ Ready for Control ─────────────────┐
│ station: selected ✓                 │
│ node: selected ✓                    │
│ isRunning: false                    │
│ Toggle available!                   │
└─────────────────────────────────────┘
           ↓
        [User clicks toggle]
           ↓
        [Toggle pressed = true]
           ↓
┌─ Writing Value ─────────────────────┐
│ loading: true                       │
│ Toggle spinner: animate             │
│ POST: /api/opcua_node/{id}/write/   │
│ Body: {"value": 1, "command": "STR"}│
└─────────────────────────────────────┘
           ↓
     [Response received]
           ↓
        [Success]
           ↓
┌─ Control Active ────────────────────┐
│ isRunning: true                     │
│ loading: false                      │
│ Toast: "✅ Turned ON"               │
│ Toggle position: ON                 │
└─────────────────────────────────────┘
           ↓
        [User clicks toggle again]
           ↓
        [Toggle pressed = false]
           ↓
┌─ Writing OFF ───────────────────────┐
│ loading: true                       │
│ POST: /api/opcua_node/{id}/write/   │
│ Body: {"value": 0, "command": "STOP"}
└─────────────────────────────────────┘
           ↓
┌─ Control Inactive ──────────────────┐
│ isRunning: false                    │
│ loading: false                      │
│ Toast: "✅ Turned OFF"              │
│ Toggle position: OFF                │
└─────────────────────────────────────┘

ERROR PATH:
════════════════════════════════════
Writing → Error Response (5xx) →
    ↓
Toggle reverts to previous state
    ↓
Toast: "❌ Write failed: [reason]"
    ↓
Ready for retry
```

---

## Data Flow Detail

### Station Selection Flow
```
Frontend                           Backend
   │                               │
   │ User selects station          │
   │────────────────────────────→  │
   │                               │
   │ useEffect triggered           │
   │────────────────────────────→  │
   │                               │
   │ GET /api/opcua_nodes/         │
   │ ?client_config__station_name  │
   │────────────────────────────→  │
   │                               │
   │                         Filters nodes by:
   │                         ├─ client_config.station_name
   │                         ├─ data_type == "Boolean"
   │                         └─ is_control == true
   │                               │
   │ Response: [nodes]             │
   │←────────────────────────────  │
   │                               │
   │ Load into controlNodes state   │
   │ Auto-select first node         │
   │ Show dropdown UI               │
```

### Write Operation Flow
```
Frontend                           Backend                       OPC UA
   │                               │                               │
   │ User clicks toggle            │                               │
   │────────────────────────────→  │                               │
   │                               │                               │
   │ Validate:                     │                               │
   │ ├─ Station exists ✓           │                               │
   │ ├─ Node exists ✓              │                               │
   │ └─ Value ready ✓              │                               │
   │────────────────────────────→  │                               │
   │                               │                               │
   │ POST /api/opcua_node/42/write/│                               │
   │ {"value": 1, "command": "START"}                              │
   │────────────────────────────→  │                               │
   │                               │                               │
   │ (show spinner)                │ Get OPCUANode(id=42)          │
   │                               │ Get client for station        │
   │                               │ validate permissions         │
   │                               │────────────────────────────→  │
   │                               │                               │
   │                               │ write_station_node(client,   │
   │                               │  node, 1, "START")           │
   │                               │────────────────────────────→  │
   │                               │                               │
   │                               │                           set_value(1)
   │                               │                               │
   │                               │ OpcUaWriteLog.create(...)    │
   │                               │ (audit trail)               │
   │                               │                               │
   │ Response JSON:                │                               │
   │ {success: true,               │←────────────────────────────  │
   │  message: "✅ Wrote...",       │                               │
   │  value: 1,                    │                               │
   │  timestamp: "..."}            │                               │
   │←────────────────────────────  │                               │
   │                               │                               │
   │ Update isRunning = true       │                               │
   │ Show toast: "✅ Turned ON"    │                               │
   │ Toggle to ON position         │                               │
```

---

## Component Props & State Summary

### ControlNode Interface
```typescript
interface ControlNode {
  id: number;              // Database ID
  node_id: string;         // OPC UA node ID (ns=X;i=X format)
  tag_name: string;        // Human-readable name
  description?: string;    // Optional description
  current_value: boolean;  // Current state
}
```

### Control Component State
```typescript
const Control = () => {
  // Station management
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("");
  
  // ✨ Node management (NEW)
  const [controlNodes, setControlNodes] = useState<ControlNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [loadingNodes, setLoadingNodes] = useState(false);
  
  // Control state
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStations, setLoadingStations] = useState(false);
}
```

### API Request/Response Types

**Get Nodes Request:**
```typescript
// GET /api/opcua_nodes/?client_config__station_name={name}
interface GetNodesQuery {
  client_config__station_name: string;
}

interface GetNodesResponse {
  count: number;
  results: ControlNode[];
}
```

**Write Request:**
```typescript
interface WriteRequest {
  value: 1 | 0;        // Required
  command?: string;    // Optional: "START" | "STOP"
}
```

**Write Response:**
```typescript
interface WriteResponse {
  success: boolean;
  message: string;
  node_id: string;
  value: number;
  timestamp: string;
}
```

---

## Error State Handling

```
WRITE OPERATION → ERROR → FRONTEND HANDLES
                  ↓
            [Check Status Code]
                  ↓
        ┌─────────┼─────────┐
        ↓         ↓         ↓
      400       503       500
        │         │         │
      Missing  No Active  Server
      Value    Client    Error
        │         │         │
        └─────────┴─────────┘
              ↓
        [Show Toast]
        [Log Error]
        [Revert Toggle]
        [Keep Form State]
        [Allow Retry]
```

---

## Performance Optimization Considerations

```
Current Implementation:
├─ Load stations: 1 request on mount
├─ Load nodes: 1 request per station change
├─ Write operation: 1 request per toggle
└─ No debouncing needed (single actions)

Memory Usage:
├─ controlNodes array: ~1KB per node * num_nodes
├─ Typical: <10 nodes = <10KB
└─ Acceptable for frontend

Network:
├─ Get nodes: ~500ms (depends on network)
├─ Write operation: 1-2s (depends on OPC UA)
├─ Concurrent: No (sequential operations)
└─ Acceptable latency
```

---

*This document provides comprehensive architecture and flow diagrams for the Control Node Selection feature.*
