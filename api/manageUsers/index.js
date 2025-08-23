const fetch = require("node-fetch");
const { DefaultAzureCredential } = require("@azure/identity");

const API_VERSIONS = ["2024-04-01", "2023-12-01", "2022-03-01"]; // try in order
const ENV_NAME = process.env.SWA_ENVIRONMENT || "Production";
const SWA_RESOURCE_ID = process.env.SWA_RESOURCE_ID;

module.exports = async function (context, req) {
  const debug = req.query.debug !== undefined;
  const cred = new DefaultAzureCredential();

  let token;
  try {
    const accessToken = await cred.getToken("https://management.azure.com/.default");
    token = accessToken.token;
  } catch (err) {
    context.log.error("Token acquisition failed", err);
    return { status: 500, body: { error: "Failed to get Azure token", details: err.message } };
  }

  // Try each version until one works
  const debugInfo = [];
  for (const version of API_VERSIONS) {
    // 1. listStaticSiteUsers (env query)
    let url = `https://management.azure.com${SWA_RESOURCE_ID}/listStaticSiteUsers?api-version=${version}&environmentName=${ENV_NAME}`;
    let res = await doPost(url, token);
    debugInfo.push({ try: `listStaticSiteUsers:envQuery:${version}`, url, status: res.status, body: res.body });

    if (res.ok) {
      return { status: 200, body: debug ? { users: res.body, debug: debugInfo } : res.body };
    }

    // 2. listStaticSiteUsers (root)
    url = `https://management.azure.com${SWA_RESOURCE_ID}/listStaticSiteUsers?api-version=${version}`;
    res = await doPost(url, token);
    debugInfo.push({ try: `listStaticSiteUsers:root:${version}`, url, status: res.status, body: res.body });

    if (res.ok) {
      return { status: 200, body: debug ? { users: res.body, debug: debugInfo } : res.body };
    }

    // 3. listUsers (env path)
    url = `https://management.azure.com${SWA_RESOURCE_ID}/environments/${ENV_NAME}/listUsers?api-version=${version}`;
    res = await doPost(url, token);
    debugInfo.push({ try: `listUsers:env:${version}`, url, status: res.status, body: res.body });

    if (res.ok) {
      return { status: 200, body: debug ? { users: res.body, debug: debugInfo } : res.body };
    }

    // 4. listUsers (root)
    url = `https://management.azure.com${SWA_RESOURCE_ID}/listUsers?api-version=${version}`;
    res = await doPost(url, token);
    debugInfo.push({ try: `listUsers:root:${version}`, url, status: res.status, body: res.body });

    if (res.ok) {
      return { status: 200, body: debug ? { users: res.body, debug: debugInfo } : res.body };
    }
  }

  // If none succeeded
  return {
    status: 500,
    body: { error: "List users failed", debug: debugInfo, hint: "Check SKU, API version, or role assignments" }
  };
};

async function doPost(url, token) {
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    let body = {};
    try {
      body = await resp.json();
    } catch (_) {}
    return { ok: resp.ok, status: resp.status, body };
  } catch (err) {
    return { ok: false, status: 0, body: { error: err.message } };
  }
}
