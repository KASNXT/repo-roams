# Boolean Tags Quick Start 🚀

Everything is now implemented and integrated. Here's how to get running:

## ✅ What's Done

| Component | Location | Status |
|-----------|----------|--------|
| Display Hook | `src/hooks/useBooleanTag.ts` | ✅ Created |
| Control Hook | `src/hooks/useBooleanControl.ts` | ✅ Created |
| Status Grid | `src/components/BooleanStatusGrid.tsx` | ✅ Created |
| Remote Control | `src/components/RemoteControl.tsx` | ✅ Created |
| History Component | `src/components/BooleanControlHistory.tsx` | ✅ Created |
| Stats Component | `src/components/BooleanControlStats.tsx` | ✅ Created |
| Dashboard Integration | `src/pages/Overview.tsx` | ✅ Integrated |
| Controls Page | `src/pages/ControlsPage.tsx` | ✅ Integrated |
| Analysis Page | `src/pages/Analysis.tsx` | ✅ Integrated |

---

## 🎯 Quick View

### Dashboard Now Shows
```
┌─────────────────────────────────────┐
│  ROAMS - Overview                   │
├─────────────────────────────────────┤
│  System Status Cards (existing)      │
│                                     │
│  ┌─────────────┐ ┌─────────────┐   │
│  │ 🚰 Pump 1   │ │ 🚰 Pump 2   │   │
│  │   ✓ ON      │ │   ✗ OFF     │   │
│  │ 12:30 PM    │ │ 12:25 PM    │   │
│  └─────────────┘ └─────────────┘   │
│  ┌─────────────┐ ┌─────────────┐   │
│  │ 🚪 Valve    │ │ 🚨 E-Stop   │   │
│  │   ✓ ON      │ │   ✗ OFF     │   │
│  │ 12:30 PM    │ │ 12:30 PM    │   │
│  └─────────────┘ └─────────────┘   │
│                                     │
│  Station Map (existing)             │
│  Uptime Trends (existing)           │
└─────────────────────────────────────┘
```

### Controls Page Now Shows
```
┌──────────────────────────────────┐
│  Plant Controls                  │
├──────────────────────────────────┤
│  Boolean Controls (Start/Stop)   │
│                                  │
│  ┌──────────────────┐            │
│  │ 🚰 Pump 01       │            │
│  │ Primary pump     │            │
│  │ ● RUNNING        │            │
│  │ ┌──────┬──────┐  │            │
│  │ │Start │ Stop │  │            │
│  │ └──────┴──────┘  │            │
│  └──────────────────┘            │
│                                  │
│  (More controls below...)        │
└──────────────────────────────────┘
```

### Analysis Page Now Shows
```
┌──────────────────────────────────┐
│  Performance Analysis            │
├──────────────────────────────────┤
│  Control System Analytics        │
│  ┌────────┬────────┬────────┐    │
│  │150 Ops │ 120.5h │95.5%   │    │
│  └────────┴────────┴────────┘    │
│                                  │
│  Control History                 │
│  ✓ → ✗ Jan 8, 12:00 (3600s)     │
│  ✗ → ✓ Jan 8, 11:00 (1800s)     │
│                                  │
│  (Telemetry & Alarms below...)   │
└──────────────────────────────────┘
```

---

## 🔧 3-Step Setup

### Step 1: Update Tag Names
Edit the tag names to match your backend. These are **REQUIRED**:

**File: `src/pages/Overview.tsx` (around line 145)**
```tsx
<BooleanStatusGrid
  items={[
    {
      id: '1',
      tagName: 'pump_01_status',    // ← Change these to your tags
      label: 'Pump 1',
      icon: '🚰',
      description: 'Primary pump',
    },
    // ... more items
  ]}
/>
```

**File: `src/pages/ControlsPage.tsx` (around line 180)**
```tsx
<RemoteControl
  commandTag="pump_01_command"       // ← Change to your tag
  statusTag="pump_01_status"         // ← Change to your tag
  label="Pump 01 - Primary"
  icon="🚰"
  description="Main water pump"
  requiresConfirmation={true}
/>
```

**File: `src/pages/Analysis.tsx` (around line 330)**
```tsx
<BooleanControlStats tagName="pump_01_status" />  // ← Change tag
<BooleanControlHistory tagName="pump_01_command" limit={30} />  // ← Change tag
<BooleanControlHistory tagName="valve_01_command" limit={30} />  // ← Change tag
```

### Step 2: Test the Frontend
Run your frontend dev server:
```bash
cd roams_frontend
npm run dev
```

Visit:
- Dashboard: http://localhost:5173/
- Controls: http://localhost:5173/controls
- Analysis: http://localhost:5173/analysis

✅ You should see status cards with ON/OFF indicators

### Step 3: Verify Backend Endpoints
Test that your backend provides these endpoints:

