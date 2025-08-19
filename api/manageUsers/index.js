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

    const {
      AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET,
      AZURE_SUBSCRIPTION_ID, AZURE_RESOURCE_GROUP, AZURE_STATIC_WEB_APP_NAME
    } = process.env;

    if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET ||
        !AZURE_SUBSCRIPTION_ID || !AZURE_RESOURCE_GROUP || !AZURE_STATIC_WEB_APP_NAME) {
      context.res = { status: 500, body: { error: "Missing required env vars for Management API auth." } };
      return;
    }

    const credential = new ClientSecretCredential(AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET);
    const token = await credential.getToken("https://management.azure.com/.default");

    const base = `https://management.azure.com/subscriptions/${AZURE_SUBSCRIPTION_ID}` +
                 `/resourceGroups/${AZURE_RESOURCE_GROUP}` +
                 `/providers/Microsoft.Web/staticSites/${AZURE_STATIC_WEB_APP_NAME}`;

    let url = `${base}/users?api-version=${API_VERSION}`;
    const users = [];

    while (url) {
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token.token}` } });
      if (!resp.ok) throw new Error(`List users failed ${resp.status}: ${await resp.text().catch(()=>"")}`);
      const data = await resp.json();
      (data.value || []).forEach(u => users.push({
        id: u.name,
        provider: u.properties?.provider,
        userId: u.properties?.userId,
        displayName: u.properties?.displayName,
        roles: u.properties?.roles || ""
      }));
      url = data.nextLink || null;
    }

    context.res = { status: 200, body: { users } };
  } catch (err) {
    context.res = { status: 500, body: { error: err.message } };
  }
};
