// manageUsers: enumerate SWA users via ARM.
// Primary path:  /authproviders/all/listUsers?api-version=2024-11-01
// Falls back to older shapes if needed.

const fetch = require("node-fetch");
const { DefaultAzureCredential } = require("@azure/identity");

const PRIMARY_API_VERSION = "2024-11-01";
const FALLBACK_VERSIONS = [
  "2024-04-01",
  "2023-12-01",
  "2023-01-01",
  "2022-09-01",
  "2022-03-01",
  "2021-03-01",
  "2021-02-01"
];

const SWA_RESOURCE_ID = process.env.SWA_RESOURCE_ID; // REQUIRED
const ENV_NAME = process.env.SWA_ENVIRONMENT || "Production";

const DEFAULT_BODY_AUTHPROVIDERS = {
  // When using /authproviders/<prov>/listUsers the provider is in the path,
  // so we only need paging/filters here.
  roles: "",
  continuationToken: null,
  top: 200
};

const DEFAULT_BODY_LEGACY = {
  // Older shapes expect an 'authprovider' field in the body.
  authprovider: "all",
  roles: "",
  continuationToken: null,
  top: 200
};

module.exports = async function (context, req) {
  const debugMode = "debug" in (req.query || {});

  if (!SWA_RESOURCE_ID) {
    return respond(context, 500, { error: "SWA_RESOURCE_ID not set" });
  }

  // ARM token
  let token;
  try {
    token = (await new DefaultAzureCredential().getToken("https://management.azure.com/.default")).token;
  } catch (e) {
    return respond(context, 500, { error: "Failed to obtain Azure token", details: e.message });
  }

  const attempts = [];

  // Quick sanity: does the SWA resource exist?
  const sanity = await armGet(`https://management.azure.com${SWA_RESOURCE_ID}?api-version=${PRIMARY_API_VERSION}`, token);
  attempts.push({ try: "getStaticSite", url: `...${SWA_RESOURCE_ID}?api-version=${PRIMARY_API_VERSION}`, status: sanity.status });
  if (!sanity.ok) {
    return respond(context, 500, { error: "Could not read Static Web App resource", debug: attempts });
  }

  // 1) NEW canonical endpoint you confirmed returns 200
  {
    const url = `https://management.azure.com${SWA_RESOURCE_ID}/authproviders/all/listUsers?api-version=${PRIMARY_API_VERSION}`;
    const r = await armPost(url, token, DEFAULT_BODY_AUTHPROVIDERS);
    attempts.push({ try: "authproviders:listUsers", url, status: r.status, body: brief(r.body) });
    const users = extractUsers(r);
    if (r.ok && users) return respond(context, 200, debugMode ? { users, debug: attempts } : users);
  }

  // 2) Try same "authproviders" path across a few versions
  for (const v of FALLBACK_VERSIONS) {
    const url = `https://management.azure.com${SWA_RESOURCE_ID}/authproviders/all/listUsers?api-version=${v}`;
    const r = await armPost(url, token, DEFAULT_BODY_AUTHPROVIDERS);
    attempts.push({ try: `authproviders:listUsers:${v}`, url, status: r.status, body: brief(r.body) });
    const users = extractUsers(r);
    if (r.ok && users) return respond(context, 200, debugMode ? { users, debug: attempts } : users);
  }

  // 3) Fallbacks for older tenants/regions
  const legacyMakers = [
    (v) => `https://management.azure.com${SWA_RESOURCE_ID}/listStaticSiteUsers?api-version=${v}`,
    (v) => `https://management.azure.com${SWA_RESOURCE_ID}/listStaticSiteUsers?api-version=${v}&environmentName=${encodeURIComponent(ENV_NAME)}`,
    (v) => `https://management.azure.com${SWA_RESOURCE_ID}/environments/${encodeURIComponent(ENV_NAME)}/listUsers?api-version=${v}`,
    (v) => `https://management.azure.com${SWA_RESOURCE_ID}/builds/default/listStaticSiteUsers?api-version=${v}`
  ];

  for (const v of [PRIMARY_API_VERSION, ...FALLBACK_VERSIONS]) {
    for (const makeUrl of legacyMakers) {
      const url = makeUrl(v);
      const r = await armPost(url, token, DEFAULT_BODY_LEGACY);
      attempts.push({ try: identify(url), url, status: r.status, body: brief(r.body) });
      const users = extractUsers(r);
      if (r.ok && users) return respond(context, 200, debugMode ? { users, debug: attempts } : users);
    }
  }

  return respond(context, 500, {
    error: "List users failed",
    debug: attempts,
    hint:
      "Your tenant works with the /authproviders/... path you tested. If the function still fails in prod, ensure the function’s identity has 'Static Web App Contributor' on the SWA and SWA_RESOURCE_ID matches exactly."
  });
};

// ---------- helpers ----------

async function armGet(url, token) {
  try {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const body = await safeJson(r);
    return { ok: r.ok, status: r.status, body };
  } catch (e) {
    return { ok: false, status: 0, body: { error: e.message } };
  }
}

async function armPost(url, token, body) {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body || {})
    });
    const data = await safeJson(r);
    return { ok: r.ok, status: r.status, body: data };
  } catch (e) {
    return { ok: false, status: 0, body: { error: e.message } };
  }
}

async function safeJson(r) {
  try {
    const txt = await r.text();
    return txt ? JSON.parse(txt) : undefined;
  } catch {
    return undefined;
  }
}

function extractUsers(resp) {
  if (!resp || !resp.ok) return null;
  const b = resp.body;
  if (!b) return null;
  if (Array.isArray(b)) return b;
  if (Array.isArray(b.value)) return b.value;
  return null;
}

function respond(context, status, body) {
  context.res = {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    body
  };
  return context.res;
}

function identify(url) {
  if (url.includes("/authproviders/")) return label(url, "authproviders");
  if (url.includes("/builds/default/")) return label(url, "builds/default");
  if (url.includes("/environments/")) return label(url, "env");
  if (url.includes("environmentName=")) return label(url, "envQuery");
  return label(url, "root");
}
function label(url, scope) {
  const v = new URL(url).searchParams.get("api-version");
  return `listUsers:${scope}:${v}`;
}
function brief(body) {
  if (!body) return body;
  if (Array.isArray(body)) return `array(${body.length})`;
  if (body.value && Array.isArray(body.value)) return `object.value(${body.value.length})`;
  if (body.error && body.error.message) return `error:${body.error.code || ""}`;
  return typeof body === "object" ? "object" : typeof body;
}
