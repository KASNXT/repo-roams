# Notification System - Quick Reference

## 🎯 What Was Built

A **database-driven notification management system** where users can manage phone numbers, email preferences, and subscribe to threshold alerts directly from the UI.

## 🚀 Key Components

### 1. Backend Models
- **UserProfile**: Stores phone numbers + notification preferences
- **NotificationRecipient**: Links users to node thresholds with alert levels

### 2. Frontend UI
- **Notifications Tab** (Settings → Notifications)
  - View/edit user preferences
  - Manage phone numbers
  - View active subscriptions
  - Control email/SMS for each user

- **Authentication Tab** (enhanced)
  - Shows phone numbers in user table

### 3. API Endpoints
- `/api/user-profiles/` - User preferences
- `/api/notification-recipients/` - Subscriptions

---

## 📋 Implementation Checklist

Before using the system:

- [ ] Run Django migrations: `python manage.py migrate`
- [ ] Create UserProfile records (auto-created on first login or via admin)
- [ ] Go to Settings → Notifications to configure users
- [ ] Add phone numbers and toggle email/SMS preferences
- [ ] Go to Django Admin → Notification Recipients to create subscriptions
- [ ] Trigger a test threshold breach to verify email/SMS delivery

---

## 🎮 How to Use

### For Admins:
1. Settings → Notifications → Edit user preferences
2. Add phone numbers (format: +1234567890)
3. Toggle Email/SMS/Critical-Only
4. Save changes

### Create Alert Subscriptions:
1. Django Admin → Notification Recipients → Add
2. Select parameter (node) and user
3. Choose alert level (warning/critical/both)
4. Enable email/SMS notifications
5. Save

### Result:
When threshold breaches, only subscribed users get notified!

---

## 🔒 Permissions

| Role | Permissions |
|------|------------|
| User | View own preferences |
| Staff | Manage all preferences & subscriptions |
| Superuser | Full admin access |

---

## 📊 Data Model

```
User (Django Built-in)
  └─ UserProfile (1-to-1)
      ├─ phone_number
      ├─ email_notifications (bool)
      ├─ sms_notifications (bool)
      └─ critical_alerts_only (bool)

OPCUANode
  ├─ NotificationRecipient (many)
  │   ├─ user (FK → User)
  │   ├─ alert_level (warning/critical/both)
  │   ├─ email_enabled (bool)
  │   └─ sms_enabled (bool)
```

---

## 🔧 Integration Points

### When a threshold breach occurs:
1. `ThresholdBreach` record created
2. `send_alert_email(node, breach)` called
3. `get_breach_recipients(node, breach_level)` queries database
4. Matching recipients get notified via email/SMS

### Database Query (simplified):
```python
subscriptions = NotificationRecipient.objects.filter(
    node=node,
    alert_level__in=['critical', 'both']  # if Critical breach
).select_related('user', 'user__profile')

for sub in subscriptions:
    if sub.email_enabled and sub.user.profile.email_notifications:
        send_email(sub.user.email, ...)
    if sub.sms_enabled and sub.user.profile.phone_number:
        send_sms(sub.user.profile.phone_number, ...)
```

---

## 🐛 Troubleshooting

### UserProfile not appearing?
- Create via: `UserProfile.objects.create(user=user)`
- Or: User logs in → auto-created signal (if implemented)

### Notifications not sending?
- Check: User has email in Django User
- Check: NotificationRecipient exists for that node
- Check: `alert_level` matches breach level
- Check: email/sms_enabled = True
- Check: user.profile.email_notifications = True

### Phone validation fails?
- Must be 9-15 digits
- Optional leading +
- Examples: `+1234567890`, `1234567890`, `9876543210`

---

## 📚 Files Changed

**Backend:** 9 files  
**Frontend:** 3 files  
**Total:** 12 file changes

See `NOTIFICATION_SYSTEM_GUIDE.md` for detailed file list.

---

## ✅ Status

- ✅ Backend complete
- ✅ Frontend complete
- ✅ Admin interfaces ready
- ⏳ Migrations pending (run: `python manage.py migrate`)
- ⏳ Testing & deployment

---

**Next Command:**
```bash
python manage.py makemigrations
python manage.py migrate
```

Then visit: **Settings → Notifications** to start managing alerts!
