module.exports = async function (context, req) {
  try {
    if (!process.env.COSMOS_CONNECTION_STRING) {
      throw new Error("COSMOS_CONNECTION_STRING environment variable is missing");
    }

    const { CosmosClient } = require("@azure/cosmos");
    const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
    const database = client.database("PoolAppDB");
    const container = database.container("Readings");

    const { resources: items } = await container.items.readAll().fetchAll();
    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    context.res = { status: 200, body: items };
  } catch (error) {
    context.res = {
      status: 500,
      body: `Function error: ${error.message}`
    };
  }
};
