// FILE: api/users/index.js  (DROP-IN)
// Uses authprovider="all" to list everyone, then merges Profiles (Cosmos).
const { DefaultAzureCredential } = require("@azure/identity");
const { WebSiteManagementClient } = require("@azure/arm-appservice");
const { getProfilesCosmos } = require("../_shared/cosmosProfiles");

module.exports = async function (context, req) {
  const meta = { errors: [], providersTried: ["all"], cosmosEnabled: false, cosmosHits: 0 };
  try {
    const cp = parseCP(req);
    if (!hasAnyRole(cp, ["admin","manager"])) return json(context, 403, { error: "Forbidden" });

    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || "10", 10)));
    const search = String(req.query.search || "").toLowerCase();
    const sortBy = (req.query.sortBy || "createdAt").toLowerCase();
    const sortDir = (req.query.sortDir || "desc").toLowerCase();

    const subId = must("APPSERVICE_SUBSCRIPTION_ID");
    const rg = must("APPSERVICE_RESOURCE_GROUP");
    const site = must("APPSERVICE_STATIC_SITE_NAME");

    const cred = new DefaultAzureCredential();
    const cli = new WebSiteManagementClient(cred, subId);

    // NEW: list once with "all"
    const raw = [];
    try {
      const it = cli.staticSites.listStaticSiteUsers(rg, site, "all");
      for await (const u of it) {
        const p = u?.properties || u || {};
        const userId = p.userId || p.userIdHash || p.name || "";
        const rolesStr = p.roles || "";
        const provider = String(p.provider || p.authProvider || p.authprovider || "").toLowerCase();
        raw.push({
          id: userId,
          name: userId, // replaced by Cosmos merge if present
          email: "",
          role: rolesStr ? rolesStr.split(",")[0] : "authenticated",
          roles: rolesStr ? rolesStr.split(",").map(r=>r.trim()).filter(Boolean) : ["authenticated"],
          provider,
          createdAt: p.createdOn || p.createdAt || ""
        });
      }
    } catch (e) {
      meta.errors.push({ where: "arm-list-users", code: e?.statusCode || e?.code, message: e?.message || String(e) });
    }

    if (raw.length === 0 && meta.errors.length) {
      return json(context, 500, { error: "ARM list users failed", meta });
    }

    // Merge from Cosmos Profiles
    const cosmos = getProfilesCosmos();
    if (cosmos.enabled) {
      meta.cosmosEnabled = true;
      const c = cosmos.client.database(cosmos.db).container(cosmos.container);
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
    }

    // search/sort/paginate
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

    return json(context, 200, { rows: paged, total, meta, debug: !!req.query.debug });
  } catch (e) {
    context.log.error("users:", e?.message || e);
    return json(context, 500, { error: "ServerError", message: e?.message || String(e), meta });
  }
};

function json(ctx, status, body){ ctx.res = { status, headers:{ "content-type":"application/json" }, body }; return ctx.res; }
function must(n){ const v=process.env[n]; if (!v) throw new Error(`Missing env ${n}`); return v; }
function parseCP(req){ try{ const d=Buffer.from(req.headers["x-ms-client-principal"],"base64").toString("utf8"); const cp=JSON.parse(d); cp.userRoles=(cp.userRoles||[]).filter(r=>r!=="anonymous"); return cp; }catch{return null;} }
function hasAnyRole(cp, allowed){ if(!cp) return false; const set=new Set((cp.userRoles||[]).map(x=>String(x).toLowerCase())); return allowed.some(r=>set.has(String(r).toLowerCase())); }
