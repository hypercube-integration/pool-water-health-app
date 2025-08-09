const { CosmosClient } = require("@azure/cosmos");
const { requireAuth } = require("../_shared/auth");

module.exports = async function (context, req) {
  const user = requireAuth(context, req);
  if (!user) return;

  try {
    const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
    const container = client.database("PoolAppDB").container("Readings");

    const query = "SELECT * FROM c ORDER BY c.date DESC";
    const { resources: items } = await container.items.query(query, { enableCrossPartitionQuery: true }).fetchAll();

    // Optional: if you tag ownerId on create, filter here:
    // const rows = items.filter(i => i.ownerId === user.userId);

    const headers = ["date", "ph", "chlorine", "salt"];
    const lines = items.map(r => `${r.date},${r.ph},${r.chlorine},${r.salt}`);
    const csv = [headers.join(","), ...lines].join("\n");

    context.res = {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="readings.csv"'
      },
      body: csv
    };
  } catch (err) {
    context.log("exportCSV error:", err);
    context.res = { status: 500, body: { error: "Failed to export CSV" } };
  }
};
