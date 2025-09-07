// FILE: api/_shared/cosmosProfiles.js  (NEW helper, optional but tidy)
const { CosmosClient } = require("@azure/cosmos");

function getProfilesCosmos() {
  const conn =
    process.env.COSMOS_CONNECTION_STRING ||
    process.env.COSMOS_CONNSTR || // legacy fallback (no need to set)
    "";

  const endpoint = process.env.COSMOS_DB_ENDPOINT || "";
  const key = process.env.COSMOS_DB_KEY || "";

  const db =
    process.env.COSMOS_DB_DATABASE || // <- your DB name
    process.env.COSMOS_DB || "";      // fallback

  const container =
    process.env.COSMOS_DB_PROFILES_CONTAINER || // <- your Profiles container
    process.env.COSMOS_CONTAINER || "";         // fallback

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
