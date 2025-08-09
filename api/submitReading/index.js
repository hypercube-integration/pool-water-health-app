const { CosmosClient } = require("@azure/cosmos");
const { requireAuth, requireRole } = require("../_shared/auth");

const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const container = client.database("PoolAppDB").container("Readings");

module.exports = async function (context, req) {
  const user = requireAuth(context, req);
  if (!user) return;
  if (!requireRole(context, user, ["writer", "admin"])) return;

  try {
    const reading = req.body;
    if (!reading || !reading.date || reading.ph == null || reading.chlorine == null || reading.salt == null) {
      context.res = { status: 400, body: { error: "Missing required fields: date, ph, chlorine, salt" } };
      return;
    }

    // Optional: set owner for future filtering
    reading.ownerId = reading.ownerId || user.userId;

    const { resource: created } = await container.items.create(reading);
    context.res = { status: 200, body: created };
  } catch (err) {
    context.log("submitReading error:", err);
    context.res = { status: 500, body: { error: "Failed to save reading" } };
  }
};
