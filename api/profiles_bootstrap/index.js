// FILE: api/profiles_bootstrap/index.js  (DROP-IN)
const { getProfilesCosmos } = require("../_shared/cosmosProfiles");

module.exports = async function (context, req) {
  const debug = req.query.debug === "1";
  try {
    const cp = parseClientPrincipal(req);
    if (!cp || !cp.userRoles?.includes("authenticated")) {
      return (context.res = jres(401, { error: "Unauthorized" }));
    }

    const cosmos = getProfilesCosmos();
    if (!cosmos.enabled) {
      return (context.res = jres(500, { error: "Cosmos not configured", detail: redactCosmos(cosmos) }));
    }

    const id = `${cp.provider}:${cp.userId}`;
    const { name, email } = extractNameEmail(cp);

    const cont = cosmos.client.database(cosmos.db).container(cosmos.container);

    const doc = {
      id,
      pk: id, // partition key path must be /pk on the container
      provider: cp.provider,
      userId: cp.userId,
      name: (name || "").trim(),
      email: (email || "").trim(),
      updatedAt: new Date().toISOString()
    };

    const { resource } = await cont.items.upsert(doc, { disableAutomaticIdGeneration: true });
    return (context.res = jres(200, { ok: true, profile: resource, debug: debug ? redactCosmos(cosmos) : undefined }));
  } catch (e) {
    context.log.error("profiles_bootstrap:", e?.message || e);
    return (context.res = jres(500, { error: "ServerError" }));
  }
};

// helpers
function jres(status, body) { return { status, headers: { "content-type": "application/json" }, body }; }
function redactCosmos(c) { return { enabled: c.enabled, db: c.db, container: c.container, hasClient: !!c.client }; }
function parseClientPrincipal(req) {
  try {
    const raw = Buffer.from(req.headers["x-ms-client-principal"], "base64").toString("utf8");
    const cp = JSON.parse(raw);
    const roles = (cp.userRoles || []).filter(r => r !== "anonymous");
    const provider = (cp.identityProvider || "").toLowerCase();
    return { ...cp, userRoles: roles, provider };
  } catch { return null; }
}
function claim(cp, ...types) {
  const c = (cp.claims || []).find(x => types.includes(x.typ || x.type));
  return c?.val || "";
}
function extractNameEmail(cp) {
  let name = claim(cp, "name",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
    "http://schemas.microsoft.com/identity/claims/displayname") || "";
  let email = claim(cp, "emails", "email", "preferred_username", "upn",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress") || "";
  if (!email && cp.userDetails?.includes("@")) email = cp.userDetails;
  if (!name && cp.userDetails && !cp.userDetails.includes("@")) name = cp.userDetails;
  if (/^[0-9a-f]{32}$/i.test(name)) name = "";
  return { name, email };
}
