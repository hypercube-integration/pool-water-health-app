// FILE: api/profiles_bootstrap/index.js
// PURPOSE: Auto-upsert the signed-in user's {name,email} into Cosmos using EasyAuth claims.
// ENV: COSMOS_CONNECTION_STRING, COSMOS_DB, COSMOS_CONTAINER

const { CosmosClient } = require("@azure/cosmos");

module.exports = async function (context, req) {
  try {
    const cp = parseClientPrincipal(req);
    if (!cp || !isAuthenticated(cp)) {
      return (context.res = json(401, { error: "Unauthorized" }));
    }

    const cfg = getCosmosConfig();
    if (!cfg.enabled) {
      return (context.res = json(500, { error: "ServerError", message: "Cosmos not configured" }));
    }

    const { provider, userId } = cp;
    const { name, email } = extractNameEmail(cp);
    const id = `${provider}:${userId}`;

    const client = new CosmosClient(cfg.conn);
    const container = client.database(cfg.db).container(cfg.container);

    const doc = {
      id,
      pk: id,
      provider,
      userId,
      name: (name || "").trim(),
      email: (email || "").trim(),
      updatedAt: new Date().toISOString()
    };

    const { resource } = await container.items.upsert(doc, { disableAutomaticIdGeneration: true });
    return (context.res = json(200, { ok: true, profile: resource }));
  } catch (err) {
    context.log.error("profiles_bootstrap error:", err?.message || err);
    return (context.res = json(500, { error: "ServerError" }));
  }
};

// ------------ helpers ------------
function json(status, body) { return { status, headers: { "content-type": "application/json" }, body }; }
function getCosmosConfig() {
  const conn = process.env.COSMOS_CONNECTION_STRING || ""; // <— uses your setting
  const db = process.env.COSMOS_DB || "";
  const container = process.env.COSMOS_CONTAINER || "";
  return conn && db && container ? { enabled: true, conn, db, container } : { enabled: false };
}
function parseClientPrincipal(req) {
  try {
    const b64 = req.headers["x-ms-client-principal"];
    if (!b64) return null;
    const raw = Buffer.from(b64, "base64").toString("utf8");
    const cp = JSON.parse(raw);
    const roles = (cp.userRoles || []).filter((r) => r !== "anonymous");
    const claims = Array.isArray(cp.claims) ? cp.claims : [];
    const provider = (cp.identityProvider || "").toLowerCase();
    const userId = cp.userId;
    return { ...cp, roles, claims, provider, userId };
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
  let name =
    getClaim(cp, "name",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
      "http://schemas.microsoft.com/identity/claims/displayname") || "";
  let email =
    getClaim(cp, "emails", "email", "preferred_username", "upn",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress") || "";
  if (!email && typeof cp.userDetails === "string" && cp.userDetails.includes("@")) email = cp.userDetails;
  if (!name && typeof cp.userDetails === "string" && !cp.userDetails.includes("@")) name = cp.userDetails;
  if (name && /^[0-9a-f]{32}$/i.test(name)) name = ""; // don't store opaque id as name
  return { name, email };
}
