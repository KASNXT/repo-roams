// roams_frontend/src/utils/lowercase.ts
// Utility to normalize parameter names for consistent key lookup
export const normalizeKey = (key: string): string => {
  return key
    .toLowerCase()         // make everything lowercase
    .replace(/\s+/g, "");  // remove all spaces
};