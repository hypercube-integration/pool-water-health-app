// BEGIN FILE: api/users/index.js
// VERSION: 2025-08-24
// NOTES:
// - Server-side pagination/sort/search scaffold.
// - Uses MOCK data by default. To wire Cosmos DB, replace `fetchAllUsers()` implementation.
// - Returns { rows, total }.

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const ALLOWED_SORT = new Set(["name", "email", "role", "createdAt"]);
const ALLOWED_DIR = new Set(["asc", "desc"]);

module.exports = async function (context, req) {
  try {
    const page = clampInt(req.query.page, DEFAULT_PAGE, 1, 100000);
    const pageSize = clampInt(req.query.pageSize, DEFAULT_PAGE_SIZE, 1, 200);
    const search = (req.query.search || "").toString().trim().toLowerCase();
    const sortBy = ALLOWED_SORT.has(req.query.sortBy) ? req.query.sortBy : "createdAt";
    const sortDir = ALLOWED_DIR.has(req.query.sortDir) ? req.query.sortDir : "desc";

    // TODO(Production): enforce role guards via EasyAuth claims if needed
    // const clientPrincipal = req.headers["x-ms-client-principal"];
    // Parse and check roles here if you need server-side enforcement.

    const all = await fetchAllUsers(context); // Array of user objects
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
      body: { error: err?.message || "Server error" },
    };
  }
};

// --- Helpers & Data ---

function clampInt(val, fallback, min, max) {
  const n = parseInt(val, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// Replace this with Cosmos DB logic in production
async function fetchAllUsers(context) {
  // MOCK data for initial wiring; add/remove fields to match your front-end columns
  // In a real app, fetch from Cosmos and map to { id, name, email, role, createdAt }
  const mock = [
    { id: "u1", name: "Alice", email: "alice@example.com", role: "admin", createdAt: "2025-06-01" },
    { id: "u2", name: "Bob", email: "bob@example.com", role: "viewer", createdAt: "2025-06-02" },
    { id: "u3", name: "Cara", email: "cara@example.com", role: "manager", createdAt: "2025-06-03" },
    { id: "u4", name: "Dan", email: "dan@example.com", role: "viewer", createdAt: "2025-06-04" },
    { id: "u5", name: "Eve", email: "eve@example.com", role: "viewer", createdAt: "2025-06-05" },
    { id: "u6", name: "Frank", email: "frank@example.com", role: "manager", createdAt: "2025-06-06" },
    { id: "u7", name: "Grace", email: "grace@example.com", role: "viewer", createdAt: "2025-06-07" },
    { id: "u8", name: "Hank", email: "hank@example.com", role: "viewer", createdAt: "2025-06-08" },
    { id: "u9", name: "Ivy", email: "ivy@example.com", role: "viewer", createdAt: "2025-06-09" },
    { id: "u10", name: "Jack", email: "jack@example.com", role: "viewer", createdAt: "2025-06-10" },
    { id: "u11", name: "Kara", email: "kara@example.com", role: "viewer", createdAt: "2025-06-11" }
  ];
  return mock;
}

/* --- Cosmos DB (Optional Production Example) ---
const { CosmosClient } = require("@azure/cosmos");

// env required:
// COSMOS_ENDPOINT, COSMOS_KEY, COSMOS_DB, COSMOS_CONTAINER
async function fetchAllUsers(context) {
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  const databaseId = process.env.COSMOS_DB || "appdb";
  const containerId = process.env.COSMOS_CONTAINER || "users";

  if (!endpoint || !key) {
    context.log.warn("COSMOS env vars missing; falling back to MOCK data.");
    return await fetchAllUsersMock();
  }

  const client = new CosmosClient({ endpoint, key });
  const container = client.database(databaseId).container(containerId);

  // Adjust SELECT to your schema
  const { resources } = await container.items
    .query("SELECT c.id, c.name, c.email, c.role, c.createdAt FROM c")
    .fetchAll();

  return resources || [];
}
--- end Cosmos example --- */
