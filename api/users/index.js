// BEGIN FILE: api/users/index.js
// VERSION: 2025-08-25
// NOTES:
// - Parses provider & providerUserId from the resourceId when properties are sparse
// - Shows ALL roles (array) and a sensible primary role
// - Defaults missing roles to ["authenticated"]
// - RBAC enforced via EasyAuth (admin/manager)

const { DefaultAzureCredential } = require("@azure/identity");
const { WebSiteManagementClient } = require("@azure/arm-appservice");

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const ALLOWED_SORT = new Set(["name", "email", "role", "provider", "createdAt"]);
const ALLOWED_DIR = new Set(["asc", "desc"]);
const PROVIDERS = ["aad", "github", "twitter"]; // we’ll try each, then fall back to "all"

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

    // Collect users from providers (richer in some cases)
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

    // Fallback to "all" if nothing found or to fill gaps
    if (map.size === 0) {
      for await (const u of client.staticSites.listStaticSiteUsers(rg, site, "all")) {
        addUser(map, u, "all");
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

// Parse provider & userId from ARM resourceId, e.g.:
// /subscriptions/.../staticSites/<name>/authproviders/github/users/<id>
function deriveFromId(resourceId) {
  if (!resourceId) return { provider: "", providerUserId: "" };
  const m = String(resourceId).match(/authproviders\/([^/]+)\/users\/([^/]+)/i);
  return m ? { provider: m[1], providerUserId: m[2] } : { provider: "", providerUserId: "" };
}

function addUser(map, u, providerHint) {
  const p = u?.properties || {};
  const { provider: provFromId, providerUserId } = deriveFromId(u?.id);
  const provider = p.provider || (providerHint !== "all" ? providerHint : provFromId) || "";

  const display = (p.displayName || "").trim();
  const email = /@/.test(display) ? display : ""; // Mgmt API doesn't expose separate email

  const rolesArr = (p.roles || "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  // If nothing came back, default to "authenticated" (SWA baseline for signed-in users)
  const normalizedRoles = rolesArr.length ? rolesArr : ["authenticated"];

  // Primary role = first non-anonymous, else authenticated
  const primary =
    normalizedRoles.find((r) => r !== "anonymous") || "authenticated";

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

  // Prefer the record with a better name or more roles
  const betterName = existing.name === "(unknown)" && rec.name !== "(unknown)";
  const moreRoles = (rec.roles?.length || 0) > (existing.roles?.length || 0);
  const prefer = betterName || moreRoles || (!existing.email && rec.email);
  if (prefer) map.set(key, rec);
}
