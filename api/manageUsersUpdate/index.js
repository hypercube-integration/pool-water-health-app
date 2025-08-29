// VERSION: 2025-08-25
// ACTION: Create/update a SWA user entry with chosen roles (RBAC: admin/manager)
// POST /api/users/update  BODY: { provider: "aad"|"github"|"twitter", userId: "<id>", roles: ["admin"], displayName?: "..." }

const { DefaultAzureCredential } = require("@azure/identity");
const { WebSiteManagementClient } = require("@azure/arm-appservice");

module.exports = async function (context, req) {
  try {
    const cp = parseCP(req);
    if (!hasAnyRole(cp, ["admin", "manager"])) {
      return (context.res = json(403, { error: "Forbidden" }));
    }

    const { provider, userId, roles, displayName } = req.body || {};
    if (!provider || !userId || !Array.isArray(roles)) {
      return (context.res = json(400, { error: "BadRequest", message: "provider, userId, roles[] are required" }));
    }

    const subId = mustEnv("APPSERVICE_SUBSCRIPTION_ID");
    const rg = mustEnv("APPSERVICE_RESOURCE_GROUP");
    const site = mustEnv("APPSERVICE_STATIC_SITE_NAME");

    const rolesCsv = roles.map(String).map((r) => r.trim()).filter(Boolean).join(",");

    const credential = new DefaultAzureCredential();
    const client = new WebSiteManagementClient(credential, subId);

    const payload = {
      properties: {
        provider,
        userId,
        roles: rolesCsv,
        ...(displayName ? { displayName } : {})
      }
    };

    const result = await client.staticSites.updateStaticSiteUser(rg, site, provider, userId, payload);

    return (context.res = json(200, { ok: true, user: normalizeUser(result) }));
  } catch (err) {
    context.log.error("manageUsersUpdate error:", err?.message || err);
    return (context.res = json(500, { error: "ServerError", message: err?.message || "Failed to update roles" }));
  }
};

// helpers
function json(status, body) { return { status, headers: { "content-type": "application/json" }, body }; }
function mustEnv(n) { const v = process.env[n]; if (!v) throw new Error(`Missing env: ${n}`); return v; }
function parseCP(req){ try{ const h=req.headers["x-ms-client-principal"]; if(!h) return null; const d=Buffer.from(h,"base64").toString("utf8"); const cp=JSON.parse(d); cp.userRoles=(cp.userRoles||[]).filter(r=>r!=="anonymous"); return cp; }catch{return null;} }
function hasAnyRole(cp, allowed){ if(!cp) return false; const set=new Set((cp.userRoles||[]).map(String)); return allowed.some(r=>set.has(String(r))); }
function normalizeUser(u) {
  const p = u?.properties || {};
  const display = (p.displayName || "").trim();
  const email = /@/.test(display) ? display : "";
  const roles = (p.roles || "").split(",").map((r) => r.trim()).filter(Boolean);
  return { id: p.userId || u.id || "", name: display || p.userId || "(unknown)", email, provider: p.provider || "", roles };
}
