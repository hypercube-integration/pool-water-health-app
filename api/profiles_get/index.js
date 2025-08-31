// FILE: api/profiles_get/index.js
// PURPOSE: Admin/Manager fetch a single profile doc by provider+userId.
// ENV: COSMOS_CONNECTION_STRING, COSMOS_DB, COSMOS_CONTAINER

const { CosmosClient } = require("@azure/cosmos");

module.exports = async function (context, req) {
  try {
    const cp = parseCP(req);
    if (!hasAnyRole(cp, ["admin", "manager"])) {
      return (context.res = json(403, { error: "Forbidden" }));
    }

    const provider = (req.query.provider || "").toLowerCase();
    const userId = (req.query.userId || "").trim();
    if (!provider || !userId) {
      return (context.res = json(400, { error: "BadRequest", message: "provider and userId are required" }));
    }

    const cfg = getCosmosConfig();
    if (!cfg.enabled) return (context.res = json(500, { error: "ServerError", message: "Cosmos not configured" }));

    const id = `${provider}:${userId}`;
    const client = new CosmosClient(cfg.conn);
    const container = client.database(cfg.db).container(cfg.container);

    try {
      const { resource } = await container.item(id, id).read();
      return (context.res = json(200, { profile: resource || null }));
    } catch (e) {
      if (e.code === 404) return (context.res = json(200, { profile: null }));
      throw e;
    }
  } catch (err) {
    context.log.error("profiles_get error:", err?.message || err);
    return (context.res = json(500, { error: "ServerError" }));
  }
};

// helpers
function json(status, body){ return { status, headers: { "content-type":"application/json" }, body }; }
function parseCP(req){ try{ const h=req.headers["x-ms-client-principal"]; if(!h) return null; const d=Buffer.from(h,"base64").toString("utf8"); const cp=JSON.parse(d); cp.userRoles=(cp.userRoles||[]).filter(r=>r!=="anonymous"); return cp; }catch{return null;} }
function hasAnyRole(cp, allowed){ if(!cp) return false; const set=new Set((cp.userRoles||[]).map(String)); return allowed.some(r=>set.has(String(r))); }
function getCosmosConfig(){ const conn=process.env.COSMOS_CONNECTION_STRING||""; const db=process.env.COSMOS_DB||""; const c=process.env.COSMOS_CONTAINER||""; return conn&&db&&c?{enabled:true, conn, db, container:c}:{enabled:false}; }
