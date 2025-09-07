// FILE: api/profiles_bootstrap/index.js
// Upserts the signed-in user's profile (name/email) into Cosmos (Profiles container).
const { getProfilesCosmos } = require("../_shared/cosmosProfiles");

module.exports = async function (context, req) {
  try {
    const cp = parseClientPrincipal(req);
    if (!cp || !cp.userRoles?.includes("authenticated")) {
      return json(context, 401, { error: "Unauthorized" });
    }

    const cosmos = getProfilesCosmos();
    if (!cosmos.enabled) {
      return json(context, 500, { error: "Cosmos not configured" });
    }

    const id = `${cp.provider}:${cp.userId}`;
    const { name, email } = extractNameEmail(cp);
    const doc = {
      id,
      pk: id,                   // container must be created with partition key path /pk
      provider: cp.provider,
      userId: cp.userId,
      name: (name || "").trim(),
      email: (email || "").trim(),
      updatedAt: new Date().toISOString()
    };

    const c = cosmos.client.database(cosmos.db).container(cosmos.container);
    const { resource } = await c.items.upsert(doc, { disableAutomaticIdGeneration: true });
    return json(context, 200, { ok: true, profile: resource });
  } catch (e) {
    context.log.error("profiles_bootstrap:", e?.message || e);
    return json(context, 500, { error: "ServerError" });
  }
};

/* ---------------- helpers ---------------- */
function json(ctx, status, body) {
  ctx.res = { status, headers: { "content-type": "application/json" }, body };
  return ctx.res;
}
function parseClientPrincipal(req) {
  try {
    const raw = req.headers["x-ms-client-principal"];
    if (!raw) return null;
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    const cp = JSON.parse(decoded);
    // keep full roles; presence of 'authenticated' is enough here
    return {
      ...cp,
      userRoles: (cp.userRoles || []).filter(Boolean),
      provider: (cp.identityProvider || "").toLowerCase(),
      userId: cp.userId
    };
  } catch {
    return null;
  }
}
function claim(cp, ...types) {
  const arr = Array.isArray(cp.claims) ? cp.claims : [];
  for (const t of types) {
    const hit = arr.find(x => (x.typ || x.type) === t);
    if (hit && typeof hit.val === "string") return hit.val;
  }
  return "";
}
function extractNameEmail(cp) {
  let name =
    claim(cp, "name",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
      "http://schemas.microsoft.com/identity/claims/displayname") || "";
  let email =
    claim(cp, "emails", "email", "preferred_username", "upn",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress") || "";
  if (!email && typeof cp.userDetails === "string" && cp.userDetails.includes("@")) email = cp.userDetails;
  if (!name && typeof cp.userDetails === "string" && !cp.userDetails.includes("@")) name = cp.userDetails;
  if (name && /^[0-9a-f]{32}$/i.test(name)) name = "";
  return { name, email };
}
