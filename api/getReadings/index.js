const { CosmosClient } = require("@azure/cosmos");

module.exports = async function (context, req) {
  try {
    const limit = Math.min(
      parseInt(req.query.limit || "50", 10) || 50,
      500 // hard cap
    );
    const startDate = req.query.startDate; // YYYY-MM-DD
    const endDate = req.query.endDate;     // YYYY-MM-DD

    if (!process.env.COSMOS_CONNECTION_STRING) {
      throw new Error("COSMOS_CONNECTION_STRING is missing");
    }

    const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
    const database = client.database("PoolAppDB");
    const container = database.container("Readings");

    // Build SQL with optional date filters
    const where = [];
    const params = [{ name: "@limit", value: limit }];

    if (startDate) {
      where.push("c.date >= @startDate");
      params.push({ name: "@startDate", value: startDate });
    }
    if (endDate) {
      where.push("c.date <= @endDate");
      params.push({ name: "@endDate", value: endDate });
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const querySpec = {
      query: `SELECT TOP @limit * FROM c ${whereClause} ORDER BY c.date DESC`,
      parameters: params
    };

    const { resources: items } = await container.items
      .query(querySpec, { enableCrossPartitionQuery: true })
      .fetchAll();

    context.res = { status: 200, body: items };
  } catch (error) {
    context.res = { status: 500, body: { error: error.message } };
  }
};
