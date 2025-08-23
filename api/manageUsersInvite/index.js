// Creates a roles invitation link for a user (works with aad/github).
// POST .../staticSites/{name}/authproviders/{provider}/users/{userid}/rolesInvitation?api-version=2024-11-01
// Docs: Static Sites - Create User Roles Invitation Link
const { DefaultAzureCredential, getBearerTokenProvider } = require("@azure/identity");

const ARM_SCOPE = "https://management.azure.com/.default";
const API_VERSION = "2024-11-01";

function resourceIdFromEnv() {
  if (process.env.SWA_RESOURCE_ID) return process.env.SWA_RESOURCE_ID;
  const sub = process.env.SWA_SUBSCRIPTION_ID;
  const rg = process.env.SWA_RESOURCE_GROUP;
  const name = process.env.SWA_NAME;
  if (!sub || !rg || !name) throw new Error("Missing SWA_RESOURCE_ID or SWA_SUBSCRIPTION_ID/SWA_RESOURCE_GROUP/SWA_NAME");
  return `/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.Web/staticSites/${name}`;
}

async function armFetch(path, options = {}) {
  const credential = new DefaultAzureCredential();
  const tokenProvider = getBearerTokenProvider(credential, ARM_SCOPE);
  const token = await tokenProvider();
  const headers = {
    "Authorization": `Bearer ${token.token}`,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const res = await fetch(`https://management.azure.com${path}`, { ...options, headers });
  const text = await res.text();
  let body; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body, headers: Object.fromEntries(res.headers.entries()) };
}

module.exports = async function (context, req) {
  try {
    const {
      provider,                 // "aad" | "github"
      userId,                   // arbitrary ID for invitee (string you pick, e.g. email hash)
      roles,                    // "admin,writer" or [ "admin", "writer" ]
      email,                    // invitee's email (shown on the invite UI)
      expirationHours = 48,     // optional, default 48h
      domain                    // optional; if provided, invite UI will show it
    } = req.body || {};

    if (!provider || !userId || !roles || !email) {
      context.res = { status: 400, body: { error: "provider, userId, roles, email are required" } };
      return;
    }

    const resourceId = resourceIdFromEnv();
    const path = `${resourceId}/authproviders/${encodeURIComponent(provider)}/users/${encodeURIComponent(userId)}/rolesInvitation?api-version=${API_VERSION}`;

    const rolesString = Array.isArray(roles) ? roles.join(",") : roles;
    const payload = {
      properties: {
        roles: rolesString,
        numHoursToExpiration: Number(expirationHours) || 48,
        invitationDomain: domain || undefined,
        userDetails: email
      }
    };

    const rsp = await armFetch(path, { method: "POST", body: JSON.stringify(payload) });

    if (rsp.status >= 200 && rsp.status < 300) {
      // ARM returns an object whose properties include the invitation URL
      context.res = { status: 200, body: rsp.body };
    } else {
      context.res = { status: rsp.status, body: { error: "Invite failed", debug: rsp } };
    }
  } catch (err) {
    context.res = { status: 500, body: { error: err.message || String(err) } };
  }
};
