import { useEffect, useCallback, useState } from 'react';

export interface RefreshSettings {
  enabled: boolean;
  intervalMs: number;
}

/**
 * Custom hook for managing refresh intervals with configurable delays
 * 
 * Usage:
 * ```tsx
 * const settings = useRefreshInterval('overview', 5 * 60 * 1000); // 5 minutes default
 * 
 * useEffect(() => {
 *   fetchData();
 *   const interval = setInterval(fetchData, settings.intervalMs);
 *   return () => clearInterval(interval);
 * }, [settings.intervalMs]);
 * ```
 */
export function useRefreshInterval(
  pageId: string,
  defaultIntervalMs: number = 30000
): RefreshSettings & { updateInterval: (ms: number) => void; resetInterval: () => void } {
  const storageKey = `refresh_interval_${pageId}`;
  
  const [intervalMs, setIntervalMs] = useState<number>(() => {
    // Try to load from localStorage
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? parseInt(stored, 10) : defaultIntervalMs;
    } catch {
      return defaultIntervalMs;
    }
  });

  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(`${storageKey}_enabled`);
      return stored ? JSON.parse(stored) : true;
    } catch {
      return true;
    }
  });

  const updateInterval = useCallback((ms: number) => {
    // Validate interval (minimum 5 seconds, maximum 1 hour)
    const validMs = Math.max(5000, Math.min(3600000, ms));
    setIntervalMs(validMs);
    try {
      localStorage.setItem(storageKey, validMs.toString());
    } catch (e) {
      console.warn('Failed to save refresh interval to localStorage:', e);
    }
  }, [storageKey]);

  const resetInterval = useCallback(() => {
    setIntervalMs(defaultIntervalMs);
    setEnabled(true);
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${storageKey}_enabled`);
    } catch (e) {
      console.warn('Failed to reset refresh interval in localStorage:', e);
    }
  }, [storageKey, defaultIntervalMs]);

  return {
    enabled,
    intervalMs,
    updateInterval,
    resetInterval,
  };
}

/**
 * Setup auto-refresh with interval management
 * 
 * Usage:
 * ```tsx
 * const settings = useRefreshInterval('dashboard', 10000);
 * useAutoRefresh(settings, fetchData, [settings.intervalMs]);
 * ```
 */
export function useAutoRefresh(
  settings: RefreshSettings,
  callback: () => void | Promise<void>,
  dependencies: any[] = []
): void {
  useEffect(() => {
    if (!settings.enabled) return;

    // Call immediately
    callback();

    // Then set up interval
    const interval = setInterval(callback, settings.intervalMs);
    return () => clearInterval(interval);
  }, [settings.enabled, settings.intervalMs, callback, ...dependencies]);
}
