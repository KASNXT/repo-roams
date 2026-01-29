# 🔍 Advanced Properties Code Audit & Fixes

## Issues Found

### ⚠️ CRITICAL ISSUE #1: Missing Fieldsets in Admin
**File**: `roams_opcua_mgr/admin.py` (OpcUaClientConfigAdmin)

**Problem**: 
- Advanced properties exist in the model but are NOT organized in the admin interface
- Users cannot access the "Show Advanced Properties" toggle because it's not in fieldsets
- All timeout and sampling settings are invisible/inaccessible

**Current State**:
```python
class OpcUaClientConfigAdmin(admin.ModelAdmin):
    list_display = (...)
    list_filter = (...)
    search_fields = (...)
    ordering = (...)
    # ❌ NO FIELDSETS DEFINED! ❌
```

**Impact**:
- Users cannot adjust subscription_interval
- Cannot configure timeouts (connection, session, request, etc.)
- Cannot toggle "Show Advanced Properties"
- Settings stuck at defaults

---

### ⚠️ ISSUE #2: Inconsistent Timeout Ranges
**File**: `roams_opcua_mgr/models/client_config_model.py`

**Problem**: Timeout validators are NOT aligned with practical use cases

```python
# CURRENT (Has Issues)
session_time_out = IntegerField(
    default=30000,  # 30 seconds
    validators=[MinValueValidator(1000), MaxValueValidator(3600000)],  # ⚠️ Range: 1s to 1 hour
)

secure_time_out = IntegerField(
    default=10000,  # 10 seconds
    validators=[MinValueValidator(1000), MaxValueValidator(30000)],   # ⚠️ Range: 1s to 30s
)

connection_time_out = IntegerField(
    default=5000,   # 5 seconds
    validators=[MinValueValidator(1000), MaxValueValidator(60000)],   # ⚠️ Range: 1s to 60s
)
```

**Issues**:
1. `session_time_out` max=3600000ms (1 hour) is unrealistic - most systems fail/retry long before that
2. Ranges not documented in help text
3. No cross-field validation (e.g., session_time_out should be > connection_time_out)

---

### ⚠️ ISSUE #3: Missing Default Value for Authentication Reference
The admin form lacks a way to set authentication credentials for stations. Currently:
- Authentication settings exist but are not linked in the admin UI
- Users have no way to set username/password via admin
- Security settings (policy/mode) are there but incomplete

---

### ⚠️ ISSUE #4: No Read-Only Fields for Timestamps
Advanced properties change over time but:
- `last_connected` is editable (should be read-only)
- `connection_status` changes dynamically but is editable
- Need read-only field display for monitoring

---

## Code Fixes

### Fix #1: Add Proper Fieldsets to OpcUaClientConfigAdmin

Add comprehensive fieldsets organization with collapsible advanced section:

```python
@admin.register(OpcUaClientConfig)
class OpcUaClientConfigAdmin(admin.ModelAdmin):
    list_display = ("station_name", "endpoint_url", "active", "colored_status", "last_connected")
    list_filter = ("active", "connection_status", "security_policy")
    search_fields = ("station_name", "endpoint_url")
    ordering = ("station_name",)
    actions = [delete_logs_action]
    
    # 🎯 ADD THIS FIELDSETS CONFIGURATION:
    fieldsets = (
        ("🏢 Basic Information", {
            "fields": ("station_name", "endpoint_url", "active"),
            "description": "Station name and OPC UA server connection details"
        }),
        ("📍 Geographic Location", {
            "fields": ("latitude", "longitude"),
            "classes": ("collapse",),
            "description": "GPS coordinates for mapping (optional)"
        }),
        ("🔐 Security Settings", {
            "fields": ("security_policy", "security_mode"),
            "description": "Configure authentication method"
        }),
        ("⏱️ Connection Timeouts", {
            "fields": (
                "connection_time_out",
                "session_time_out",
                "request_time_out",
                "secure_time_out",
                "acknowledge_time_out",
            ),
            "classes": ("collapse",),
            "description": "All values in milliseconds (ms). Adjust for slow/fast networks."
        }),
        ("📊 Sampling & Data Collection", {
            "fields": ("subscription_interval",),
            "classes": ("collapse",),
            "description": "How often to read values from OPC UA server (milliseconds)"
        }),
        ("📋 Advanced Options", {
            "fields": ("show_advanced_properties",),
            "classes": ("collapse",),
            "description": "Toggle this to show/hide advanced fields above"
        }),
        ("📈 Connection Status", {
            "fields": ("connection_status", "last_connected", "created_at"),
            "classes": ("collapse",),
            "readonly_fields": ("connection_status", "last_connected", "created_at"),
            "description": "Auto-updated by system - read-only"
        }),
    )
    
    readonly_fields = ("connection_status", "last_connected", "created_at")
```

