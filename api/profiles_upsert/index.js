// FILE: api/profiles_upsert/index.js  (DROP-IN)
const { getProfilesCosmos } = require("../_shared/cosmosProfiles");

module.exports = async function (context, req) {
  try {
    const cp = parseCP(req);
    if (!hasAnyRole(cp, ["admin", "manager"])) return (context.res = jres(403, { error: "Forbidden" }));

    const { provider, userId, name, email } = req.body || {};
    if (!provider || !userId) return (context.res = jres(400, { error: "BadRequest", message: "provider and userId are required" }));

    const cosmos = getProfilesCosmos();
    if (!cosmos.enabled) return (context.res = jres(500, { error: "Cosmos not configured" }));

    const id = `${String(provider).toLowerCase()}:${String(userId).trim()}`;
    const doc = {
      id,
      pk: id,
      provider: String(provider).toLowerCase(),
      userId: String(userId).trim(),
      name: (name || "").trim(),
      email: (email || "").trim(),
      updatedAt: new Date().toISOString()
    };

    const cont = cosmos.client.database(cosmos.db).container(cosmos.container);
    const { resource } = await cont.items.upsert(doc, { disableAutomaticIdGeneration: true });
    return (context.res = jres(200, { ok: true, profile: resource }));
  } catch (e) {
    context.log.error("profiles_upsert:", e?.message || e);
    return (context.res = jres(500, { error: "ServerError" }));
  }
};

function jres(status, body){ return { status, headers: { "content-type":"application/json" }, body }; }
function parseCP(req){ try{ const d=Buffer.from(req.headers["x-ms-client-principal"],"base64").toString("utf8"); const cp=JSON.parse(d); cp.userRoles=(cp.userRoles||[]).filter(r=>r!=="anonymous"); return cp; }catch{return null;} }
function hasAnyRole(cp, allowed){ if(!cp) return false; const set=new Set((cp.userRoles||[]).map(String)); return allowed.some(r=>set.has(String(r))); }
