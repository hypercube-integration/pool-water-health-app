// BEGIN FILE: api/profiles/upsert/index.js
// VERSION: 2025-08-30
// POST /api/profiles/upsert
// BODY: { provider: "aad"|"github"|"twitter", userId: "<id>", name?: "...", email?: "..." }

const { CosmosClient } = require("@azure/cosmos");

module.exports = async function (context, req) {
  try {
    const cp = parseCP(req);
    if (!hasAnyRole(cp, ["admin", "manager"])) {
      return (context.res = json(403, { error: "Forbidden" }));
    }

    const { provider, userId, name, email } = req.body || {};
    if (!provider || !userId) {
      return (context.res = json(400, { error: "BadRequest", message: "provider and userId are required" }));
    }

    const cfg = getCosmosConfig();
    if (!cfg.enabled) {
      return (context.res = json(500, { error: "ServerError", message: "Cosmos not configured" }));
    }

    const client = new CosmosClient(cfg.conn);
    const container = client.database(cfg.db).container(cfg.container);

    const id = `${provider}:${userId}`;
    const doc = {
      id,            // document id
      pk: id,        // partition key
      provider,
      userId,
      name: (name || "").trim(),
      email: (email || "").trim(),
      updatedAt: new Date().toISOString()
    };

    const { resource } = await container.items.upsert(doc, { disableAutomaticIdGeneration: true });

    return (context.res = json(200, { ok: true, profile: resource }));
  } catch (err) {
    context.log.error("profiles/upsert error:", err?.message || err);
    return (context.res = json(500, { error: "ServerError", message: err?.message || "Failed to upsert profile" }));
  }
};

// helpers
function json(status, body) { return { status, headers: { "content-type": "application/json" }, body }; }
function parseCP(req){ try{ const h=req.headers["x-ms-client-principal"]; if(!h) return null; const d=Buffer.from(h,"base64").toString("utf8"); const cp=JSON.parse(d); cp.userRoles=(cp.userRoles||[]).filter(r=>r!=="anonymous"); return cp; }catch{return null;} }
function hasAnyRole(cp, allowed){ if(!cp) return false; const set=new Set((cp.userRoles||[]).map(String)); return allowed.some(r=>set.has(String(r))); }
function getCosmosConfig(){ const cs=process.env.COSMOS_CONNSTR||""; const db=process.env.COSMOS_DB||""; const c=process.env.COSMOS_DB_PROFILES_CONTAINER||""; if(!cs||!db||!c) return {enabled:false}; return {enabled:true, conn:cs, db, container:c}; }
