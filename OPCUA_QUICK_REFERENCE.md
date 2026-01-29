# OPC UA Node Display Configuration - Quick Reference

## 📊 Display Type Selection Matrix

Choose the right display type based on your data:

```
┌─────────────────────────────────────────────────────────────────┐
│                    DISPLAY TYPE GUIDE                           │
├──────────────────────┬──────────┬──────────────────┬────────────┤
│ Display Type         │ Data Type│ Best For         │ Example    │
├──────────────────────┼──────────┼──────────────────┼────────────┤
│ 📊 Numeric           │ Any      │ Simple values    │ 23.5°C     │
│                      │          │ Counters         │ 1234 kWh   │
├──────────────────────┼──────────┼──────────────────┼────────────┤
│ 🎯 Gauge (Linear)    │ Float    │ Measurements     │ 45 bar ▓▓░ │
│                      │ Int      │ Pressures        │ 250V ▓░░░░ │
├──────────────────────┼──────────┼──────────────────┼────────────┤
│ 🎡 Gauge (Circular)  │ Float    │ Dashboards       │ Speedometer│
│                      │ Int      │ Analog displays  │ RPM dial   │
├──────────────────────┼──────────┼──────────────────┼────────────┤
│ 📈 Progress          │ Float    │ Tank levels      │ 75% ████░░ │
│                      │ Int      │ Fill percentage  │ Battery    │
├──────────────────────┼──────────┼──────────────────┼────────────┤
│ 🔘 Switch            │ Boolean  │ Controls         │ ON / OFF   │
│ (is_boolean_control) │          │ Toggle states    │ Pump: ON   │
├──────────────────────┼──────────┼──────────────────┼────────────┤
│ 🟢 Status Indicator  │ Boolean  │ Status lights    │ 🟢 Online  │
│                      │          │ Alarms           │ 🔴 Fault   │
├──────────────────────┼──────────┼──────────────────┼────────────┤
│ 📉 Chart             │ Float    │ Time series      │ [sparkline]│
│                      │ Int      │ Trends           │ Graph      │
└──────────────────────┴──────────┴──────────────────┴────────────┘
```

## 🎨 Icon Categories

| Icon | Category | Best For |
|------|----------|----------|
| `zap` ⚡ | Power | Voltage, Current, Power consumption |
| `droplet` 💧 | Flow/Liquid | Water flow, pressure, level |
| `gauge` 📏 | Pressure/Level | Pressure readings, tank levels |
| `thermometer` 🌡️ | Temperature | Temperature sensors |
| `battery` 🔋 | Battery/UPS | Battery status, backup power |
| `wind` 💨 | Air Flow | Ventilation, air flow |
| `settings` ⚙️ | Status/Config | General status, settings |
| `alert` ⚠️ | Alert/Fault | Fault indicators, warnings |
| `check-circle` ✓ | OK/Operational | All systems go |
| `x-circle` ✗ | Fault | System fault |

## ⚡ Common Node Configurations

### VOLTAGE
```
data_type: Float
display_type: gauge
decimal_places: 2
display_min: 0
display_max: 500
icon: zap
warning_level: 190
critical_level: 180
```

### CURRENT
```
data_type: Float
display_type: gauge
decimal_places: 2
display_min: 0
display_max: 100
icon: zap
```

### TEMPERATURE
```
data_type: Float
display_type: gauge-circular
decimal_places: 1
display_min: -20
display_max: 100
icon: thermometer
warning_level: 80
critical_level: 95
```

### WATER LEVEL
```
data_type: UInt16
display_type: gauge-circular
decimal_places: 0
display_min: 0
display_max: 100
icon: droplet
warning_level: 25
critical_level: 10
```

### PUMP (Writable Boolean)
```
data_type: Boolean
display_type: switch
icon: settings
is_boolean_control: True  ← KEY: Makes it clickable!
```

### POWER STATUS (Read-only Boolean)
```
data_type: Boolean
display_type: status-indicator
icon: zap
is_boolean_control: False  ← Read-only indicator
```

### FLOW RATE
```
data_type: Float
display_type: progress
decimal_places: 2
display_min: 0
display_max: 150
icon: droplet
```