---

### Fix #2: Improve Timeout Defaults & Validators

Update the model with better defaults and ranges based on OPC UA best practices:

```python
# IN roams_opcua_mgr/models/client_config_model.py

# CONNECTION TIMEOUTS - How long to wait for OPC UA server to respond
connection_time_out = models.IntegerField(
    default=5000,  # 5 seconds - GOOD for local networks
    validators=[MinValueValidator(1000), MaxValueValidator(30000)],  # 1s-30s (more realistic)
    help_text="⏱️ Connection timeout in milliseconds. "
              "Local network: 3000-5000ms | Remote: 10000-15000ms | Slow: 20000-30000ms. "
              "Reduce to fail fast on unreachable servers; increase for slow/remote networks."
)

# SESSION TIMEOUTS - How long OPC UA server keeps session alive with no activity
session_time_out = models.IntegerField(
    default=30000,  # 30 seconds - GOOD default
    validators=[MinValueValidator(5000), MaxValueValidator(600000)],  # 5s-10min (more realistic: removed 1h max)
    help_text="🔄 Session timeout in milliseconds. "
              "Typical: 30000-60000ms (30-60s). Server closes idle sessions after this time. "
              "Increase if frequent disconnects."
)

# REQUEST TIMEOUTS - How long to wait for individual OPC UA requests
request_time_out = models.IntegerField(
    default=10000,  # 10 seconds - GOOD default
    validators=[MinValueValidator(1000), MaxValueValidator(60000)],  # 1s-60s
    help_text="📝 Request timeout in milliseconds. "
              "Time to wait for OPC UA server response. Typical: 5000-10000ms."
)

# SECURE CHANNEL TIMEOUTS - For encrypted communications
secure_time_out = models.IntegerField(
    default=10000,  # 10 seconds - GOOD default
    validators=[MinValueValidator(5000), MaxValueValidator(30000)],  # 5s-30s (minimum 5s for secure channel)
    help_text="🔒 Secure channel timeout in milliseconds. "
              "For encrypted connections. Minimum 5000ms recommended."
)

# ACKNOWLEDGE TIMEOUTS - For writes/control operations
acknowledge_time_out = models.IntegerField(
    default=5000,  # 5 seconds - GOOD default
    validators=[MinValueValidator(1000), MaxValueValidator(30000)],  # 1s-30s
    help_text="✓ Acknowledge timeout in milliseconds. "
              "Wait time for write operations to complete. Typical: 3000-5000ms."
)

# SAMPLING INTERVAL - How often to read from OPC UA
subscription_interval = models.IntegerField(
    default=5000,  # 5 seconds - GOOD default (balanced)
    validators=[MinValueValidator(1000), MaxValueValidator(60000)],  # 1s-60s (same as before - GOOD)
    help_text="📈 Subscription interval in milliseconds. "
              "Fast sensors: 1000ms | General: 5000ms | Slow sensors: 30000ms. "
              "Must match other SCADA systems for data comparison."
)
```

---

### Fix #3: Add Custom Validation for Timeouts

Add a `clean()` method to validate timeout relationships:

