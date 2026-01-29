# 📱 Phone Contact Implementation Guide

## Overview

The ROAMS system has **full SMS notification support** with phone contact fields already implemented. Users can receive SMS notifications when thresholds are breached, but they need to configure their phone numbers first.

---

## ✅ Implementation Status

### Backend (100% Complete)

#### UserProfile Model
**Location:** [roams_backend/roams_api/models.py](roams_backend/roams_api/models.py#L31-L44)

```python
phone_number = models.CharField(
    max_length=20,
    blank=True,
    null=True,
    validators=[
        RegexValidator(
            regex=r'^\+?1?\d{9,15}$',
            message='Phone number must be between 9-15 digits, optionally starting with +',
        )
    ],
    help_text="User's phone number for SMS notifications (format: +1234567890)"
)

sms_notifications = models.BooleanField(
    default=False,
    help_text="User wants to receive SMS notifications"
)

email_notifications = models.BooleanField(
    default=True,
    help_text="User wants to receive email notifications"
)

critical_alerts_only = models.BooleanField(
    default=False,
    help_text="Only receive critical level alerts (ignore warnings)"
)
```

**Features:**
- ✅ Phone number validation (9-15 digits with optional +)
- ✅ Optional field (can be blank)
- ✅ SMS notifications toggle
- ✅ Email notifications toggle
- ✅ Critical alerts only filter

#### User Profile Admin
**Location:** [roams_backend/roams_api/admin.py](roams_backend/roams_api/admin.py#L8-L40)

**Admin can:**
- View all users' phone numbers
- Edit phone numbers for any user
- Toggle email/SMS notifications
- Set critical alerts only mode
- Search by username, email, or phone number

---

### Frontend (100% Complete)

#### Notifications Tab Component
**Location:** [roams_frontend/src/components/settings/NotificationsTab.tsx](roams_frontend/src/components/settings/NotificationsTab.tsx)

**Features:**
- ✅ View all users' notification settings
- ✅ Edit phone numbers in bulk
- ✅ Toggle email notifications
- ✅ Toggle SMS notifications
- ✅ Toggle critical alerts only
- ✅ Manage notification subscriptions

**UI Flow:**
```
Settings → Notifications Tab
├── User Notification Preferences
│   ├── User: [Name] ([Email])
│   ├── [Edit Button] → 
│   │   ├── Phone Number: [Input]
│   │   ├── Email Notifications: [Toggle]
│   │   ├── SMS Notifications: [Toggle]
│   │   ├── Critical Alerts Only: [Toggle]
│   │   └── [Save Button]
│   └── [Table of Users]
└── Notification Subscriptions
    └── [Manage per-node subscriptions]
```

---

## 🚀 How to Use

### For Admins: Adding Phone Numbers via Admin Panel

1. **Log in** as admin/superuser
2. Go to **Django Admin** → **User Profiles**
3. Find the user
4. Edit → Set phone number (format: `+1234567890` or `1234567890`)
5. Click **Save**

### For Admins: Adding Phone Numbers via Settings UI

1. **Log in** as admin/superuser
2. Go to **Settings** → **Notifications**
3. Click **Edit** on the user
4. Enter phone number in the **Phone Number** field
5. **Toggle SMS Notifications** ON
6. Click **Save**

### For End Users: Personal Settings (Future)

When user settings page is implemented, users can:
1. Go to **Account Settings** → **Notifications**
2. Enter their phone number
3. Enable SMS notifications
4. Save

---

## 📧 API Endpoints

### User Profile Endpoints

**Get User Profiles:**
```bash
GET /api/user-profiles/
Authorization: Token <token>
```

**Update User Profile:**
```bash
PATCH /api/user-profiles/{id}/
Authorization: Token <token>
Content-Type: application/json

{
  "phone_number": "+256779273796",
  "email_notifications": true,
  "sms_notifications": true,
  "critical_alerts_only": false
}
```

### Notification Methods

**Via Email:**
- Requires: `email_notifications = true`
- Uses: User's email address from Django User model

**Via SMS:**
- Requires: `sms_notifications = true` AND `phone_number` set
- Provider: Twilio (or custom SMS backend)

---

## 🔒 Permission Model

| Role | Can View | Can Edit Own | Can Edit Others |
|------|----------|--------------|-----------------|
| Viewer | ❌ | ❌ | ❌ |
| Technician | ❌ | ❌ | ❌ |
| Operator | ❌ | ❌ | ❌ |
| Admin | ✅ | ✅ | ✅ |
| Superuser | ✅ | ✅ | ✅ |

Currently, only admin/superuser can manage notification settings via UI. Regular users can self-manage when personal settings page is implemented.

---

## 📝 Database Schema

### UserProfile Table
```
Column                  Type        Nullable  Notes
─────────────────────────────────────────────────────────
id                      INT         NO        Primary Key
user_id                 INT         NO        FK to User
role                    VARCHAR(20) NO        viewer/technician/operator/admin/superuser
phone_number            VARCHAR(20) YES       +1234567890 format
email_notifications     BOOL        NO        Default: true
sms_notifications       BOOL        NO        Default: false
critical_alerts_only    BOOL        NO        Default: false
created_at              DATETIME    NO        Auto
updated_at              DATETIME    NO        Auto
```

---

## 🧪 Testing

### Test Adding Phone Number to User

```bash
# 1. Get user profile ID
curl -H "Authorization: Token YOUR_TOKEN" \
  http://localhost:8000/api/user-profiles/

# 2. Update with phone number
curl -X PATCH -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+256779273796",
    "sms_notifications": true
  }' \
  http://localhost:8000/api/user-profiles/1/

# 3. Verify
curl -H "Authorization: Token YOUR_TOKEN" \
  http://localhost:8000/api/user-profiles/1/
```

### Validation Examples

**Valid Phone Numbers:**
- `+256779273796`
- `+1234567890`
- `256779273796`
- `1234567890`

**Invalid Phone Numbers:**
- `123` (too short)
- `+abc123` (non-numeric)
- `+1` (incomplete)

---

## 🔧 Configuration

### SMS Service (Environment Variables)

If SMS notifications are enabled, configure SMS provider:

```bash
# Twilio (if using)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_FROM=+1234567890

# Or custom SMS backend
SMS_BACKEND=your.custom.backend
SMS_API_KEY=your_api_key
```

### Email Service (Environment Variables)

```bash
# Email configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_password

# Notification sender
DEFAULT_FROM_EMAIL=noreply@roams.local
```

---

## 🎯 Next Steps

### For Immediate Use
1. ✅ Phone contact fields implemented
2. ✅ Admin UI for editing complete
3. Add users' phone numbers via Settings → Notifications tab

### For Full SMS Support
1. Configure SMS provider (Twilio, etc.)
2. Test SMS notifications on threshold breach
3. Monitor SMS delivery logs

### For Enhanced User Experience
1. Implement personal notification settings page
2. Allow users to self-manage their phone numbers
3. Add SMS delivery status tracking
4. Implement SMS verification (OTP)

---

## 📞 Example Users with Phone Numbers

Currently configured users:
- **kasmic**: `+256779273796` (Admin)
  - SMS Notifications: ❌ (disabled)
  - Email Notifications: ✅ (enabled)

Other users can be configured via admin panel or Settings UI.

---

## ✨ Recent Changes

### Fixed Issues
1. ✅ **Dialog Accessibility Warning** - Added DialogDescription to AddUserModal
   - Location: [AddUserModal.tsx](roams_frontend/src/components/settings/AddUserModal.tsx#L117-L122)
   - Fixes: Missing `aria-describedby` warning in console

---

## 🐛 Troubleshooting

### Phone Number Not Saving
- Ensure format matches regex: `+?1?\d{9,15}$`
- Check for trailing spaces
- Verify user role has edit permissions

### SMS Not Sending
1. Verify `sms_notifications = true`
2. Verify phone number is set
3. Check SMS service credentials
4. Review SMS provider logs

### Can't Edit User Phone in Settings UI
- Ensure you're logged in as admin/superuser
- Try Django admin panel instead
- Check browser console for errors

---

## 📚 Related Documentation

- [UserProfile Model](roams_backend/roams_api/models.py)
- [UserProfileAdmin](roams_backend/roams_api/admin.py)
- [NotificationsTab Component](roams_frontend/src/components/settings/NotificationsTab.tsx)
- [API Reference](API_REFERENCE.md)

