// FILE: api/diag_site/index.js
const { DefaultAzureCredential } = require("@azure/identity");
const { WebSiteManagementClient } = require("@azure/arm-appservice");
module.exports = async function (context, req) {
  try {
    const subId = must("APPSERVICE_SUBSCRIPTION_ID");
    const rg = must("APPSERVICE_RESOURCE_GROUP");
    const name = must("APPSERVICE_STATIC_SITE_NAME");
    const cred = new DefaultAzureCredential();
    const cli = new WebSiteManagementClient(cred, subId);

    const site = await cli.staticSites.getStaticSite(rg, name);

    const counts = {};
    for (const p of ["aad","github"]) {
      try {
        let n = 0; const it = cli.staticSites.listStaticSiteUsers(rg, name, p);
        for await (const _ of it) n++;
        counts[p] = n;
      } catch (e) {
        counts[p] = { error: e?.message || String(e), code: e?.statusCode || e?.code };
      }
    }
    context.res = { status: 200, headers: { "content-type":"application/json" }, body: {
      ok: true,
      siteName: site?.name,
      defaultHostname: site?.defaultHostname || site?.properties?.defaultHostname,
      counts
    }};
  } catch (e) {
    context.res = { status: 500, headers: { "content-type":"application/json" }, body: { ok:false, error: e?.message || String(e) } };
  }
};
function must(n){ const v=process.env[n]; if(!v) throw new Error(`Missing env ${n}`); return v; }
