// FILE: api/manageUsersDelete/index.js
const { DefaultAzureCredential } = require("@azure/identity");
const { WebSiteManagementClient } = require("@azure/arm-appservice");

module.exports = async function (context, req) {
  try {
    const cp = parseCP(req);
    if (!hasAnyRole(cp, ["admin","manager"])) return json(context, 403, { error: "Forbidden" });

    const { provider, userId } = req.body || {};
    if (!provider || !userId) return json(context, 400, { error: "BadRequest" });

    const subId = must("APPSERVICE_SUBSCRIPTION_ID");
    const rg = must("APPSERVICE_RESOURCE_GROUP");
    const site = must("APPSERVICE_STATIC_SITE_NAME");
    const cred = new DefaultAzureCredential();
    const cli = new WebSiteManagementClient(cred, subId);

    await cli.staticSites.deleteStaticSiteUser(rg, site, provider, userId);
    return json(context, 200, { ok: true });
  } catch (e) {
    context.log.error("manageUsersDelete:", e?.message || e);
    return json(context, 500, { error: "ServerError", message: e?.message || String(e) });
  }
};

function json(ctx, status, body){ ctx.res = { status, headers:{ "content-type":"application/json" }, body }; return ctx.res; }
function parseCP(req){ try{ const d=Buffer.from(req.headers["x-ms-client-principal"],"base64").toString("utf8"); const cp=JSON.parse(d); return { ...cp, userRoles:(cp.userRoles||[]).filter(r=>r!=="anonymous") }; }catch{return null;} }
function hasAnyRole(cp, allowed){ if(!cp) return false; const set=new Set((cp.userRoles||[]).map(x=>String(x).toLowerCase())); return allowed.some(r=>set.has(String(r).toLowerCase())); }
function must(n){ const v=process.env[n]; if(!v) throw new Error(`Missing env ${n}`); return v; }
