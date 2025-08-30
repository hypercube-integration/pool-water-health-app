// BEGIN FILE: api/manageUsersInvite/index.js
// ACTION: Create an invitation link (admin/manager) with correct domain
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

    // Gentle validation on userDetails
    if (provider === "github" && /@/.test(userDetails)) {
      return (context.res = json(400, { error: "BadRequest", message: "For GitHub invites, userDetails must be the GitHub username (not an email)." }));
    }

    const subId = mustEnv("APPSERVICE_SUBSCRIPTION_ID");
    const rg = mustEnv("APPSERVICE_RESOURCE_GROUP");
    const site = mustEnv("APPSERVICE_STATIC_SITE_NAME");

    const credential = new DefaultAzureCredential();
    const client = new WebSiteManagementClient(credential, subId);

    // Get the Static Web App default hostname from ARM to avoid domain mismatches
    let defaultHost = "";
    try {
      const siteRes = await client.staticSites.getStaticSite(rg, site);
      defaultHost =
        siteRes?.defaultHostname ||
        siteRes?.properties?.defaultHostname ||
        "";
    } catch (e) {
      context.log("getStaticSite failed:", e?.message || e);
    }

    const hostFromReq = (req.headers["x-forwarded-host"] || req.headers.host || "").toString();
    const finalDomain = (domain || defaultHost || hostFromReq || "").replace(/^https?:\/\//, "").replace(/\/.*/, "");

    if (!finalDomain) {
      return (context.res = json(500, { error: "ServerError", message: "Could not determine site domain for invitation." }));
    }

    const rolesCsv = roles.map(String).map((r) => r.trim()).filter(Boolean).join(",");

    const payload = {
      properties: {
        domain: finalDomain,                 // <<< critical to avoid 400 at /.auth/complete
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
      expiresOn: res?.properties?.expiresOn || "",
      domainUsed: finalDomain
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