```python
def clean(self):
    """
    Validate timeout configuration for consistency.
    """
    # Import ValidationError at method level
    from django.core.exceptions import ValidationError
    
    errors = {}
    
    # ✅ Security policy/mode must match
    if self.security_policy != "None" and self.security_mode == "None":
        errors['security_mode'] = "Security mode required when policy is selected"
    
    if self.security_mode != "None" and self.security_policy == "None":
        errors['security_policy'] = "Security policy required when mode is selected"
    
    # ✅ Session timeout should be greater than connection timeout
    if self.session_time_out <= self.connection_time_out:
        errors['session_time_out'] = (
            f"Session timeout ({self.session_time_out}ms) should be > "
            f"connection timeout ({self.connection_time_out}ms)"
        )
    
    # ✅ Request timeout should not exceed session timeout
    if self.request_time_out > self.session_time_out:
        errors['request_time_out'] = (
            f"Request timeout ({self.request_time_out}ms) should be < "
            f"session timeout ({self.session_time_out}ms)"
        )
    
    # Raise all errors together
    if errors:
        raise ValidationError(errors)
    
    # Call parent clean()
    super().clean()
```

---

## Recommendations by Use Case

### For Local Network (Fast, Reliable)
```
connection_time_out:    3000ms  (3 seconds)
session_time_out:       30000ms (30 seconds)
request_time_out:       5000ms  (5 seconds)
subscription_interval:  5000ms  (5 seconds) [MATCH OTHER SCADA]
```

### For Remote Network (Slower, Occasional Latency)
```
connection_time_out:    10000ms (10 seconds)
session_time_out:       60000ms (60 seconds)
request_time_out:       15000ms (15 seconds)
subscription_interval:  10000ms (10 seconds) [MATCH OTHER SCADA]
```

### For Very Slow/Unreliable Network
```
connection_time_out:    20000ms (20 seconds)
session_time_out:       120000ms (2 minutes)
request_time_out:       30000ms (30 seconds)
subscription_interval:  30000ms (30 seconds) [MATCH OTHER SCADA]
```

---

## Testing the Fixes

### Before Deploying
1. ✓ Admin interface shows all advanced property fields
2. ✓ Fields are properly grouped with collapse sections
3. ✓ Help text explains each timeout's purpose
4. ✓ Validation prevents invalid timeout combinations
5. ✓ Read-only fields show system-managed values
6. ✓ Connection status colors display correctly

### Verification Steps
```bash
# 1. Restart Django
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
source venv_new/bin/activate
python manage.py runserver

# 2. Go to admin
# http://localhost:8000/admin/roams_opcua_mgr/opcuaclientconfig/

# 3. Click any station to edit
# 4. Verify:
#    ✓ Advanced Properties checkbox visible
#    ✓ All timeout fields present and organized
#    ✓ subscription_interval accessible
#    ✓ Help text clear and helpful
#    ✓ connection_status is read-only (grayed out)

# 5. Try to enter invalid values
#    ✓ Session timeout < connection timeout = ERROR
#    ✓ Values outside range = ERROR
#    ✓ Helpful error messages shown
```

---

## Summary Table

| Field | Current | Issue | Fixed Value | Notes |
|-------|---------|-------|-------------|-------|
| `connection_time_out` | 5000ms | ✓ OK | 5000ms | Fast enough for most networks |
| `session_time_out` | 30000ms | ⚠️ Default too low | 30000ms | OK, but can increase to 60000 |
| `request_time_out` | 10000ms | ✓ OK | 10000ms | Good balance |
| `secure_time_out` | 10000ms | ✓ OK | 10000ms | Suitable for encrypted |
| `acknowledge_time_out` | 5000ms | ✓ OK | 5000ms | Good for writes |
| `subscription_interval` | 5000ms | ✓ OK | 5000ms | Must match other SCADA |
| **Admin Fieldsets** | ❌ MISSING | **CRITICAL** | ✓ ADDED | Now properly organized |
| **Timeout Validation** | ❌ NONE | ⚠️ ISSUE | ✓ ADDED | Prevents invalid combinations |
| **Read-Only Fields** | ❌ MISSING | ⚠️ ISSUE | ✓ ADDED | Status fields protected |

---

## Conclusion

**Status**: ⚠️ **PARTIALLY WELL-CODED** but **MISSING UI CONFIGURATION**

**Critical Issues**:
1. ❌ Admin fieldsets missing (users can't access settings)
2. ⚠️ No timeout relationship validation
3. ⚠️ Help text could be more detailed

**Quick Fixes Applied**:
1. ✅ Added comprehensive fieldsets with grouping
2. ✅ Improved timeout default descriptions
3. ✅ Added validation logic
4. ✅ Made status fields read-only

All fixes are provided in the code sections above - ready to implement!

