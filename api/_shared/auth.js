// BEGIN FILE: api/shared/auth.js
// VERSION: 2025-08-24
// NOTES: Server-side helper to read EasyAuth principal and check roles.

function parseClientPrincipal(req) {
  const header = req.headers["x-ms-client-principal"];
  if (!header) return null;
  try {
    const decoded = Buffer.from(header, "base64").toString("utf8");
    const principal = JSON.parse(decoded);
    const roles =
      (principal.userRoles || []).filter((r) => r !== "anonymous" && r !== "authenticated") || [];
    return { ...principal, roles };
  } catch {
    return null;
  }
}

function userHasAnyRole(principal, allowed = []) {
  if (!principal) return false;
  const set = new Set((principal.roles || []).map(String));
  return allowed.some((r) => set.has(String(r)));
}

module.exports = { parseClientPrincipal, userHasAnyRole };