```bash
# Read current value
curl http://localhost:8000/api/tags/pump_01_status/

# Write new value (requires auth token)
curl -X POST http://localhost:8000/api/tags/pump_01_command/write/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": true, "reason": "Test", "timestamp": "2026-01-08T12:00:00Z"}'

# Get history
curl http://localhost:8000/api/tags/pump_01_command/history/

# Get stats
curl http://localhost:8000/api/tags/pump_01_status/stats/
```

---

## 📊 API Contract (Backend Required)

Your backend **MUST** provide these endpoints:

### 1️⃣ Get Current Value
```
GET /api/tags/{tag_name}/
```
**Response:**
```json
{
  "value": true,
  "timestamp": "2026-01-08T12:00:00Z",
  "quality": "GOOD",
  "status": "SYNCED"
}
```

### 2️⃣ Write New Value
```
POST /api/tags/{tag_name}/write/
```
**Request:**
```json
{
  "value": true,
  "reason": "User control action",
  "timestamp": "2026-01-08T12:00:00Z"
}
```
**Response:**
```json
{
  "success": true,
  "value": true,
  "written_at": "2026-01-08T12:00:00Z"
}
```

### 3️⃣ Get History
```
GET /api/tags/{tag_name}/history/?limit=30
```
**Response:**
```json
[
  {
    "id": 1,
    "timestamp": "2026-01-08T12:00:00Z",
    "from_value": false,
    "to_value": true,
    "duration_seconds": 3600,
    "triggered_by": "user_123",
    "reason": "Scheduled start"
  }
]
```

### 4️⃣ Get Statistics
```
GET /api/tags/{tag_name}/stats/
```
**Response:**
```json
{
  "total_operations": 150,
  "total_runtime": 432000,
  "average_runtime": 2880,
  "last_operation": "2026-01-08T12:00:00Z",
  "uptime_percentage": 95.5
}
```

---

## ⚡ Quick Customization

### Change Polling Interval
Default is 2 seconds. To change:

```tsx
// In any component using useBooleanTag
const { data, loading } = useBooleanTag(
  'pump_01_status',
  5000  // ← 5 seconds instead of 2
);
```

### Make Confirmation Optional
```tsx
<RemoteControl
  commandTag="pump_01_command"
  statusTag="pump_01_status"
  label="Pump 01"
  requiresConfirmation={false}  // ← Skip confirmation dialog
/>
```

### Mark as Critical (Red Warning)
```tsx
<RemoteControl
  commandTag="emergency_stop_command"
  statusTag="emergency_stop_status"
  label="Emergency Stop"
  isCritical={true}  // ← Shows orange warning and "CRITICAL OPERATION"
/>
```

### Change Icons/Labels
```tsx
{
  id: '1',
  tagName: 'your_tag',
  label: 'Custom Label',      // ← Custom display name
  icon: '⚡',                 // ← Any emoji you want
  description: 'My control',  // ← Optional description
}
```

---

## 🧪 Testing Checklist

### [ ] Display Works
- [ ] Navigate to Dashboard
- [ ] See status cards appear
- [ ] Cards show green (ON) or red (OFF) borders
- [ ] Timestamps update every 2-5 seconds
- [ ] No errors in browser console

### [ ] Control Works
- [ ] Navigate to Controls page
- [ ] Click "Start" button
- [ ] Confirmation dialog appears
- [ ] Click confirm
- [ ] Toast shows success/error
- [ ] Status updates after write

### [ ] History Works
- [ ] Navigate to Analysis page
- [ ] See control statistics (uptime %, operations count)
- [ ] See history timeline with past changes
- [ ] Each entry shows state transition with timestamp

### [ ] Error Handling
- [ ] Disconnect backend
- [ ] Try to write value
- [ ] See error message in toast
- [ ] No app crash

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "No controls shown on dashboard" | Check that tag names match backend exactly |
| "Click button but nothing happens" | Check browser console for API errors |
| "Data shows but won't write" | Verify POST endpoint exists, check auth token |
| "Confirmation dialog doesn't appear" | Check requiresConfirmation={true} in code |
| "Timestamps are wrong" | Verify backend returns ISO 8601 format |
| "App crashes when loading" | Check that API response matches schema |

---

## 📖 Documentation Files

- `BOOLEAN_TAGS_IMPLEMENTATION_COMPLETE.md` - Full implementation details
- `BOOLEAN_TAGS_DISPLAY_CONTROL_GUIDE.md` - Design patterns & best practices
- `BOOLEAN_TAGS_IMPLEMENTATION_EXAMPLES.md` - Code examples

---

## 🎉 You're Ready!

Everything is wired up and ready to test. The only things you need:

1. ✅ Update tag names (3 files)
2. ✅ Implement 4 backend endpoints
3. ✅ Test in browser

**Happy controlling!** 🚀

