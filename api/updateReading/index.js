const { CosmosClient } = require("@azure/cosmos");
const { requireAuth } = require("../_shared/auth");

module.exports = async function (context, req) {
  const user = requireAuth(context, req);
  if (!user) return;

  try {
    const updated = req.body;
    if (!updated || !updated.id || !updated.date) {
      context.res = { status: 400, body: { error: "Missing id or date" } };
      return;
    }

    const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
    const container = client.database("PoolAppDB").container("Readings");

    // Read existing (id + partition key /date)
    const { resource: existing } = await container.item(updated.id, updated.date).read();
    if (!existing) {
      context.res = { status: 404, body: { error: "Reading not found" } };
      return;
    }

    // Optional: ensure same owner (if you want to enforce per-user ownership)
    // if (existing.ownerId && existing.ownerId !== user.userId) {
    //   context.res = { status: 403, body: { error: "Forbidden" } };
    //   return;
    // }

    const merged = { ...existing, ...updated, ownerId: existing.ownerId || user.userId };
    const { resource: saved } = await container.item(merged.id, merged.date).replace(merged);

    context.res = { status: 200, body: saved };
  } catch (err) {
    context.log("updateReading error:", err);
    context.res = { status: 500, body: { error: "Failed to update reading" } };
  }
};
