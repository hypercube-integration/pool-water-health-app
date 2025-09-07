// FILE: api/profiles_get/index.js
// Admin/Manager fetch profile by provider+userId from Cosmos Profiles.
const { getProfilesCosmos } = require("../_shared/cosmosProfiles");

module.exports = async function (context, req) {
  try {
    const cp = parseCP(req);
    if (!hasAnyRole(cp, ["admin", "manager"])) return json(context, 403, { error: "Forbidden" });

    const provider = String(req.query.provider || "").toLowerCase();
    const userId = String(req.query.userId || "").trim();
    if (!provider || !userId) return json(context, 400, { error: "BadRequest", message: "provider and userId required" });

    const cosmos = getProfilesCosmos();
    if (!cosmos.enabled) return json(context, 500, { error: "Cosmos not configured" });

    const id = `${provider}:${userId}`;
    const c = cosmos.client.database(cosmos.db).container(cosmos.container);

    try {
      const { resource } = await c.item(id, id).read();
      return json(context, 200, { profile: resource || null });
    } catch (e) {
      if (e.code === 404) return json(context, 200, { profile: null });
      throw e;
    }
  } catch (e) {
    context.log.error("profiles_get:", e?.message || e);
    return json(context, 500, { error: "ServerError" });
  }
};

function json(ctx, status, body) { ctx.res = { status, headers: { "content-type": "application/json" }, body }; return ctx.res; }
function parseCP(req){ try{ const d=Buffer.from(req.headers["x-ms-client-principal"],"base64").toString("utf8"); const cp=JSON.parse(d); cp.userRoles=(cp.userRoles||[]).filter(r=>r!=="anonymous"); return cp; }catch{return null;} }
function hasAnyRole(cp, allowed){ if(!cp) return false; const set=new Set((cp.userRoles||[]).map(r=>String(r).toLowerCase())); return allowed.some(r=>set.has(String(r).toLowerCase())); }
