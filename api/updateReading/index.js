const { CosmosClient } = require('@azure/cosmos');

const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE;
const containerId = process.env.COSMOS_DB_CONTAINER;

const client = new CosmosClient({ endpoint, key });

module.exports = async function (context, req) {
  if (req.method !== 'PUT') {
    context.res = { status: 405, body: 'Method Not Allowed' };
    return;
  }

  const updated = req.body;

  if (!updated || !updated.id) {
    context.res = { status: 400, body: 'Missing or invalid reading id' };
    return;
  }

  try {
    const container = client.database(databaseId).container(containerId);

    // Retrieve the existing item
    const { resource: existing } = await container.item(updated.id, updated.date).read();

    if (!existing) {
      context.res = { status: 404, body: 'Reading not found' };
      return;
    }

    // Merge existing fields with new ones
    const merged = {
      ...existing,
      ...updated,
    };

    const { resource: saved } = await container.item(merged.id, merged.date).replace(merged);

    context.res = {
      status: 200,
      body: saved,
    };
  } catch (err) {
    console.error('Update failed:', err);
    context.res = {
      status: 500,
      body: 'Failed to update reading',
    };
  }
};