### ENERGY COUNTER
```
data_type: Float
display_type: numeric
decimal_places: 3
icon: zap
```

## 🔧 Configuration Checklists

### For Monitoring Nodes (Read-Only)
- [ ] Set `data_type` to actual OPC UA type
- [ ] Choose `display_type` (gauge, numeric, etc.)
- [ ] Set `decimal_places` (usually 1-3)
- [ ] Set `display_min` and `display_max` for gauges
- [ ] Add `icon` for visual grouping
- [ ] Set warning/critical thresholds
- [ ] Leave `is_boolean_control = False`

### For Control Nodes (Write-Enabled Boolean)
- [ ] Set `data_type = Boolean`
- [ ] Set `display_type = switch`
- [ ] Set `is_boolean_control = True` ← IMPORTANT!
- [ ] Set `icon` (e.g., settings, zap, droplet)
- [ ] Leave `display_min/max` empty

### For Status Indicators (Read-Only Boolean)
- [ ] Set `data_type = Boolean`
- [ ] Set `display_type = status-indicator`
- [ ] Set `icon` for meaning (alert, battery, zap, etc.)
- [ ] Leave `is_boolean_control = False`

## 🧮 Decimal Places Guide

```
decimal_places: 0    → 45    (whole number)
decimal_places: 1    → 45.2  (one decimal)
decimal_places: 2    → 45.23 (two decimals)
decimal_places: 3    → 45.234 (three decimals)
```

**Recommendations:**
- Voltage/Current: 2-3
- Temperature: 1-2
- Pressure: 1-2
- Flow rate: 2-3
- Level/Tank: 0-1
- Energy: 2-3
- Boolean: 0 (not used)

## 📈 Display Range Guide

**For Gauges:** Set realistic operational range
```
Voltage: min=0, max=500
Pressure: min=0, max=10
Temperature: min=-20, max=100
```

**Auto-Scaling:** Leave blank to auto-scale based on data
```
display_min: null
display_max: null
→ UI will scale to min/max of incoming values
```

**Don't confuse with:**
- `min_value`/`max_value` = Operational limits
- `display_min`/`display_max` = Display scaling

## 🚨 Threshold Configuration

```
warning_level: 190
critical_level: 180

80                    normal (green)
                      ↑
                      warning threshold
                      ↓
190
                      ↑
                      critical threshold
                      ↓
180                   critical (red)
```

**Order matters:**
- If value ≥ warning_level → Yellow ⚠️
- If value ≥ critical_level → Red 🔴
- Otherwise → Green ✓

## 💡 API Response Example

```json
{
  "id": 1,
  "node_id": "ns=2;i=3856758799",
  "tag_name": "VOLTAGE",
  "tag_name_str": "VOLTAGE",
  "tag_units": "V",
  "data_type": "Float",
  "display_type": "gauge",
  "decimal_places": 2,
  "display_min": 0,
  "display_max": 500,
  "icon": "zap",
  "is_boolean_control": false,
  "last_value": "230.45",
  "last_updated": "2025-12-29T10:30:00Z",
  "warning_level": 190,
  "critical_level": 180
}
```

## 🔄 Bulk Update Pattern

For multiple similar nodes:

```python
# Update all voltage nodes to use gauge display
OPCUANode.objects.filter(
    tag_name__name__icontains='voltage'
).update(
    display_type='gauge',
    decimal_places=2,
    display_min=0,
    display_max=500,
    icon='zap'
)

# Update all pump nodes to be writable
OPCUANode.objects.filter(
    tag_name__name__icontains='pump'
).update(
    display_type='switch',
    is_boolean_control=True,
    icon='settings'
)
```

## ✅ Validation Rules

| Field | Rule | Example |
|-------|------|---------|
| `data_type` | Must be in choices | Float, Boolean |
| `display_type` | Must be in choices | gauge, switch |
| `decimal_places` | 0-5 recommended | 2 |
| `display_min` | Optional, null allowed | null |
| `display_max` | > display_min if both set | 500 |
| `icon` | Must be in choices | zap, droplet |
| `is_boolean_control` | Boolean (T/F) | True |

---

**💬 Questions?** See `NODE_UI_DISPLAY_GUIDE.md` for detailed documentation
