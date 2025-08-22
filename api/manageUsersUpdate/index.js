// api/manageUsersUpdate/index.js
// Echo stub that verifies ARM auth + resource resolution using SWA_RESOURCE_ID.
// Replace with real role update later.

const { getSwaResourceId, getArmToken, armGET } = require("../_shared/arm");

module.exports = async function (context, req) {
  const verbose = req.query?.debug === "1";
  const apiVersion = process.env.SWA_ARM_API_VERSION || "2022-03-01";

  try {
    const resourceId = getSwaResourceId();
    const token = await getArmToken();

    // Sanity check we can read the SWA resource
    const probeUrl = `https://management.azure.com${resourceId}?api-version=${apiVersion}`;
    const probe = await armGET(probeUrl, token);

    if (!probe.ok) {
      context.res = {
        status: 500,
        body: verbose
          ? { error: "Probe failed", debug: { url: probeUrl, status: probe.status, body: probe.json || probe.text } }
          : { error: "Probe failed" },
      };
      return;
    }

    // Just echo input for now.
    const body = req.body || {};
    context.res = { status: 200, body: { ok: true, received: body, resourceId } };
  } catch (err) {
    context.log.error("manageUsersUpdate fatal", err);
    context.res = { status: 500, body: { error: err.message || "Update failed" } };
  }
};
