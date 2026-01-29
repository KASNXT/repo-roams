# Role System Enhancement - Visual Guide

## 🎨 **Before vs After**

### Add User Modal

**BEFORE:**
```
┌─────────────────────────────────────┐
│ Add New User                        │
├─────────────────────────────────────┤
│ Username: [_____________________]   │
│ Email: [________________________]    │
│ Password: [____________________]    │
│ Confirm Password: [______________] │
│ Role: [Operator ▼]                 │
│        ├─ Operator (Regular)       │
│        └─ Admin (Full Access)       │
│ ✓ Account Active                    │
└─────────────────────────────────────┘
```

**AFTER:**
```
┌─────────────────────────────────────┐
│ Add New User                        │
├─────────────────────────────────────┤
│ Username: [_____________________]   │
│ Email: [________________________]    │
│ Password: [____________________]    │
│ Confirm Password: [______________] │
│ Role: [Viewer ▼]                   │
│        ├─ Viewer (Read-only)       │
│        ├─ Technician (Equipment)   │
│        ├─ Operator (Full access)   │
│        └─ Admin (System admin)     │
│ ✓ Account Active                    │
│                                     │
│ • Viewer: View-only access         │
│ • Technician: Equipment control    │
│ • Operator: Full access             │
│ • Admin: System admin              │
└─────────────────────────────────────┘
```

---

### User Management Table

**BEFORE:**
```
┌────────────┬──────────────┬────────────┬─────────┐
│ Username   │ Email        │ Role       │ Actions │
├────────────┼──────────────┼────────────┼─────────┤
│ john       │ john@a.com   │ [Admin]    │ ...     │
│ jane       │ jane@a.com   │ [Operator] │ ...     │
└────────────┴──────────────┴────────────┴─────────┘

Actions Menu:
├─ Promote to Admin (disabled if admin)
├─ Demote to Operator (disabled if not admin)
└─ Deactivate/Activate
```

**AFTER:**
```
┌────────────┬──────────────┬─────────────┬─────────┐
│ Username   │ Email        │ Role        │ Actions │
├────────────┼──────────────┼─────────────┼─────────┤
│ john       │ john@a.com   │ [Admin]     │ ...     │
│ jane       │ jane@a.com   │ [Operator]  │ ...     │
│ bob        │ bob@a.com    │ [Technician]│ ...     │
│ alice      │ alice@a.com  │ [Viewer]    │ ...     │
└────────────┴──────────────┴─────────────┴─────────┘

Actions Menu (Now with 4 Roles):
├─ Set as Viewer
├─ Set as Technician
├─ Set as Operator
├─ Promote to Admin
└─ Deactivate/Activate
```

---

### Role Permissions Matrix

**BEFORE (Static):**
```
┌──────────────────┬───────┬──────────┬────────┐
│ Permission       │ Admin │ Operator │ Viewer │
├──────────────────┼───────┼──────────┼────────┤
│ View Dashboard   │  ✅   │    ✅    │   ✅   │
│ Modify Settings  │  ✅   │    ❌    │   ❌   │
│ Control Equipment│  ✅   │    ✅    │   ❌   │
│ View Reports     │  ✅   │    ✅    │   ✅   │
│ User Management  │  ✅   │    ❌    │   ❌   │
│ System Logs      │  ✅   │    ✅    │   ❌   │
└──────────────────┴───────┴──────────┴────────┘

(No edit capability)
```

