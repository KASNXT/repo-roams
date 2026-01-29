# OPC UA Node UI Display Configuration Guide

## Overview
Your `OPCUANode` model has been enhanced with comprehensive UI display capabilities, allowing you to control how each node appears in your frontend dashboards.

## New Fields

### 1. **Data Type** (`data_type`)
Specifies the OPC UA data type for proper handling and display.

**Options:**
- `Float` - 32-bit floating point
- `Double` - 64-bit floating point  
- `Int16` - Signed 16-bit integer
- `UInt16` - Unsigned 16-bit integer
- `Int32` - Signed 32-bit integer
- `UInt32` - Unsigned 32-bit integer
- `Boolean` - True/False values
- `String` - Text values

**Use Case:** Determines validation rules, rounding, and data formatting.

### 2. **Display Type** (`display_type`)
Controls how the node is rendered in the UI.

| Display Type | Best For | Example |
|---|---|---|
| **numeric** | Simple numeric values | Temperature: 23.5°C |
| **gauge** | Linear gauge display | Pressure: ▓▓▓▓░░░░░ 45 bar |
| **gauge-circular** | Circular gauge | Speed: Circular meter |
| **progress** | Progress bar | Tank Level: ▓▓▓▓▓░░░░ 55% |
| **switch** | Toggle on/off | Pump: ON/OFF |
| **status-indicator** | Simple indicator | Power: 🟢 Online |
| **chart** | Mini time series | Energy: Graph |

### 3. **Decimal Places** (`decimal_places`)
How many decimal places to display.

**Examples:**
- `0` - Show as integer: `45`
- `1` - One decimal: `45.2`
- `2` - Two decimals: `45.23`
- `3` - Three decimals: `45.234`

### 4. **Display Range** (`display_min`, `display_max`)
Sets the min/max scale for gauges and charts.

**Leave blank for auto-scaling** - The UI will automatically scale based on incoming data.

**Example:**
```
Voltage node:
  display_min: 0
  display_max: 500
  → Gauge shows 0-500V scale
```

### 5. **Icon/Category** (`icon`)
Provides visual grouping and category indication.

| Icon | Category | Best For |
|---|---|---|
| `zap` | ⚡ Power | Voltage, Current, Power |
| `droplet` | 💧 Flow/Liquid | Water, Flow rate, Level |
| `gauge` | 📏 Pressure/Level | Pressure, Tank level |
| `thermometer` | 🌡️ Temperature | Temperature sensors |
| `battery` | 🔋 Battery | Battery status, UPS |
| `wind` | 💨 Air Flow | Air flow, ventilation |
| `settings` | ⚙️ Status | General status |
| `alert` | ⚠️ Alert | Fault indicators |
| `check-circle` | ✓ Operational | Operational status |
| `x-circle` | ✗ Fault | Fault status |

### 6. **Boolean Control** (`is_boolean_control`)
When enabled, boolean nodes become interactive switches instead of read-only indicators.

**Example:**
```
Pump Running (Boolean):
  is_boolean_control: True
  → Renders as clickable toggle switch
  
Power Status (Boolean):
  is_boolean_control: False
  → Renders as read-only indicator 🟢
```

## Configuration Examples

### Example 1: Voltage Meter (Monitoring)
```
Name: VOLTAGE
Node ID: ns=2;i=3856758799
Data Type: Float
Display Type: gauge
Units: V
Decimal Places: 2
Display Min: 0
Display Max: 500
Min Value: 90
Max Value: 270
Warning Level: 190
Critical Level: 180
Icon: zap
Is Boolean Control: False
```

**Result in UI:** Linear gauge showing 0-500V range with warning/critical zones

---

### Example 2: Well Level (Monitoring)
```
Name: Well Levels
Node ID: ns=2;i=670629055
Data Type: UInt16
Display Type: gauge-circular
Units: m
Decimal Places: 1
Display Min: 0
Display Max: 100
Warning Level: 25
Critical Level: 10
Icon: droplet
Is Boolean Control: False
```

**Result in UI:** Circular gauge with droplet icon, shows depth in meters

---

### Example 3: Pump Toggle (Control)
```
Name: Pump Running
Node ID: ns=2;i=1191188298
Data Type: Boolean
Display Type: switch
Units: (empty)
Icon: settings
Is Boolean Control: True
```

**Result in UI:** Clickable toggle switch - click to turn pump on/off

---

### Example 4: Power Status (Indicator)
```
Name: Power Status
Node ID: ns=2;i=3323654524
Data Type: Boolean
Display Type: status-indicator
Units: (empty)
Icon: zap
Is Boolean Control: False
```

