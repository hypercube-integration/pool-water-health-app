// BEGIN FILE: api/users/index.js
// VERSION: 2025-08-25
// NOTES:
// - Lists real SWA users via Azure Management API (ARM SDK)
// - Clear diagnostics when config/permissions are missing
// - Enforces RBAC: only 'admin' or 'manager' can call this API

const { DefaultAzureCredential } = require("@azure/identity");
const { WebSiteManagementClient } = require("@azure/arm-appservice");

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const ALLOWED_SORT = new Set(["name", "email", "role", "provider", "createdAt"]);
const ALLOWED_DIR = new Set(["asc", "desc"]);

// set true temporarily if you want the error reason in the response body
const EXPOSE_ERRORS = true;

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
        message: EXPOSE_ERRORS
          ? `Missing env var(s): ${missing.join(", ")}`
          : "Server configuration error"
      }));
    }

    // ---- ARM call ----
    const credential = new DefaultAzureCredential(); // MI in Azure / az login locally
    const client = new WebSiteManagementClient(credential, subId);

    const rawUsers = [];
    // authprovider can be "all" | "aad" | "github" | "twitter"
    for await (const u of client.staticSites.listStaticSiteUsers(rg, site, "all")) {
      rawUsers.push(u);
    }

    const all = (rawUsers || []).map((u) => {
      const p = u?.properties || {};
      const display = p.displayName || "";
      const emailGuess = /@/.test(display) ? display : "";
      const rolesStr = (p.roles || "").split(",").map((r) => r.trim()).filter(Boolean);
      const primary = rolesStr.find((r) => r !== "anonymous" && r !== "authenticated") || "authenticated";
      return {
        id: p.userId || u.id || Math.random().toString(36).slice(2),
        name: display || p.userId || "(unknown)",
        email: emailGuess,
        role: primary,
        provider: p.provider || "",
        createdAt: "" // not provided by ARM
      };
    });

    // ---- filter/sort/page ----
    let filtered = all;
    if (search) {
      filtered = all.filter((r) => [r.name, r.email, r.role, r.provider].some((v) => String(v || "").toLowerCase().includes(search)));
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
      message: EXPOSE_ERRORS ? (err?.message || "Unknown error") : "Server error",
      code: err?.code || undefined,
      statusCode: err?.statusCode || undefined
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
