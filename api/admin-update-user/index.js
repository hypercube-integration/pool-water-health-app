import { ClientSecretCredential } from "@azure/identity";
import fetch from "node-fetch";
import { getClientPrincipal, requireAdmin } from "../_shared/auth.js";

const API_VERSION = "2024-11-01";

export default async function (context, req) {
  try {
    const principal = getClientPrincipal(req);
    if (!requireAdmin(principal)) {
      return (context.res = { status: 403, jsonBody: { error: "Forbidden: admin only" } });
    }

    const { authProvider, userId, roles, displayName } = req.body || {};
    if (!authProvider || !userId) {
      return (context.res = { status: 400, jsonBody: { error: "authProvider and userId are required" } });
    }
    const rolesString = Array.isArray(roles) ? roles.join(",") : (roles || "");

    const {
      AZURE_TENANT_ID,
      AZURE_CLIENT_ID,
      AZURE_CLIENT_SECRET,
      AZURE_SUBSCRIPTION_ID,
      AZURE_RESOURCE_GROUP,
      AZURE_STATIC_WEB_APP_NAME
    } = process.env;

    const credential = new ClientSecretCredential(AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET);
    const token = await credential.getToken("https://management.azure.com/.default");

    const url = `https://management.azure.com/subscriptions/${AZURE_SUBSCRIPTION_ID}/resourceGroups/${AZURE_RESOURCE_GROUP}/providers/Microsoft.Web/staticSites/${AZURE_STATIC_WEB_APP_NAME}/users/${encodeURIComponent(authProvider)}/${encodeURIComponent(userId)}?api-version=${API_VERSION}`;

    const body = {
      properties: {
        provider: authProvider,
        userId,
        roles: rolesString
      }
    };
    if (displayName) body.properties.displayName = displayName;

    const resp = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Update user failed ${resp.status}: ${text}`);
    }
    const data = await resp.json();
    context.res = {
      status: 200,
      jsonBody: {
        id: data.name,
        provider: data.properties?.provider,
        userId: data.properties?.userId,
        displayName: data.properties?.displayName,
        roles: data.properties?.roles || ""
      }
    };
  } catch (err) {
    context.res = { status: 500, jsonBody: { error: err.message } };
  }
}
