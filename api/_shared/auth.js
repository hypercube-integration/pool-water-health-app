// api/_shared/auth.js
function getUserFromHeaders(req) {
  const h = req.headers['x-ms-client-principal'] || req.headers['X-MS-CLIENT-PRINCIPAL'];
  if (!h) return null;
  try {
    return JSON.parse(Buffer.from(h, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function requireAuth(context, req) {
  const user = getUserFromHeaders(req);
  if (!user) {
    context.res = { status: 401, body: { error: 'Not authenticated' } };
    return null;
  }
  return user;
}

function requireRole(context, user, roles) {
  const has = user?.userRoles?.some(r => roles.includes(r));
  if (!has) {
    context.res = { status: 403, body: { error: 'Forbidden: missing role' } };
    return false;
  }
  return true;
}

module.exports = { getUserFromHeaders, requireAuth, requireRole };
