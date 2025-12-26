python manage.py makemigrations roams_api roams_opcua_mgr
python manage.py migrate# Notification System Implementation - Complete Guide

## Overview
A comprehensive database-driven notification management system has been implemented for the ROAMS monitoring system. Users can now manage notification preferences, phone numbers, and threshold subscriptions directly from the UI.

## Backend Implementation

### 1. Django Models

#### UserProfile Model (`roams_api/models.py`)
Extends Django's built-in User model with:
- **phone_number**: User's phone number for SMS notifications (with regex validation)
- **email_notifications**: Boolean flag for email preference
- **sms_notifications**: Boolean flag for SMS preference
- **critical_alerts_only**: Only receive critical level alerts (ignore warnings)

**Endpoints:**
- GET/POST: `/api/user-profiles/`
- GET/PATCH/DELETE: `/api/user-profiles/{id}/`

#### NotificationRecipient Model (`roams_opcua_mgr/models/notification_model.py`)
Links OPC UA nodes to users with specific alert preferences:
- **node**: ForeignKey to OPCUANode
- **user**: ForeignKey to Django User
- **alert_level**: 'warning', 'critical', or 'both'
- **email_enabled**: Whether to send emails for this subscription
- **sms_enabled**: Whether to send SMS for this subscription

**Key Methods:**
- `can_receive_email()`: Checks if user can receive emails
- `can_receive_sms()`: Checks if user can receive SMS

**Endpoints:**
- GET/POST: `/api/notification-recipients/`
- GET/PATCH/DELETE: `/api/notification-recipients/{id}/`

### 2. Notification System Update

**File:** `roams_opcua_mgr/notifications.py`

#### New Function: `get_breach_recipients(node, breach_level)`
Queries the database to find all users subscribed to a threshold breach:
- Filters by alert level matching the breach level
- Respects user profile preferences (critical_alerts_only, email/SMS enabled)
- Returns organized dict with 'email' and 'sms' recipient lists

**Usage:**
```python
recipients = get_breach_recipients(node, breach_level='Critical')
# Returns: {'email': ['user@example.com'], 'sms': ['+1234567890']}
```

#### Updated `send_alert_email()` Function
Now uses database-driven recipients instead of hardcoded settings:
- Calls `get_breach_recipients()` to get actual subscribers
- Only sends to users who have opted in
- Respects alert level preferences

### 3. Django Admin Interface

#### UserProfileAdmin
- View/edit user phone numbers
- Manage notification preferences
- Filter by notification settings

#### NotificationRecipientAdmin
- Manage threshold subscriptions
- See user contact info and alert preferences
- Color-coded alert levels
- Permissions: Only staff can manage

## Frontend Implementation

### 1. NotificationsTab Component (`roams_frontend/src/components/settings/NotificationsTab.tsx`)

#### Features:
1. **User Notification Preferences Panel**
   - List all users with profiles
   - Edit phone numbers
   - Toggle email/SMS notifications
   - Set critical alerts only
   - Inline edit with save button

2. **Threshold Alert Subscriptions Panel**
   - View all active subscriptions
   - See which users are subscribed to which parameters
   - View alert levels and notification methods
   - Delete subscriptions

3. **Info Box**
   - Explains how the notification system works
   - User-friendly help text

#### API Calls:
- GET `/api/user-profiles/` - Load user preferences
- GET `/api/notification-recipients/` - Load subscriptions
- PATCH `/api/user-profiles/{id}/` - Update user preferences
- DELETE `/api/notification-recipients/{id}/` - Remove subscription

### 2. Settings Page Integration
- Added "Notifications" tab to Settings page
- Grid expanded from 5 to 6 columns for new tab
- Import: `NotificationsTab` component

### 3. AuthenticationTab Update
- Added phone number column to user table
- Shows "Not set" for users without phone numbers
- Phone numbers can be edited in NotificationsTab

## Workflow Example

### Step 1: User Sets Notification Preferences
1. Go to Settings → Notifications
2. Click "Edit" for a user
3. Enter phone number (e.g., +1234567890)
4. Toggle Email/SMS preferences
5. Optionally enable "Critical Alerts Only"
6. Click "Save"

### Step 2: Create Threshold Subscription
1. In Django Admin: `/admin/roams_opcua_mgr/notificationrecipient/add/`
2. Select OPC UA Node (parameter)
3. Select User
4. Choose alert level (warning/critical/both)
5. Enable email/SMS for this subscription
6. Save

