# ROAMS Data Sampling & Alarm Management - Quick Reference

## 📊 Data Sampling Configuration

### What's New?
Data logging now intelligently samples based on **whole number changes** instead of logging every reading.

**Example:**
- Value: 47.6 → 48.2 (logs because whole number changed from 47 to 48)
- Value: 48.2 → 48.9 (does NOT log because whole number is still 48)
- Value: 48.9 → 50.1 (logs because whole number changed from 48 to 50)

### How to Configure
1. Go to **Settings → Node Management**
2. Edit a node configuration
3. Find **"Sampling Configuration"** section:
   - **Sampling Interval**: Set to standard time (e.g., 60 seconds)
   - **Sample on Whole Number Change**: Toggle ON/OFF
   - **Last Whole Number**: Read-only field showing last logged value

### Benefits
✅ Reduced database size (fewer records)
✅ Cleaner data visualization (less noise)
✅ Faster queries
✅ Maintains important threshold crossings

---

## 🚨 Alarm Management System

### Real-Time Alarm Banner
- **Location**: Analysis page (below telemetry charts)
- **Features**:
  - Shows active unacknowledged alarms
  - Color-coded by severity (Red = Critical, Yellow = Warning)
  - Auto-refreshes every 30 seconds
  - Manual refresh button
  - One-click access to detailed alarms

### Notifications Center
- **Location**: Main sidebar → Notifications
- **Displays**:
  - System status summary (total, critical, warning)
  - Acknowledged vs unacknowledged count
  - Complete alarm history with timestamps
  - Filtering options: All / Critical Only / Unacknowledged

---

## 📋 Alarm Retention & Cleanup

### What Gets Deleted?
- **Alarm Logs**: Old system alarm records
- **Threshold Breaches**: Historical breach events

### Default Settings
- **Alarm Retention**: 90 days
- **Breach Retention**: 90 days
- **Keep Unacknowledged**: YES (never auto-delete unacknowledged breaches)

### How to Configure
1. Go to **Settings → Alarm Retention** tab
2. Adjust retention periods (7-365 days):
   - Alarm Log Retention
   - Threshold Breach Retention
3. Toggle features:
   - **Keep Unacknowledged**: Preserve unacknowledged breaches
   - **Auto Cleanup**: Enable automatic daily cleanup
4. Click **Save Changes**

### Manual Cleanup
- Click **"Run Cleanup Now"** button to trigger immediately
- Useful after changing retention settings
- Shows status of last cleanup run

---

## 📧 Notification Settings

### Standard Interval Sending
Notifications are sent at standard intervals to avoid spam:
- **15 Minutes**: Alert every 15 min while breach active
- **30 Minutes**: Alert every 30 min
- **1 Hour**: Alert every hour (recommended)
- **4 Hours**: Alert every 4 hours
- **Daily**: One alert per day
- **Never**: Disable notifications

### Configure Intervals
1. Go to **Settings → Notifications**
2. Set per-node notification preferences
3. Each threshold breach creates its own schedule
4. Unacknowledged breaches continue to notify at intervals

### Subscribing Users
- Users subscribe to nodes they want alerts for
- Choose alert level (Warning/Critical)
- Enable/disable email and SMS per subscription
- Staff can manage all subscriptions

---

## 📱 Frontend Features Summary

### Analysis Page
```
┌─────────────────────────────────────┐
│ 🔴 Alarm Banner (NEW)              │
│ ├─ Active alarms count             │
│ ├─ Critical/Warning badges         │
│ ├─ Live alarm list                 │
│ └─ Auto-refresh indicator          │
│                                     │
├─ Telemetry Charts (existing)       │
└─ Alarms Table (existing)           │
```

### Notifications Page
```
┌─────────────────────────────────────┐
│ System Status Cards:                │
│ ├─ Total Alarms                    │
│ ├─ Critical Count                  │
│ ├─ Warning Count                   │
│ ├─ Acknowledged                    │
│ └─ Unacknowledged                  │
│                                     │
│ Filters: [All] [Critical] [Pending]│
│                                     │
│ Detailed Alarm List:               │
│ ├─ Timestamp                       │
│ ├─ Severity Badge                  │
│ ├─ Status (Acknowledged/Pending)   │
│ └─ Message                         │
└─────────────────────────────────────┘
```

### Settings → Alarm Retention
```
┌─────────────────────────────────────┐
│ Alarm Log Retention: [90] days      │
│ Breach Retention: [90] days         │
│                                     │
│ ☑ Keep Unacknowledged Breaches     │
│ ☑ Enable Automatic Cleanup         │
│                                     │
│ Last cleanup: [timestamp]           │
│                                     │
│ [Save Changes] [Cancel] [Cleanup]   │
└─────────────────────────────────────┘
```

---

## 🔧 Backend Commands

### Create Migrations
```bash
cd roams_backend
python manage.py makemigrations roams_opcua_mgr
```

### Apply Migrations
```bash
python manage.py migrate roams_opcua_mgr
```

### Run Cleanup Manually
```bash
python manage.py cleanup_old_alarms
```

### Schedule Daily Cleanup (Linux/Mac)
```bash
# Edit crontab
crontab -e

# Add line for 2 AM daily cleanup:
0 2 * * * /path/to/project/venv/bin/python /path/to/project/roams_backend/manage.py cleanup_old_alarms
```

---

## 🎯 Key Improvements

| Feature | Before | After |
|---------|--------|-------|
| Data Logging | Every reading | Only on whole number change |
| Alarm Display | None | Real-time banner + page |
| Notification Spam | Repeated instantly | Standard intervals (1hr default) |
| Data Retention | No auto-cleanup | Auto-delete with 90-day default |
| UI Configuration | Limited | Full settings page |
| Unacknowledged Alarms | Deleted with time | Can be preserved indefinitely |

---

## ⚠️ Important Notes

1. **Migration Required**: Must run migrations before using new features
2. **Database Backup**: Backup database before first cleanup
3. **Time Zones**: All timestamps use server timezone
4. **Unacknowledged Breaches**: Check "Keep Unacknowledged" if preserving is important
5. **Notification Intervals**: Default is 1 hour (configurable per breach)
6. **API Access**: All endpoints require authentication token

---

## 📞 Support & Troubleshooting

### Alarms Not Showing?
- Check authentication token
- Verify alarms exist in database: `python manage.py shell`
- Check browser console for API errors

### Cleanup Not Running?
- Verify auto_cleanup_enabled is True
- Check cron job if scheduled
- Run manually: `python manage.py cleanup_old_alarms`
- Check Django logs for errors

### Sampling Not Working?
- Verify `sample_on_whole_number_change = True` on node
- Check `last_whole_number` field is updating
- Verify read_data.py is running

### Notifications Not Sending?
- Check notification subscriptions exist
- Verify email/SMS enabled on subscription
- Check email configuration in settings
- Check notification schedule intervals

---

Last Updated: December 27, 2025
Version: 1.0
