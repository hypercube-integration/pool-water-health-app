// BEGIN FILE: api/users/index.js
// VERSION: 2025-08-25
// NOTES:
// - Queries SWA Users per provider (aad/github/twitter) then de-dupes
// - Surfaces display name, provider, ALL roles (array), plus primary role
// - Still enforces RBAC via EasyAuth (admin/manager)

const { DefaultAzureCredential } = require("@azure/identity");
const { WebSiteManagementClient } = require("@azure/arm-appservice");

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const ALLOWED_SORT = new Set(["name", "email", "role", "provider", "createdAt"]);
const ALLOWED_DIR = new Set(["asc", "desc"]);
const PROVIDERS = ["aad", "github", "twitter"];

const EXPOSE_ERRORS = false; // set true temporarily if you want error text in responses

module.exports = async function (context, req) {
  try {
    // ---- RBAC from EasyAuth ----
    const principal = parseClientPrincipal(req);
    if (!hasAnyRole(principal, ["admin", "manager"])) {
      return (context.res = resp(403, { error: "Forbidden" }));
    }

    // ---- Query params ----
    const page = clampInt(req.query.page, DEFAULT_PAGE, 1, 100000);
    const pageSize = clampInt(req.query.pageSize, DEFAULT_PAGE_SIZE, 1, 200);
    const search = (req.query.search || "").toString().trim().toLowerCase();
    const sortBy = ALLOWED_SORT.has(req.query.sortBy) ? req.query.sortBy : "name";
    const sortDir = ALLOWED_DIR.has(req.query.sortDir) ? req.query.sortDir : "asc";

    // ---- Required env ----
    const missing = [];
    const subId = getEnv("APPSERVICE_SUBSCRIPTION_ID", missing);
    const rg = getEnv("APPSERVICE_RESOURCE_GROUP", missing);
    const site = getEnv("APPSERVICE_STATIC_SITE_NAME", missing);
    if (missing.length) {
      return (context.res = resp(500, {
        error: "MissingConfig",
        message: EXPOSE_ERRORS ? `Missing env var(s): ${missing.join(", ")}` : "Server configuration error"
      }));
    }

    const credential = new DefaultAzureCredential(); // MI in Azure / az login locally
    const client = new WebSiteManagementClient(credential, subId);

    // ---- Gather users from each provider (some return richer displayName) ----
    const map = new Map(); // key: provider|userId
    for (const provider of PROVIDERS) {
      try {
        for await (const u of client.staticSites.listStaticSiteUsers(rg, site, provider)) {
          const p = u?.properties || {};
          const display = (p.displayName || "").trim();
          const emailGuess = /@/.test(display) ? display : "";
          const rolesArr = (p.roles || "")
            .split(",")
            .map((r) => r.trim())
            .filter(Boolean);

          const primary =
            rolesArr.find((r) => r !== "anonymous" && r !== "authenticated") ||
            (rolesArr.includes("authenticated") ? "authenticated" : "");

          const rec = {
            id: p.userId || u.id || `${provider}:${Math.random().toString(36).slice(2)}`,
            name: display || p.userId || "(unknown)",
            email: emailGuess, // SWA Mgmt API doesn't provide a separate email field
            role: primary || "authenticated",
            roles: rolesArr.filter((r) => r !== "anonymous"), // keep everything except anonymous
            provider: p.provider || provider,
            createdAt: "" // not provided by API
          };

          const key = `${rec.provider}|${rec.id}`;
          // Prefer a record that has a non-empty display or more roles
          const existing = map.get(key);
          if (!existing) map.set(key, rec);
          else {
            const betterName = existing.name === "(unknown)" && rec.name !== "(unknown)";
            const moreRoles = (rec.roles?.length || 0) > (existing.roles?.length || 0);
            const prefer = betterName || moreRoles || (!existing.email && rec.email);
            if (prefer) map.set(key, rec);
          }
        }
      } catch (e) {
        // keep going if a provider has no users configured
        context.log(`Provider ${provider} list failed or empty:`, e?.message || e);
      }
    }

    // If we found nothing, try "all" as a fallback
    if (map.size === 0) {
      try {
        for await (const u of client.staticSites.listStaticSiteUsers(rg, site, "all")) {
          const p = u?.properties || {};
          const display = (p.displayName || "").trim();
          const emailGuess = /@/.test(display) ? display : "";
          const rolesArr = (p.roles || "").split(",").map((r) => r.trim()).filter(Boolean);
          const primary =
            rolesArr.find((r) => r !== "anonymous" && r !== "authenticated") ||
            (rolesArr.includes("authenticated") ? "authenticated" : "");
          const rec = {
            id: p.userId || u.id || Math.random().toString(36).slice(2),
            name: display || p.userId || "(unknown)",
            email: emailGuess,
            role: primary || "authenticated",
            roles: rolesArr.filter((r) => r !== "anonymous"),
            provider: p.provider || "",
            createdAt: ""
          };
          map.set(`all|${rec.id}`, rec);
        }
      } catch (e) {
        context.log("Fallback 'all' list failed:", e?.message || e);
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

    return (context.res = resp(200, { rows, total }));
  } catch (err) {
    context.log.error("users function error:", err?.message || err, {
      code: err?.code,
      statusCode: err?.statusCode
    });
    return (context.res = resp(err?.statusCode || 500, {
      error: "ServerError",
      message: EXPOSE_ERRORS ? (err?.message || "Unknown error") : "Server error"
    }));
  }
};

// ---------- helpers ----------
function resp(status, body) {
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
    const roles = (principal.userRoles || []).filter((r) => r !== "anonymous" && r !== "authenticated") || [];
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
function getEnv(name, missing) {
  const v = process.env[name];
  if (!v) missing.push(name);
  return v;
}
