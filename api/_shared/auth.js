// Minimal helper to read the SWA client principal and check admin.
export function getClientPrincipal(req) {
  const header = req.headers['x-ms-client-principal'] || req.headers['X-MS-CLIENT-PRINCIPAL'];
  if (!header) return null;
  const decoded = Buffer.from(header, 'base64').toString('ascii');
  try {
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function requireAdmin(principal) {
  const roles = (principal?.userRoles || []).map(r => r.toLowerCase());
  return roles.includes('admin');
}
