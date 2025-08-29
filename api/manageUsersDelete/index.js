// VERSION: 2025-08-25
// ACTION: Delete a SWA user entry (admin/manager)
// POST /api/users/delete  BODY: { provider: "aad"|"github"|"twitter", userId: "<id>" }

const { DefaultAzureCredential } = require("@azure/identity");
const { WebSiteManagementClient } = require("@azure/arm-appservice");

module.exports = async function (context, req) {
  try {
    const cp = parseCP(req);
    if (!hasAnyRole(cp, ["admin", "manager"])) {
      return (context.res = json(403, { error: "Forbidden" }));
    }

    const { provider, userId } = req.body || {};
    if (!provider || !userId) {
      return (context.res = json(400, { error: "BadRequest", message: "provider and userId are required" }));
    }

    const subId = mustEnv("APPSERVICE_SUBSCRIPTION_ID");
    const rg = mustEnv("APPSERVICE_RESOURCE_GROUP");
    const site = mustEnv("APPSERVICE_STATIC_SITE_NAME");

    const credential = new DefaultAzureCredential();
    const client = new WebSiteManagementClient(credential, subId);

    await client.staticSites.deleteStaticSiteUser(rg, site, provider, userId);

    return (context.res = json(200, { ok: true }));
  } catch (err) {
    context.log.error("manageUsersDelete error:", err?.message || err);
    return (context.res = json(500, { error: "ServerError", message: err?.message || "Failed to delete user" }));
  }
};

// helpers
function json(status, body) { return { status, headers: { "content-type": "application/json" }, body }; }
function mustEnv(n) { const v = process.env[n]; if (!v) throw new Error(`Missing env: ${n}`); return v; }
function parseCP(req){ try{ const h=req.headers["x-ms-client-principal"]; if(!h) return null; const d=Buffer.from(h,"base64").toString("utf8"); const cp=JSON.parse(d); cp.userRoles=(cp.userRoles||[]).filter(r=>r!=="anonymous"); return cp; }catch{return null;} }
function hasAnyRole(cp, allowed){ if(!cp) return false; const set=new Set((cp.userRoles||[]).map(String)); return allowed.some(r=>set.has(String(r))); }
