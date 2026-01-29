# 🔄 Adjustable Auto-Refresh Settings

## Overview

ROAMS now allows **users to customize the refresh intervals** for each page. Instead of fixed refresh rates, administrators can adjust how frequently data is fetched on:

- **Dashboard** (default: 10 seconds)
- **Overview** (default: 5 minutes)
- **Analysis** (default: 15 seconds)
- **Control** (default: 5 seconds)
- **Notifications** (default: 30 seconds)

---

## ✨ Features

✅ **Per-Page Configuration** - Each page has independent refresh settings
✅ **Persistent Storage** - Settings saved in browser localStorage
✅ **Enable/Disable Toggle** - Turn off auto-refresh for any page
✅ **Validation** - Minimum 5 seconds, Maximum 1 hour
✅ **One-Click Reset** - Restore all defaults instantly
✅ **Real-Time Preview** - See current settings displayed

---

## 🚀 How to Use

### Access Refresh Settings

1. **Log in** as admin/superuser
2. Go to **Settings** → **Auto-Refresh tab**
3. Configure intervals for each page

### Adjust a Page's Refresh Rate

For each page:
```
Page Name
├── Auto-Refresh Toggle: [ON/OFF]
├── Refresh Interval (seconds): [5-3600]
├── Default: [original value]
└── Current: [active value]
```

**Example: Dashboard**
```
Dashboard (10s default)
├── Toggle: ON
├── Interval: 15 (15 seconds)
├── Default: 10
└── Current: 15s
```

### Save & Apply

1. Adjust all desired intervals
2. Click **Save Refresh Settings**
3. Changes apply immediately to active pages
4. Refresh browser if needed

### Reset to Defaults

- Click **Reset All** to restore original intervals
- Or reset individual pages by returning to defaults

---

## 🎯 Configuration Guide

| Page | Min | Default | Max | Use Case |
|------|-----|---------|-----|----------|
| Dashboard | 5s | 10s | 3600s | Real-time alarms & status |
| Overview | 5s | 5m | 3600s | System trends (less frequent) |
| Analysis | 5s | 15s | 3600s | Alarm analysis & history |
| Control | 5s | 5s | 3600s | Equipment control feedback |
| Notifications | 5s | 30s | 3600s | New breach alerts |

### Recommended Settings

**High Activity (24/7 Monitoring):**
```
Dashboard:     5-10 seconds
Control:       5-10 seconds
Notifications: 10-30 seconds
Analysis:      30 seconds
Overview:      5 minutes
```

**Low Activity (Daily Checks):**
```
Dashboard:     30-60 seconds
Control:       60 seconds
Notifications: 60 seconds
Analysis:      5 minutes
Overview:      30 minutes
```

**Bandwidth Conservative:**
```
Dashboard:     1-2 minutes
Control:       5 minutes
Notifications: 2 minutes
Analysis:      10 minutes
Overview:      30-60 minutes
```

---

## 🛠️ Technical Implementation

### Hook: `useRefreshInterval()`

**Location:** [src/hooks/useRefreshInterval.ts](roams_frontend/src/hooks/useRefreshInterval.ts)

```typescript
import { useRefreshInterval } from "@/hooks/useRefreshInterval";

// In your component
const refreshSettings = useRefreshInterval("dashboard", 10000); // 10s default

// Use in useEffect
useEffect(() => {
  if (refreshSettings.enabled) {
    fetchData();
    const interval = setInterval(fetchData, refreshSettings.intervalMs);
    return () => clearInterval(interval);
  }
}, [refreshSettings.enabled, refreshSettings.intervalMs]);
```

### Component: `RefreshSettingsTab`

**Location:** [src/components/settings/RefreshSettingsTab.tsx](roams_frontend/src/components/settings/RefreshSettingsTab.tsx)

Provides UI for managing refresh intervals per page.

### Updated Pages

Pages now using adjustable refresh intervals:

1. **Index.tsx (Dashboard)**
   - Summary refresh
   - Nodes refresh
   - Alarms refresh

2. **Overview.tsx**
   - Uptime trend refresh

3. **Analysis.tsx** (ready for update)
4. **Control.tsx** (ready for update)
5. **Notifications.tsx** (ready for update)

---

## 📊 Storage Format

Settings are stored in browser's **localStorage**:

