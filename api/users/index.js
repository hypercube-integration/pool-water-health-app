// BEGIN FILE: api/users/index.js
// VERSION: 2025-08-24
// NOTES:
// - Inline EasyAuth role parsing (no external imports)
// - Safe 403 for non-admin/manager instead of crashing
// - Mock data source; swap to Cosmos later

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const ALLOWED_SORT = new Set(["name", "email", "role", "createdAt"]);
const ALLOWED_DIR = new Set(["asc", "desc"]);

module.exports = async function (context, req) {
  try {
    // --- RBAC from EasyAuth ---
    const principal = parseClientPrincipal(req);
    if (!hasAnyRole(principal, ["admin", "manager"])) {
      context.res = { status: 403, headers: { "content-type": "application/json" }, body: { error: "Forbidden" } };
      return;
    }

    // --- Query params ---
    const page = clampInt(req.query.page, DEFAULT_PAGE, 1, 100000);
    const pageSize = clampInt(req.query.pageSize, DEFAULT_PAGE_SIZE, 1, 200);
    const search = (req.query.search || "").toString().trim().toLowerCase();
    const sortBy = ALLOWED_SORT.has(req.query.sortBy) ? req.query.sortBy : "createdAt";
    const sortDir = ALLOWED_DIR.has(req.query.sortDir) ? req.query.sortDir : "desc";

    // --- Data (mock for now) ---
    const all = await fetchAllUsers();
    let filtered = all;

    if (search) {
      filtered = filtered.filter((u) =>
        Object.values(u).some((v) => String(v ?? "").toLowerCase().includes(search))
      );
    }

    filtered.sort((a, b) => {
      const av = a[sortBy] ?? "";
      const bv = b[sortBy] ?? "";
      if (av === bv) return 0;
      if (sortDir === "asc") return av > bv ? 1 : -1;
      return av < bv ? 1 : -1;
    });

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const rows = filtered.slice(start, start + pageSize);

    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: { rows, total },
    };
  } catch (err) {
    context.log.error("users function error", err);
    context.res = {
      status: 500,
      headers: { "content-type": "application/json" },
      body: { error: "Server error" },
    };
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
    const roles =
      (principal.userRoles || []).filter((r) => r !== "anonymous" && r !== "authenticated") || [];
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

// Replace with Cosmos later
async function fetchAllUsers() {
  return [
    { id: "u1", name: "Alice", email: "alice@example.com", role: "admin",   createdAt: "2025-06-01" },
    { id: "u2", name: "Bob",   email: "bob@example.com",   role: "viewer",  createdAt: "2025-06-02" },
    { id: "u3", name: "Cara",  email: "cara@example.com",  role: "manager", createdAt: "2025-06-03" },
    { id: "u4", name: "Dan",   email: "dan@example.com",   role: "viewer",  createdAt: "2025-06-04" },
    { id: "u5", name: "Eve",   email: "eve@example.com",   role: "viewer",  createdAt: "2025-06-05" },
    { id: "u6", name: "Frank", email: "frank@example.com", role: "manager", createdAt: "2025-06-06" },
    { id: "u7", name: "Grace", email: "grace@example.com", role: "viewer",  createdAt: "2025-06-07" },
    { id: "u8", name: "Hank",  email: "hank@example.com",  role: "viewer",  createdAt: "2025-06-08" },
    { id: "u9", name: "Ivy",   email: "ivy@example.com",   role: "viewer",  createdAt: "2025-06-09" },
    { id: "u10",name: "Jack",  email: "jack@example.com",  role: "viewer",  createdAt: "2025-06-10" },
    { id: "u11",name: "Kara",  email: "kara@example.com",  role: "viewer",  createdAt: "2025-06-11" }
  ];
}
