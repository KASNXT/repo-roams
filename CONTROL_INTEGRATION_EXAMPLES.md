# Boolean Control System - Integration Examples

This guide shows how to integrate the control components into your existing React application.

## Example 1: Add Controls Page to Main App

**File: `src/App.tsx`**

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ControlsPage from '@/pages/ControlsPage';
import PrivateRoute from '@/components/PrivateRoute';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Existing routes... */}
        
        {/* Add Controls page - protected route */}
        <Route
          path="/controls"
          element={
            <PrivateRoute>
              <ControlsPage />
            </PrivateRoute>
          }
        />
        
        {/* More routes... */}
      </Routes>
    </BrowserRouter>
  );
}
```

## Example 2: Add Navigation Link

**File: `src/components/AppSidebar.tsx` (or your navigation component)**

```typescript
import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AppSidebar() {
  return (
    <nav>
      {/* Existing nav items... */}
      
      {/* Add Controls link */}
      <Link 
        to="/controls" 
        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded"
      >
        <Zap className="w-5 h-5 text-yellow-600" />
        <span>Plant Controls</span>
      </Link>
      
      {/* More nav items... */}
    </nav>
  );
}
```

## Example 3: Embed Control in Custom Dashboard

**Display a single control in your custom dashboard:**

```typescript
import { useState, useEffect } from 'react';
import { ControlToggle } from '@/components/ControlToggle';
import { useApi } from '@/hooks/useApi';
import { ControlState } from '@/components/ControlToggle';
import { Loader2 } from 'lucide-react';

export function PumpDashboard() {
  const { api } = useApi();
  const [pumpControl, setPumpControl] = useState<ControlState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPumpControl = async () => {
      try {
        // Fetch specific control by ID or name
        const response = await api.get('/control-states/?search=Pump_Main');
        if (response.results.length > 0) {
          setPumpControl(response.results[0]);
        }
      } catch (error) {
        console.error('Failed to load pump control:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPumpControl();
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (!pumpControl) return <div>Control not found</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Pump System</h2>
      <ControlToggle control={pumpControl} />
    </div>
  );
}
```

## Example 4: Custom Control Cards in a Grid

**Display multiple specific controls:**

```typescript
import { useState, useEffect } from 'react';
import { ControlToggle } from '@/components/ControlToggle';
import { useApi } from '@/hooks/useApi';
import { ControlState } from '@/components/ControlToggle';

export function CriticalControlsGrid() {
  const { api } = useApi();
  const [controls, setControls] = useState<ControlState[]>([]);

  useEffect(() => {
    const fetchCriticalControls = async () => {
      try {
        // Get all critical controls
        const response = await api.get('/control-states/?danger_level=3');
        setControls(response.results);
      } catch (error) {
        console.error('Failed to load critical controls:', error);
      }
    };

    fetchCriticalControls();
    const interval = setInterval(fetchCriticalControls, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">🚨 Critical Controls</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {controls.map((control) => (
          <ControlToggle key={control.id} control={control} />
        ))}
      </div>
    </div>
  );
}
```

## Example 5: Create Custom Hook for Controls

**Reusable hook for fetching and managing controls:**

```typescript
// src/hooks/useControls.ts
import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@/hooks/useApi';
import { ControlState } from '@/components/ControlToggle';

interface UseControlsOptions {
  search?: string;
  tagType?: string;
  syncedOnly?: boolean;
  refreshInterval?: number;
}

export function useControls(options: UseControlsOptions = {}) {
  const { api } = useApi();
  const [controls, setControls] = useState<ControlState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchControls = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Build query string
      const params = new URLSearchParams();
      if (options.search) params.append('search', options.search);
      if (options.tagType) params.append('tag_type', options.tagType);
      
      const url = `/control-states/?${params.toString()}`;
      const response = await api.get(url);
      
      let results = response.results;
      
      // Filter synced if requested
      if (options.syncedOnly) {
        results = results.filter(c => c.is_synced_with_plc);
      }
      
      setControls(results);
      setError(null);
    } catch (err) {
      setError('Failed to load controls');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [api, options.search, options.tagType, options.syncedOnly]);

  useEffect(() => {
    fetchControls();
    
    const interval = setInterval(
      fetchControls,
      options.refreshInterval || 5000
    );
    
    return () => clearInterval(interval);
  }, [fetchControls, options.refreshInterval]);

  return {
    controls,
    isLoading,
    error,
    refresh: fetchControls,
  };
}

