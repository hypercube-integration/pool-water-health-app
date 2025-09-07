// FILE: api/profiles_upsert/index.js
// Admin/Manager manually upsert name/email for a user into Cosmos Profiles.
const { getProfilesCosmos } = require("../_shared/cosmosProfiles");

module.exports = async function (context, req) {
  try {
    const cp = parseCP(req);
    if (!hasAnyRole(cp, ["admin", "manager"])) return json(context, 403, { error: "Forbidden" });

    const { provider, userId, name, email } = req.body || {};
    if (!provider || !userId) return json(context, 400, { error: "BadRequest", message: "provider and userId required" });

    const cosmos = getProfilesCosmos();
    if (!cosmos.enabled) return json(context, 500, { error: "Cosmos not configured" });

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

    const c = cosmos.client.database(cosmos.db).container(cosmos.container);
    const { resource } = await c.items.upsert(doc, { disableAutomaticIdGeneration: true });
    return json(context, 200, { ok: true, profile: resource });
  } catch (e) {
    context.log.error("profiles_upsert:", e?.message || e);
    return json(context, 500, { error: "ServerError" });
  }
};

function json(ctx, status, body){ ctx.res = { status, headers: { "content-type": "application/json" }, body }; return ctx.res; }
function parseCP(req){ try{ const d=Buffer.from(req.headers["x-ms-client-principal"],"base64").toString("utf8"); const cp=JSON.parse(d); cp.userRoles=(cp.userRoles||[]).filter(r=>r!=="anonymous"); return cp; }catch{return null;} }
function hasAnyRole(cp, allowed){ if(!cp) return false; const set=new Set((cp.userRoles||[]).map(r=>String(r).toLowerCase())); return allowed.some(r=>set.has(String(r).toLowerCase())); }
