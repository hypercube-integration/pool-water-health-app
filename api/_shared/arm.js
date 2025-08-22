// api/_shared/arm.js
// Tiny ARM helper used by admin functions (Node 18+: global fetch is available).

const REQUIRED_CLIENT = ["AZURE_TENANT_ID", "AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET"];

/**
 * Resolve the Static Web App resource ID.
 * Prefer SWA_RESOURCE_ID (exact ARM path), else compose from subscription/rg/name.
 */
function getSwaResourceId() {
  const rid = process.env.SWA_RESOURCE_ID && process.env.SWA_RESOURCE_ID.trim();
  if (rid) return rid; // e.g. /subscriptions/<GUID>/resourceGroups/<RG>/providers/Microsoft.Web/staticSites/<NAME>

  const sub = process.env.SWA_SUBSCRIPTION_ID && process.env.SWA_SUBSCRIPTION_ID.trim();
  const rg  = process.env.SWA_RESOURCE_GROUP && process.env.SWA_RESOURCE_GROUP.trim();
  const name = process.env.SWA_NAME && process.env.SWA_NAME.trim();

  if (!sub || !rg || !name) {
    const missing = [];
    if (!sub)  missing.push("SWA_SUBSCRIPTION_ID");
    if (!rg)   missing.push("SWA_RESOURCE_GROUP");
    if (!name) missing.push("SWA_NAME");
    throw new Error(`Missing resource identity. Provide SWA_RESOURCE_ID or (${missing.join(", ")})`);
  }
  return `/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.Web/staticSites/${name}`;
}

/** Ensure client-credential secrets exist. */
function assertClientEnv() {
  const missing = REQUIRED_CLIENT.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing env: ${missing.join(", ")}`);
  }
}

/** Get an ARM access token via client credentials. */
async function getArmToken() {
  assertClientEnv();
  const url = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: process.env.AZURE_CLIENT_ID,
    client_secret: process.env.AZURE_CLIENT_SECRET,
    scope: "https://management.azure.com/.default",
    grant_type: "client_credentials",
  });
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch {}
  if (!r.ok) {
    const e = new Error(`token ${r.status}`);
    e.details = json || text;
    throw e;
  }
  return json.access_token;
}

/** Simple GET wrapper for ARM. */
async function armGET(url, token) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch {}
  return { ok: r.ok, status: r.status, json, text, headers: Object.fromEntries(r.headers.entries()) };
}

/** Simple POST wrapper for ARM. */
async function armPOST(url, token, bodyObj) {
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bodyObj ?? {}),
  });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch {}
  return { ok: r.ok, status: r.status, json, text, headers: Object.fromEntries(r.headers.entries()) };
}

module.exports = {
  getSwaResourceId,
  getArmToken,
  armGET,
  armPOST,
};