// Usage:
// const { controls, isLoading } = useControls({ 
//   tagType: 'pump',
//   syncedOnly: true,
//   refreshInterval: 3000
// });
```

## Example 6: Admin Control Management Panel

**Panel for admins to manage permissions:**

```typescript
import { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Permission {
  id: number;
  user: number;
  username: string;
  control_state: number;
  control_state_name: string;
  permission_level: 'view' | 'request' | 'execute';
  is_active: boolean;
  expires_at: string | null;
}

export function PermissionManager() {
  const { api } = useApi();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const response = await api.get('/control-permissions/');
      setPermissions(response.results);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deactivatePermission = async (permissionId: number) => {
    try {
      await api.patch(`/control-permissions/${permissionId}/`, {
        is_active: false,
      });
      fetchPermissions();
    } catch (error) {
      console.error('Failed to deactivate permission:', error);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Control Permissions</h2>
        
        <div className="space-y-2">
          {permissions.map((perm) => (
            <div
              key={perm.id}
              className="flex items-center justify-between p-3 border rounded"
            >
              <div>
                <p className="font-semibold">{perm.username}</p>
                <p className="text-sm text-gray-600">{perm.control_state_name}</p>
                <p className="text-xs text-gray-500">
                  Level: {perm.permission_level}
                  {perm.expires_at && ` • Expires: ${new Date(perm.expires_at).toLocaleDateString()}`}
                </p>
              </div>
              
              <Button
                variant={perm.is_active ? 'destructive' : 'secondary'}
                size="sm"
                onClick={() => deactivatePermission(perm.id)}
              >
                {perm.is_active ? 'Deactivate' : 'Deactivated'}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
```

## Example 7: Quick Status Widget

**Small widget showing control status:**

```typescript
import { useControls } from '@/hooks/useControls';
import { AlertCircle, CheckCircle } from 'lucide-react';

export function ControlStatusWidget() {
  const { controls } = useControls({ refreshInterval: 10000 });

  const synced = controls.filter(c => c.is_synced_with_plc).length;
  const unsynced = controls.length - synced;

  return (
    <div className="grid grid-cols-2 gap-2 p-4 bg-white rounded-lg border">
      <div>
        <p className="text-xs text-gray-600">Synced</p>
        <p className="text-2xl font-bold text-green-600 flex items-center gap-1">
          <CheckCircle className="w-5 h-5" />
          {synced}
        </p>
      </div>
      
      <div>
        <p className="text-xs text-gray-600">Out of Sync</p>
        <p className="text-2xl font-bold text-yellow-600 flex items-center gap-1">
          <AlertCircle className="w-5 h-5" />
          {unsynced}
        </p>
      </div>
    </div>
  );
}
```

## Example 8: Control History in Custom View

**Embed history in a custom page:**

```typescript
import { ControlHistory } from '@/components/ControlHistory';

export function EquipmentHistoryPage({ equipmentId }: { equipmentId: number }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Equipment History</h1>
      
      {/* Equipment details... */}
      
      {/* Control history for this equipment */}
      <ControlHistory controlId={equipmentId} limit={20} />
    </div>
  );
}
```

## Example 9: API Integration without Components

**Direct API usage without components:**

```typescript
import { useApi } from '@/hooks/useApi';

export function CustomControlLogic() {
  const { api } = useApi();

  const requestControlChange = async (controlId: number, newValue: boolean) => {
    try {
      const response = await api.post(
        `/control-states/${controlId}/request_change/`,
        {
          requested_value: newValue,
          reason: 'Custom application logic',
        }
      );

      if (response.confirmation_token) {
        // Control requires confirmation
        console.log('Confirmation required. Token:', response.confirmation_token);
        return {
          requiresConfirmation: true,
          token: response.confirmation_token,
          expiresIn: response.expires_in_seconds,
        };
      } else {
        // Changed immediately
        console.log('Control changed successfully');
        return {
          requiresConfirmation: false,
          success: true,
        };
      }
    } catch (error) {
      console.error('Failed to request control change:', error);
      throw error;
    }
  };

  return { requestControlChange };
}
```

## Example 10: Monitoring Dashboard

**Real-time monitoring of all controls:**

```typescript
import { useEffect, useState } from 'react';
import { useControls } from '@/hooks/useControls';
import { PendingRequests } from '@/components/PendingRequests';
import { Card } from '@/components/ui/card';

export function MonitoringDashboard() {
  const { controls, error } = useControls({
    refreshInterval: 3000, // Update every 3 seconds
  });

  const stats = {
    total: controls.length,
    on: controls.filter(c => c.current_value).length,
    off: controls.filter(c => !c.current_value).length,
    synced: controls.filter(c => c.is_synced_with_plc).length,
    outOfSync: controls.filter(c => !c.is_synced_with_plc).length,
    critical: controls.filter(c => c.danger_level >= 2).length,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-gray-600">Total</p>
        </Card>
        <Card className="p-4 text-center bg-green-50">
          <p className="text-2xl font-bold text-green-600">{stats.on}</p>
          <p className="text-xs text-gray-600">ON</p>
        </Card>
        <Card className="p-4 text-center bg-red-50">
          <p className="text-2xl font-bold text-red-600">{stats.off}</p>
          <p className="text-xs text-gray-600">OFF</p>
        </Card>
        <Card className="p-4 text-center bg-blue-50">
          <p className="text-2xl font-bold text-blue-600">{stats.synced}</p>
          <p className="text-xs text-gray-600">Synced</p>
        </Card>
        <Card className="p-4 text-center bg-yellow-50">
          <p className="text-2xl font-bold text-yellow-600">{stats.outOfSync}</p>
          <p className="text-xs text-gray-600">Out of Sync</p>
        </Card>
        <Card className="p-4 text-center bg-red-100">
          <p className="text-2xl font-bold text-red-700">{stats.critical}</p>
          <p className="text-xs text-gray-600">Critical</p>
        </Card>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      <PendingRequests showPendingOnly={false} />
    </div>
  );
}
```

## Integration Checklist

- [ ] Install/update UI component dependencies if needed
- [ ] Add ControlsPage route to App.tsx
- [ ] Add navigation link to main menu
- [ ] Create test control in Django admin
- [ ] Grant permissions to test user
- [ ] Test the workflow end-to-end
- [ ] Customize styling to match your app theme
- [ ] Add error handling/logging
- [ ] Test on mobile/tablet
- [ ] Train users on confirmation workflow

## Notes

- All components use the `useApi` hook for API calls - ensure this is available in your project
- Components use shadcn/ui components - ensure they're installed
- Real-time updates use intervals - adjust refresh rates based on your needs
- All components are fully TypeScript typed
- Error handling is included but can be enhanced with custom toast/modal handlers

## Common Issues

**Issue: Import errors for components**
- Ensure all UI components from shadcn are installed
- Check that lucide-react icons are installed

**Issue: useApi hook not found**
- Create/verify `src/hooks/useApi.ts` exists
- Should handle authentication tokens and API calls

**Issue: Components not updating**
- Check refresh intervals
- Verify API is returning data
- Check browser console for errors

**Issue: Permission denied on API calls**
- Verify user has correct permissions in Django admin
- Check authentication token is being sent
- Verify user has ControlPermission record
