// FILE: api/profiles_upsert/index.js
// PURPOSE: Admin/Manager manually set/update a user's name/email in Cosmos.
// ENV: COSMOS_CONNECTION_STRING, COSMOS_DB, COSMOS_CONTAINER

const { CosmosClient } = require("@azure/cosmos");

module.exports = async function (context, req) {
  try {
    const cp = parseCP(req);
    if (!hasAnyRole(cp, ["admin", "manager"])) {
      return (context.res = json(403, { error: "Forbidden" }));
    }

    const { provider, userId, name, email } = req.body || {};
    if (!provider || !userId) {
      return (context.res = json(400, { error:"BadRequest", message:"provider and userId are required" }));
    }

    const cfg = getCosmosConfig();
    if (!cfg.enabled) return (context.res = json(500, { error:"ServerError", message:"Cosmos not configured" }));

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

    const client = new CosmosClient(cfg.conn);
    const container = client.database(cfg.db).container(cfg.container);
    const { resource } = await container.items.upsert(doc, { disableAutomaticIdGeneration: true });

    return (context.res = json(200, { ok: true, profile: resource }));
  } catch (err) {
    context.log.error("profiles_upsert error:", err?.message || err);
    return (context.res = json(500, { error: "ServerError" }));
  }
};

// helpers
function json(status, body){ return { status, headers: { "content-type":"application/json" }, body }; }
function parseCP(req){ try{ const h=req.headers["x-ms-client-principal"]; if(!h) return null; const d=Buffer.from(h,"base64").toString("utf8"); const cp=JSON.parse(d); cp.userRoles=(cp.userRoles||[]).filter(r=>r!=="anonymous"); return cp; }catch{return null;} }
function hasAnyRole(cp, allowed){ if(!cp) return false; const set=new Set((cp.userRoles||[]).map(String)); return allowed.some(r=>set.has(String(r))); }
function getCosmosConfig(){ const conn=process.env.COSMOS_CONNECTION_STRING||""; const db=process.env.COSMOS_DB||""; const c=process.env.COSMOS_CONTAINER||""; return conn&&db&&c?{enabled:true, conn, db, container:c}:{enabled:false}; }
