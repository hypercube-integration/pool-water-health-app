// api/manageUsers/index.js
// Lists SWA users via ARM, trying multiple API versions, env names, and action paths.
// Env required: SWA_RESOURCE_ID  (preferred)
// Optional env: SWA_ENVIRONMENT, SWA_ARM_API_VERSION
// Auth env: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET

const { getSwaResourceId, getArmToken, armGET, armPOST } = require("../_shared/arm");

module.exports = async function (context, req) {
  const verbose = req.query?.debug === "1";

  // Try newest first (Azure’s error message listed these as supported for your region)
  const apiVersions = [
    process.env.SWA_ARM_API_VERSION?.trim(),
    "2024-11-01",
    "2024-04-01",
    "2023-12-01",
    "2023-01-01",
    "2022-09-01",
    "2022-03-01",
    "2021-03-01",
    "2021-02-01",
    "2021-01-15",
    "2021-01-01",
    "2020-12-01",
    "2020-10-01",
    "2020-09-01",
    "2020-06-01",
    "2019-12-01-preview",
    "2019-08-01",
  ].filter(Boolean);

  const envCandidates = [
    (process.env.SWA_ENVIRONMENT || "").trim(),
    "Production",
    "production",
    "Default",
    "default",
    "default-production",
    // Seen in a few older free SKUs:
    "Build",
  ].filter(Boolean);

  try {
    const resourceId = getSwaResourceId();
    const token = await getArmToken();
    const debug = [];

    // 0) Sanity probe (resource exists + SP is authorized)
    {
      const v = apiVersions[0];
      const url = `https://management.azure.com${resourceId}?api-version=${v}`;
      const res = await armGET(url, token);
      debug.push({ try: "getStaticSite(GET)", url, status: res.status, body: res.json || res.text });
      if (!res.ok) {
        context.res = {
          status: 500,
          body: verbose ? { error: "Static site probe failed", debug } : { error: "Static site probe failed" },
        };
        return;
      }
    }

    // 1) Optional: enumerate environments (not all SKUs expose this; 404 is OK)
    for (const v of apiVersions) {
      const url = `https://management.azure.com${resourceId}/environments?api-version=${v}`;
      const res = await armGET(url, token);
      debug.push({ try: "listEnvironments(GET, optional)", url, status: res.status, body: res.json || res.text });
      if (res.ok && Array.isArray(res.json?.value)) {
        // Prepend discovered names so they are tried first
        for (const e of res.json.value) {
          const nm = e?.name || e?.properties?.name;
          if (nm && !envCandidates.includes(nm)) envCandidates.unshift(nm);
        }
        break;
      }
    }

    // 2) Build a thorough attempt list.
    const attempts = [];
    for (const v of apiVersions) {
      // Root-scoped POST actions
      attempts.push({
        key: `listUsers:root:POST:${v}`,
        url: `https://management.azure.com${resourceId}/listUsers?api-version=${v}`,
        method: "POST",
        shape: "root",
        apiVersion: v,
      });
      attempts.push({
        key: `listStaticSiteUsers:root:POST:${v}`,
        url: `https://management.azure.com${resourceId}/listStaticSiteUsers?api-version=${v}`,
        method: "POST",
        shape: "root",
        apiVersion: v,
      });

      // Some SKUs briefly exposed a GET list:
      attempts.push({
        key: `users:root:GET:${v}`,
        url: `https://management.azure.com${resourceId}/users?api-version=${v}`,
        method: "GET",
        shape: "rootUsersGET",
        apiVersion: v,
      });

      // Environment-scoped variants
      for (const envName of envCandidates) {
        const enc = encodeURIComponent(envName);
        attempts.push({
          key: `listUsers:env:POST:${v}:${envName}`,
          url: `https://management.azure.com${resourceId}/environments/${enc}/listUsers?api-version=${v}`,
          method: "POST",
          shape: "env",
          apiVersion: v,
          envName,
        });
        attempts.push({
          key: `listStaticSiteUsers:envQuery:POST:${v}:${envName}`,
          url: `https://management.azure.com${resourceId}/listStaticSiteUsers?api-version=${v}&environmentName=${enc}`,
          method: "POST",
          shape: "envQuery",
          apiVersion: v,
          envName,
        });
        // Defensive GET shape (rare, but cheap to try)
        attempts.push({
          key: `users:env:GET:${v}:${envName}`,
          url: `https://management.azure.com${resourceId}/environments/${enc}/users?api-version=${v}`,
          method: "GET",
          shape: "envUsersGET",
          apiVersion: v,
          envName,
        });
      }
    }

    // 3) Try in sequence; return on first success
    for (const a of attempts) {
      const res = a.method === "GET" ? await armGET(a.url, token) : await armPOST(a.url, token, {});
      const body = res.json || res.text;
      debug.push({ try: a.key, url: a.url, status: res.status, body: verbose ? body : (res.ok ? "(ok)" : "(not ok)") });

      if (res.ok) {
        const raw = Array.isArray(res.json?.value) ? res.json.value
                  : Array.isArray(res.json) ? res.json
                  : (res.json?.users && Array.isArray(res.json.users) ? res.json.users : []);
        const users = raw.map(u => ({
          displayName: u.displayName || u.name || u.userDetails || "",
          userId: u.userId || u.user_id || u.user || u.principalId || "",
          provider: u.provider || u.identityProvider || u.providerName || "",
          roles: (u.roles || u.roleNames || "")
            .toString()
            .split(",")
            .map(s => s.trim())
            .filter(Boolean),
        }));

        context.res = verbose
          ? { status: 200, body: { users, meta: { apiVersion: a.apiVersion, envName: a.envName || null, pathShape: a.shape }, debug } }
          : { status: 200, body: { users } };
        return;
      }
    }

    const hint =
      "All permutations still returned non-200. Next checks: (1) In Azure Portal → your SWA → Users: does the list load? Note the environment name it shows. (2) If your plan is Free, some tenants/regions disable ARM listing; consider upgrading to Standard or managing roles via invitations instead.";
    context.res = { status: 500, body: verbose ? { error: "List users failed", debug, hint } : { error: "List users failed" } };
  } catch (err) {
    context.log.error("manageUsers fatal", err);
    context.res = { status: 500, body: { error: err.message || "List users failed" } };
  }
};
