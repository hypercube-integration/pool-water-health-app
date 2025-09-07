// FILE: api/users/index.js  (DROP-IN)
// Lists SWA users via ARM + merges Name/Email from Cosmos.
// Env: COSMOS_CONNECTION_STRING, COSMOS_DB, COSMOS_CONTAINER
//      APPSERVICE_SUBSCRIPTION_ID, APPSERVICE_RESOURCE_GROUP, APPSERVICE_STATIC_SITE_NAME
const { DefaultAzureCredential } = require("@azure/identity");
const { WebSiteManagementClient } = require("@azure/arm-appservice");
const { CosmosClient } = require("@azure/cosmos");

module.exports = async function (context, req) {
  const meta = { errors: [], providersTried: [], cosmosEnabled: false, cosmosHits: 0 };
  try {
    const cp = parseCP(req);
    if (!hasAnyRole(cp, ["admin","manager"])) return (context.res = json(403, { error: "Forbidden" }));

    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || "10", 10)));
    const search = String(req.query.search || "").toLowerCase();
    const sortBy = (req.query.sortBy || "createdAt").toLowerCase();
    const sortDir = (req.query.sortDir || "desc").toLowerCase();

    const subId = mustEnv("APPSERVICE_SUBSCRIPTION_ID");
    const rg = mustEnv("APPSERVICE_RESOURCE_GROUP");
    const site = mustEnv("APPSERVICE_STATIC_SITE_NAME");

    const cred = new DefaultAzureCredential();
    const cli = new WebSiteManagementClient(cred, subId);

    const raw = [];
    for (const provider of ["aad","github"]) {
      meta.providersTried.push(provider);
      try {
        const it = cli.staticSites.listStaticSiteUsers(rg, site, provider);
        for await (const u of it) {
          const p = u?.properties || u || {};
          const userId = p.userId || p.userIdHash || p.name || "";
          const rolesStr = p.roles || "";
          raw.push({
            id: userId,
            name: userId, // replaced by Cosmos merge if present
            email: "",
            role: rolesStr ? rolesStr.split(",")[0] : "authenticated",
            roles: rolesStr ? rolesStr.split(",").map((r)=>r.trim()).filter(Boolean) : ["authenticated"],
            provider: (p.provider || provider || "").toLowerCase(),
            createdAt: p.createdOn || p.createdAt || ""
          });
        }
      } catch (e) {
        meta.errors.push({ provider, code: e?.statusCode || e?.code, message: e?.message || String(e) });
      }
    }

    if (raw.length === 0 && meta.errors.length === meta.providersTried.length) {
      return (context.res = json(500, { error: "ARM list users failed", meta }));
    }

    // Cosmos merge (optional)
    const cfg = getCosmosCfg();
    if (cfg.enabled) {
      meta.cosmosEnabled = true;
      try {
        const c = new CosmosClient(cfg.conn).database(cfg.db).container(cfg.container);
        for (const row of raw) {
          const id = `${row.provider}:${row.id}`;
          try {
            const { resource } = await c.item(id, id).read();
            if (resource) {
              if (resource.name) row.name = resource.name;
              if (resource.email) row.email = resource.email;
              meta.cosmosHits++;
            }
          } catch (e) {
            if (e.code && e.code !== 404) meta.errors.push({ where: "cosmos-read", code: e.code, message: e.message });
          }
        }
      } catch (e) {
        meta.errors.push({ where: "cosmos-init", message: e?.message || String(e) });
      }
    }

    // Search/sort/page
    let rows = raw;
    if (search) rows = rows.filter(r =>
      (r.name||"").toLowerCase().includes(search) ||
      (r.email||"").toLowerCase().includes(search) ||
      (r.id||"").toLowerCase().includes(search)
    );
    rows.sort((a,b)=>{ const d=sortDir==="asc"?1:-1; const va=(a[sortBy]||"").toString().toLowerCase(); const vb=(b[sortBy]||"").toString().toLowerCase(); return va<vb?-1*d:va>vb?1*d:0; });
    const total = rows.length;
    const start = (page-1)*pageSize;
    const paged = rows.slice(start, start+pageSize);

    return (context.res = json(200, { rows: paged, total, meta, debug: !!req.query.debug }));
  } catch (err) {
    context.log.error("users error:", err?.message || err);
    return (context.res = json(500, { error: "ServerError", message: err?.message || String(err), meta }));
  }
};

function json(status, body){ return { status, headers:{ "content-type":"application/json" }, body }; }
function mustEnv(n){ const v=process.env[n]; if (!v) throw new Error(`Missing env: ${n}`); return v; }
function parseCP(req){ try{ const h=req.headers["x-ms-client-principal"]; if(!h) return null; const d=Buffer.from(h,"base64").toString("utf8"); const cp=JSON.parse(d); cp.userRoles=(cp.userRoles||[]).filter(r=>r!=="anonymous"); return cp; }catch{ return null; } }
function hasAnyRole(cp, allowed){ if(!cp) return false; const set=new Set((cp.userRoles||[]).map(x=>String(x).toLowerCase())); return allowed.some(r=>set.has(String(r).toLowerCase())); }
function getCosmosCfg(){ const conn=process.env.COSMOS_CONNECTION_STRING||""; const db=process.env.COSMOS_DB||""; const c=process.env.COSMOS_CONTAINER||""; return conn&&db&&c?{enabled:true, conn, db, container:c}:{enabled:false}; }
