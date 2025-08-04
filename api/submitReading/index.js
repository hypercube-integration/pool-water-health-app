const { CosmosClient } = require("@azure/cosmos");

module.exports = async function (context, req) {
  const reading = req.body;

  if (!reading || !reading.date) {
    context.res = { status: 400, body: { error: "Missing reading data" } };
    return;
  }

  try {
    // Connect to Cosmos DB
    const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
    const database = client.database("PoolAppDB");
    const container = database.container("Readings");

    // Insert reading into Cosmos DB
    const { resource: createdItem } = await container.items.create(reading);

    context.res = {
      status: 200,
      body: { message: "Reading saved", item: createdItem }
    };
  } catch (error) {
    context.log("Error saving to Cosmos DB:", error);
    context.res = { status: 500, body: { error: "Database save failed" } };
  }
};
