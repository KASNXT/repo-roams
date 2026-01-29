# ROAMS Project - Quick Action Items (Priority Order)

## 🚀 Start Here

This file contains the most important issues to fix **before production**, ordered by impact and effort.

---

## TIER 1: Critical (Fix This Week)

### ✅ Task 1.1: Fix Database Connection Pooling
**Time:** 30 minutes  
**Impact:** CRITICAL - System crashes after ~1 hour under load

**Steps:**
1. Edit `roams_backend/roams_pro/settings.py`
2. Find the `DATABASES` section
3. Add these lines inside the `'default'` database config:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        # ... other settings ...
        'CONN_MAX_AGE': 60,  # ADD THIS LINE
        'OPTIONS': {
            'connect_timeout': 10,
        }
    }
}
```

4. Test with extended runtime:
```bash
python manage.py runserver
# Let it run for 2+ hours, check for connection errors
```

---

### ✅ Task 1.2: Reduce OPC UA Warning Spam
**Time:** 45 minutes  
**Impact:** HIGH - Logs are unreadable, hard to spot real errors

**Steps:**

1. Create new file: `roams_backend/roams_opcua_mgr/node_cache.py`

```python
from datetime import datetime, timedelta
from typing import Set

class NodeValidationCache:
    """Cache invalid OPC UA nodes to prevent repeated failed reads"""
    
    def __init__(self, grace_period_minutes: int = 5):
        self.invalid_nodes: dict = {}  # {node_id: first_failure_time}
        self.grace_period = timedelta(minutes=grace_period_minutes)
    
    def should_skip_node(self, node_id: str) -> bool:
        """Returns True if node should be skipped (recent failure)"""
        if node_id not in self.invalid_nodes:
            return False
        
        failed_at = self.invalid_nodes[node_id]
        if datetime.now() - failed_at < self.grace_period:
            return True  # Skip this node
        else:
            del self.invalid_nodes[node_id]  # Retry after grace period
            return False
    
    def mark_invalid(self, node_id: str):
        """Mark node as invalid after failed read"""
        if node_id not in self.invalid_nodes:
            self.invalid_nodes[node_id] = datetime.now()
    
    def get_invalid_nodes_count(self) -> int:
        return len(self.invalid_nodes)

# Global instance
node_cache = NodeValidationCache()
```

2. Update `roams_backend/roams_opcua_mgr/read_data.py`:
   - Import: `from .node_cache import node_cache`
   - Before each node read, add: `if node_cache.should_skip_node(node_id): continue`
   - After failed read, add: `node_cache.mark_invalid(node_id)`

3. Restart server and verify logs are cleaner

---

### ✅ Task 1.3: Add React Error Boundaries
**Time:** 1 hour  
**Impact:** MEDIUM - Prevents entire app crash from single component error

**Steps:**

1. Create: `roams_frontend/src/components/ErrorBoundary.tsx`

```typescript
import React, { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught:', error, errorInfo);
    // TODO: Send to error tracking service (Sentry)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
            <div className="flex items-center mb-4">
              <AlertTriangle className="text-red-600 mr-3" size={32} />
              <h1 className="text-2xl font-bold text-red-600">Oops!</h1>
            </div>
            <p className="text-gray-700 mb-4">
              Something went wrong. Please try refreshing the page.
            </p>
            <details className="mb-4 text-sm text-gray-600">
              <summary>Error details</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto text-xs">
                {this.state.error?.toString()}
              </pre>
            </details>
            <button
              onClick={this.handleReset}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center"
            >
              <RefreshCw size={18} className="mr-2" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

2. Update `roams_frontend/src/App.tsx` - wrap major routes:

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
          <Route path="/stations" element={<ErrorBoundary><StationMap /></ErrorBoundary>} />
          {/* ... */}
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
```

3. Test: Open browser console, intentionally break a component, verify error boundary catches it

---

## TIER 2: High Priority (Fix Next 2 Weeks)

### 🔐 Task 2.1: Add Rate Limiting
**Time:** 1.5 hours  
**Impact:** HIGH - Prevents API abuse/DoS

**Steps:**

1. Create: `roams_backend/roams_api/throttles.py`

```python
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle

class UserThrottle(UserRateThrottle):
    """Limit authenticated users to 1000 requests/hour"""
    scope = 'user'

class AnonThrottle(AnonRateThrottle):
    """Limit anonymous users to 100 requests/hour"""
    scope = 'anon'
```

2. Update `roams_backend/roams_pro/settings.py`:

```python
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'roams_api.throttles.UserThrottle',
        'roams_api.throttles.AnonThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'user': '1000/hour',
        'anon': '100/hour',
        'station_list': '100/hour',  # Stricter for expensive queries
    },
    # ... other settings ...
}
```

3. Test with cURL:
```bash
for i in {1..105}; do
  curl -s http://localhost:8000/api/opcua_clientconfig/ | grep -q "throttled" && echo "Throttled at request $i" && break
