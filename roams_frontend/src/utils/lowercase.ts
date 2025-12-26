// roams_frontend/src/utils/lowercase.ts
// Utility to normalize parameter names for consistent key lookup
export const normalizeKey = (key: any) => {
  if (!key) return "";       // handle undefined/null
  return String(key).replace(/\s+/g, "_").toLowerCase();
};