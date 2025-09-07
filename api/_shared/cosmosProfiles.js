// FILE: api/_shared/cosmosProfiles.js
// Helper to create a Cosmos client and point at the Profiles container.
// Uses your env names to avoid duplicates.
const { CosmosClient } = require("@azure/cosmos");

function getProfilesCosmos() {
  const conn =
    process.env.COSMOS_CONNECTION_STRING ||
    ""; // preferred

  const endpoint = process.env.COSMOS_DB_ENDPOINT || "";
  const key = process.env.COSMOS_DB_KEY || "";

  const db =
    process.env.COSMOS_DB_DATABASE || // your DB name
    "";

  const container =
    process.env.COSMOS_DB_PROFILES_CONTAINER || // your Profiles container
    "";

  let client = null;
  if (conn) client = new CosmosClient(conn);
  else if (endpoint && key) client = new CosmosClient({ endpoint, key });

  return {
    enabled: !!(client && db && container),
    client,
    db,
    container
  };
}

module.exports = { getProfilesCosmos };
