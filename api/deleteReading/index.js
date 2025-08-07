const { CosmosClient } = require("@azure/cosmos");

module.exports = async function (context, req) {
  try {
    const id = (req.query && req.query.id) || (req.body && req.body.id);
    const date = (req.query && req.query.date) || (req.body && req.body.date);

    if (!id || !date) {
      context.res = {
        status: 400,
        body: { error: "Missing required parameters: id and date (partition key)" }
      };
      return;
    }

    const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
    const database = client.database("PoolAppDB");
    const container = database.container("Readings");

    // Delete by id + partition key (/date)
    await container.item(id, date).delete();

    context.res = {
      status: 200,
      body: { ok: true, id, date }
    };
  } catch (err) {
    context.log("deleteReading error:", err);

    // Cosmos returns a 404 if the item doesn't exist
    const status = err.code === 404 ? 404 : 500;
    context.res = {
      status,
      body: { error: status === 404 ? "Reading not found" : "Failed to delete reading" }
    };
  }
};
