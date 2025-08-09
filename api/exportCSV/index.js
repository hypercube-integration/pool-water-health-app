const { CosmosClient } = require("@azure/cosmos");
const { requireAuth, requireRole } = require("../_shared/auth");

const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const container = client.database("PoolAppDB").container("Readings");

module.exports = async function (context, req) {
  const user = requireAuth(context, req);
  if (!user) return;
  if (!requireRole(context, user, ["exporter", "admin"])) return;

  try {
    const query = "SELECT * FROM c ORDER BY c.date DESC";
    const { resources: items } = await container.items
      .query(query, { enableCrossPartitionQuery: true })
      .fetchAll();

    // Optional: filter by owner if you set ownerId on create
    // const rows = items.filter(i => i.ownerId === user.userId);
    const rows = items;

    const headers = ["date", "ph", "chlorine", "salt"];
    const lines = rows.map(r => `${r.date},${r.ph},${r.chlorine},${r.salt}`);
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
