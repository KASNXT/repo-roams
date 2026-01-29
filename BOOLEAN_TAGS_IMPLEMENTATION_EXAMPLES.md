# Boolean Tags - Implementation Examples for ROAMS

Quick reference with copy-paste ready code for your Dashboard, Controls, and Analysis pages.

---

## 1. Display Boolean Tags on Dashboard

### Status Card Grid

```tsx
// File: src/components/BooleanStatusGrid.tsx

import { useBooleanTag } from '@/hooks/useBooleanTag';
import { Card, CardContent } from '@/components/ui/card';

interface BooleanItem {
  id: string;
  tagName: string;
  label: string;
  icon: string;
  description?: string;
}

export function BooleanStatusGrid({ items }: { items: BooleanItem[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map(item => (
        <BooleanStatusItem key={item.id} {...item} />
      ))}
    </div>
  );
}

function BooleanStatusItem({ 
  tagName, 
  label, 
  icon, 
  description 
}: BooleanItem) {
  const { data } = useBooleanTag(tagName);
  const value = data?.value ?? false;

  return (
    <Card className={`border-2 transition-all ${
      value
        ? 'border-green-400 bg-green-50/50 dark:bg-green-950/30'
        : 'border-red-400 bg-red-50/50 dark:bg-red-950/30'
    }`}>
      <CardContent className="pt-6">
        <div className="space-y-3">
          {/* Icon and Status */}
          <div className="flex items-center justify-between">
            <span className="text-3xl">{icon}</span>
            <div className={`w-4 h-4 rounded-full shadow-lg ${
              value ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'
            }`} />
          </div>

          {/* Label */}
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">
              {value ? '✓ ON' : '✗ OFF'}
            </p>
          </div>

          {/* Description */}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}

          {/* Last Updated */}
          {data?.timestamp && (
            <p className="text-xs text-muted-foreground">
              {new Date(data.timestamp).toLocaleTimeString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Usage in Dashboard:
const statusItems = [
  { id: '1', tagName: 'pump_01_status', label: 'Pump 1', icon: '🚰', description: 'Primary pump' },
  { id: '2', tagName: 'pump_02_status', label: 'Pump 2', icon: '🚰', description: 'Secondary pump' },
  { id: '3', tagName: 'valve_01_status', label: 'Valve 1', icon: '🚪', description: 'Main valve' },
  { id: '4', tagName: 'emergency_stop', label: 'E-Stop', icon: '🚨', description: 'Emergency' },
];

// <BooleanStatusGrid items={statusItems} />
```

---

## 2. Read/Write Boolean Tags on Control Page

### Complete Control Component

