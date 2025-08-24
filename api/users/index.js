// BEGIN FILE: api/users/index.js
// VERSION: 2025-08-24
// NOTES:
// - Lists real SWA users via Azure Management API (StaticSites_ListStaticSiteUsers)
// - Requires env: APPSERVICE_SUBSCRIPTION_ID, APPSERVICE_RESOURCE_GROUP, APPSERVICE_STATIC_SITE_NAME
// - Auth: DefaultAzureCredential (Managed Identity in Azure, az login / env secrets locally)

const { DefaultAzureCredential } = require("@azure/identity");
const { WebSiteManagementClient } = require("@azure/arm-appservice");

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const ALLOWED_SORT = new Set(["name", "email", "role", "provider", "createdAt"]);
const ALLOWED_DIR = new Set(["asc", "desc"]);

module.exports = async function (context, req) {
  try {
    // --- RBAC using EasyAuth header (UI + API aligned) ---
    const principal = parseClientPrincipal(req);
    if (!hasAnyRole(principal, ["admin", "manager"])) {
      context.res = { status: 403, headers: { "content-type": "application/json" }, body: { error: "Forbidden" } };
      return;
    }

    // --- Query params ---
    const page = clampInt(req.query.page, DEFAULT_PAGE, 1, 100000);
    const pageSize = clampInt(req.query.pageSize, DEFAULT_PAGE_SIZE, 1, 200);
    const search = (req.query.search || "").toString().trim().toLowerCase();
    const sortBy = ALLOWED_SORT.has(req.query.sortBy) ? req.query.sortBy : "name";
    const sortDir = ALLOWED_DIR.has(req.query.sortDir) ? req.query.sortDir : "asc";

    // --- Pull users from Azure Static Web Apps Management API ---
    const subId = requiredEnv("APPSERVICE_SUBSCRIPTION_ID");
    const rg = requiredEnv("APPSERVICE_RESOURCE_GROUP");
    const staticSiteName = requiredEnv("APPSERVICE_STATIC_SITE_NAME");

    const credential = new DefaultAzureCredential(); // MI in Azure; dev creds locally
    const client = new WebSiteManagementClient(credential, subId);

    const rawUsers = [];
    // authprovider can be "all" | "aad" | "github" | "twitter"
    for await (const item of client.staticSites.listStaticSiteUsers(rg, staticSiteName, "all")) {
      rawUsers.push(item);
    }

    // --- Shape to UI rows ---
    const all = rawUsers.map((u) => {
      const p = u?.properties || {};
      const display = p.displayName || "";
      const emailGuess = /@/.test(display) ? display : "";
      const roleStr = (p.roles || "").split(",").map((r) => r.trim()).filter(Boolean);
      // Prefer first non-default role; fall back to "authenticated"
      const primaryRole = roleStr.find((r) => r !== "anonymous" && r !== "authenticated") || "authenticated";
      return {
        id: p.userId || u.id || Math.random().toString(36).slice(2),
        name: display || p.userId || "(unknown)",
        email: emailGuess,
        role: primaryRole,
        provider: p.provider || "",
        createdAt: "" // not provided by API
      };
    });

    // --- Search ---
    let filtered = all;
    if (search) {
      filtered = all.filter((r) =>
        [r.name, r.email, r.role, r.provider].some((v) => String(v || "").toLowerCase().includes(search))
      );
    }

    // --- Sort ---
    filtered.sort((a, b) => {
      const av = a[sortBy] ?? "";
      const bv = b[sortBy] ?? "";
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

    // --- Page ---
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const rows = filtered.slice(start, start + pageSize);

    context.res = { status: 200, headers: { "content-type": "application/json" }, body: { rows, total } };
  } catch (err) {
    context.log.error("users function error", err);
    context.res = { status: 500, headers: { "content-type": "application/json" }, body: { error: "Server error" } };
  }
};

// ---- helpers ----
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

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}
