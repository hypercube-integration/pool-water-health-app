const { ClientSecretCredential } = require("@azure/identity");

function getClientPrincipal(req) {
  const h = req.headers["x-ms-client-principal"] || req.headers["X-MS-CLIENT-PRINCIPAL"];
  if (!h) return null;
  try { return JSON.parse(Buffer.from(h, "base64").toString("ascii")); } catch { return null; }
}
function requireAdmin(p) {
  return (p?.userRoles || []).map(r => String(r).toLowerCase()).includes("admin");
}

const API_VERSION = "2024-11-01";

module.exports = async function (context, req) {
  try {
    const principal = getClientPrincipal(req);
    if (!requireAdmin(principal)) {
      context.res = { status: 403, body: { error: "Forbidden: admin only" } };
      return;
    }

    const { authProvider, userId, roles, displayName } = req.body || {};
    if (!authProvider || !userId) {
      context.res = { status: 400, body: { error: "authProvider and userId are required" } };
      return;
    }
    const rolesString = Array.isArray(roles) ? roles.join(",") : (roles || "");

    const {
      AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET,
      AZURE_SUBSCRIPTION_ID, AZURE_RESOURCE_GROUP, AZURE_STATIC_WEB_APP_NAME
    } = process.env;

    const credential = new ClientSecretCredential(AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET);
    const token = await credential.getToken("https://management.azure.com/.default");

    const url = `https://management.azure.com/subscriptions/${AZURE_SUBSCRIPTION_ID}` +
                `/resourceGroups/${AZURE_RESOURCE_GROUP}` +
                `/providers/Microsoft.Web/staticSites/${AZURE_STATIC_WEB_APP_NAME}` +
                `/users/${encodeURIComponent(authProvider)}/${encodeURIComponent(userId)}?api-version=${API_VERSION}`;

    const body = { properties: { provider: authProvider, userId, roles: rolesString } };
    if (displayName) body.properties.displayName = displayName;

    const resp = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!resp.ok) throw new Error(`Update user failed ${resp.status}: ${await resp.text().catch(()=> "")}`);
    const data = await resp.json();

    context.res = {
      status: 200,
      body: {
        id: data.name,
        provider: data.properties?.provider,
        userId: data.properties?.userId,
        displayName: data.properties?.displayName,
        roles: data.properties?.roles || ""
      }
    };
  } catch (err) {
    context.res = { status: 500, body: { error: err.message } };
  }
};