```javascript
// Storage keys format
`refresh_interval_{pageId}`              // Interval in milliseconds
`refresh_interval_{pageId}_enabled`      // Boolean, enable/disable

// Example
localStorage.getItem("refresh_interval_dashboard")           // "10000"
localStorage.getItem("refresh_interval_dashboard_enabled")   // "true"
```

---

## 🔒 Permission Model

| Role | Can Access | Can Modify |
|------|-----------|-----------|
| Viewer | ❌ | ❌ |
| Technician | ❌ | ❌ |
| Operator | ❌ | ❌ |
| Admin | ✅ | ✅ |
| Superuser | ✅ | ✅ |

Currently admin/superuser only. Can extend to viewer role if needed.

---

## 📱 Browser Support

✅ Chrome/Edge/Brave (localStorage)
✅ Firefox (localStorage)
✅ Safari (localStorage)
✅ Mobile browsers (localStorage)

**Note:** localStorage is persistent across sessions until cleared manually.

---

## 🧪 Testing

### Test Manual Refresh
1. Go to Settings → Auto-Refresh
2. Set Dashboard to 5 seconds
3. Go to Dashboard
4. Watch data update every 5 seconds
5. Back to Settings → Disable Dashboard
6. Dashboard stops updating

### Test Persistence
1. Set Overview to 30 seconds
2. Close browser completely
3. Reopen and go to Settings → Auto-Refresh
4. Overview still shows 30 seconds ✅

### Test Validation
1. Try entering "1" second → Auto-corrects to 5 seconds
2. Try entering "5000" seconds → Auto-corrects to 3600 (1 hour max)
3. Interval saved correctly each time

---

## 🚀 Performance Tips

### Optimal Refresh Rates

**Balance between:**
- Data freshness (more frequent = fresher)
- Server load (less frequent = lower load)
- Network bandwidth (less frequent = less traffic)

### Monitor Server Impact

If experiencing high load, increase intervals:
```
10s → 15s = 33% reduction in requests
5s → 10s = 50% reduction in requests
```

### Client-Side Performance

Updates happen in browser memory (React state), no visual re-renders until data changes.

---

## 🐛 Troubleshooting

### Settings Not Saving
- Check if localStorage is enabled
- Try clearing cache and reloading
- Check browser privacy settings

### Page Not Refreshing
- Verify "Auto-Refresh" toggle is ON
- Check interval value is reasonable (5-3600 seconds)
- Check browser console for errors
- Verify backend API is responding

### Refresh Too Frequent
- Dashboard feels laggy → Increase to 30s+
- Move to Overview or Control
- Reduce refresh rate

### Refresh Too Slow
- Data seems stale → Decrease interval
- Move to Dashboard (10s default)
- Minimum is 5 seconds

---

## 📚 API Reference

### `useRefreshInterval(pageId, defaultIntervalMs)`

Returns `RefreshSettings` object:
```typescript
{
  enabled: boolean              // Is auto-refresh on?
  intervalMs: number            // Current interval in ms
  updateInterval: (ms) => void  // Update interval
  resetInterval: () => void     // Reset to default
}
```

---

## 🔮 Future Enhancements

Possible additions:
- 📊 User-specific refresh settings in profile
- 🔔 Different rates for different alert levels
- ⏰ Time-based scheduling (e.g., fast during business hours)
- 📱 Adaptive rates based on page visibility
- 🌙 Dark mode aware refresh rates

---

## 🛠️ Integration Checklist

- [x] Create `useRefreshInterval()` hook
- [x] Create `RefreshSettingsTab` component
- [x] Add to Settings page (Auto-Refresh tab)
- [x] Update Dashboard/Index.tsx
- [x] Update Overview.tsx
- [ ] Update Analysis.tsx
- [ ] Update Control.tsx
- [ ] Update Notifications.tsx
- [ ] Update other pages as needed

---

## 📝 Change Log

### v1.0 (Current)
- ✅ Initial implementation
- ✅ Dashboard (Index.tsx) integration
- ✅ Overview.tsx integration
- ✅ Settings UI for configuration
- ✅ localStorage persistence
- ✅ Validation and bounds checking

---

## 📞 Support

For issues or questions:
1. Check Settings → Auto-Refresh tab
2. Review "How It Works" section
3. Check browser console for errors
4. Verify localStorage is enabled

