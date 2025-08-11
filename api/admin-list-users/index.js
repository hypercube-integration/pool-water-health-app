import { ClientSecretCredential } from "@azure/identity";
import fetch from "node-fetch";
import { getClientPrincipal, requireAdmin } from "../_shared/auth.js";

const API_VERSION = "2024-11-01"; // Management API version

export default async function (context, req) {
  try {
    const principal = getClientPrincipal(req);
    if (!requireAdmin(principal)) {
      return (context.res = { status: 403, jsonBody: { error: "Forbidden: admin only" } });
    }

    const {
      AZURE_TENANT_ID,
      AZURE_CLIENT_ID,
      AZURE_CLIENT_SECRET,
      AZURE_SUBSCRIPTION_ID,
      AZURE_RESOURCE_GROUP,
      AZURE_STATIC_WEB_APP_NAME
    } = process.env;

    if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET || !AZURE_SUBSCRIPTION_ID || !AZURE_RESOURCE_GROUP || !AZURE_STATIC_WEB_APP_NAME) {
      return (context.res = { status: 500, jsonBody: { error: "Missing required env vars for Management API auth." } });
    }

    const credential = new ClientSecretCredential(AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET);
    const token = await credential.getToken("https://management.azure.com/.default");

    const base = `https://management.azure.com/subscriptions/${AZURE_SUBSCRIPTION_ID}/resourceGroups/${AZURE_RESOURCE_GROUP}/providers/Microsoft.Web/staticSites/${AZURE_STATIC_WEB_APP_NAME}`;
    let url = `${base}/users?api-version=${API_VERSION}`;

    const all = [];
    while (url) {
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token.token}` } });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`List users failed ${resp.status}: ${text}`);
      }
      const data = await resp.json();
      (data.value || []).forEach(u => {
        all.push({
          id: u.name,
          provider: u.properties?.provider,
          userId: u.properties?.userId,
          displayName: u.properties?.displayName,
          roles: u.properties?.roles || ""
        });
      });
      url = data.nextLink || null;
    }

    context.res = { status: 200, jsonBody: { users: all } };
  } catch (err) {
    context.res = { status: 500, jsonBody: { error: err.message } };
  }
}
