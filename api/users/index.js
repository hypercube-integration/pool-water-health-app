// BEGIN FILE: api/users/index.js
// VERSION: 2025-08-25
// NOTES:
// - Lists SWA users via Azure Management API.
// - Parses provider + providerUserId from the resourceId when properties are sparse.
// - Optional AAD enrichment (displayName, mail, UPN) via Microsoft Graph using DefaultAzureCredential.
//   • Toggle with env GRAPH_ENRICH_AAD=true|false (default true)
//   • Requires Graph App permission: "User.Read.All" (application) with Admin consent on the identity used.
// - RBAC: only 'admin' or 'manager' may call this API (EasyAuth roles).

const { DefaultAzureCredential } = require("@azure/identity");
const { WebSiteManagementClient } = require("@azure/arm-appservice");

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const ALLOWED_SORT = new Set(["name", "email", "role", "provider", "createdAt"]);
const ALLOWED_DIR = new Set(["asc", "desc"]);
const PROVIDERS = ["aad", "github", "twitter"];

const ENRICH_AAD = String(process.env.GRAPH_ENRICH_AAD || "true").toLowerCase() === "true";

module.exports = async function (context, req) {
  try {
    // ---- RBAC (SWA EasyAuth) ----
    const principal = parseClientPrincipal(req);
    if (!hasAnyRole(principal, ["admin", "manager"])) {
      return (context.res = json(403, { error: "Forbidden" }));
    }

    // ---- Query params ----
    const page = clampInt(req.query.page, DEFAULT_PAGE, 1, 100000);
    const pageSize = clampInt(req.query.pageSize, DEFAULT_PAGE_SIZE, 1, 200);
    const search = (req.query.search || "").toString().trim().toLowerCase();
    const sortBy = ALLOWED_SORT.has(req.query.sortBy) ? req.query.sortBy : "name";
    const sortDir = ALLOWED_DIR.has(req.query.sortDir) ? req.query.sortDir : "asc";

    // ---- Env ----
    const subId = mustEnv("APPSERVICE_SUBSCRIPTION_ID");
    const rg = mustEnv("APPSERVICE_RESOURCE_GROUP");
    const site = mustEnv("APPSERVICE_STATIC_SITE_NAME");

    const credential = new DefaultAzureCredential();
    const client = new WebSiteManagementClient(credential, subId);

    // ---- Gather users from each provider (richer in some cases) ----
    const map = new Map(); // key: provider|id
    for (const provider of PROVIDERS) {
      try {
        for await (const u of client.staticSites.listStaticSiteUsers(rg, site, provider)) {
          addUser(context, map, u, provider);
        }
      } catch (e) {
        context.log(`Provider ${provider} query skipped:`, e?.message || e);
      }
    }
    if (map.size === 0) {
      for await (const u of client.staticSites.listStaticSiteUsers(rg, site, "all")) {
        addUser(context, map, u, "all");
      }
    }

    // ---- Optional: Enrich AAD users from Microsoft Graph (displayName, mail/UPN) ----
    if (ENRICH_AAD) {
      try {
        await enrichAadUsersFromGraph(context, credential, map);
      } catch (e) {
        // Never fail the API if Graph enrichment is unavailable
        context.log("Graph enrichment skipped:", e?.message || e);
      }
    }

    const all = Array.from(map.values());

    // ---- filter/sort/page ----
    let filtered = all;
    if (search) {
      filtered = all.filter((r) =>
        [r.name, r.email, r.role, r.provider, ...(r.roles || [])]
          .some((v) => String(v || "").toLowerCase().includes(search))
      );
    }
    filtered.sort((a, b) => {
      const av = a[sortBy] ?? "";
      const bv = b[sortBy] ?? "";
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const rows = filtered.slice(start, start + pageSize);

    return (context.res = json(200, { rows, total }));
  } catch (err) {
    context.log.error("users function error:", err?.message || err);
    return (context.res = json(500, { error: "ServerError" }));
  }
};

// ---------- helpers ----------

function json(status, body) {
  return { status, headers: { "content-type": "application/json" }, body };
}
function clampInt(val, fallback, min, max) {
  const n = parseInt(val, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
function parseClientPrincipal(req) {
  try {
    const header = req.headers["x-ms-client-principal"];
    if (!header) return null;
    const decoded = Buffer.from(header, "base64").toString("utf8");
    const principal = JSON.parse(decoded);
    const roles = (principal.userRoles || []).filter((r) => r !== "anonymous") || [];
    return { ...principal, roles };
  } catch {
    return null;
  }
}
function hasAnyRole(principal, allowed) {
  if (!principal) return false;
  const set = new Set((principal.roles || []).map(String));
  return allowed.some((r) => set.has(String(r)));
}
function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}
function deriveFromId(resourceId) {
  if (!resourceId) return { provider: "", providerUserId: "" };
  const m = String(resourceId).match(/authproviders\/([^/]+)\/users\/([^/]+)/i);
  return m ? { provider: m[1], providerUserId: m[2] } : { provider: "", providerUserId: "" };
}
function addUser(context, map, u, providerHint) {
  const p = u?.properties || {};
  const { provider: provFromId, providerUserId } = deriveFromId(u?.id);
  const provider = p.provider || (providerHint !== "all" ? providerHint : provFromId) || "";

  const display = (p.displayName || "").trim();
  const email = /@/.test(display) ? display : "";

  const rolesArr = (p.roles || "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  const normalizedRoles = rolesArr.length ? rolesArr : ["authenticated"];
  const primary = normalizedRoles.find((r) => r !== "anonymous") || "authenticated";

  const rec = {
    id: p.userId || providerUserId || u.id || Math.random().toString(36).slice(2),
    name: display || providerUserId || "(unknown)",
    email,
    role: primary,
    roles: normalizedRoles.filter((r) => r !== "anonymous"),
    provider,
    createdAt: "" // Mgmt API doesn't provide this
  };

  const key = `${rec.provider}|${rec.id}`;
  const existing = map.get(key);
  if (!existing) return map.set(key, rec);

  const betterName = existing.name === "(unknown)" && rec.name !== "(unknown)";
  const moreRoles = (rec.roles?.length || 0) > (existing.roles?.length || 0);
  const prefer = betterName || moreRoles || (!existing.email && rec.email);
  if (prefer) map.set(key, rec);
}

// ---------------- Graph enrichment ----------------

async function enrichAadUsersFromGraph(context, credential, map) {
  // Collect unique AAD IDs (these need to be valid AAD object IDs to resolve)
  const aadKeys = Array.from(map.entries())
    .filter(([k, v]) => v.provider.toLowerCase() === "aad" && v.id && typeof v.id === "string")
    .map(([k, v]) => v.id);

  if (aadKeys.length === 0) return;

  // Get a token for Microsoft Graph
  const tokenObj = await credential.getToken("https://graph.microsoft.com/.default");
  const accessToken = tokenObj?.token;
  if (!accessToken) throw new Error("Unable to acquire Graph access token");

  // Graph batch supports up to 20 requests per batch
  const chunks = chunk(aadKeys, 20);
  for (const ids of chunks) {
    const batchBody = {
      requests: ids.map((id, i) => ({
        id: String(i + 1),
        method: "GET",
        url: `/users/${encodeURIComponent(id)}?$select=displayName,mail,userPrincipalName`,
        headers: { Accept: "application/json" }
      }))
    };

    const resp = await fetch("https://graph.microsoft.com/v1.0/$batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(batchBody)
    });

    if (!resp.ok) {
      const t = await safeText(resp);
      context.log(`Graph batch failed: ${resp.status} ${resp.statusText} ${t}`);
      continue; // don’t fail enrichment
    }

    const data = await resp.json().catch(() => ({}));
    const results = Array.isArray(data?.responses) ? data.responses : [];
    for (const r of results) {
      const body = r?.body || {};
      const objId = extractUserIdFromUrl(r?.url);
      // Find matching rec (provider 'aad' and id == objId)
      const key = findAadKeyById(map, objId);
      if (!key) continue;

      const rec = map.get(key);
      const displayName = body.displayName || "";
      const email = body.mail || body.userPrincipalName || "";

      if (displayName && (rec.name === "(unknown)" || looksLikeGuid(rec.name))) {
        rec.name = displayName;
      }
      if (email && !rec.email) rec.email = email;

      map.set(key, rec);
    }
  }
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
async function safeText(resp) {
  try {
    return await resp.text();
  } catch {
    return "";
  }
}
function extractUserIdFromUrl(url) {
  // url like: /users/{id}?$select=...
  const m = String(url || "").match(/\/users\/([^?]+)/i);
  return m ? decodeURIComponent(m[1]) : "";
}
function findAadKeyById(map, id) {
  // keys are "provider|id"
  for (const [k, v] of map.entries()) {
    if (v.provider.toLowerCase() === "aad" && String(v.id).toLowerCase() === String(id).toLowerCase()) return k;
  }
  return "";
}
function looksLikeGuid(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s));
}
