function getUserFromHeaders(req) {
  const header = req.headers['x-ms-client-principal'] || req.headers['X-MS-CLIENT-PRINCIPAL'];
  if (!header) return null;
  try {
    return JSON.parse(Buffer.from(header, 'base64').toString('utf8'));
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

module.exports = { requireAuth, getUserFromHeaders };
