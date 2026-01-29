# Boolean Tags Display & Control Guide

## Overview

Boolean tags (true/false values) represent critical control states in industrial systems:
- **Remote Start/Stop** (pump, valve, motor control)
- **Enable/Disable** (system states)
- **Alarm States** (triggered/cleared)
- **Mode Selection** (manual/auto)
- **Door/Gate Status** (open/closed)

This guide covers best practices for displaying and controlling boolean tags on your frontend dashboard.

---

## Part 1: Displaying Boolean Tags

### Visual Representation Options

#### Option 1: Status Indicator with Icon + Label (RECOMMENDED for Dashboard)

```tsx
// ✅ BEST FOR: Overview pages, monitoring
// Shows status at a glance with semantic colors

interface BooleanTagDisplayProps {
  value: boolean;
  label: string;
  tagName: string;
  lastUpdated?: Date;
}

export function BooleanTagDisplay({ value, label, tagName, lastUpdated }: BooleanTagDisplayProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
      {/* Status Indicator */}
      <div className={`w-4 h-4 rounded-full ${
        value 
          ? 'bg-green-500 shadow-lg shadow-green-500/50' 
          : 'bg-red-500 shadow-lg shadow-red-500/50'
      }`} />
      
      {/* Label and Status Text */}
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">
          {value ? '✓ ON' : '✗ OFF'}
        </p>
      </div>
      
      {/* Last Updated */}
      {lastUpdated && (
        <p className="text-xs text-muted-foreground">
          {new Date(lastUpdated).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

// Usage:
// <BooleanTagDisplay 
//   value={true} 
//   label="Pump Status" 
//   tagName="pump_01_running"
//   lastUpdated={new Date()}
// />
```

#### Option 2: Badge with Text (Compact)

```tsx
// ✅ BEST FOR: Lists, tables, compact spaces

interface BooleanBadgeProps {
  value: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function BooleanBadge({ value, label, size = 'md' }: BooleanBadgeProps) {
  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <span className={`
      rounded-full font-semibold ${sizes[size]}
      ${value
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      }
    `}>
      {label || (value ? '✓ ON' : '✗ OFF')}
    </span>
  );
}

// Usage:
// <BooleanBadge value={true} label="Pump Running" />
// <BooleanBadge value={false} label="Valve Closed" size="sm" />
```

#### Option 3: Status Card (For Dashboard Tiles)

```tsx
// ✅ BEST FOR: Dashboard overview cards

interface BooleanStatusCardProps {
  title: string;
  value: boolean;
  icon: React.ReactNode;
  description?: string;
  onClick?: () => void;
}

export function BooleanStatusCard({ 
  title, 
  value, 
  icon, 
  description,
  onClick 
}: BooleanStatusCardProps) {
  return (
    <Card 
      className={`cursor-pointer transition-all ${
        value 
          ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20'
          : 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20'
      }`}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className={`text-2xl ${value ? 'text-green-600' : 'text-red-600'}`}>
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            value ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <p className="font-semibold">{value ? 'ACTIVE' : 'INACTIVE'}</p>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Usage:
// <BooleanStatusCard 
//   title="Pump 01" 
//   value={true} 
//   icon="🚰"
//   description="Primary pump running"
// />
```

---

## Part 2: Reading Boolean Values

### Hook for Reading Boolean Tags

```typescript
// File: src/hooks/useBooleanTag.ts

import { useState, useEffect } from 'react';
import { useApi } from './useApi';

interface BooleanTagData {
  tag_name: string;
  value: boolean;
  timestamp: string;
  quality: 'good' | 'bad' | 'uncertain';
  status: string;
}

export function useBooleanTag(tagName: string) {
  const { api } = useApi();
  const [data, setData] = useState<BooleanTagData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTag = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/tags/${tagName}/`);
        setData(response.data);
        setError(null);
      } catch (err) {
        setError((err as any).message || 'Failed to fetch tag');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTag();

    // Auto-refresh every 2 seconds
    const interval = setInterval(fetchTag, 2000);
    return () => clearInterval(interval);
  }, [tagName, api]);

  return { data, loading, error };
}

