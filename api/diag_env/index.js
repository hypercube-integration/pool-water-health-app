// FILE: api/diag_env/index.js
module.exports = async function (context, req) {
  const redacted = {
    has_COSMOS_CONNECTION_STRING: !!process.env.COSMOS_CONNECTION_STRING,
    COSMOS_DB_DATABASE: process.env.COSMOS_DB_DATABASE || "",
    COSMOS_DB_PROFILES_CONTAINER: process.env.COSMOS_DB_PROFILES_CONTAINER || "",
    APPSERVICE_SUBSCRIPTION_ID: process.env.APPSERVICE_SUBSCRIPTION_ID ? "[set]" : "",
    APPSERVICE_RESOURCE_GROUP: process.env.APPSERVICE_RESOURCE_GROUP || "",
    APPSERVICE_STATIC_SITE_NAME: process.env.APPSERVICE_STATIC_SITE_NAME || ""
  };
  context.res = { status: 200, headers: { "content-type": "application/json" }, body: redacted };
};
