# 🚀 Threshold System - Implementation Guide

## ✅ What Has Been Implemented

All three missing features from the checklist have been fully implemented:

### 1. **Permission Restrictions on Edit Endpoints** ✅
- **File**: [roams_backend/roams_api/views.py](roams_api/views.py)
- **Implementation**: `TagThresholdViewSet.get_permissions()` method
- **Details**:
  - READ operations (GET, LIST): Require `IsAuthenticated` (any user)
  - WRITE operations (POST, PUT, PATCH, DELETE): Require `IsAuthenticated` + `IsAdminUser` (staff only)
  - Users without admin permissions get 403 Forbidden on edit operations

### 2. **Email/SMS Notification Integration** ✅
- **File**: [roams_backend/roams_opcua_mgr/notifications.py](roams_opcua_mgr/notifications.py) (NEW)
- **Integration Point**: [roams_backend/roams_opcua_mgr/services.py](roams_opcua_mgr/services.py) (UPDATED)
- **Features**:
  - `send_alert_email()`: Sends HTML emails with breach details
  - `send_alert_sms()`: Sends SMS via Twilio for critical breaches
  - `notify_threshold_breach()`: Main entry point that sends all configured notifications
  - Automatically called when `evaluate_threshold()` detects a breach
  - Supports separate email/SMS lists for critical vs warning breaches
  - Graceful error handling - notifications don't block breach logging

### 3. **Admin Interface Customization** ✅
- **File**: [roams_backend/roams_opcua_mgr/admin.py](roams_opcua_mgr/admin.py) (UPDATED)
- **New Admin Class**: `ThresholdBreachAdmin`
- **Features**:
  - Color-coded breach levels (red=Critical, orange=Warning)
  - Multi-field search (parameter name, station, acknowledged by)
  - Advanced filtering (level, acknowledged, date range, station)
  - Bulk action to mark breaches as acknowledged
  - Optimized queries with `select_related()`
  - Date hierarchy for quick navigation
  - Read-only fields for audit trail
  - Delete protection for non-superusers

### 4. **Breach Cleanup Management Command** ✅
- **File**: [roams_backend/roams_opcua_mgr/management/commands/cleanup_breaches.py](roams_opcua_mgr/management/commands/cleanup_breaches.py) (NEW)
- **Usage**:
  ```bash
  # Delete breaches older than 90 days (default)
  python manage.py cleanup_breaches
  
  # Custom age (30 days)
  python manage.py cleanup_breaches --days 30
  
  # Dry run to preview what would be deleted
  python manage.py cleanup_breaches --dry-run
  ```
- **Features**:
  - Keeps unacknowledged breaches regardless of age
  - Supports custom age threshold
  - Dry-run mode for safety
  - Detailed progress reporting
  - Logging of cleanup operations

## 🎯 Additional Features Created

### 5. **Dashboard & Analytics Service** 🆕
- **File**: [roams_backend/roams_opcua_mgr/dashboard_analytics.py](roams_opcua_mgr/dashboard_analytics.py) (NEW)
- **Functions** (ready for API endpoints):
  - `get_top_breached_parameters()`: Top 10 parameters with most breaches
  - `get_breach_statistics()`: Overall statistics (total, critical, unacknowledged, etc.)
  - `get_breach_trend()`: Time-series data for trend visualization
  - `get_breach_severity_distribution()`: Breakdown by severity level
  - `get_unacknowledged_critical_breaches()`: Urgent alerts
  - `get_parameter_breach_history()`: Historical data for specific parameter
  - `get_daily_breach_report()`: Daily summary reports
  - `get_breach_frequency_trend()`: Trend analysis (increasing/decreasing)

### 6. **Configuration Settings** 🆕
- **File**: [roams_backend/roams_pro/settings.py](roams_pro/settings.py) (UPDATED)
- **New Settings** (configure via .env):
  ```python
  # Email Configuration
  THRESHOLD_EMAIL_ENABLED = False                    # Enable/disable email alerts
  THRESHOLD_EMAIL_FROM = 'alerts@roams.local'
  THRESHOLD_CRITICAL_EMAILS = []                     # Email list for critical breaches
  THRESHOLD_WARNING_EMAILS = []                      # Email list for warnings
  EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
  EMAIL_HOST = 'localhost'
  EMAIL_PORT = 587
  EMAIL_USE_TLS = True
  EMAIL_HOST_USER = ''                               # SMTP credentials
  EMAIL_HOST_PASSWORD = ''
  
  # SMS Configuration (Twilio)
  THRESHOLD_SMS_ENABLED = False                      # Enable/disable SMS alerts
  TWILIO_ACCOUNT_SID = None
  TWILIO_AUTH_TOKEN = None
  TWILIO_PHONE_FROM = None
  THRESHOLD_CRITICAL_PHONES = []                     # Phone list for critical breaches
  THRESHOLD_WARNING_PHONES = []
  ```

## 📋 File Summary