**AFTER (Editable for Admins):**
```
View Mode (Everyone Sees This):
┌──────────────────┬──────────┬────────────┬──────────┬───────┐
│ Permission       │ Viewer   │ Technician │ Operator │ Admin │
├──────────────────┼──────────┼────────────┼──────────┼───────┤
│ View Dashboard   │    ✓     │     ✓      │    ✓     │   ✓   │
│ Modify Settings  │    ✗     │     ✗      │    ✓     │   ✓   │
│ Control Equipment│    ✗     │     ✓      │    ✓     │   ✓   │
│ View Reports     │    ✓     │     ✓      │    ✓     │   ✓   │
│ User Management  │    ✗     │     ✗      │    ✗     │   ✓   │
│ System Logs      │    ✗     │     ✓      │    ✓     │   ✓   │
│ View Alarms      │    ✓     │     ✓      │    ✓     │   ✓   │
│ Acknowledge Alm. │    ✗     │     ✓      │    ✓     │   ✓   │
└──────────────────┴──────────┴────────────┴──────────┴───────┘

                    [Edit Permissions] (Admin only)
                    ↓
Edit Mode (Admin Click "Edit Permissions"):
┌──────────────────┬──────────┬────────────┬──────────┬───────┐
│ Permission       │ Viewer   │ Technician │ Operator │ Admin │
├──────────────────┼──────────┼────────────┼──────────┼───────┤
│ View Dashboard   │  [☑]     │    [☑]     │   [☑]    │ [☑]   │
│ Modify Settings  │  [☐]     │    [☐]     │   [☑]    │ [☑]   │
│ Control Equipment│  [☐]     │    [☑]     │   [☑]    │ [☑]   │
│ View Reports     │  [☑]     │    [☑]     │   [☑]    │ [☑]   │
│ User Management  │  [☐]     │    [☐]     │   [☐]    │ [☑]   │
│ System Logs      │  [☐]     │    [☑]     │   [☑]    │ [☑]   │
│ View Alarms      │  [☑]     │    [☑]     │   [☑]    │ [☑]   │
│ Acknowledge Alm. │  [☐]     │    [☑]     │   [☑]    │ [☑]   │
└──────────────────┴──────────┴────────────┴──────────┴───────┘
                    [Save Changes] [Cancel]
```

---

## 🔄 **Data Flow**

### Create User with Role

```
Frontend (AddUserModal)
    │
    ├─ Username: john_tech
    ├─ Email: john@test.com
    ├─ Password: secret123
    └─ Role: technician  ← NEW!
           │
           ▼
POST /api/users/
    {
        "username": "john_tech",
        "email": "john@test.com",
        "password": "secret123",
        "role": "technician"  ← NEW!
    }
           │
           ▼
Backend (UserViewSet.create())
    │
    ├─ Validate role in ['viewer', 'technician', 'operator', 'admin']  ← NEW!
    ├─ Set is_staff = (role in ['admin', 'superuser'])  ← NEW!
    ├─ Create User object
    └─ Create UserProfile with role=technician  ← NEW!
           │
           ▼
Response 201
    {
        "id": 5,
        "username": "john_tech",
        "role": "technician",  ← NEW!
        "is_staff": false,
        ...
    }
```

### Change User Role

```
Frontend (AuthenticationTab)
    │
    └─ Click "Actions" > "Set as Admin"
           │
           ▼
POST /api/users/5/set_user_role/
    {
        "role": "admin"  ← Changed from is_staff
    }
           │
           ▼
Backend (UserViewSet.set_user_role())
    │
    ├─ Validate role in ['viewer', 'technician', 'operator', 'admin', 'superuser']
    ├─ Update UserProfile.role = "admin"
    └─ Update User.is_staff = True (since admin is privileged)
           │
           ▼
Response 200
    {
        "message": "User john_tech role changed to admin",
        "role": "admin",
        "is_staff": true
    }
           │
           ▼
Frontend refresh users list
    └─ Show new role badge
```

### Edit Permissions Matrix

```
Frontend (AuthenticationTab - Admin View)
    │
    ├─ See permissions matrix with ✓ and ✗
    ├─ Click "Edit Permissions"
    │   │
    │   ├─ Matrix switches to edit mode
    │   ├─ Shows checkboxes for each role/permission
    │   └─ Admin toggles checkboxes
    │       │
    │       └─ Click "View Dashboard" checkbox for Viewer role
    │           └─ Checkbox becomes unchecked
    │
    └─ Click "Save Changes"
           │
           ▼
POST /api/users/permissions_matrix/
    {
        "permissions": [...],
        "roles": {
            "viewer": [false, false, ...],  ← Changed!
            "technician": [...],
            "operator": [...],
            "admin": [...],
            "superuser": [...]
        }
    }
           │
           ▼
Backend (UserViewSet.permissions_matrix())
    │
    ├─ Validate matrix structure
    ├─ Save to database (or memory for demo)
    └─ Respond with updated matrix
           │
           ▼
Response 200
    {
        "message": "Permissions matrix updated"
    }
           │
           ▼
Frontend
    │
    ├─ Switch back to view mode
    ├─ Refresh matrix display
    └─ Show new permission state with ✓ and ✗
```

---

## 📱 **Mobile vs Desktop**

