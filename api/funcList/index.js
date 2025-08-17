const fs = require("fs");
const path = require("path");

module.exports = async function (context, req) {
  try {
    const root = path.resolve(__dirname, ".."); // wwwroot (api root)
    const entries = fs.readdirSync(root, { withFileTypes: true });
    const funcs = [];

    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const dir = path.join(root, e.name);
      const fj = path.join(dir, "function.json");
      if (!fs.existsSync(fj)) continue;

      let routes = [];
      try {
        const j = JSON.parse(fs.readFileSync(fj, "utf-8"));
        const bindings = Array.isArray(j.bindings) ? j.bindings : [];
        const trig = bindings.find(b => b.type && b.type.toLowerCase() === "httptrigger");
        // If function.json has a "route", it’s mounted at /api/<route>; otherwise /api/<folderName>
        if (trig && typeof trig.route === "string" && trig.route.trim().length > 0) {
          routes.push(`/api/${trig.route}`);
        } else {
          routes.push(`/api/${e.name}`);
        }
      } catch (err) {
        routes.push("(failed to parse function.json)");
      }

      funcs.push({
        folder: e.name,
        routes
      });
    }

    context.res = {
      status: 200,
      body: {
        site: process.env.WEBSITE_SITE_NAME,
        functionsExtension: process.env.FUNCTIONS_EXTENSION_VERSION,
        node: process.version,
        functions: funcs.sort((a, b) => a.folder.localeCompare(b.folder))
      }
    };
  } catch (err) {
    context.res = { status: 500, body: { error: err.message } };
  }
};
