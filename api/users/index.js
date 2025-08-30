// BEGIN FILE: api/users/index.js
// VERSION: 2025-08-30
// Lists SWA users via ARM, enriches AAD via Graph (when possible),
// and merges custom profiles (name/email) from Cosmos DB.

const { DefaultAzureCredential } = require("@azure/identity");
const { WebSiteManagementClient } = require("@azure/arm-appservice");
const { CosmosClient } = require("@azure/cosmos");

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const ALLOWED_SORT = new Set(["name", "email", "role", "provider", "createdAt"]);
const ALLOWED_DIR = new Set(["asc", "desc"]);
const PROVIDERS = ["aad", "github", "twitter"];
const ENRICH_AAD = String(process.env.GRAPH_ENRICH_AAD || "true").toLowerCase() === "true";

module.exports = async function (context, req) {
  try {
    const principal = parseClientPrincipal(req);
    if (!hasAnyRole(principal, ["admin", "manager"])) {
      return (context.res = json(403, { error: "Forbidden" }));
    }

    const page = clampInt(req.query.page, DEFAULT_PAGE, 1, 100000);
    const pageSize = clampInt(req.query.pageSize, DEFAULT_PAGE_SIZE, 1, 200);
    const search = (req.query.search || "").toString().trim().toLowerCase();
    const sortBy = ALLOWED_SORT.has(req.query.sortBy) ? req.query.sortBy : "name";
    const sortDir = ALLOWED_DIR.has(req.query.sortDir) ? req.query.sortDir : "asc";
    const debug = req.query.debug === "1";

    const subId = mustEnv("APPSERVICE_SUBSCRIPTION_ID");
    const rg = mustEnv("APPSERVICE_RESOURCE_GROUP");
    const site = mustEnv("APPSERVICE_STATIC_SITE_NAME");

    const credential = new DefaultAzureCredential();
    const client = new WebSiteManagementClient(credential, subId);

    // --- Pull users from providers ---
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
      for await (const u of client.staticSites.listStaticSiteUsers(rg, site, "all")) {
        addUser(map, u, "all");
      }
    }

    // --- Optional: Graph enrichment for AAD objectIds (best-effort) ---
    const meta = { graphAttempted: 0, graphSucceeded: 0, graphLast: null, cosmosEnabled: false, cosmosTried: 0, cosmosHits: 0 };
    if (ENRICH_AAD && map.size > 0) {
      try {
        await enrichAadUsers(context, credential, map, meta);
      } catch (e) {
        context.log("Graph enrichment error:", e?.message || e);
        meta.graphLast = { status: 0, message: String(e?.message || e) };
      }
    }

    // --- Cosmos profiles (name/email) merge ---
    const cosmosCfg = getCosmosConfig();
    if (cosmosCfg.enabled) {
      meta.cosmosEnabled = true;
      try {
        await mergeCosmosProfiles(context, cosmosCfg, map, meta);
      } catch (e) {
        context.log("Cosmos merge error:", e?.message || e);
      }
    }

    // --- turn into array, then filter/sort/page ---
    const all = Array.from(map.values());

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

  const rolesArr = (p.roles || "").split(",").map((r) => r.trim()).filter(Boolean);
  const normalizedRoles = rolesArr.length ? rolesArr : ["authenticated"];
  const primary = normalizedRoles.find((r) => r !== "anonymous") || "authenticated";

  const rec = {
    id: p.userId || providerUserId || u.id || Math.random().toString(36).slice(2),
    name: display || providerUserId || "(unknown)",
    email,
    role: primary,
    roles: normalizedRoles.filter((r) => r !== "anonymous"),
    provider,
    createdAt: ""
  };

  const key = `${rec.provider}|${rec.id}`;
  const existing = map.get(key);
  if (!existing) return map.set(key, rec);
  const betterName = existing.name === "(unknown)" && rec.name !== "(unknown)";
  const moreRoles = (rec.roles?.length || 0) > (existing.roles?.length || 0);
  const prefer = betterName || moreRoles || (!existing.email && rec.email);
  if (prefer) map.set(key, rec);
}

// ---------- Graph enrichment (best-effort for AAD) ----------
async function enrichAadUsers(context, credential, map, meta) {
  const entries = Array.from(map.entries()).filter(([k, v]) => v.provider === "aad");
  if (entries.length === 0) return;

  const tokenObj = await credential.getToken("https://graph.microsoft.com/.default");
  const accessToken = tokenObj?.token;
  if (!accessToken) throw new Error("Unable to acquire Graph access token");

  for (const [key, rec] of entries) {
    const rawId = String(rec.id || "");
    const hyphenated = looksLike32Hex(rawId) ? hyphenateGuid(rawId) : rawId;

    meta.graphAttempted++;

    const candidates = hyphenated && hyphenated !== rawId ? [hyphenated, rawId] : [rawId];
    let got = null;
    let last = { status: 0, message: "" };

    for (const cand of candidates) {
      const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(cand)}?$select=displayName,mail,userPrincipalName`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }
      });
      if (resp.ok) {
        got = await resp.json();
        last = { status: resp.status, message: "OK" };
        break;
      } else {
        const t = await safeText(resp);
        last = { status: resp.status, message: t || resp.statusText };
      }
    }

    if (got) {
      meta.graphSucceeded++;
      const displayName = got.displayName || "";
      const email = got.mail || got.userPrincipalName || "";
      const updated = { ...rec };
      if (displayName && (rec.name === "(unknown)" || looksLike32Hex(rec.name))) updated.name = displayName;
      if (email && !rec.email) updated.email = email;
      map.set(key, updated);
    } else {
      meta.graphLast = last; // e.g., 404 when SWA ID != Graph objectId
    }
  }
}

async function safeText(resp) { try { return await resp.text(); } catch { return ""; } }
function looksLike32Hex(s) { return /^[0-9a-f]{32}$/i.test(String(s)); }
function hyphenateGuid(h) { const x=String(h); return `${x.slice(0,8)}-${x.slice(8,12)}-${x.slice(12,16)}-${x.slice(16,20)}-${x.slice(20)}`; }

// ---------- Cosmos merge ----------
function getCosmosConfig() {
  const cs = process.env.COSMOS_CONNECTION_STRING || "";
  const db = process.env.COSMOS_DB || "";
  const c  = process.env.COSMOS_DB_PROFILES_CONTAINER || "";
  if (!cs || !db || !c) return { enabled: false };
  return { enabled: true, conn: cs, db, container: c };
}

async function mergeCosmosProfiles(context, cfg, map, meta) {
  const client = new CosmosClient(cfg.conn);
  const container = client.database(cfg.db).container(cfg.container);

  // Point-read each profile by id/pk = `${provider}:${id}`
  const entries = Array.from(map.entries());
  meta.cosmosTried = entries.length;

  // Limit concurrency a bit
  const pool = 8;
  let i = 0;
  async function worker() {
    while (i < entries.length) {
      const idx = i++;
      const [key, rec] = entries[idx];
      const pk = `${rec.provider}:${rec.id}`;
      try {
        const { resource } = await container.item(pk, pk).read();
        if (resource) {
          meta.cosmosHits++;
          const updated = { ...rec };
          if (resource.name)  updated.name  = resource.name;
          if (resource.email) updated.email = resource.email;
          map.set(key, updated);
        }
      } catch (e) {
        // 404 is expected for missing docs; ignore others
        if (e.code && e.code !== 404) context.log("Cosmos read error", pk, e.code, e.message);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(pool, entries.length) }, worker));
}