### Step 3: Threshold Breach Occurs
1. Node value exceeds threshold
2. ThresholdBreach record created
3. `send_alert_email()` is called
4. `get_breach_recipients()` queries database
5. Only matching subscriptions are notified
6. Email/SMS sent to configured recipients

## Permission Model

### Permissions:
- **Viewers/Users**: Can view their own profile and subscriptions
- **Staff/Operators**: Can view all profiles and manage subscriptions
- **Superusers**: Full admin access

### Code Example (ViewSet):
```python
def get_queryset(self):
    if self.request.user.is_staff:
        return NotificationRecipient.objects.all()
    return NotificationRecipient.objects.filter(user=self.request.user)
```

## Database Migration

**Required:** Run migrations to create new tables

```bash
python manage.py makemigrations
python manage.py migrate
```

**New Tables:**
- `roams_api_userprofile`
- `roams_opcua_mgr_notificationrecipient`

## Configuration

### Django Settings (Optional)
Keep these for fallback/default settings:

```python
# Email Configuration
THRESHOLD_EMAIL_FROM = 'alerts@roams.local'  # Sender email

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID = 'your_account_sid'
TWILIO_AUTH_TOKEN = 'your_auth_token'
TWILIO_PHONE_FROM = '+1234567890'
```

**Note:** Specific email/SMS addresses are now managed in the database instead of settings.

## API Reference

### User Profiles
```
GET    /api/user-profiles/              # List all profiles
GET    /api/user-profiles/{id}/         # Get specific profile
PATCH  /api/user-profiles/{id}/         # Update profile
```

### Notification Recipients
```
GET    /api/notification-recipients/                      # List subscriptions
POST   /api/notification-recipients/                      # Create subscription
GET    /api/notification-recipients/{id}/                 # Get subscription
PATCH  /api/notification-recipients/{id}/                 # Update subscription
DELETE /api/notification-recipients/{id}/                 # Delete subscription
```

### Query Filters
```
/api/notification-recipients/?node={node_id}&user={user_id}&alert_level=critical
/api/notification-recipients/?search=username
```

## Testing

### Test Notification Delivery:
1. Create a NotificationRecipient subscription
2. Trigger a threshold breach
3. Check logs: `journalctl -f` or `tail -f logs/debug.log`
4. Verify email sent via Django admin

### Test Phone Validation:
- Add phone: "+1234567890" ✅
- Add phone: "1234567890" ✅
- Add phone: "123" ❌ (too short)

## Summary of Changes

### Backend
- ✅ UserProfile model with phone field
- ✅ NotificationRecipient model
- ✅ Django admin interfaces
- ✅ REST API views and serializers
- ✅ Updated notifications.py to use database
- ✅ Database migrations ready

### Frontend
- ✅ NotificationsTab component
- ✅ Settings page integration
- ✅ AuthenticationTab phone column
- ✅ API service calls
- ✅ User-friendly UI with inline editing

### Permissions
- ✅ Staff-only management
- ✅ User self-service profile updates
- ✅ Subscription management

## Next Steps

1. **Run migrations**: `python manage.py migrate`
2. **Create UserProfiles**: Admin interface or management command
3. **Configure Twilio** (if using SMS): Add credentials to settings
4. **Set up subscriptions**: Admin panel or bulk import
5. **Test notifications**: Trigger threshold breaches
6. **Monitor logs**: Check for successful delivery

## Files Modified

### Backend
- `roams_api/models.py` - Added UserProfile
- `roams_api/admin.py` - Added UserProfileAdmin
- `roams_api/serializers.py` - Added serializers
- `roams_api/views.py` - Added ViewSets
- `roams_api/urls.py` - Registered new routes
- `roams_opcua_mgr/models/notification_model.py` - Created NotificationRecipient
- `roams_opcua_mgr/models/__init__.py` - Updated imports
- `roams_opcua_mgr/admin.py` - Added NotificationRecipientAdmin
- `roams_opcua_mgr/notifications.py` - Updated to use database

### Frontend
- `roams_frontend/src/components/settings/NotificationsTab.tsx` - Created
- `roams_frontend/src/pages/Settings.tsx` - Added Notifications tab
- `roams_frontend/src/components/settings/AuthenticationTab.tsx` - Added phone column

---

**Implementation Date:** December 22, 2025
**Status:** Ready for migration and testing
