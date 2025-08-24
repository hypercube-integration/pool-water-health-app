// BEGIN FILE: src/auth/roles.js
// VERSION: 2025-08-24
// NOTES: Helper for UI checks (unchanged; included for completeness).

export function hasAnyRole(user, roles) {
  const set = new Set((user?.roles || []).map(String));
  return roles.some((r) => set.has(String(r)));
}
