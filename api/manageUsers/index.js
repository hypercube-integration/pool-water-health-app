// api/manageUsers/index.js
// Verbose user listing with diagnostics. Returns extra info when ?debug=1

const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

const REQUIRED = [
  "AZURE_TENANT_ID",
  "AZURE_CLIENT_ID",
  "AZURE_CLIENT_SECRET",
  "SWA_SUBSCRIPTION_ID",
  "SWA_RESOURCE_GROUP",
  "SWA_NAME",
];

function needEnv() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  return missing;
}

async function getArmToken() {
  // Client credentials flow for ARM
  const tenant = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  const url = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://management.azure.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch {}

  if (!res.ok) {
    const e = new Error(`token failed ${res.status}`);
    e.details = json || text;
    throw e;
  }
  return json.access_token;
}

async function armGET(url, token) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch {}

  return { ok: res.ok, status: res.status, json, text, headers: Object.fromEntries(res.headers.entries()) };
}

module.exports = async function (context, req) {
  const verbose = req.query?.debug === "1";

  try {
    // 0) Ensure config exists
    const missing = needEnv();
    if (missing.length) {
      const msg = `Missing env: ${missing.join(", ")}`;
      context.log.error(msg);
      context.res = { status: 500, body: { error: msg } };
      return;
    }

    const sub = process.env.SWA_SUBSCRIPTION_ID;
    const rg = process.env.SWA_RESOURCE_GROUP;
    const name = process.env.SWA_NAME;
    const envName = process.env.SWA_ENVIRONMENT || "Production"; // allow override, default Production
    const apiVersion = process.env.SWA_ARM_API_VERSION || "2022-03-01";

    // 1) Get ARM token
    const token = await getArmToken();

    // 2) Try both ARM list endpoints. Different docs/sdks use these two shapes.
    const base = `https://management.azure.com/subscriptions/${sub}/resourceGroups/${rg}/providers/Microsoft.Web/staticSites/${name}`;
    const tries = [
      {
        key: "listUsers",
        url: `${base}/environments/${envName}/listUsers?api-version=${apiVersion}`,
      },
      {
        key: "listStaticSiteUsers",
        url: `${base}/listStaticSiteUsers?api-version=${apiVersion}&environmentName=${encodeURIComponent(envName)}`,
      },
    ];

    const debugInfo = [];
    let users = null, lastErr = null;

    for (const t of tries) {
      const r = await armGET(t.url, token);
      debugInfo.push({ try: t.key, url: t.url, status: r.status, body: r.json || r.text, headers: r.headers });
      if (r.ok) {
        // normalize result shape
        const arr = Array.isArray(r.json?.value) ? r.json.value : (Array.isArray(r.json) ? r.json : []);
        users = arr.map(u => ({
          displayName: u.displayName || u.name || "",
          userId: u.userId || u.user_id || u.user || "",
          provider: u.provider || u.identityProvider || "",
          roles: (u.roles || "").split(",").map(s => s.trim()).filter(Boolean),
          raw: u
        }));
        break;
      } else {
        lastErr = new Error(`ARM ${t.key} ${r.status}`);
      }
    }

    if (!users) {
      const hint =
        "ARM returned non-200. Check SWA_NAME, SWA_RESOURCE_GROUP, SWA_SUBSCRIPTION_ID, environment (SWA_ENVIRONMENT=Production), and that the service principal has 'Static Web App Contributor' (or higher) on the Static Web App.";
      context.log.error("manageUsers failed", { debugInfo, hint });
      context.res = {
        status: 500,
        body: verbose ? { error: "List users failed", debug: debugInfo, hint } : { error: "List users failed" },
      };
      return;
    }

    // Success
    context.res = verbose
      ? { status: 200, body: { users, debug: { env: envName, apiVersion, tested: tries.map(t => t.key) } } }
      : { status: 200, body: { users } };
  } catch (err) {
    context.log.error("manageUsers fatal", err);
    context.res = {
      status: 500,
      body: { error: err.message || "manageUsers failed", details: (req.query?.debug === "1") ? err.details : undefined },
    };
  }
};