// Usage:
// const { data, loading, error } = useBooleanTag('pump_01_running');
// if (data) console.log(data.value); // true or false
```

### In a Component

```tsx
import { useBooleanTag } from '@/hooks/useBooleanTag';

export function PumpStatus() {
  const { data, loading, error } = useBooleanTag('pump_01_running');

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div>
      <h3>Pump Status</h3>
      <p>Status: {data?.value ? 'Running' : 'Stopped'}</p>
      <p>Quality: {data?.quality}</p>
      <p>Last Updated: {new Date(data?.timestamp!).toLocaleTimeString()}</p>
    </div>
  );
}
```

---

## Part 3: Writing Boolean Values (Control)

### Safe Control Pattern

```typescript
// File: src/hooks/useBooleanControl.ts

import { useState } from 'react';
import { useApi } from './useApi';
import { toast } from 'sonner';

export function useBooleanControl(tagName: string) {
  const { api } = useApi();
  const [isWriting, setIsWriting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const writeValue = async (newValue: boolean, reason?: string) => {
    try {
      setIsWriting(true);
      setLastError(null);

      // Call backend to write tag
      const response = await api.post(`/tags/${tagName}/write/`, {
        value: newValue,
        reason: reason || 'User control action',
        timestamp: new Date().toISOString(),
      });

      toast.success(`${tagName} set to ${newValue}`);
      return response.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to write value';
      setLastError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setIsWriting(false);
    }
  };

  return {
    writeValue,
    isWriting,
    lastError,
  };
}

// Usage:
// const { writeValue, isWriting } = useBooleanControl('pump_01_command');
// await writeValue(true, 'Manual start by operator');
```

---

## Part 4: Remote Start/Stop Control

### Toggle Button with Confirmation

```tsx
// File: src/components/BooleanControl.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useBooleanTag } from '@/hooks/useBooleanTag';
import { useBooleanControl } from '@/hooks/useBooleanControl';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BooleanControlProps {
  tagName: string;
  readTag?: string; // If different from write tag
  label: string;
  icon?: string;
  requiresConfirmation?: boolean;
  dangerousAction?: boolean; // Shows warning for critical operations
}

export function BooleanControl({
  tagName,
  readTag,
  label,
  icon = '⚙️',
  requiresConfirmation = true,
  dangerousAction = false,
}: BooleanControlProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [targetValue, setTargetValue] = useState<boolean | null>(null);

  // Read current value
  const { data: tagData, loading: reading } = useBooleanTag(readTag || tagName);

  // Write new value
  const { writeValue, isWriting, lastError } = useBooleanControl(tagName);

  const handleToggle = async (newValue: boolean) => {
    if (requiresConfirmation) {
      setTargetValue(newValue);
      setShowConfirm(true);
    } else {
      await writeValue(newValue);
    }
  };

  const handleConfirm = async () => {
    if (targetValue !== null) {
      await writeValue(targetValue);
      setShowConfirm(false);
      setTargetValue(null);
    }
  };

  if (reading) return <div>Loading...</div>;

  const currentValue = tagData?.value ?? false;

  return (
    <>
      <div className={`flex items-center gap-3 p-4 rounded-lg border ${
        dangerousAction
          ? 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20'
          : 'border-slate-200 bg-slate-50 dark:border-slate-800'
      }`}>
        {/* Status Display */}
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-3 h-3 rounded-full ${
              currentValue ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <p className="text-lg font-semibold">
              {currentValue ? 'ON' : 'OFF'}
            </p>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={currentValue ? 'default' : 'outline'}
            onClick={() => handleToggle(true)}
            disabled={isWriting || currentValue}
            className={currentValue ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {isWriting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Start
          </Button>

          <Button
            size="sm"
            variant={!currentValue ? 'default' : 'outline'}
            onClick={() => handleToggle(false)}
            disabled={isWriting || !currentValue}
            className={!currentValue ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {isWriting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Stop
          </Button>
        </div>
      </div>

      {lastError && (
        <div className="mt-2 p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 rounded text-sm text-red-700 dark:text-red-400">
          {lastError}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            {dangerousAction && (
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span className="text-orange-600 font-semibold">⚠️ Critical Operation</span>
              </div>
            )}
            <AlertDialogTitle>Confirm {label}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {targetValue ? 'START' : 'STOP'} {label}?
              {dangerousAction && (
                <div className="mt-2 p-2 bg-orange-100 dark:bg-orange-900/20 rounded text-orange-700 dark:text-orange-400">
                  This is a critical control operation that will immediately affect the system.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={targetValue ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {targetValue ? 'Confirm Start' : 'Confirm Stop'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Usage:
// <BooleanControl 
//   tagName="pump_01_command"
//   readTag="pump_01_status"
//   label="Pump 01 - Start/Stop"
//   icon="🚰"
//   requiresConfirmation={true}
//   dangerousAction={false}
// />
```

### Simple Toggle Switch

```tsx
// File: src/components/BooleanToggleSwitch.tsx

import { Switch } from '@/components/ui/switch';
import { useBooleanTag } from '@/hooks/useBooleanTag';
import { useBooleanControl } from '@/hooks/useBooleanControl';
import { Label } from '@/components/ui/label';

interface BooleanToggleSwitchProps {
  tagName: string;
  readTag?: string;
  label: string;
}

export function BooleanToggleSwitch({
  tagName,
  readTag,
  label,
}: BooleanToggleSwitchProps) {
  const { data: tagData } = useBooleanTag(readTag || tagName);
  const { writeValue, isWriting } = useBooleanControl(tagName);

  const currentValue = tagData?.value ?? false;

  const handleChange = (checked: boolean) => {
    writeValue(checked);
  };

  return (
    <div className="flex items-center gap-3">
      <Label htmlFor={tagName}>{label}</Label>
      <Switch
        id={tagName}
        checked={currentValue}
        onCheckedChange={handleChange}
        disabled={isWriting}
      />
    </div>
  );
}

// Usage:
// <BooleanToggleSwitch 
//   tagName="pump_01_command"
//   label="Enable Pump"
// />
```

---

## Part 5: Dashboard Integration

### Complete Dashboard Example

```tsx
// File: src/pages/Dashboard.tsx

import { useBooleanTag } from '@/hooks/useBooleanTag';
import { BooleanControl } from '@/components/BooleanControl';
import { BooleanStatusCard } from '@/components/BooleanStatusCard';
import { BooleanDisplay } from '@/components/BooleanDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function Dashboard() {
  // Read pump status
  const pump1Status = useBooleanTag('pump_01_status');
  const pump2Status = useBooleanTag('pump_02_status');
  const valve1Status = useBooleanTag('valve_01_status');
  const emergencyStop = useBooleanTag('emergency_stop');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">System Dashboard</h1>
        <p className="text-muted-foreground">Monitor and control system components</p>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BooleanStatusCard
          title="Pump 1"
          value={pump1Status.data?.value ?? false}
          icon="🚰"
          description="Primary pump"
        />
        <BooleanStatusCard
          title="Pump 2"
          value={pump2Status.data?.value ?? false}
          icon="🚰"
          description="Secondary pump"
        />
        <BooleanStatusCard
          title="Valve 1"
          value={valve1Status.data?.value ?? false}
          icon="🚪"
          description="Main valve"
        />
        <BooleanStatusCard
          title="Emergency"
          value={emergencyStop.data?.value ?? false}
          icon="🚨"
          description="E-Stop status"
        />
      </div>

      {/* Controls Section */}
      <Card>
        <CardHeader>
          <CardTitle>System Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <BooleanControl
            tagName="pump_01_command"
            readTag="pump_01_status"
            label="Pump 1 - Start/Stop"
            requiresConfirmation={true}
            dangerousAction={false}
          />

          <BooleanControl
            tagName="pump_02_command"
            readTag="pump_02_status"
            label="Pump 2 - Start/Stop"
            requiresConfirmation={true}
            dangerousAction={false}
          />

          <BooleanControl
            tagName="valve_01_command"
            readTag="valve_01_status"
            label="Valve 1 - Open/Close"
            requiresConfirmation={true}
            dangerousAction={false}
          />
        </CardContent>
      </Card>

      {/* Analysis Section */}
      <Card>
        <CardHeader>
          <CardTitle>Status Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BooleanDisplay
            value={pump1Status.data?.value ?? false}
            label="Pump 1 Status"
            tagName="pump_01_status"
            lastUpdated={pump1Status.data?.timestamp ? new Date(pump1Status.data.timestamp) : undefined}
          />
          <BooleanDisplay
            value={pump2Status.data?.value ?? false}
            label="Pump 2 Status"
            tagName="pump_02_status"
            lastUpdated={pump2Status.data?.timestamp ? new Date(pump2Status.data.timestamp) : undefined}
          />
          <BooleanDisplay
            value={valve1Status.data?.value ?? false}
            label="Valve 1 Status"
            tagName="valve_01_status"
            lastUpdated={valve1Status.data?.timestamp ? new Date(valve1Status.data.timestamp) : undefined}
          />
          <BooleanDisplay
            value={emergencyStop.data?.value ?? false}
            label="Emergency Stop"
            tagName="emergency_stop"
            lastUpdated={emergencyStop.data?.timestamp ? new Date(emergencyStop.data.timestamp) : undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Part 6: Control Page Integration

### Adding Boolean Controls to ControlsPage

```tsx
// Extend the existing ControlsPage.tsx

const BooleanControlsSection = ({ controls }: { controls: ControlState[] }) => {
  const booleanControls = controls.filter(c => c.data_type === 'boolean');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {booleanControls.map(control => (
        <BooleanControl
          key={control.id}
          tagName={control.node_tag_name}
          label={control.description}
          requiresConfirmation={control.safety_critical}
          dangerousAction={control.safety_critical}
        />
      ))}
    </div>
  );
};

// In ControlsPage component:
// <BooleanControlsSection controls={filteredControls} />
```

---

## Part 7: Analysis Page Integration

### Showing Boolean History

```tsx
// File: src/components/BooleanHistory.tsx

import { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BooleanEvent {
  timestamp: string;
  from_value: boolean;
  to_value: boolean;
  duration_seconds: number;
  triggered_by: string;
}

export function BooleanHistory({ tagName }: { tagName: string }) {
  const { api } = useApi();
  const [history, setHistory] = useState<BooleanEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get(`/tags/${tagName}/history/`, {
          params: { limit: 50 }, // Last 50 events
        });
        setHistory(response.data);
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [tagName, api]);

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Control History: {tagName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {history.map((event, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-900"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {event.from_value ? '✓ ON' : '✗ OFF'} → {event.to_value ? '✓ ON' : '✗ OFF'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(event.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{event.duration_seconds}s</p>
                <p className="text-xs text-muted-foreground">{event.triggered_by}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Usage:
// <BooleanHistory tagName="pump_01_command" />
```

---

## Part 8: Best Practices Checklist

### Display Best Practices
- ✅ Use **colors consistently** (green = ON/active, red = OFF/inactive)
- ✅ **Always show last update time** for monitoring
- ✅ Use **semantic icons** (🚰 pump, 🚪 valve, 🚨 emergency)
- ✅ Display in **multiple formats** (status cards, badges, details)
- ✅ **Real-time updates** with auto-refresh every 2-5 seconds

### Control Best Practices
- ✅ **Require confirmation** for critical operations
- ✅ **Show loading state** while writing
- ✅ **Display error messages** if write fails
- ✅ **Log all control actions** with timestamp and user
- ✅ **Disable buttons** if already in target state
- ✅ **Use separate read/write tags** when possible
- ✅ **Add cool-down period** to prevent rapid toggles
- ✅ **Show last updated** status after successful write

### Security Best Practices
- ✅ **Validate user permissions** before allowing writes
- ✅ **Check tag is writable** before showing control UI
- ✅ **Log all control actions** for audit trail
- ✅ **Implement role-based access** (admin can control, read-only can view)
- ✅ **Add rate limiting** to prevent control spam
- ✅ **Show warning dialogs** for dangerous operations
- ✅ **Implement write timeouts** (e.g., auto-stop if no refresh)

---

## Part 9: Backend Endpoint Requirements

### Required API Endpoints

```
GET /tags/{tag_name}/                    - Get tag current value
GET /tags/{tag_name}/history/            - Get tag change history
POST /tags/{tag_name}/write/             - Write new value
GET /control-states/                     - List all controls
POST /control-states/{id}/execute/       - Execute control
```

### Example Requests

```javascript
// Read tag value
GET /api/tags/pump_01_status/
Response: {
  "tag_name": "pump_01_status",
  "value": true,
  "timestamp": "2024-01-07T15:30:45Z",
  "quality": "good",
  "status": "active"
}

// Write tag value
POST /api/tags/pump_01_command/write/
Body: {
  "value": true,
  "reason": "Manual start",
  "timestamp": "2024-01-07T15:31:00Z"
}
Response: {
  "success": true,
  "tag_name": "pump_01_command",
  "value": true,
  "written_at": "2024-01-07T15:31:00Z"
}

// Get control history
GET /api/tags/pump_01_command/history/?limit=50
Response: [
  {
    "timestamp": "2024-01-07T15:30:00Z",
    "from_value": false,
    "to_value": true,
    "duration_seconds": 120,
    "triggered_by": "operator@example.com"
  },
  ...
]
```

---

## Part 10: Implementation Roadmap

### Phase 1: Display (Week 1)
- [ ] Create `BooleanDisplay` component
- [ ] Create `BooleanBadge` component  
- [ ] Create `BooleanStatusCard` component
- [ ] Add to Dashboard overview

### Phase 2: Reading (Week 1-2)
- [ ] Create `useBooleanTag` hook
- [ ] Add real-time polling
- [ ] Display refresh status
- [ ] Error handling

### Phase 3: Writing (Week 2-3)
- [ ] Create `useBooleanControl` hook
- [ ] Create `BooleanControl` component
- [ ] Add confirmation dialogs
- [ ] Implement loading states

### Phase 4: Integration (Week 3-4)
- [ ] Integrate with ControlsPage
- [ ] Integrate with Analysis page
- [ ] Add control history display
- [ ] Implement permission checks

### Phase 5: Polish (Week 4-5)
- [ ] Add animations
- [ ] Improve error messages
- [ ] Add logging/audit trails
- [ ] Optimization

---

## Summary

**For Displaying Boolean Tags:**
- Use **Status Indicators** for overview dashboards
- Use **Badges** for compact lists
- Use **Status Cards** for detailed information
- Always show **last updated** timestamp

**For Reading Boolean Values:**
- Use **useBooleanTag hook** with 2-5s auto-refresh
- Display **quality and status** information
- Show **loading and error states**

**For Writing Boolean Values:**
- Use **Start/Stop buttons** for remote control
- Implement **confirmation dialogs** for critical operations
- Show **loading indicator** during write
- Display **error messages** on failure
- Log **all control actions** with user/timestamp

**For Control (Start/Stop):**
- Separate **read tag** from **write tag** when possible
- Disable buttons when already in **target state**
- Show **visual feedback** after successful write
- Implement **cool-down period** between writes

---