```tsx
// File: src/components/RemoteControl.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBooleanTag } from '@/hooks/useBooleanTag';
import { useBooleanControl } from '@/hooks/useBooleanControl';
import { Loader2, AlertTriangle, Power } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RemoteControlProps {
  controlId: string;
  commandTag: string;      // Tag to write to (e.g., "pump_01_command")
  statusTag?: string;      // Tag to read from (e.g., "pump_01_status") - defaults to commandTag
  label: string;
  icon?: string;
  description?: string;
  requiresConfirmation?: boolean;
  isCritical?: boolean;    // Shows warning for emergency stops, critical valves
  disabledReason?: string; // Why control is disabled
}

export function RemoteControl({
  controlId,
  commandTag,
  statusTag,
  label,
  icon = '⚙️',
  description,
  requiresConfirmation = true,
  isCritical = false,
  disabledReason,
}: RemoteControlProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmValue, setConfirmValue] = useState<boolean | null>(null);

  // Read current status
  const { data: statusData, loading: statusLoading } = useBooleanTag(statusTag || commandTag);

  // Write command
  const { writeValue, isWriting, lastError } = useBooleanControl(commandTag);

  const currentValue = statusData?.value ?? false;
  const isDisabled = disabledReason !== undefined;

  const handleToggle = (newValue: boolean) => {
    if (requiresConfirmation) {
      setConfirmValue(newValue);
      setShowConfirm(true);
    } else {
      writeValue(newValue);
    }
  };

  const handleConfirm = async () => {
    if (confirmValue !== null) {
      await writeValue(confirmValue);
      setShowConfirm(false);
      setConfirmValue(null);
    }
  };

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={`border-2 transition-all ${
        isCritical
          ? 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/30'
          : currentValue
          ? 'border-green-300 bg-green-50/50 dark:bg-green-950/30'
          : 'border-slate-300 dark:border-slate-700'
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{icon}</span>
              <div>
                <CardTitle className="text-base">{label}</CardTitle>
                {description && (
                  <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
              </div>
            </div>
            {isCritical && (
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <div className={`w-3 h-3 rounded-full ${
              currentValue ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="font-semibold">
              {currentValue ? 'RUNNING' : 'STOPPED'}
            </span>
            {statusData?.timestamp && (
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(statusData.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2">
            <Button
              flex-1
              size="sm"
              variant={currentValue ? 'default' : 'outline'}
              onClick={() => handleToggle(true)}
              disabled={isWriting || currentValue || isDisabled}
              className={currentValue ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              <Power className="h-4 w-4 mr-2" />
              {isWriting ? 'Starting...' : 'Start'}
            </Button>

            <Button
              flex-1
              size="sm"
              variant={!currentValue ? 'default' : 'outline'}
              onClick={() => handleToggle(false)}
              disabled={isWriting || !currentValue || isDisabled}
              className={!currentValue ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              <Power className="h-4 w-4 mr-2" />
              {isWriting ? 'Stopping...' : 'Stop'}
            </Button>
          </div>

          {/* Disabled Reason */}
          {isDisabled && disabledReason && (
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 rounded text-sm text-yellow-800 dark:text-yellow-400">
              ⚠️ {disabledReason}
            </div>
          )}

          {/* Error Message */}
          {lastError && (
            <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 rounded text-sm text-red-800 dark:text-red-400">
              ❌ {lastError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            {isCritical && (
              <div className="flex items-center gap-2 mb-3 p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                  CRITICAL OPERATION
                </span>
              </div>
            )}
            <AlertDialogTitle>Confirm {label}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to <strong>{confirmValue ? 'START' : 'STOP'}</strong> {label}?
              {isCritical && (
                <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/20 rounded text-red-700 dark:text-red-400">
                  This is a critical operation that will immediately affect the system.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={`${
                confirmValue
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {confirmValue ? 'Start' : 'Stop'} {label}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Usage:
// <RemoteControl
//   controlId="pump_01"
//   commandTag="pump_01_command"
//   statusTag="pump_01_status"
//   label="Pump 01 - Primary"
//   icon="🚰"
//   description="Main water pump"
//   requiresConfirmation={true}
//   isCritical={false}
// />
```

---

## 3. Analysis Page - Boolean History & Statistics

### Control History Visualization

```tsx
// File: src/components/BooleanControlHistory.tsx

import { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface ControlEvent {
  id: number;
  timestamp: string;
  from_value: boolean;
  to_value: boolean;
  duration_seconds?: number;
  triggered_by: string;
  reason?: string;
}

export function BooleanControlHistory({ 
  tagName, 
  limit = 30 
}: { 
  tagName: string;
  limit?: number;
}) {
  const { api } = useApi();
  const [events, setEvents] = useState<ControlEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/tags/${tagName}/history/`, {
          params: { limit },
        });
        setEvents(Array.isArray(response.data) ? response.data : response.data.results || []);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load history');
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [tagName, limit, api]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading history...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6 text-red-700">
          Error: {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Control History: {tagName}</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-muted-foreground">No control events recorded</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.map((event, idx) => (
              <div
                key={event.id || idx}
                className={`p-3 rounded-lg border-l-4 ${
                  event.to_value
                    ? 'border-l-green-500 bg-green-50 dark:bg-green-950/20'
                    : 'border-l-red-500 bg-red-50 dark:bg-red-950/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${
                      event.to_value ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {event.from_value ? '✓' : '✗'} → {event.to_value ? '✓' : '✗'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {event.duration_seconds && (
                    <span className="text-xs font-semibold bg-white dark:bg-slate-800 px-2 py-1 rounded">
                      {event.duration_seconds}s
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Triggered by: {event.triggered_by}</p>
                  {event.reason && <p>Reason: {event.reason}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Usage:
// <BooleanControlHistory tagName="pump_01_command" limit={50} />
```

### Control Statistics

```tsx
// File: src/components/BooleanControlStats.tsx

import { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ControlStats {
  total_operations: number;
  total_runtime: number;
  average_runtime: number;
  last_operation: string;
  uptime_percentage: number;
}

export function BooleanControlStats({ tagName }: { tagName: string }) {
  const { api } = useApi();
  const [stats, setStats] = useState<ControlStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get(`/tags/${tagName}/stats/`);
        setStats(response.data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [tagName, api]);

  if (loading || !stats) return <div>Loading stats...</div>;

  const formatSeconds = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${mins}m ${secs}s`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Operations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{stats.total_operations}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Runtime
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-bold">{formatSeconds(stats.total_runtime)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Avg. Runtime
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-bold">{formatSeconds(stats.average_runtime)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Uptime %
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${
            stats.uptime_percentage > 95 ? 'text-green-600' : 
            stats.uptime_percentage > 80 ? 'text-yellow-600' : 
            'text-red-600'
          }`}>
            {stats.uptime_percentage.toFixed(1)}%
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Usage:
// <BooleanControlStats tagName="pump_01_status" />
```

---

## 4. Quick Integration Examples

### For Overview/Dashboard Page

```tsx
import { BooleanStatusGrid } from '@/components/BooleanStatusGrid';

export function DashboardPage() {
  const controls = [
    { id: '1', tagName: 'pump_01_status', label: 'Pump 1', icon: '🚰' },
    { id: '2', tagName: 'pump_02_status', label: 'Pump 2', icon: '🚰' },
    { id: '3', tagName: 'valve_01_status', label: 'Valve', icon: '🚪' },
    { id: '4', tagName: 'emergency_stop', label: 'E-Stop', icon: '🚨' },
  ];

  return (
    <div className="space-y-6">
      <h1>System Dashboard</h1>
      <BooleanStatusGrid items={controls} />
    </div>
  );
}
```

### For Controls Page

```tsx
import { RemoteControl } from '@/components/RemoteControl';

export function ControlsPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <RemoteControl
        controlId="pump_01"
        commandTag="pump_01_command"
        statusTag="pump_01_status"
        label="Pump 01"
        icon="🚰"
        requiresConfirmation={true}
      />
      
      <RemoteControl
        controlId="pump_02"
        commandTag="pump_02_command"
        statusTag="pump_02_status"
        label="Pump 02"
        icon="🚰"
        requiresConfirmation={true}
      />

      <RemoteControl
        controlId="emergency"
        commandTag="emergency_stop_command"
        statusTag="emergency_stop_status"
        label="Emergency Stop"
        icon="🚨"
        requiresConfirmation={true}
        isCritical={true}
      />
    </div>
  );
}
```

### For Analysis Page

```tsx
import { BooleanControlHistory } from '@/components/BooleanControlHistory';
import { BooleanControlStats } from '@/components/BooleanControlStats';

export function AnalysisPage() {
  return (
    <div className="space-y-6">
      <BooleanControlStats tagName="pump_01_status" />
      <BooleanControlHistory tagName="pump_01_command" limit={50} />
    </div>
  );
}
```

---

## 5. Hook Template

Create these hooks in `src/hooks/`:

### useBooleanTag.ts
```typescript
// Already provided in main guide
```

### useBooleanControl.ts
```typescript
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

      const response = await api.post(`/tags/${tagName}/write/`, {
        value: newValue,
        reason: reason || 'User control action',
        timestamp: new Date().toISOString(),
      });

      toast.success(`${tagName} set to ${newValue ? 'ON' : 'OFF'}`);
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

  return { writeValue, isWriting, lastError };
}
```

---

## Summary

**Display Options:**
- Status Indicators ← Recommended for overview
- Badges ← For lists/tables  
- Status Cards ← For dashboard tiles

**Reading:**
- Use `useBooleanTag` hook
- Auto-refresh every 2-5 seconds

**Writing (Control):**
- Use `useBooleanControl` hook
- Confirmation dialog for critical operations
- Show loading and error states

**Best For Each Page:**
- **Dashboard:** Status cards grid
- **Controls:** Start/Stop buttons
- **Analysis:** History + Statistics

---

