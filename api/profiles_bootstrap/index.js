// FILE: api/profiles_bootstrap/index.js  (DROP-IN)
// ENV: COSMOS_CONNECTION_STRING, COSMOS_DB, COSMOS_CONTAINER
const { CosmosClient } = require("@azure/cosmos");

module.exports = async function (context, req) {
  const debug = req.query.debug === "1";
  try {
    const cp = parseClientPrincipal(req);
    if (!cp || !isAuthenticated(cp)) {
      return (context.res = json(401, jerr("Unauthorized", debug && { cp })));
    }

    const cfg = getCosmosConfig();
    if (!cfg.enabled) {
      return (context.res = json(500, jerr("Cosmos not configured", debug && { cfg })));
    }

    const id = `${cp.provider}:${cp.userId}`;
    const { name, email } = extractNameEmail(cp);

    const client = new CosmosClient(cfg.conn);
    const db = client.database(cfg.db);
    const container = db.container(cfg.container);

    // Optional: in debug mode, prove DB+container+PK are correct
    if (debug) {
      try { await db.read(); } catch (e) { return (context.res = json(500, jerr("DB read failed", fmtErr(e, { cfg })))); }
      try { await container.read(); } catch (e) { return (context.res = json(500, jerr("Container read failed", fmtErr(e, { cfg })))); }
    }

    const doc = {
      id,
      pk: id,                 // container partition key must be /pk
      provider: cp.provider,
      userId: cp.userId,
      name: (name || "").trim(),
      email: (email || "").trim(),
      updatedAt: new Date().toISOString()
    };

    const { resource } = await container.items.upsert(doc, { disableAutomaticIdGeneration: true });
    return (context.res = json(200, { ok: true, profile: resource, debug: debug ? { cfg: redactedCfg(cfg), cp: publicCP(cp) } : undefined }));
  } catch (err) {
    context.log.error("profiles_bootstrap error:", err?.message || err);
    return (context.res = json(500, jerr("ServerError", fmtErr(err))));
  }
};

/* ---------------- helpers ---------------- */
function json(status, body) { return { status, headers: { "content-type": "application/json" }, body }; }
function jerr(message, extra) { return Object.assign({ error: message }, extra ? { detail: extra } : {}); }
function fmtErr(e, extra) {
  const out = { message: e?.message || String(e) };
  if (e?.code) out.code = e.code;
  if (e?.name) out.name = e.name;
  if (e?.statusCode) out.statusCode = e.statusCode;
  if (extra) out.extra = extra;
  return out;
}
function redactedCfg(cfg) { return { enabled: cfg.enabled, hasConn: !!cfg.conn, db: cfg.db, container: cfg.container }; }

function getCosmosConfig() {
  const conn = process.env.COSMOS_CONNECTION_STRING || ""; // <-- your env name
  const db = process.env.COSMOS_DB || "";
  const container = process.env.COSMOS_CONTAINER || "";
  return conn && db && container ? { enabled: true, conn, db, container } : { enabled: false, conn: !!conn, db, container };
}

function parseClientPrincipal(req) {
  try {
    const b64 = req.headers["x-ms-client-principal"];
    if (!b64) return null;
    const raw = Buffer.from(b64, "base64").toString("utf8");
    const cp = JSON.parse(raw);
    const roles = (cp.userRoles || []).filter((r) => r !== "anonymous");
    const claims = Array.isArray(cp.claims) ? cp.claims : [];
    return { ...cp, roles, claims, provider: (cp.identityProvider || "").toLowerCase(), userId: cp.userId };
  } catch { return null; }
}
function isAuthenticated(cp) { return Array.isArray(cp.roles) && cp.roles.includes("authenticated"); }
function getClaim(cp, ...types) {
  if (!cp?.claims) return "";
  for (const t of types) {
    const c = cp.claims.find((x) => (x.typ || x.type) === t);
    if (c?.val) return String(c.val);
  }
  return "";
}
function extractNameEmail(cp) {
  let name = getClaim(cp, "name",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
    "http://schemas.microsoft.com/identity/claims/displayname") || "";
  let email = getClaim(cp, "emails", "email", "preferred_username", "upn",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress") || "";
  if (!email && typeof cp.userDetails === "string" && cp.userDetails.includes("@")) email = cp.userDetails;
  if (!name && typeof cp.userDetails === "string" && !cp.userDetails.includes("@")) name = cp.userDetails;
  if (name && /^[0-9a-f]{32}$/i.test(name)) name = "";
  return { name, email };
}
function publicCP(cp) {
  return { provider: cp.provider, userId: cp.userId, roles: cp.roles, userDetails: cp.userDetails };
}
