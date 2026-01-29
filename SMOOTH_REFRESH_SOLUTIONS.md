# 🎯 Smooth Refresh Solutions - Code Examples & Patterns

This file contains 6 different approaches to implement smooth page refresh without blinking. Choose the one that best fits your use case.

---

## Solution 1: Keep Old Data While Fetching (✅ RECOMMENDED)

**Why:** Simplest, most effective. Old data stays visible while fetching new data.

```tsx
import { useEffect, useState } from "react";
import axios from "axios";

const OverviewSmooth = () => {
  const [uptimeData, setUptimeData] = useState<any[]>([]);
  const [overallUptime, setOverallUptime] = useState<number>(0);
  const [serverUptime, setServerUptime] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false); // DON'T use "loading"

  useEffect(() => {
    const fetchUptimeTrend = async () => {
      setIsRefreshing(true); // Subtle flag, doesn't hide data
      
      try {
        const trendRes = await axios.get<any>("/api/uptime-trend/?hours=24");
        
        // Keep showing old data until new data arrives
        if (trendRes.data.trend && trendRes.data.trend.length > 0) {
          setUptimeData(trendRes.data.trend);
        }
        
        setOverallUptime(trendRes.data.overall_uptime || 0);
        setServerUptime(trendRes.data.server_uptime || null);
      } catch (err) {
        console.error("Uptime fetch error:", err);
        // Old data stays visible on error ✅
      } finally {
        setIsRefreshing(false); // Just stops the refresh indicator
      }
    };

    fetchUptimeTrend();
    const interval = setInterval(fetchUptimeTrend, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {/* The key: Don't hide content when isRefreshing is true */}
      {/* Old data always visible, just opacity fades slightly */}
    </div>
  );
};
```

**Benefits:**
- ✅ No data disappears
- ✅ No layout shifts
- ✅ Smooth fade effect
- ✅ Professional appearance
- ✅ Simple to implement

---

## Solution 2: Smooth Fade Transition

**Why:** CSS-based smooth visual update without any content disappearing.

```tsx
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface CardWithSmoothingProps {
  data: any;
  isUpdating: boolean;
}

const CardWithSmoothing = ({ data, isUpdating }: CardWithSmoothingProps) => {
  return (
    <div
      style={{
        transition: "opacity 0.3s ease-in-out",
        opacity: isUpdating ? 0.7 : 1, // Subtle fade, not disappear
      }}
    >
      <Card>
        <CardContent>
          {data}
        </CardContent>
      </Card>
    </div>
  );
};
```

**CSS Alternative (Tailwind):**
```tsx
<div 
  className="transition-opacity duration-300 ease-in-out"
  style={{ opacity: isUpdating ? 0.7 : 1 }}
>
  <Card>
    <CardContent>{data}</CardContent>
  </Card>
</div>
```

**Benefits:**
- ✅ Smooth 300ms fade
- ✅ GPU accelerated
- ✅ Professional fade effect
- ✅ Data always visible

---

## Solution 3: Progressive Data Updates

**Why:** Update different data pieces with slight delays for ultra-smooth flow.

```tsx
import axios from "axios";

const fetchUptimeTrendProgressive = async (
  setUptimeData: (data: any) => void,
  setOverallUptime: (uptime: number) => void,
  setServerUptime: (uptime: any) => void
) => {
  try {
    const trendRes = await axios.get<any>("/api/uptime-trend/?hours=24");
    
    // Update each piece separately with slight delays
    if (trendRes.data.trend) {
      setUptimeData(trendRes.data.trend);
      await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
    }
    
    if (trendRes.data.overall_uptime) {
      setOverallUptime(trendRes.data.overall_uptime);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    if (trendRes.data.server_uptime) {
      setServerUptime(trendRes.data.server_uptime);
    }
  } catch (err) {
    console.error("Error:", err);
  }
};
```

**Benefits:**
- ✅ Ultra-smooth cascading updates
- ✅ Each element updates separately
- ✅ Professional waterfall effect
- ✅ Perceivable but subtle

---

## Solution 4: Skeleton Loaders

**Why:** Show placeholder content instead of blank space = no jarring transitions.

```tsx
import { Card, CardContent } from "@/components/ui/card";

const SkeletonCard = () => (
  <Card className="animate-pulse">
    <CardContent>
      <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      <div className="mt-4 h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
    </CardContent>
  </Card>
);

interface UptimeCardWithSkeletonProps {
  data: any;
  isLoading: boolean;
}

const UptimeCardWithSkeleton = ({ data, isLoading }: UptimeCardWithSkeletonProps) => {
  return isLoading && !data ? (
    <SkeletonCard />
  ) : (
    <Card>
      <CardContent>{data}</CardContent>
    </Card>
  );
};
```

**Key Point:** Match skeleton dimensions exactly to real content!

**Benefits:**
- ✅ No blank space
- ✅ Layout stays stable
- ✅ Professional loading experience
- ✅ Perceivable progress indicator

---

## Solution 5: Debounced Updates

**Why:** Prevent rapid UI flickering when data updates very frequently.

```tsx
let updateTimeout: ReturnType<typeof setTimeout> | null = null;

const debouncedUpdate = (callback: () => void, delay = 300) => {
  if (updateTimeout) clearTimeout(updateTimeout);
  updateTimeout = setTimeout(callback, delay);
};

// Usage in your fetch function:
const fetchUptimeTrend = async (
  setUptimeData: (data: any) => void
) => {
  const trendRes = await axios.get<any>("/api/uptime-trend/?hours=24");
  
  // Debounce the update to prevent rapid flickering
  debouncedUpdate(() => {
    if (trendRes.data.trend && trendRes.data.trend.length > 0) {
      setUptimeData(trendRes.data.trend);
    }
  }, 300);
};
```

