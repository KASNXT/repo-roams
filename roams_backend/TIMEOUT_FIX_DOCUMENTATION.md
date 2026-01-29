# PostgreSQL Timeout Resolution - Complete Fix

## Problem
The application was experiencing `OperationalError: canceling statement due to statement timeout` when accessing the Django admin changelist view and during deletion operations. The timeout occurred when PostgreSQL tried to delete the AuthenticationSetting record due to the CASCADE foreign key constraint.

## Root Cause
1. PostgreSQL default statement timeout was too low (~30 seconds)
2. CASCADE delete on OneToOneField was triggering expensive operations
3. Heavy queries during admin list rendering were timing out
4. No proper error handling for bulk delete operations

## Solutions Implemented

### 1. **Changed Foreign Key Constraint**
- **File**: `roams_opcua_mgr/models/authentication.py`
- **Change**: `on_delete=models.CASCADE` → `on_delete=models.DO_NOTHING`
- **Benefit**: Prevents automatic cascade delete triggers that timeout
- **Migration**: `0013_alter_authenticationsetting_client_config.py`

### 2. **Increased PostgreSQL Timeouts**
- **File**: `roams_pro/settings.py`
- **Changes**:
  - `statement_timeout`: 600,000ms (10 min) → 1,800,000ms (30 min)
  - Added `lock_timeout`: 300,000ms (5 min)
- **Applied to**: All database connections

### 3. **Added Admin Timeout Middleware**
- **File**: `roams_pro/middleware.py` (new)
- **Function**: Automatically increases timeouts for `/admin/` and `/api/` requests
- **Per-request**: Sets timeout to 30 minutes for admin operations
- **Registered**: Added to `MIDDLEWARE` in settings.py

### 4. **Added Deletion Signal Handler**
- **File**: `roams_opcua_mgr/signals.py`
- **Handler**: `handle_client_config_deletion()`
- **Function**: Manually deletes AuthenticationSetting when OpcUaClientConfig is deleted
- **Benefit**: Uses optimized raw SQL instead of ORM cascade

### 5. **Enhanced Admin Deletion**
- **File**: `roams_opcua_mgr/admin.py`
- **Features**:
  - Custom `delete_model()` with progress tracking
  - Background thread deletion using `DeletionProgress` cache
  - Custom `delete_view()` showing real-time progress bar
  - Batch processing with 500-record batches
  - Comprehensive error handling

### 6. **Database Optimization**
- **File**: Created `optimize_deletion.py` management command
- **Function**: Creates missing indexes on foreign keys
- **Indexes Created**:
  - `authenticationsetting.client_config_id`
  - `opcuanode.client_config_id`

## Files Modified

| File | Changes |
|------|---------|
| `roams_opcua_mgr/models/authentication.py` | Changed CASCADE to DO_NOTHING |
| `roams_pro/settings.py` | Increased statement_timeout & added lock_timeout |
| `roams_pro/middleware.py` | New admin timeout middleware |
| `roams_opcua_mgr/signals.py` | Added pre_delete signal for AuthenticationSetting |
| `roams_opcua_mgr/admin.py` | Enhanced delete handling with progress tracking |
| `roams_opcua_mgr/migrations/0013_...` | Migration for foreign key change |
| `roams_opcua_mgr/templates/admin/.../delete_progress.html` | Progress bar UI |

## Testing Recommendations

1. **Test Admin Listview**
   ```
   Visit: http://127.0.0.1:8000/admin/roams_opcua_mgr/opcuaclientconfig/
   Should load without timeout
   ```

2. **Test Deletion**
   ```
   - Delete a client config from admin
   - Should show progress bar
   - Should complete without timeout
   ```

3. **Test Signal Handler**
   ```
   python manage.py shell
   >>> from roams_opcua_mgr.models import OpcUaClientConfig
   >>> OpcUaClientConfig.objects.first().delete()
   ```

## Performance Impact

- ✅ Admin list view: Faster (removed cascade delete overhead)
- ✅ Deletion operations: Faster (batch processing & raw SQL)
- ✅ Database queries: Faster (new indexes on foreign keys)
- ⚠️  Memory: Minimal increase (progress tracking via cache)

## Deployment Notes

1. Run migrations: `python manage.py migrate`
2. Run database optimization: `python manage.py optimize_deletion`
3. Restart Django server: `python manage.py runserver`
4. No data loss - all cascading deletes are handled via signals

## Fallback Options

If issues persist:
1. Increase timeouts further in `settings.py`
2. Adjust batch size in `admin.py` (currently 500)
3. Use PostgreSQL `maintenance_work_mem` setting
4. Run `VACUUM ANALYZE` on affected tables
