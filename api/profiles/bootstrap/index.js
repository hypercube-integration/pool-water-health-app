// BEGIN FILE: api/profiles/bootstrap/index.js
// PURPOSE: When any authenticated user loads the app, upsert their profile
//          (name/email) into Cosmos from EasyAuth claims.
// ROUTE:   POST /api/profiles/bootstrap  (no body)

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
    const doc = {
      id,
      pk: id,
      provider,
      userId,
      name: (name || "").trim(),
      email: (email || "").trim(),
      updatedAt: new Date().toISOString()
    };

    const client = new CosmosClient(cfg.conn);
    const container = client.database(cfg.db).container(cfg.container);

    // Upsert (create or update)
    const { resource } = await container.items.upsert(doc, { disableAutomaticIdGeneration: true });

    return (context.res = json(200, { ok: true, profile: resource }));
  } catch (err) {
    context.log.error("profiles/bootstrap error:", err?.message || err);
    return (context.res = json(500, { error: "ServerError" }));
  }
};

// ----------------- helpers -----------------
function json(status, body) { return { status, headers: { "content-type": "application/json" }, body }; }

function getCosmosConfig() {
  const conn = process.env.COSMOS_CONNSTR || "";
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

    // Normalize
    const roles = (cp.userRoles || []).filter((r) => r !== "anonymous");
    const claims = Array.isArray(cp.claims) ? cp.claims : [];
    const provider = (cp.identityProvider || "").toLowerCase(); // "aad", "github", etc.
    const userId = cp.userId; // SWA provider ID (string)

    return { ...cp, roles, claims, provider, userId };
  } catch {
    return null;
  }
}

function isAuthenticated(cp) {
  return Array.isArray(cp.roles) && cp.roles.includes("authenticated");
}

function getClaim(cp, ...types) {
  if (!cp?.claims) return "";
  for (const t of types) {
    const c = cp.claims.find((x) => (x.typ || x.type) === t);
    if (c?.val) return String(c.val);
  }
  return "";
}

// Pull best-available display name & email from common claim types
function extractNameEmail(cp) {
  let name =
    getClaim(
      cp,
      "name",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
      "http://schemas.microsoft.com/identity/claims/displayname"
    ) || "";

  let email =
    getClaim(
      cp,
      "emails",
      "email",
      "preferred_username",
      "upn",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
    ) || "";

  // Fallbacks
  if (!email && typeof cp.userDetails === "string" && cp.userDetails.includes("@")) {
    email = cp.userDetails;
  }
  if (!name && typeof cp.userDetails === "string" && !cp.userDetails.includes("@")) {
    // For GitHub we often get the username in userDetails
    name = cp.userDetails;
  }
  // Never store the opaque provider id as "name"
  if (name && /^[0-9a-f]{32}$/i.test(name)) name = "";

  return { name, email };
}
