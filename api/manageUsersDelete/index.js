// Deletes a user via ARM
// DELETE .../staticSites/{name}/authproviders/{provider}/users/{userid}?api-version=2024-11-01
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
  const headers = { "Authorization": `Bearer ${token.token}`, ...(options.headers || {}) };
  const res = await fetch(`https://management.azure.com${path}`, { ...options, headers });
  const text = await res.text();
  let body; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body, headers: Object.fromEntries(res.headers.entries()) };
}

module.exports = async function (context, req) {
  try {
    const resourceId = resourceIdFromEnv();
    const provider = (req.body && req.body.provider) || req.query.provider;
    const userId = (req.body && req.body.userId) || req.query.userId;
    if (!provider || !userId) {
      context.res = { status: 400, body: { error: "provider and userId are required" } };
      return;
    }
    const path = `${resourceId}/authproviders/${encodeURIComponent(provider)}/users/${encodeURIComponent(userId)}?api-version=${API_VERSION}`;
    const rsp = await armFetch(path, { method: "DELETE" });

    if (rsp.status === 200 || rsp.status === 204) {
      context.res = { status: 200, body: { ok: true } };
    } else {
      context.res = { status: rsp.status, body: { error: "Delete failed", debug: rsp } };
    }
  } catch (err) {
    context.res = { status: 500, body: { error: err.message || String(err) } };
  }
};
