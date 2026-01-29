# ROAMS Project - Quick Start Guide for Next Actions

## 🎯 TL;DR (Too Long; Didn't Read)

**Your project is WORKING but NOT PRODUCTION-READY.**

**What to do:**
1. Fix 3 critical issues → 2.5 hours → 90% more stable
2. Add monitoring/security → 3 hours → Production-ready
3. Test & optimize → 1-2 weeks → Enterprise-grade

**When:** Start TODAY

---

## 🔴 CRITICAL: Do These TODAY (2.5 hours)

### Issue #1: Database Connections Die After 1 Hour
**How to fix:** Edit one file, add 1 line

```bash
# File: roams_backend/roams_pro/settings.py

# Find this section (around line 150):
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'roams_db',
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': 'localhost',
        'PORT': '5432',
        # ADD THESE TWO LINES:
        'CONN_MAX_AGE': 60,
        'OPTIONS': {'connect_timeout': 10},
    }
}

# Save and restart server
python manage.py runserver
```

**Test:** Let it run for 2 hours, check no connection errors ✅

---

### Issue #2: Logs Full of "Node Not Found" Spam
**How to fix:** Create cache to skip bad nodes

**File:** Create `roams_backend/roams_opcua_mgr/node_cache.py`

```python
from datetime import datetime, timedelta

class NodeCache:
    def __init__(self):
        self.invalid = {}
    
    def skip_node(self, node_id: str) -> bool:
        if node_id not in self.invalid:
            return False
        if datetime.now() - self.invalid[node_id] < timedelta(minutes=5):
            return True
        del self.invalid[node_id]
        return False
    
    def mark_bad(self, node_id: str):
        if node_id not in self.invalid:
            self.invalid[node_id] = datetime.now()

node_cache = NodeCache()
```

**Update:** `roams_backend/roams_opcua_mgr/read_data.py`
- Add import: `from .node_cache import node_cache`
- Before reading: `if node_cache.skip_node(node_id): continue`
- After error: `node_cache.mark_bad(node_id)`

**Test:** Logs should have 90% fewer warnings ✅

---

### Issue #3: One Component Error = Entire App Crashes
**How to fix:** Add error boundary

**File:** Create `roams_frontend/src/components/ErrorBoundary.tsx`

```typescript
import React, { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-100 border border-red-400 rounded">
          <AlertTriangle className="inline mr-2" />
          <p>Something went wrong. Try refreshing.</p>
          <p className="text-sm text-gray-600 mt-2">
            {this.state.error?.message}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Update:** `roams_frontend/src/App.tsx`

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      {/* ... rest of app ... */}
    </ErrorBoundary>
  );
}
```

**Test:** App no longer crashes on component error ✅

---

## 🟡 HIGH PRIORITY: Do This Week (2-3 hours)

### Task #4: Add Rate Limiting (Stop Attacks)

**File:** Create `roams_backend/roams_api/throttles.py`

```python
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle

class UserThrottle(UserRateThrottle):
    scope = 'user'

class AnonThrottle(AnonRateThrottle):
    scope = 'anon'
```

**Update:** `roams_backend/roams_pro/settings.py`

```python
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'roams_api.throttles.UserThrottle',
        'roams_api.throttles.AnonThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'user': '1000/hour',
        'anon': '100/hour',
    }
}
```

---

### Task #5: Enable HTTPS & Security Headers

**Update:** `roams_backend/roams_pro/settings.py`

```python
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
```

---

### Task #6: Add Error Tracking (Sentry)

```bash
# Install
pip install sentry-sdk

# Create account at sentry.io (free tier OK)
# Copy your DSN and add to settings:
```

**Update:** `roams_backend/roams_pro/settings.py`

```python
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

sentry_sdk.init(
    dsn="YOUR_SENTRY_DSN_HERE",
    integrations=[DjangoIntegration()],
    traces_sample_rate=0.1,
    environment='production' if not DEBUG else 'development'
)
```

---

## ✅ Verification Checklist

After each fix, run:

```bash
# Check backend
cd roams_backend
python manage.py check
python -c "import django; django.setup()" && python manage.py test

# Check frontend
cd roams_frontend
npm run build
npm run lint

# Test API
curl http://localhost:8000/api/stations/

# Test 100 requests (should throttle)
for i in {1..110}; do curl -s http://localhost:8000/api/test/ | head -c 20; echo; done
```

---

## 📈 Success Indicators

| Before | After | Success |
|--------|-------|---------|
| Crash after 1 hour | Runs 24+ hours | ✅ |
| 1000+ log warnings | <100 warnings | ✅ |
| Any error = crash | Error shows UI | ✅ |
| No rate limiting | 429 responses | ✅ |
| HTTP only | HTTPS + headers | ✅ |
| Blind to errors | Sentry alerts | ✅ |

---

## 📊 Timeline

```
Today:           ██ Fix 3 critical issues (2.5 hrs)
Tomorrow:        ██ Add rate limiting + security (2 hrs)
This week:       ██ Setup monitoring (1 hr)
Next week:       ████ Add tests + docs (3-4 hrs)
Following week:  ██████ Load test + optimize
→ PRODUCTION READY ✅
```

---

## 🚨 If Something Breaks

```bash
# 1. Check logs
tail -f roams_backend/logs/roams.log

# 2. Verify API
curl http://localhost:8000/api/health/

# 3. Check frontend console
# Open browser, press F12, look for errors

# 4. Restart if needed
pkill -f "python manage.py runserver"
python manage.py runserver

# 5. Revert if needed
git diff                    # See changes
git checkout <filename>     # Undo file
```

---

## 📞 Questions?

- **How to implement?** → See `ACTION_ITEMS_PRIORITY.md` (detailed steps)
- **Why do this?** → See `PROJECT_REVIEW_COMPREHENSIVE.md` (full analysis)
- **What's my progress?** → See `HEALTH_DASHBOARD.md` (tracking sheet)

---

## 🎯 Final Checklist

```
This Week:
□ Database pooling DONE
□ OPC UA cache DONE  
□ Error boundaries DONE
□ Rate limiting DONE
□ Security headers DONE
□ Error tracking setup DONE
→ Redeploy to staging

Next Week:
□ Test with realistic data (2+ hours runtime)
□ Load test (100+ requests/sec)
□ Security audit
□ Full documentation
→ Ready for production

Documentation created:
✅ PROJECT_REVIEW_COMPREHENSIVE.md (full analysis)
✅ ACTION_ITEMS_PRIORITY.md (step-by-step)
✅ HEALTH_DASHBOARD.md (progress tracking)
✅ REVIEW_SUMMARY_EXECUTIVE.md (stakeholder brief)
```

---

## 💡 Pro Tips

1. **Test each fix separately** - Change one thing, test, commit
2. **Keep git commits small** - Easier to revert if needed
3. **Monitor after each deploy** - Watch logs for 30+ minutes
4. **Document as you go** - Future you will thank you
5. **Use feature flags** - Deploy to staging first, then production

---

## 🏁 Success Criteria

Your system is **production-ready** when:

✅ No crashes for 24+ hours continuous run  
✅ All TIER 1 + TIER 2 issues fixed  
✅ Monitoring alerts working  
✅ Rate limiting enforced  
✅ Security headers present  
✅ 60%+ test coverage  
✅ Load test at 500 req/sec passes  
✅ Team trained on monitoring/troubleshooting  

**Expected date:** End of this month (Jan 31, 2026)

---

**You've got this! Let's make it production-ready! 🚀**

*Last updated: January 5, 2026*
