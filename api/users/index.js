// BEGIN FILE: api/users/index.js
// VERSION: 2025-08-29
// NOTES:
// - Lists SWA users via ARM, enriches AAD users via Microsoft Graph.
// - Handles AAD ids that are 32-hex without hyphens by hyphenating to GUID.
// - Add ?debug=1 to response to include enrichment stats.

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
    const debug = req.query.debug === "1";

    // ---- Env ----
    const subId = mustEnv("APPSERVICE_SUBSCRIPTION_ID");
    const rg = mustEnv("APPSERVICE_RESOURCE_GROUP");
    const site = mustEnv("APPSERVICE_STATIC_SITE_NAME");

    const credential = new DefaultAzureCredential();
    const client = new WebSiteManagementClient(credential, subId);

    // ---- Gather users from providers ----
    const map = new Map(); // key: provider|id
    for (const provider of PROVIDERS) {
      try {
        for await (const u of client.staticSites.listStaticSiteUsers(rg, site, provider)) {
          addUser(map, u, provider);
        }
      } catch (e) {
        context.log(`Provider ${provider} query skipped:`, e?.message || e);
      }
    }
    if (map.size === 0) {
      // fallback 'all'
      for await (const u of client.staticSites.listStaticSiteUsers(rg, site, "all")) {
        addUser(map, u, "all");
      }
    }

    // ---- Optional AAD enrichment via Graph ----
    const meta = { graphAttempted: 0, graphSucceeded: 0 };
    if (ENRICH_AAD && map.size > 0) {
      try {
        await enrichAadUsers(context, credential, map, meta);
      } catch (e) {
        context.log("Graph enrichment error:", e?.message || e);
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

    return (context.res = json(200, debug ? { rows, total, meta } : { rows, total }));
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
function addUser(map, u, providerHint) {
  const p = u?.properties || {};
  const { provider: provFromId, providerUserId } = deriveFromId(u?.id);
  const provider = (p.provider || (providerHint !== "all" ? providerHint : provFromId) || "").toLowerCase();

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
    createdAt: "" // not provided by Mgmt API
  };

  const key = `${rec.provider}|${rec.id}`;
  const existing = map.get(key);
  if (!existing) return map.set(key, rec);

  const betterName = existing.name === "(unknown)" && rec.name !== "(unknown)";
  const moreRoles = (rec.roles?.length || 0) > (existing.roles?.length || 0);
  const prefer = betterName || moreRoles || (!existing.email && rec.email);
  if (prefer) map.set(key, rec);
}

async function enrichAadUsers(context, credential, map, meta) {
  // pull AAD users
  const entries = Array.from(map.entries()).filter(([k, v]) => v.provider === "aad");
  if (entries.length === 0) return;

  // acquire Graph token
  const tokenObj = await credential.getToken("https://graph.microsoft.com/.default");
  const accessToken = tokenObj?.token;
  if (!accessToken) throw new Error("Unable to acquire Graph access token");

  for (const [key, rec] of entries) {
    const rawId = String(rec.id || "");
    // Try hyphenated GUID if raw is 32-hex
    const hyphenated = looksLike32Hex(rawId) ? hyphenateGuid(rawId) : rawId;

    meta.graphAttempted++;

    // First try hyphenated (if changed), else raw
    const candidates = hyphenated && hyphenated !== rawId ? [hyphenated, rawId] : [rawId];

    let got = null;
    for (const cand of candidates) {
      const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(cand)}?$select=displayName,mail,userPrincipalName`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }
      });
      if (resp.ok) {
        got = await resp.json();
        break;
      }
      // 404/400 → try next candidate
    }

    if (got) {
      meta.graphSucceeded++;
      const displayName = got.displayName || "";
      const email = got.mail || got.userPrincipalName || "";

      const updated = { ...rec };
      if (displayName && (rec.name === "(unknown)" || looksLike32Hex(rec.name))) {
        updated.name = displayName;
      }
      if (email && !rec.email) {
        updated.email = email;
      }
      map.set(key, updated);
    }
  }
}

function looksLike32Hex(s) {
  return /^[0-9a-f]{32}$/i.test(String(s));
}
function hyphenateGuid(hex32) {
  // XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
  const h = String(hex32);
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
