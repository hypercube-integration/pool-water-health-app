const { CosmosClient } = require("@azure/cosmos");

module.exports = async function (context, req) {
  const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
  const database = client.database("PoolAppDB");
  const container = database.container("Readings");

  try {
    const query = 'SELECT * FROM c ORDER BY c.date DESC';
    const { resources: readings } = await container.items.query(query).fetchAll();

    const headers = ['date', 'ph', 'chlorine', 'salt'];
    const rows = readings.map(r =>
      `${r.date},${r.ph},${r.chlorine},${r.salt}`
    );

    const csvContent = [headers.join(','), ...rows].join('\n');

    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="readings.csv"',
      },
      body: csvContent
    };
  } catch (err) {
    context.log("Error exporting CSV:", err);
    context.res = {
      status: 500,
      body: "Failed to export CSV"
    };
  }
};