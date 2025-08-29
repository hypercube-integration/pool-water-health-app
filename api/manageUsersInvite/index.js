// VERSION: 2025-08-25
// ACTION: Create an invitation link (admin/manager)
// POST /api/users/invite  BODY: { provider: "aad"|"github", userDetails: "<email|upn|username>", roles: ["viewer"], hours?: 24, domain?: "<host>" }

const { DefaultAzureCredential } = require("@azure/identity");
const { WebSiteManagementClient } = require("@azure/arm-appservice");

module.exports = async function (context, req) {
  try {
    const cp = parseCP(req);
    if (!hasAnyRole(cp, ["admin", "manager"])) {
      return (context.res = json(403, { error: "Forbidden" }));
    }

    const { provider, userDetails, roles, hours, domain } = req.body || {};
    if (!provider || !userDetails || !Array.isArray(roles)) {
      return (context.res = json(400, { error: "BadRequest", message: "provider, userDetails, roles[] are required" }));
    }

    const subId = mustEnv("APPSERVICE_SUBSCRIPTION_ID");
    const rg = mustEnv("APPSERVICE_RESOURCE_GROUP");
    const site = mustEnv("APPSERVICE_STATIC_SITE_NAME");

    const credential = new DefaultAzureCredential();
    const client = new WebSiteManagementClient(credential, subId);

    const rolesCsv = roles.map(String).map((r) => r.trim()).filter(Boolean).join(",");
    const fallbackDomain =
      process.env.SWA_PUBLIC_HOST ||
      req.headers["x-forwarded-host"] ||
      req.headers.host ||
      "";

    const payload = {
      properties: {
        domain: (domain || fallbackDomain || "").toString(),
        provider,
        userDetails,
        roles: rolesCsv,
        numHoursToExpiration: Number.isFinite(hours) ? Number(hours) : 24
      }
    };

    const res = await client.staticSites.createUserRolesInvitationLink(rg, site, payload);

    return (context.res = json(200, {
      ok: true,
      invitationUrl: res?.properties?.invitationUrl || "",
      expiresOn: res?.properties?.expiresOn || ""
    }));
  } catch (err) {
    context.log.error("manageUsersInvite error:", err?.message || err);
    return (context.res = json(500, { error: "ServerError", message: err?.message || "Failed to create invitation" }));
  }
};

// helpers
function json(status, body) { return { status, headers: { "content-type": "application/json" }, body }; }
function mustEnv(n) { const v = process.env[n]; if (!v) throw new Error(`Missing env: ${n}`); return v; }
function parseCP(req){ try{ const h=req.headers["x-ms-client-principal"]; if(!h) return null; const d=Buffer.from(h,"base64").toString("utf8"); const cp=JSON.parse(d); cp.userRoles=(cp.userRoles||[]).filter(r=>r!=="anonymous"); return cp; }catch{return null;} }
function hasAnyRole(cp, allowed){ if(!cp) return false; const set=new Set((cp.userRoles||[]).map(String)); return allowed.some(r=>set.has(String(r))); }
