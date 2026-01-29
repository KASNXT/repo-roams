# Control Node Selection - Quick Reference 🚀

## What's New

Control page now supports **node selection + write operations**. Select which device to control, then toggle ON/OFF to send values to OPC UA.

---

## Quick Start (3 Steps)

### 1️⃣ Select Station
```
Station Selection → Dropdown → Choose a station
✓ Station online → Ready
✗ Station offline → Wait or try another
```

### 2️⃣ Select Control Node
```
Control Node Selection → Dropdown → Choose a node
✓ Green "Node Selected" indicator appears
Ready to write!
```

### 3️⃣ Toggle ON/OFF
```
Control Panel → Toggle Switch → Press ON or OFF
Value 1 (ON) sent to OPC UA
Value 0 (OFF) sent to OPC UA
✅ Toast shows success
```

---

## API Endpoints

### Get Control Nodes
```
GET /api/opcua_nodes/?client_config__station_name=Main%20Pump
```

Returns:
```json
{
  "results": [
    {
      "id": 42,
      "node_id": "ns=2;i=12345",
      "tag_name": "Pump Start Signal",
      "data_type": "Boolean"
    }
  ]
}
```

### Write to Node
```
POST /api/opcua_node/{node_id}/write/

Body: {
  "value": 1,              // 0 or 1
  "command": "START"       // Optional
}

Response: {
  "success": true,
  "message": "✅ Wrote value 1 to Pump Start Signal",
  "timestamp": "2024-01-15T14:30:45Z"
}
```

---

## File Changes

| File | Changes |
|------|---------|
| `control.tsx` | Added node selection dropdown + write handler |
| `views.py` | Added write action to OPCUANodeViewSet |

---

## Write Values

| Action | Value | Command | Effect |
|--------|-------|---------|--------|
| Toggle ON | `1` | `START` | Device activates |
| Toggle OFF | `0` | `STOP` | Device deactivates |

---

## Error Codes

| Code | Meaning | Fix |
|------|---------|-----|
| No station selected | Missing station | Pick station first |
| No node selected | Missing node | Pick node first |
| Station offline | No OPC UA connection | Wait for connection |
| HTTP 503 | No active client | Station offline |
| HTTP 500 | Write failed | Check OPC UA server |

---

## Database Tables

### OpcUaWriteLog (New Records)
- `timestamp`: When write occurred
- `client_config`: Which station
- `node`: Which control node
- `value`: 0 or 1
- `command`: "START" or "STOP"

---

## State Management (Frontend)

```typescript
controlNodes[]        // Available control nodes
selectedNode          // Currently selected node ID
loadingNodes          // Loading indicator

On toggle:
  → Validate station selected
  → Validate node selected
  → POST /api/opcua_node/{selectedNode}/write/
  → Wait for response
  → Show toast (success/error)
```

---

## Backend Flow

```
POST /api/opcua_node/{id}/write/ {value, command}
  ↓
OPCUANodeViewSet.write()
  ↓
Get OPCUANode by ID
  ↓
Get active client for station
  ↓
write_station_node(client, node, value, command)
  ↓
OPC UA: client.get_node(node.node_id).set_value(value)
  ↓
OpcUaWriteLog.create(...)
  ↓
Return { success: true, ... }
```

---

## Permissions Required

- User must be authenticated
- User must have `IsFrontendApp` permission
- Write operations logged per user

---

## Testing Commands

### Get available control nodes
```bash
curl -H "Authorization: Token YOUR_TOKEN" \
  "http://localhost:8000/api/opcua_nodes/?client_config__station_name=Main%20Pump"
```

### Write value to node
```bash
curl -X POST \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": 1, "command": "START"}' \
  "http://localhost:8000/api/opcua_node/42/write/"
```

---

## Browser DevTools Tips

### Check Write Request
```
DevTools → Network tab
Filter: /api/opcua_node/
Click write request → Payload tab
See: {"value": 1, "command": "START"}
```

### Check Write Response
```
DevTools → Network tab
Click write request → Response tab
See: {"success": true, "message": "✅ ...", ...}
```

### Console Logs
```
Filter: "opcua", "write", "Wrote value"
Shows detailed write operation info
Emoji prefixes for status (✅ 📤 ❌)
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Empty station dropdown | No OPC UA clients configured |
| Empty node dropdown | Station has no Boolean nodes |
| Toggle disabled | Station offline or no node selected |
| Write fails silently | Check network tab for error |
| Device doesn't change | Check node write permissions in OPC UA |
| Slow toggle response | Check network latency / OPC UA server |

---

## Component Structure

```
Control Page
├── Station Selection Card
│   ├── Select Dropdown
│   └── Status Badge
│
├── Control Node Selection Card (NEW)
│   ├── Node Dropdown
│   └── Selected Indicator
│
└── Control Panel Card
    ├── Power Icon
    ├── Toggle Switch
    └── ON/OFF Labels
```

---

## Environment Variables

None required! Uses existing API configuration.

---

## Dependencies

- **Frontend**: React, TypeScript, @radix-ui components
- **Backend**: Django REST Framework, rest_framework decorators
- **OPC UA**: write_data.py, opc_client.py

---

## Next Steps After Deployment

1. ✅ Test station dropdown loads
2. ✅ Test control nodes dropdown loads
3. ✅ Test write value 1 (ON)
4. ✅ Test write value 0 (OFF)
5. ✅ Verify OPC UA device responds
6. ✅ Check write logs in database
7. ✅ Test error scenarios
8. ✅ Monitor backend logs

---

## Support

- **Implementation Details**: CONTROL_NODE_SELECTION_IMPLEMENTATION.md
- **User Guide**: CONTROL_NODE_SELECTION_USER_GUIDE.md
- **Backend Logs**: `roams_backend/logs/`
- **API Explorer**: Django REST Framework browsable API

---

## Version Info

- **Feature**: Control Node Selection & Write Operations
- **Status**: ✅ Complete
- **API Version**: v1
- **Python**: 3.8+
- **Django**: 3.2+
- **React**: 18+

---

*Quick reference for developers and operators*
*For detailed information, see full implementation documentation*
