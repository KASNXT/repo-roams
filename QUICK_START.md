# 🚀 Quick Start Configuration

## After Implementation Checklist

### 1. ✅ Install Dependencies

```bash
cd roams_backend
pip install twilio  # For SMS support (optional)
```

No new Django packages needed - everything uses existing dependencies!

### 2. 📝 Update .env File

Add these settings to your `.env` file:

```bash
# ========== THRESHOLD NOTIFICATIONS ==========

# Email Configuration (optional but recommended)
THRESHOLD_EMAIL_ENABLED=false
THRESHOLD_EMAIL_FROM=alerts@roams.local
THRESHOLD_CRITICAL_EMAILS=ops@company.com,manager@company.com
THRESHOLD_WARNING_EMAILS=team@company.com

# Gmail Example (requires App Password)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Or use Console Backend for development
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# SMS Configuration (optional - requires Twilio)
THRESHOLD_SMS_ENABLED=false
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_FROM=+1234567890
THRESHOLD_CRITICAL_PHONES=+1111111111,+2222222222
```

### 3. 🔄 Run Migrations (if not already done)

```bash
python manage.py makemigrations
python manage.py migrate
```

### 4. ✅ Test Permission Restrictions

```bash
# Login as regular user - should see thresholds but can't edit
curl -H "Authorization: Token YOUR_USER_TOKEN" \
  http://localhost:8000/api/thresholds/

# Try to edit - should get 403 Forbidden
curl -X PATCH \
  -H "Authorization: Token YOUR_USER_TOKEN" \
  http://localhost:8000/api/thresholds/1/ \
  -d '{"warning_level": 100}'

# Login as admin user - should succeed
curl -X PATCH \
  -H "Authorization: Token YOUR_ADMIN_TOKEN" \
  http://localhost:8000/api/thresholds/1/ \
  -d '{"warning_level": 100}'
```

### 5. 📧 Test Email Notifications

In Django shell:
```bash
python manage.py shell
```

```python
from roams_opcua_mgr.models import OPCUANode, ThresholdBreach
from roams_opcua_mgr.notifications import notify_threshold_breach

# Get a node with thresholds
node = OPCUANode.objects.filter(threshold_active=True).first()

# Create a test breach
breach = ThresholdBreach.objects.create(
    node=node,
    value=node.critical_level + 10,  # Over critical
    level='Critical'
)

# Send notification
notify_threshold_breach(node, breach)
```

Check your email (or console if using console backend)!

### 6. 🗑️ Test Cleanup Command

```bash
# Dry run - see what would be deleted
python manage.py cleanup_breaches --days=90 --dry-run

# Actually run (deletes breaches older than 90 days)
python manage.py cleanup_breaches --days=90

# Delete only 30-day-old breaches
python manage.py cleanup_breaches --days=30
```

### 7. 👨‍💼 Access Admin Interface

1. Go to: `http://localhost:8000/admin/`
2. Navigate to: **ROAMS OPCUA MGR** → **Threshold breaches**
3. Features:
   - ✅ Color-coded severity (red=critical, orange=warning)
   - 🔍 Search by parameter name or station
   - 📊 Filter by level, date, acknowledgement status
   - ✅ Bulk action to mark acknowledged

### 8. 📊 Dashboard Endpoints (Ready to Use)

These analytics functions are ready. To expose as API endpoints, add to `roams_api/views.py`:

```python
from roams_opcua_mgr.dashboard_analytics import *

# In ThresholdBreachViewSet:
@action(detail=False, methods=['get'])
def dashboard_statistics(self, request):
    """GET /api/breaches/dashboard_statistics/?hours=24"""
    hours = int(request.query_params.get('hours', 24))
    stats = get_breach_statistics(hours=hours)
    return Response(stats)

@action(detail=False, methods=['get'])
def top_parameters(self, request):
    """GET /api/breaches/top_parameters/?limit=10"""
    limit = int(request.query_params.get('limit', 10))
    params = get_top_breached_parameters(limit=limit)
    return Response(params)

# See API_ENDPOINTS_GUIDE.md for complete implementation
```

## 📋 Files Overview

### New Files Created:
| File | Purpose |
|------|---------|
| `roams_opcua_mgr/notifications.py` | Email/SMS alert functions |
| `roams_opcua_mgr/dashboard_analytics.py` | Analytics & reporting functions |
| `roams_opcua_mgr/management/commands/cleanup_breaches.py` | Database cleanup tool |
| `IMPLEMENTATION_GUIDE.md` | Detailed implementation documentation |
| `API_ENDPOINTS_GUIDE.md` | Code examples for API endpoints |
| `QUICK_START.md` | This file |

### Modified Files:
| File | Changes |
|------|---------|
| `roams_opcua_mgr/services.py` | Added notification integration |
| `roams_opcua_mgr/admin.py` | Added ThresholdBreachAdmin |
| `roams_api/views.py` | Added permission restrictions |
| `roams_pro/settings.py` | Added notification configuration |

## 🧪 Testing Checklist

- [ ] Email notifications enabled and tested
- [ ] SMS notifications enabled (optional)
- [ ] Permission restrictions verified (user can't edit, admin can)
- [ ] Admin interface accessible and filters working
- [ ] Cleanup command tested with --dry-run
- [ ] Dashboard analytics functions returning data
- [ ] Frontend loads without errors

## ⚠️ Important Notes

1. **Notifications are non-blocking**: Even if email fails, breach is still logged
2. **Breaches are always created**: Event log is complete regardless of notification status
3. **Cleanup is safe**: Only removes acknowledged breaches older than specified age
4. **Admin permissions**: Only staff users can bulk acknowledge or delete breaches
5. **Email configuration**: Start with console backend for testing, switch to real SMTP in production

## 🆘 Troubleshooting

### Emails not sending?
```bash
# Test email configuration
python manage.py shell
>>> from django.core.mail import send_mail
>>> send_mail('Test', 'Test message', 'from@example.com', ['to@example.com'])
```

### SMS not sending?
- Verify Twilio credentials in .env
- Check Twilio account has sufficient balance
- Verify phone numbers include country code (+1, +44, etc)

### Permissions not working?
- Make sure user is staff: `User.objects.get(id=X).is_staff = True`
- Check token authentication is working
- Verify `IsAdminUser` permission is imported

### Cleanup command fails?
- Run with `--dry-run` first to check for issues
- Ensure database has sufficient space
- Check logs for specific error messages

## 📚 Additional Resources

- [Django Email Documentation](https://docs.djangoproject.com/en/stable/topics/email/)
- [Twilio Python SDK](https://www.twilio.com/docs/python)
- [DRF Permissions](https://www.django-rest-framework.org/api-guide/permissions/)
- [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) - Full technical details
- [API_ENDPOINTS_GUIDE.md](API_ENDPOINTS_GUIDE.md) - API integration examples

---

**Status**: ✅ All features implemented and ready to use!