done
```

---

### 🛡️ Task 2.2: Enable HTTPS & Security Headers
**Time:** 1 hour  
**Impact:** MEDIUM - Required for production

**Update `roams_backend/roams_pro/settings.py`:**

```python
# Add this section at the end
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_CONTENT_SECURITY_POLICY = {
        'default-src': ("'self'",),
        'script-src': ("'self'", "'unsafe-inline'"),
        'img-src': ("'self'", 'data:', 'https:'),
    }
```

---

### 📊 Task 2.3: Setup Error Tracking (Sentry)
**Time:** 1 hour  
**Impact:** MEDIUM - Alerts on production errors

**Steps:**

1. Create Sentry account (sentry.io) - free tier OK for MVP

2. Install SDK:
```bash
pip install sentry-sdk
```

3. Update `roams_backend/roams_pro/settings.py`:

```python
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

sentry_sdk.init(
    dsn="https://YOUR_SENTRY_KEY@sentry.io/YOUR_PROJECT_ID",
    integrations=[DjangoIntegration()],
    traces_sample_rate=0.1,
    send_default_pii=False,
    environment='production' if not DEBUG else 'development'
)
```

4. Frontend - install browser SDK:
```bash
npm install @sentry/react @sentry/tracing
```

5. Update `roams_frontend/src/main.tsx`:

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_KEY",
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
});

// Wrap root component
const RootComponent = Sentry.withProfiler(() => <App />);
```

---

## TIER 3: Medium Priority (Next 4 Weeks)

### 📝 Task 3.1: Add Input Validation for GPS Coordinates
**File:** `roams_backend/roams_opcua_mgr/models/client_config_model.py`

```python
from django.core.validators import MinValueValidator, MaxValueValidator

class OpcUaClientConfig(models.Model):
    # ... existing fields ...
    latitude = models.FloatField(
        validators=[MinValueValidator(-90.0), MaxValueValidator(90.0)],
        null=True,
        blank=True,
        help_text="GPS latitude (-90 to 90)"
    )
    longitude = models.FloatField(
        validators=[MinValueValidator(-180.0), MaxValueValidator(180.0)],
        null=True,
        blank=True,
        help_text="GPS longitude (-180 to 180)"
    )
```

---

### 📊 Task 3.2: Add Prometheus Metrics
**Install:**
```bash
pip install django-prometheus
```

**Update `roams_pro/settings.py`:**
```python
INSTALLED_APPS = [
    'django_prometheus',
    # ... rest ...
]

MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',
    # ... other middleware ...
    'django_prometheus.middleware.PrometheusAfterMiddleware',
]
```

---

### 🧪 Task 3.3: Add Unit Tests
**Create:** `roams_backend/roams_api/tests.py`

```python
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from .models import UserProfile

class UserProfileTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('test', 'test@test.com', 'pass123')
    
    def test_list_users(self):
        response = self.client.get('/api/users/')
        self.assertEqual(response.status_code, 200)
    
    def test_create_user(self):
        response = self.client.post('/api/users/', {
            'username': 'newuser',
            'email': 'new@test.com'
        })
        self.assertEqual(response.status_code, 201)
```

**Run tests:**
```bash
python manage.py test
```

---

## 🎯 Testing Checklist

After each major change, verify:

- [ ] **Backend**: `python manage.py test` passes
- [ ] **Frontend**: `npm run build` succeeds without warnings
- [ ] **No console errors**: Check browser DevTools console
- [ ] **API responds**: Test key endpoints with cURL
- [ ] **OPC UA connects**: Check Django logs for successful connections
- [ ] **Map loads**: Verify stations appear on station map
- [ ] **Database connection**: Monitor connection count for 30+ minutes
- [ ] **Rate limiting works**: Hit endpoint 100+ times, verify 429 response

---

## 📈 Success Metrics

Track these after implementing fixes:

| Metric | Before | After | Goal |
|--------|--------|-------|------|
| Django errors/hour | ~5-10 | <1 | < 1 |
| DB connection pool exhaustion | Every 60min | Never | Never |
| Frontend crashes/day | ~2-3 | 0 | 0 |
| Log lines (warnings) | 1000+/min | <100/min | <50/min |
| API response time | 50-200ms | 50-150ms | <200ms |
| Rate limiting hits | N/A | 0/day | <1/day |

---

## 🆘 If Something Breaks

1. **Check logs first:**
```bash
cd roams_backend
tail -f logs/roams.log  # Backend logs
cd roams_frontend
npm run dev  # Frontend dev server shows errors
```

2. **Test each component independently:**
   - Backend: `curl http://localhost:8000/api/stations/`
   - Frontend: `http://localhost:5173/`
   - OPC UA: Check station map for markers

3. **Rollback changes:**
```bash
git diff  # See what changed
git checkout <file>  # Undo changes
git revert <commit>  # Undo commit
```

4. **Ask for help:** Check conversations or documentation

---

## 📚 References

- [Django Database Pooling Docs](https://docs.djangoproject.com/en/4.2/ref/databases/#persistent-connections)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [DRF Throttling](https://www.django-rest-framework.org/api-guide/throttling/)
- [Sentry Django Integration](https://docs.sentry.io/platforms/python/integrations/django/)

---

**Last Updated:** January 5, 2026  
**Priority Review:** Weekly  
**Status:** Ready to Execute