### New Files Created:
1. `roams_opcua_mgr/notifications.py` - Email/SMS notification system
2. `roams_opcua_mgr/dashboard_analytics.py` - Analytics and reporting functions
3. `roams_opcua_mgr/management/commands/cleanup_breaches.py` - Cleanup management command
4. `roams_opcua_mgr/management/__init__.py` - Package marker
5. `roams_opcua_mgr/management/commands/__init__.py` - Package marker

### Updated Files:
1. `roams_opcua_mgr/services.py` - Added notification integration to breach evaluation
2. `roams_opcua_mgr/admin.py` - Added ThresholdBreachAdmin with full customization
3. `roams_api/views.py` - Added permission restrictions to TagThresholdViewSet
4. `roams_pro/settings.py` - Added threshold configuration settings

## 🔧 Configuration Guide

### Email Alerts Setup

**1. Update .env file:**
```env
THRESHOLD_EMAIL_ENABLED=true
THRESHOLD_EMAIL_FROM=alerts@yourdomain.com
THRESHOLD_CRITICAL_EMAILS=ops@company.com,manager@company.com
THRESHOLD_WARNING_EMAILS=team@company.com

# Gmail Example
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

**2. Test email configuration:**
```bash
python manage.py shell
>>> from django.core.mail import send_mail
>>> send_mail('Test', 'Test message', 'from@example.com', ['to@example.com'])
```

### SMS Alerts Setup

**1. Get Twilio credentials** from https://www.twilio.com

**2. Update .env file:**
```env
THRESHOLD_SMS_ENABLED=true
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_FROM=+1234567890
THRESHOLD_CRITICAL_PHONES=+1111111111,+2222222222
THRESHOLD_WARNING_PHONES=+3333333333
```

**3. Install Twilio SDK:**
```bash
pip install twilio
```

### Admin Interface

Access threshold breaches at: `/admin/roams_opcua_mgr/thresholdbreach/`

**Features:**
- 🔍 Color-coded severity levels
- 📊 Advanced filtering and search
- ✅ Bulk acknowledge action
- 📋 Audit trail of who acknowledged what

## 🚀 Using the Cleanup Command

### Schedule automatic cleanup (optional)

**Using Django Cron (django-crontab):**

1. Install: `pip install django-crontab`

2. Add to settings.py:
```python
INSTALLED_APPS += ['django_cron']

CRONJOBS = [
    ('0 2 * * *', 'roams_opcua_mgr.management.commands.cleanup_breaches'),  # 2 AM daily
]
```

3. Install cron job: `python manage.py crontab add`

**Using System Cron:**
```bash
0 2 * * * cd /path/to/roams_b && python roams_backend/manage.py cleanup_breaches
```

## 📊 Dashboard Endpoints (Ready to Create)

The dashboard analytics functions are ready to be exposed as API endpoints. Add to `roams_api/views.py`:

```python
@action(detail=False, methods=['get'])
def dashboard_stats(self, request):
    """Get dashboard statistics"""
    from roams_opcua_mgr.dashboard_analytics import get_breach_statistics
    stats = get_breach_statistics(hours=24)
    return Response(stats)

@action(detail=False, methods=['get'])
def top_parameters(self, request):
    """Get top breached parameters"""
    from roams_opcua_mgr.dashboard_analytics import get_top_breached_parameters
    params = get_top_breached_parameters(limit=10)
    return Response(params)

@action(detail=False, methods=['get'])
def breach_trend(self, request):
    """Get breach trend data"""
    from roams_opcua_mgr.dashboard_analytics import get_breach_trend
    trend = get_breach_trend(hours=24)
    return Response(trend)
```

## ✨ Next Steps (Optional Enhancements)

1. **Dashboard Frontend**: Create React component using dashboard analytics endpoints
2. **Automated Reports**: Email daily/weekly breach reports using the reporting functions
3. **Trend Alerting**: Alert when breach frequency increases beyond threshold
4. **WebSocket Updates**: Real-time breach notifications to connected clients
5. **Slack Integration**: Send critical breaches to Slack channel
6. **Data Archive**: Archive old breaches to cold storage before deletion

## 📝 Notes

- **Notifications are non-blocking**: Email/SMS failures don't prevent breach logging
- **All breaches are always logged**: Event log is complete regardless of notification status
- **Permissions are enforced at API level**: Frontend users can view but not edit thresholds
- **Admin interface is read-only for breaches**: Prevents accidental deletion
- **Cleanup is safe**: Only removes acknowledged breaches older than specified age

## 🧪 Testing

Test notifications in Django shell:
```bash
python manage.py shell
>>> from roams_opcua_mgr.models import OPCUANode, ThresholdBreach
>>> from roams_opcua_mgr.notifications import notify_threshold_breach
>>> 
>>> # Get a node with thresholds
>>> node = OPCUANode.objects.filter(threshold_active=True).first()
>>> 
>>> # Create a test breach
>>> breach = ThresholdBreach.objects.create(
...     node=node,
...     value=node.critical_level + 1,
...     level='Critical'
... )
>>> 
>>> # Send notification
>>> notify_threshold_breach(node, breach)
```

---

**Status**: ✅ All features fully implemented and ready for use
