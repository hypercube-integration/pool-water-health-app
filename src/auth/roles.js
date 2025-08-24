// BEGIN FILE: src/auth/roles.js
// VERSION: 2025-08-24
// NOTES: Minimal role helpers. If you already have an auth layer, adapt imports accordingly.

export function hasAnyRole(user, roles) {
  const set = new Set((user?.roles || []).map(String));
  return roles.some((r) => set.has(String(r)));
}
