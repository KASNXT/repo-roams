# Control Node Selection - User Guide 📋

## Feature Overview

The Control page now supports **per-station node selection and write operations**, enabling you to:
- ✅ Select specific OPC UA control nodes for each station
- ✅ Send ON/OFF commands (write values 1/0) to selected nodes
- ✅ Track all write operations in the database
- ✅ Receive real-time feedback on write success/failure

---

## Step-by-Step Usage

### Step 1: Navigate to Control Page
```
Sidebar → Pump House (Control Page)
```
You'll see the control interface with Station Selection.

### Step 2: Select a Station
```
Station Selection Card
├─ Dropdown: "Select Station"
└─ Choose from available OPC UA stations
   • Main Pump Station (Online) ✓
   • Backup Pump Station (Offline)
   • Remote Monitoring Station (Online) ✓
```

**What happens:**
- Station status shows connection state
- Running badge updates when toggled
- Control nodes automatically load

### Step 3: Wait for Control Nodes to Load
```
Control Node Selection Card (appears after station selected)
├─ Label: "Select Control Nodes"
├─ Dropdown: "Available Control Nodes"
└─ Status: Loading... ⏳

Once loaded:
├─ Pump Start Signal (ns=2;i=12345)
├─ Pump Stop Signal (ns=2;i=12346)
├─ Emergency Stop (ns=2;i=12347)
└─ Water Pressure Control (ns=2;i=12348)
```

**Auto-selection:**
- First available node is automatically selected
- Shows green checkmark "✓ Node Selected"

### Step 4: Select a Control Node
```
Click on dropdown → Choose node to control
Example: "Pump Start Signal (ns=2;i=12345)"
```

You'll see:
```
✓ Node Selected
Ready to control
```

### Step 5: Toggle ON/OFF
```
Control Panel Card
├─ Station Operation
├─ Icon: Power symbol
├─ Toggle Switch: [OFF] ⭕ [ON]
└─ Status: Off/On

Click toggle → Select ON
```

**What happens:**
1. Toggle switches to ON position
2. Spinner shows during write operation
3. Success notification appears:
   ```
   ✅ Pump Start Signal turned ON
   ```
4. Backend writes value 1 to OPC UA node
5. Device/pump receives command and activates

### Step 6: Toggle OFF
```
Click toggle → Select OFF
```

**What happens:**
1. Toggle switches to OFF position
2. Spinner shows during write operation
3. Success notification appears:
   ```
   ✅ Pump Start Signal turned OFF
   ```
4. Backend writes value 0 to OPC UA node
5. Device/pump receives command and deactivates

---

## Error Scenarios & Solutions

### Error 1: "Please select a station first"
```
Cause: Toggle pressed without selecting station
Solution: 
  1. Click "Select Station" dropdown
  2. Choose a station from the list
  3. Wait for control nodes to load
  4. Select a control node
  5. Try toggle again
```

### Error 2: "Please select a control node to operate"
```
Cause: Toggle pressed without selecting node
Solution:
  1. Wait for "Control Node Selection" card to appear
  2. Click "Available Control Nodes" dropdown
  3. Choose a node from the list
  4. Verify green "✓ Node Selected" appears
  5. Try toggle again
```

### Error 3: "No active client for [Station Name]"
```
Cause: OPC UA connection to station is offline
Solution:
  1. Check station connection in Station Selection
  2. Look for status badge: "Online" vs "Offline"
  3. If offline, wait for station to reconnect
  4. Toggle will be disabled until station is online
  5. Check OPC UA server logs for connection issues
```

### Error 4: "Failed to control node: [Technical Error]"
```
Cause: Network error, timeout, or permission issue
Solution:
  1. Check your internet connection
  2. Verify OPC UA server is running and accessible
  3. Wait 10 seconds and try again
  4. Check Django backend logs: 
     tail -f /var/log/roams_api.log
  5. Verify node write permissions in OPC UA server
```

### Error 5: Station Selection Dropdown Empty
```
Cause: No OPC UA stations configured in database
Solution:
  1. Configure at least one OPC UA client
  2. Connection: Settings → OPC UA Configuration
  3. Add new station with URL and credentials
  4. Test connection
  5. Refresh page (F5)
```

### Error 6: Control Nodes Dropdown Empty
```
Cause: Station has no Boolean-type nodes defined
Solution:
  1. Add control nodes in OPC UA node configuration
  2. Node must have data_type = "Boolean"
  3. Or set is_control = true flag
  4. Nodes load automatically after configuration
  5. Test: Select station again to reload nodes
```

---

## Data Written to OPC UA

### Write Operation Payload

**Endpoint:** `POST /api/opcua_node/{node_id}/write/`

**Request Body:**
```json
{
  "value": 1,              // or 0
  "command": "START"       // or "STOP"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "✅ Wrote value 1 to Pump Start Signal",
  "node_id": "ns=2;i=12345",
  "value": 1,
  "timestamp": "2024-01-15T14:30:45.123456Z"
}
```

### Backend Processing
```
1. Frontend sends POST with value (0 or 1)
2. Backend validates:
   ✓ Node exists
   ✓ Station has active OPC UA client
   ✓ User has permission
3. Backend executes:
   - Calls write_station_node(client, node, value, command)
   - Writes directly to OPC UA server
   - Creates OpcUaWriteLog record (audit trail)
   - Updates node.last_value and last_updated
4. Backend responds with success/error
5. Frontend shows toast notification
6. OPC UA device receives and executes command
```

---

## Write Operation Flow Diagram

