const { CosmosClient } = require("@azure/cosmos");

module.exports = async function (context, req) {
  try {
    const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
    const database = client.database("PoolAppDB");
    const container = database.container("Readings");

    // Fetch all readings
    const { resources: items } = await container.items.readAll().fetchAll();

    // Sort newest first
    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    context.res = {
      status: 200,
      body: items
    };
  } catch (error) {
    context.log("Error fetching readings:", error);
    context.res = {
      status: 500,
      body: { error: "Failed to fetch readings" }
    };
  }
};