// FILE: api/diag_site/index.js  (DROP-IN)
// Lists users with authprovider="all" and summarizes counts by provider.
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

    // NEW: call once with "all"
    let all = 0, aad = 0, github = 0, other = 0;
    try {
      const it = cli.staticSites.listStaticSiteUsers(rg, name, "all");
      for await (const u of it) {
        all++;
        const p = (u?.properties || u || {});
        const prov = String(p.provider || p.authProvider || p.authprovider || "").toLowerCase();
        if (prov === "aad") aad++;
        else if (prov === "github") github++;
        else other++;
      }
    } catch (e) {
      // Surface the exact error if the new "all" path fails
      return fail(context, 500, { ok: false, error: e?.message || String(e), code: e?.statusCode || e?.code });
    }

    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: {
        ok: true,
        siteName: site?.name,
        defaultHostname: site?.defaultHostname || site?.properties?.defaultHostname,
        counts: { all, aad, github, other }
      }
    };
  } catch (e) {
    fail(context, 500, { ok:false, error: e?.message || String(e) });
  }
};

function must(n){ const v=process.env[n]; if(!v) throw new Error(`Missing env ${n}`); return v; }
function fail(ctx, status, body){ ctx.res = { status, headers:{ "content-type":"application/json" }, body }; return ctx.res; }