```
┌─ User Interface ─────────────────────────────────────┐
│                                                       │
│  1. Select Station                                   │
│     Dropdown: "Main Pump Station"                    │
│           ↓                                           │
│  2. Auto-Load Control Nodes                          │
│     API GET: /api/opcua_nodes/                      │
│     Response: [node1, node2, node3]                 │
│           ↓                                           │
│  3. Select Control Node                              │
│     Dropdown: "Pump Start Signal"                    │
│           ↓                                           │
│  4. Toggle ON/OFF                                    │
│     Click power toggle button                        │
│           ↓                                           │
└───────────────────────────────────────────────────────┘
                      ↓
┌─ Backend ───────────────────────────────────────────┐
│                                                      │
│  API Endpoint: POST /api/opcua_node/{id}/write/    │
│  Body: {"value": 1, "command": "START"}            │
│           ↓                                          │
│  OPCUANodeViewSet.write()                           │
│  ├─ Get OPCUANode by ID                            │
│  ├─ Get OPC UA client for station                  │
│  ├─ Call write_station_node()                      │
│  ├─ Create OpcUaWriteLog record                    │
│  └─ Return success response                        │
│           ↓                                          │
└──────────────────────────────────────────────────────┘
                      ↓
┌─ OPC UA Server ─────────────────────────────────────┐
│                                                      │
│  Receive write: ns=2;i=12345 = 1                   │
│  ├─ Validate write permissions                     │
│  ├─ Update node value in memory                    │
│  └─ Execute device command                        │
│           ↓                                          │
│  Device (Pump/Motor) receives activation signal    │
│                                                      │
└──────────────────────────────────────────────────────┘
                      ↓
┌─ User Interface (Feedback) ────────────────────────┐
│                                                     │
│  Toast: "✅ Pump Start Signal turned ON"          │
│  Toggle: Switches to ON position                  │
│  Node Badge: Shows "Node Selected - Ready"        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Write Operation Log

All write operations are recorded in the database for audit purposes.

### Access Write Logs
```
Django Admin → OPC UA Write Logs
Shows:
  • Timestamp of write
  • Station name
  • Node ID and tag name
  • Value written (0 or 1)
  • Command label (START/STOP)
  • User who triggered write
```

### Example Log Entry
```
OPC UA Write Log Entry
├─ ID: 12345
├─ Timestamp: 2024-01-15 14:30:45.123456 UTC
├─ Station: Main Pump Station
├─ Node: ns=2;i=12345 (Pump Start Signal)
├─ Value: 1
├─ Command: START
└─ User: john_operator
```

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Focus Station Dropdown | `Alt + S` |
| Focus Node Dropdown | `Alt + N` |
| Toggle ON/OFF | `Space` (when focused on toggle) |

---

## Tips & Best Practices

### ✅ DO:
- **Select node before toggling**: Ensure green checkmark shows
- **Check station status**: Only write when station shows "Online"
- **Use descriptive node names**: Makes it clear what you're controlling
- **Monitor write logs**: Track all operations in audit trail
- **Test with one node first**: Verify write works before operating multiple

### ❌ DON'T:
- Don't click toggle rapidly: Wait for spinner to complete
- Don't write to offline stations: Wait for "Online" status
- Don't forget to monitor device: Ensure device responds to commands
- Don't ignore error messages: They indicate real issues
- Don't change stations mid-operation: Complete write before switching

---

## Troubleshooting

### Device Not Responding to Write
```
1. Check OPC UA node ID is correct
   → Verify in node dropdown
2. Check node write permissions
   → Admin check: OPC UA server security settings
3. Check node data type matches
   → Should be Boolean for ON/OFF
4. Check OPC UA subscription is active
   → From previous keep-alive implementation
5. Check OPC UA client connection
   → Ensure "Online" status in station dropdown
6. Check backend logs
   → tail -f django_logs.txt
   → Look for write operation details
```

### Slow Response on Toggle
```
1. Check network latency
   → Browser DevTools → Network tab
2. Check OPC UA server performance
   → Monitor CPU/memory on OPC UA server
3. Check Django server load
   → Check CPU/memory on Django server
4. Increase timeout in frontend (if needed)
   → Modify API call timeout in control.tsx
5. Check keep-alive subscription interval
   → From previous implementation (should be 15s)
```

### Write Succeeds But Device Doesn't Change
```
1. Verify you selected correct node
   → Check node_id in success message
2. Verify write value reaches device
   → Read node value back after write
3. Check device input handling
   → Some devices need time to process
   → Some require additional configuration
4. Check device status/error logs
   → Device may be in error state
5. Verify OPC UA node permissions
   → Node may be read-only by mistake
```

---

## Support Resources

- **API Documentation**: /CONTROL_NODE_SELECTION_IMPLEMENTATION.md
- **OPC UA Configuration**: /FRONTEND_URL_CONFIGURATION_GUIDE.md
- **Keep-Alive Fixes**: /OPCUA_KEEPALIVE_IMPLEMENTATION_COMPLETE.md
- **Backend Issues**: Check Django logs in roams_backend/
- **OPC UA Issues**: Check OPC UA server logs

---

## Summary

**Control Node Selection provides:**
1. ✅ Simple UI for selecting which device to control
2. ✅ Automatic loading of available control nodes
3. ✅ One-click ON/OFF switching with write operations
4. ✅ Real-time feedback on success/failure
5. ✅ Full audit trail of all operations
6. ✅ Error handling and validation

**Write Operation Data:**
- Value: 1 (ON) or 0 (OFF)
- Command: "START" or "STOP"
- Target: OPC UA node on server
- Logging: Recorded in OpcUaWriteLog table
- Permissions: Follows Django user permissions

**Integration with Previous Work:**
- Uses OPC UA client from keep-alive implementation
- Leverages write_data.py for low-level operations
- Maintains node state in database
- Follows REST API patterns

---

*Last Updated: January 2024*
*Feature Version: 1.0*
*Status: Production Ready ✅*