### Mobile - Add User Modal
```
Screen: 375px
┌──────────────────────────┐
│ Add New User             │
├──────────────────────────┤
│ Username                 │
│ [______________________] │
│                          │
│ Email                    │
│ [______________________] │
│                          │
│ Password                 │
│ [______________________] │
│                          │
│ Confirm Password         │
│ [______________________] │
│                          │
│ Role                     │
│ [Viewer ▼]              │
│  • Viewer               │
│  • Technician           │
│  • Operator             │
│  • Admin                │
│                          │
│ ✓ Account Active         │
│                          │
│    [Cancel] [Create]     │
└──────────────────────────┘
```

### Desktop - User Table
```
Screen: 1920px
┌────────────┬──────────────┬─────────────┬────────┬────────────┬─────────┐
│ Username   │ Email        │ Role        │ Status │ Last Login │ Actions │
├────────────┼──────────────┼─────────────┼────────┼────────────┼─────────┤
│ admin_user │ admin@a.com  │ [Admin]     │ Active │ 2 min ago  │ Actions │
│ john_tech  │ john@a.com   │ [Technician]│ Active │ 1 hour ago │ Actions │
│ jane_op    │ jane@a.com   │ [Operator]  │ Active │ 3 hours ago│ Actions │
│ viewer_bob │ bob@a.com    │ [Viewer]    │ Active │ Never      │ Actions │
└────────────┴──────────────┴─────────────┴────────┴────────────┴─────────┘
```

### Desktop - Permissions Matrix
```
Screen: 1920px
┌──────────────────┬──────────┬────────────┬──────────┬───────┬──────────┐
│ Permission       │ Viewer   │ Technician │ Operator │ Admin │ Superuser│
├──────────────────┼──────────┼────────────┼──────────┼───────┼──────────┤
│ View Dashboard   │    ✓     │     ✓      │    ✓     │   ✓   │    ✓     │
│ Modify Settings  │    ✗     │     ✗      │    ✓     │   ✓   │    ✓     │
│ Control Equipment│    ✗     │     ✓      │    ✓     │   ✓   │    ✓     │
│ View Reports     │    ✓     │     ✓      │    ✓     │   ✓   │    ✓     │
│ User Management  │    ✗     │     ✗      │    ✗     │   ✓   │    ✓     │
│ System Logs      │    ✗     │     ✓      │    ✓     │   ✓   │    ✓     │
│ View Alarms      │    ✓     │     ✓      │    ✓     │   ✓   │    ✓     │
│ Acknowledge Alm. │    ✗     │     ✓      │    ✓     │   ✓   │    ✓     │
└──────────────────┴──────────┴────────────┴──────────┴───────┴──────────┘

                              [Edit Permissions]
```

---

## 🎯 **Role Hierarchy**

```
                    Superuser
                       │
                       ▼
                     Admin
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   Operator      Technician       Viewer
   (full ops)    (equipment)   (read-only)

Legend:
• Superuser: Full system access (Django superuser flag)
• Admin: Can manage users, modify settings, control equipment
• Operator: Can control equipment, view data
• Technician: Can control specific equipment, view logs
• Viewer: Read-only access to dashboards and reports
```

---

## ✨ **Color Coding**

| Role | Color | Hex Code | Usage |
|------|-------|----------|-------|
| Admin | Red/Destructive | #DC2626 | Highest authority |
| Technician | Blue | #2563EB | New role - equipment focus |
| Operator | Orange/Warning | #F59E0B | Full equipment access |
| Viewer | Gray/Neutral | #6B7280 | Lowest access |
| Superuser | Red/Destructive | #DC2626 | (Same as Admin) |

---

## 📊 **Default Permission Matrix**

```
Permission Matrix (Built-in Defaults):

                    Viewer  Technician  Operator  Admin  Superuser
├─ View Dashboard        ✓       ✓         ✓       ✓       ✓
├─ Modify Settings       ✗       ✗         ✓       ✓       ✓
├─ Control Equipment     ✗       ✓         ✓       ✓       ✓
├─ View Reports          ✓       ✓         ✓       ✓       ✓
├─ User Management       ✗       ✗         ✗       ✓       ✓
├─ System Logs           ✗       ✓         ✓       ✓       ✓
├─ View Alarms           ✓       ✓         ✓       ✓       ✓
└─ Acknowledge Alarms    ✗       ✓         ✓       ✓       ✓

Feature Count:
• Viewer:      3/8 features (37%)
• Technician:  5/8 features (63%)
• Operator:    6/8 features (75%)
• Admin:       8/8 features (100%)
• Superuser:   8/8 features (100%)
```

---

*Visual Guide for Role System Enhancement*
*December 31, 2025*
