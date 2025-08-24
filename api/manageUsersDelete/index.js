const fetch = require("node-fetch");
const { DefaultAzureCredential, getBearerTokenProvider } = require("@azure/identity");
const ARM_SCOPE = "https://management.azure.com/.default";

module.exports = async function (context, req) {
  try {
    const { provider, userId } = req.body || {};
    if (!userId) return (context.res = { status: 400, jsonBody: { error: "userId is required" } });

    let providerFinal = provider;
    if (!providerFinal) {
      const resList = await callArm("GET", process.env.SWA_RESOURCE_ID + "/authproviders?api-version=2024-11-01");
      if (resList.ok) {
        const { value: provs = [] } = await resList.json();
        for (const p of provs) {
          const pName = p?.name;
          if (!pName) continue;
          const url = `${process.env.SWA_RESOURCE_ID}/authproviders/${pName}/users/${userId}?api-version=2024-11-01`;
          const probe = await callArm("GET", url);
          if (probe.status === 200) { providerFinal = pName; break; }
        }
      }
    }

    if (!providerFinal) {
      return (context.res = { status: 400, jsonBody: { error: "provider and userId are required" } });
    }

    const url = `${process.env.SWA_RESOURCE_ID}/authproviders/${providerFinal}/users/${userId}?api-version=2024-11-01`;
    const res = await callArm("DELETE", url);
    const txt = await res.text();
    if (!res.ok) {
      return (context.res = { status: res.status, jsonBody: { error: "Delete failed", detail: safeJson(txt) } });
    }
    return (context.res = { status: 200, body: txt || "{}" });
  } catch (err) {
    context.log.error(err);
    context.res = { status: 500, jsonBody: { error: "Unexpected error", detail: String(err) } };
  }
};

function safeJson(t) {
  try { return JSON.parse(t); } catch { return t; }
}

async function callArm(method, url, body) {
  const credential = new DefaultAzureCredential();
  const getToken = getBearerTokenProvider(credential, ARM_SCOPE);
  const token = (await getToken()).token;
  return fetch(`https://management.azure.com${url.replace(/^https?:\/\/management\.azure\.com/, "")}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
