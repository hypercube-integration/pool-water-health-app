// FILE: api/users/index.js  (DROP-IN REPLACEMENT)
// PURPOSE: List SWA users (AAD + GitHub) and merge Name/Email from Cosmos.
// ENV: COSMOS_CONNECTION_STRING, COSMOS_DB, COSMOS_CONTAINER
//      APPSERVICE_SUBSCRIPTION_ID, APPSERVICE_RESOURCE_GROUP, APPSERVICE_STATIC_SITE_NAME

const { DefaultAzureCredential } = require("@azure/identity");
const { WebSiteManagementClient } = require("@azure/arm-appservice");
const { CosmosClient } = require("@azure/cosmos");

module.exports = async function (context, req) {
  const meta = {
    cosmosEnabled: false,
    cosmosHits: 0,
    cosmosTried: 0,
    graphAttempted: 0,
    graphSucceeded: 0
  };

  try {
    const cp = parseCP(req);
    if (!hasAnyRole(cp, ["admin", "manager"])) {
      return (context.res = json(403, "Forbidden"));
    }

    // pagination/sort/search
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || "10", 10)));
    const search = String(req.query.search || "").toLowerCase();
    const sortBy = (req.query.sortBy || "createdAt").toLowerCase();
    const sortDir = (req.query.sortDir || "desc").toLowerCase();

    // 1) Pull users from SWA (AAD + GitHub)
    const subId = mustEnv("APPSERVICE_SUBSCRIPTION_ID");
    const rg = mustEnv("APPSERVICE_RESOURCE_GROUP");
    const site = mustEnv("APPSERVICE_STATIC_SITE_NAME");

    const credential = new DefaultAzureCredential();
    const client = new WebSiteManagementClient(credential, subId);

    const providers = ["aad", "github"];
    const raw = [];
    for (const p of providers) {
      try {
        const iter = client.staticSites.listStaticSiteUsers(rg, site, p);
        for await (const u of iter) {
          const props = u?.properties || u || {};
          const userId = props.userId || props.userIdHash || props.name || ""; // depends on API version
          const rolesStr = props.roles || "";
          raw.push({
            id: userId,
            name: userId,              // will be replaced by Cosmos merge
            email: "",
            role: rolesStr ? rolesStr.split(",")[0] : "authenticated",
            roles: rolesStr ? rolesStr.split(",").map((r) => r.trim()).filter(Boolean) : ["authenticated"],
            provider: (props.provider || p || "").toLowerCase(),
            createdAt: props.createdOn || props.createdAt || ""
          });
        }
      } catch (e) {
        context.log.warn(`listStaticSiteUsers(${p}) failed:`, e?.message || e);
      }
    }

    // 2) Merge Cosmos profiles (if configured)
    const cfg = getCosmosConfig();
    if (cfg.enabled) {
      meta.cosmosEnabled = true;
      const clientCosmos = new CosmosClient(cfg.conn);
      const container = clientCosmos.database(cfg.db).container(cfg.container);

      for (const row of raw) {
        meta.cosmosTried++;
        const id = `${row.provider}:${row.id}`;
        try {
          const { resource } = await container.item(id, id).read();
          if (resource) {
            if (resource.name) row.name = resource.name;
            if (resource.email) row.email = resource.email;
            meta.cosmosHits++;
          }
        } catch (e) {
          // ignore 404s
          if (e.code && e.code !== 404) context.log.warn("Cosmos read error:", e.message || e);
        }
      }
    }

    // 3) Search / Sort / Paginate
    let rows = raw;
    if (search) {
      rows = rows.filter((r) =>
        (r.name || "").toLowerCase().includes(search) ||
        (r.email || "").toLowerCase().includes(search) ||
        (r.id || "").toLowerCase().includes(search)
      );
    }

    rows.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const va = (a[sortBy] || "").toString().toLowerCase();
      const vb = (b[sortBy] || "").toString().toLowerCase();
      if (va < vb) return -1 * dir;
      if (va > vb) return  1 * dir;
      return 0;
    });

    const total = rows.length;
    const start = (page - 1) * pageSize;
    const paged = rows.slice(start, start + pageSize);

    const body = {
      rows: paged,
      total,
      meta
    };

    // debug mode passthrough
    if (req.query.debug) body.meta.debug = true;
    return (context.res = json(200, body));
  } catch (err) {
    context.log.error("users list error:", err?.message || err);
    return (context.res = json(500, { error: "ServerError" }));
  }
};

// --------------- helpers ----------------
function json(status, body) { return { status, headers: { "content-type": "application/json" }, body }; }
function mustEnv(n) { const v = process.env[n]; if (!v) throw new Error(`Missing env: ${n}`); return v; }
function parseCP(req){ try{ const h=req.headers["x-ms-client-principal"]; if(!h) return null; const d=Buffer.from(h,"base64").toString("utf8"); const cp=JSON.parse(d); cp.userRoles=(cp.userRoles||[]).filter(r=>r!=="anonymous"); return cp; }catch{return null;} }
function hasAnyRole(cp, allowed){ if(!cp) return false; const set=new Set((cp.userRoles||[]).map((x)=>String(x).toLowerCase())); return allowed.some((r)=>set.has(String(r).toLowerCase())); }
function getCosmosConfig(){ const conn=process.env.COSMOS_CONNECTION_STRING||""; const db=process.env.COSMOS_DB||""; const c=process.env.COSMOS_CONTAINER||""; return conn&&db&&c?{enabled:true, conn, db, container:c}:{enabled:false}; }