**Benefits:**
- ✅ Prevents rapid flickering
- ✅ Smoother visual experience
- ✅ Reduces jank from frequent updates
- ✅ Battery efficient (fewer renders)

---

## Solution 6: Separate Initial Load from Auto-Refresh (✅ IMPLEMENTED)

**Why:** Show loading spinner on initial page load, but silent updates during auto-refresh.

```tsx
import { useEffect, useState } from "react";
import axios from "axios";

const Overview = () => {
  const [uptimeData, setUptimeData] = useState<any[]>([]);
  const [overallUptime, setOverallUptime] = useState<number>(0);
  const [serverUptime, setServerUptime] = useState<any>(null);
  const [loading, setLoading] = useState(true); // Initial load only
  const [isRefreshing, setIsRefreshing] = useState(false); // Auto-refresh only

  useEffect(() => {
    let isInitialLoad = true;

    const fetchUptimeTrend = async () => {
      try {
        // Only set loading to true for INITIAL load, not refresh
        if (isInitialLoad) {
          setLoading(true);
        } else {
          setIsRefreshing(true); // Subtle indicator, doesn't hide UI
        }
        
        const trendRes = await axios.get<any>("/api/uptime-trend/?hours=24");
        
        setUptimeData(trendRes.data.trend || []);
        setOverallUptime(trendRes.data.overall_uptime || 0);
        setServerUptime(trendRes.data.server_uptime || null);
        
        if (isInitialLoad) {
          setLoading(false);
        } else {
          setIsRefreshing(false);
        }
        
        isInitialLoad = false;
      } catch (err) {
        console.error("Error:", err);
        if (isInitialLoad) {
          setLoading(false);
          isInitialLoad = false;
        } else {
          setIsRefreshing(false);
        }
      }
    };

    fetchUptimeTrend();
    const interval = setInterval(fetchUptimeTrend, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {/* Show spinner only during initial load */}
      {loading && !uptimeData.length && <LoadingSpinner />}
      
      {/* During auto-refresh, data stays visible with slight opacity fade */}
      <div style={{ opacity: loading ? 0.6 : 1 }}>
        {/* Your chart content here */}
      </div>
    </div>
  );
};
```

**Benefits:**
- ✅ Professional first impression (loading spinner)
- ✅ Smooth auto-refresh (silent, no jank)
- ✅ Best user experience
- ✅ **This is what we implemented in Overview.tsx**

---

## 📊 Comparison Table

| Solution | Use Case | Effort | Result |
|----------|----------|--------|--------|
| **#1: Keep Old Data** | General use | Easy | ✅ Best |
| **#2: Fade Transition** | Visual polish | Easy | ✅ Good |
| **#3: Progressive** | Ultra-smooth | Medium | ✅ Excellent |
| **#4: Skeleton** | Better UX | Medium | ✅ Professional |
| **#5: Debounced** | Frequent updates | Easy | ✅ Good |
| **#6: Initial/Refresh** | Best balance | Medium | ✅ **RECOMMENDED** |

---

## 🚀 Combining Solutions (Best Practice)

For maximum smoothness, combine multiple techniques:

```tsx
// Combine #1 (Keep old data) + #2 (Fade) + #4 (Skeleton) + #6 (Initial/Refresh)

const BestPracticeOverview = () => {
  const [uptimeData, setUptimeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let isInitialLoad = true;

    const fetchUptimeTrend = async () => {
      try {
        // Technique #6: Separate initial from refresh
        if (isInitialLoad) {
          setLoading(true);
        } else {
          setIsRefreshing(true);
        }

        const trendRes = await axios.get<any>("/api/uptime-trend/?hours=24");

        // Technique #1: Keep old data visible
        if (trendRes.data.trend && trendRes.data.trend.length > 0) {
          setUptimeData(trendRes.data.trend);
        }

        isInitialLoad = false;
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    };

    fetchUptimeTrend();
    const interval = setInterval(fetchUptimeTrend, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Technique #4: Show skeleton during initial load */}
      {loading && !uptimeData.length && <ChartSkeleton />}

      {/* Technique #2: Fade transition */}
      <div 
        className="transition-opacity duration-300 ease-in-out"
        style={{ opacity: loading ? 0.6 : 1 }}
      >
        {uptimeData.length > 0 ? (
          <Chart data={uptimeData} />
        ) : (
          <p>Loading...</p>
        )}
      </div>
    </>
  );
};
```

---

## ✅ Summary

| Solution | Best For |
|----------|----------|
| **Keep Old Data** | Simplicity, everyday use |
| **Fade Transition** | Visual polish, quick fix |
| **Progressive Updates** | Ultra-smooth, premium feel |
| **Skeleton Loaders** | Professional, perceived speed |
| **Debounced Updates** | Frequent updates, jank prevention |
| **Initial/Refresh** | **Best balance, what we use** |

**Recommendation:** Use Solution #6 (Initial/Refresh) combined with Solution #2 (Fade Transition) for the best user experience. This is exactly what we implemented in [Overview.tsx](roams_frontend/src/pages/Overview.tsx).

---

## 📚 Related Documentation

- [SMOOTH_REFRESH_GUIDE.md](SMOOTH_REFRESH_GUIDE.md) - Deep dive on smooth refresh techniques
- [SMOOTH_REFRESH_COMPLETE.md](SMOOTH_REFRESH_COMPLETE.md) - Implementation summary
- [NO_SHAKE_IMPLEMENTATION_GUIDE.md](NO_SHAKE_IMPLEMENTATION_GUIDE.md) - Node-RED style smoothness
- [Overview.tsx](roams_frontend/src/pages/Overview.tsx) - Actual implementation