**Result in UI:** Non-clickable indicator showing 🟢 Online or 🔴 Offline

---

### Example 5: Flow Rate (Progress)
```
Name: Flow Rate
Node ID: ns=2;i=3824145987
Data Type: Float
Display Type: progress
Units: m³/h
Decimal Places: 2
Display Min: 0
Display Max: 150
Warning Level: 140
Critical Level: 150
Icon: droplet
Is Boolean Control: False
```

**Result in UI:** Progress bar showing 0-150 m³/h with color warning zones

---

## Django Admin Usage

### Quick Setup
1. Go to **OPC UA Nodes** section in Django Admin
2. Click **Add OPC UA Node**
3. Fill in the enhanced fields:
   - **Data Type & Display** section: Configure display_type, data_type, decimal_places, icon
   - **Display Range** section: Set min/max for gauges (optional)
   - **Thresholds** section: Set warning/critical levels for alarms

### Filtering
Use the filter sidebar to find nodes by:
- `data_type` - All Float nodes, Boolean nodes, etc.
- `display_type` - All gauge displays, switches, etc.
- `is_boolean_control` - Only interactive boolean controls

### List View
The enhanced list shows:
- ✅ Data type with color coding
- ✅ Display type with emoji icons
- ✅ Quick access to edit

---

## Frontend Integration

### React Component Usage

```typescript
// Access display configuration in your React component
interface NodeWithDisplay {
  id: number;
  tag_name: string;
  last_value: number;
  data_type: string;
  display_type: string;
  decimal_places: number;
  display_min?: number;
  display_max?: number;
  icon?: string;
  is_boolean_control: boolean;
}

export const NodeDisplay = ({ node }: { node: NodeWithDisplay }) => {
  switch (node.display_type) {
    case 'gauge':
      return <LinearGauge 
        value={parseFloat(node.last_value)}
        min={node.display_min || 0}
        max={node.display_max || 100}
        decimals={node.decimal_places}
      />;
    
    case 'gauge-circular':
      return <CircularGauge value={parseFloat(node.last_value)} />;
    
    case 'switch':
      return <BooleanToggle 
        value={node.last_value === 'true'}
        isControl={node.is_boolean_control}
      />;
    
    case 'status-indicator':
      return <StatusIndicator 
        active={node.last_value === 'true'}
        icon={node.icon}
      />;
    
    case 'progress':
      return <ProgressBar 
        value={parseFloat(node.last_value)}
        max={node.display_max || 100}
      />;
    
    default:
      return <NumericDisplay 
        value={parseFloat(node.last_value)}
        decimals={node.decimal_places}
        units={node.tag_units}
      />;
  }
};
```

---

## Auto-Configuration Tips

### For Electrical Monitoring
- **Voltage**: gauge, display 0-500V, ⚡ zap icon
- **Current**: gauge, display 0-100A, ⚡ zap icon
- **Power**: gauge-circular, ⚡ zap icon
- **kWh**: numeric, ⚡ zap icon

### For Water/Fluid Systems
- **Pressure**: gauge, 📏 gauge icon
- **Flow Rate**: progress bar, 💧 droplet icon
- **Level**: gauge-circular, 💧 droplet icon
- **Volume**: numeric, 💧 droplet icon

### For Boolean Controls
- **Pump Running**: switch, ⚙️ settings icon, `is_boolean_control = True`
- **Power Status**: status-indicator, ⚡ zap icon, `is_boolean_control = False`
- **Door**: status-indicator, ⚠️ alert icon, `is_boolean_control = False`

---

## Performance Considerations

1. **Display Min/Max**: Set explicitly for best performance (avoids auto-scaling calculations)
2. **Decimal Places**: Keep to 2-3 for most values (reduces UI repaints)
3. **Icon**: Use standardized icons (emoji rendering is fast)
4. **Boolean Control**: Only enable for nodes that should be writable

---

## Troubleshooting

**Q: My gauge doesn't show the correct range?**  
A: Check `display_min` and `display_max` are set. Leave blank for auto-scaling.

**Q: Switch doesn't work?**  
A: Verify `is_boolean_control = True` and `data_type = Boolean`

**Q: Display type not showing in list?**  
A: Clear Django admin cache and refresh page

---

## Migration Info

**Migration:** `0013_add_ui_display_fields_to_opcuanode`

New database columns:
- `data_type` (CharField)
- `display_type` (CharField)
- `decimal_places` (IntegerField)
- `display_min` (FloatField, nullable)
- `display_max` (FloatField, nullable)
- `icon` (CharField, nullable)
- `is_boolean_control` (BooleanField)

All fields are backward compatible with existing nodes.

