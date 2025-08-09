// api/submitReading/index.js
const { CosmosClient } = require("@azure/cosmos");
const { requireAuth } = require("../_shared/auth"); // <-- auth helper

module.exports = async function (context, req) {
  // 1) Require an authenticated user
  const user = requireAuth(context, req);
  if (!user) return; // 401 already set

  try {
    // 2) Validate payload
    const reading = req.body;
    if (!reading || !reading.date) {
      context.res = { status: 400, body: { error: "Missing reading data (requires date, ph, chlorine, salt)" } };
      return;
    }

    // 3) Connect to Cosmos
    const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
    const database = client.database("PoolAppDB");
    const container = database.container("Readings");

    // 4) (Optional) tag the owner for future filtering/authorization
    reading.ownerId = user.userId;

    // 5) Insert
    const { resource: created } = await container.items.create(reading);

    context.res = { status: 200, body: created };
  } catch (err) {
    context.log("submitReading error:", err);
    context.res = { status: 500, body: { error: "Failed to save reading" } };
  }
};
