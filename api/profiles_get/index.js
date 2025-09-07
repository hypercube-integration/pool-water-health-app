// FILE: api/profiles_get/index.js  (DROP-IN)
const { getProfilesCosmos } = require("../_shared/cosmosProfiles");

module.exports = async function (context, req) {
  try {
    const cp = parseCP(req);
    if (!hasAnyRole(cp, ["admin", "manager"])) return (context.res = jres(403, { error: "Forbidden" }));

    const provider = String(req.query.provider || "").toLowerCase();
    const userId = String(req.query.userId || "").trim();
    if (!provider || !userId) return (context.res = jres(400, { error: "BadRequest", message: "provider and userId are required" }));

    const cosmos = getProfilesCosmos();
    if (!cosmos.enabled) return (context.res = jres(500, { error: "Cosmos not configured" }));

    const id = `${provider}:${userId}`;
    const cont = cosmos.client.database(cosmos.db).container(cosmos.container);

    try {
      const { resource } = await cont.item(id, id).read();
      return (context.res = jres(200, { profile: resource || null }));
    } catch (e) {
      if (e.code === 404) return (context.res = jres(200, { profile: null }));
      throw e;
    }
  } catch (e) {
    context.log.error("profiles_get:", e?.message || e);
    return (context.res = jres(500, { error: "ServerError" }));
  }
};

function jres(status, body){ return { status, headers: { "content-type":"application/json" }, body }; }
function parseCP(req){ try{ const d=Buffer.from(req.headers["x-ms-client-principal"],"base64").toString("utf8"); const cp=JSON.parse(d); cp.userRoles=(cp.userRoles||[]).filter(r=>r!=="anonymous"); return cp; }catch{return null;} }
function hasAnyRole(cp, allowed){ if(!cp) return false; const set=new Set((cp.userRoles||[]).map(String)); return allowed.some(r=>set.has(String(r))); }
