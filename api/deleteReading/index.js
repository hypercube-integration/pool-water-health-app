const { CosmosClient } = require("@azure/cosmos");
const { requireAuth, requireRole } = require("../_shared/auth");

const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const container = client.database("PoolAppDB").container("Readings");

module.exports = async function (context, req) {
  const user = requireAuth(context, req);
  if (!user) return;
  if (!requireRole(context, user, ["deleter", "admin"])) return;

  try {
    const id = req.query?.id || req.body?.id;
    const date = req.query?.date || req.body?.date;
    if (!id || !date) {
      context.res = { status: 400, body: { error: "Missing required parameters: id and date" } };
      return;
    }

    // Optional: enforce ownership (read first and check)
    // const { resource: existing } = await container.item(id, date).read();
    // if (existing?.ownerId && existing.ownerId !== user.userId) {
    //   context.res = { status: 403, body: { error: "Forbidden" } };
    //   return;
    // }

    await container.item(id, date).delete();
    context.res = { status: 200, body: { ok: true, id, date } };
  } catch (err) {
    context.log("deleteReading error:", err);
    const status = err.code === 404 ? 404 : 500;
    context.res = { status, body: { error: status === 404 ? "Not found" : "Failed to delete reading" } };
  }
};
