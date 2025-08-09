// api/exportCSV/index.js
const { CosmosClient } = require('@azure/cosmos');
const { requireAuth, requireRole } = require('../_shared/auth');

const COSMOS_CONNECTION_STRING = process.env.COSMOS_CONNECTION_STRING;
const DB = 'PoolAppDB';
const CONTAINER = 'Readings';

// RFC4180-safe CSV utils
function toCsv(rows, headers) {
  const cols = headers && headers.length
    ? headers
    : Array.from(rows.reduce((s, r) => (Object.keys(r).forEach(k => s.add(k)), s), new Set()));

  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = cols.map(esc).join(',');
  const body = rows.map(r => cols.map(c => esc(r[c])).join(',')).join('\n');
  return header + '\n' + body + '\n';
}

module.exports = async function (context, req) {
  try {
    // --- AuthN/Z (route already restricted in staticwebapp.config.json) -----
    const user = requireAuth(context, req);
    if (!user) return;
    if (!requireRole(context, user, ['exporter', 'admin'])) return;

    if (!COSMOS_CONNECTION_STRING) {
      context.res = { status: 500, body: { error: 'Missing COSMOS_CONNECTION_STRING' } };
      return;
    }

    // --- Inputs -------------------------------------------------------------
    const startDate = (req.query.startDate || '').trim();
    const endDate = (req.query.endDate || '').trim();
    const limit = Math.max(1, Math.min(parseInt(req.query.limit || '3650', 10) || 3650, 20000));
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;

    const where = [];
    const params = [{ name: '@limit', value: limit }];

    if (startDate && dateRe.test(startDate)) {
      where.push('c.date >= @start');
      params.push({ name: '@start', value: startDate });
    }
    if (endDate && dateRe.test(endDate)) {
      where.push('c.date <= @end');
      params.push({ name: '@end', value: endDate });
    }

    // If you later add owner scoping:
    // const ownerId = req.query.ownerId || user?.userId;
    // if (ownerId) { where.push('c.ownerId = @owner'); params.push({ name:'@owner', value: ownerId }); }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `
      SELECT TOP @limit c.date, c.ph, c.chlorine, c.salt
      FROM c
      ${whereSql}
      ORDER BY c.date ASC
    `.trim();

    // --- Query Cosmos -------------------------------------------------------
    const client = new CosmosClient(COSMOS_CONNECTION_STRING);
    const container = client.database(DB).container(CONTAINER);

    const { resources } = await container.items
      .query({ query: sql, parameters: params }, { enableCrossPartition: true, maxItemCount: limit })
      .fetchAll();

    // --- Build CSV ----------------------------------------------------------
    const headers = ['date', 'ph', 'chlorine', 'salt'];
    const csv = toCsv(resources || [], headers);

    // --- Filename -----------------------------------------------------------
    const safe = (s) => (s || '').replace(/[^0-9a-zA-Z-_]/g, '');
    const fname = `pool-readings_${safe(startDate) || 'start'}_to_${safe(endDate) || 'end'}.csv`;

    context.res = {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${fname}"`,
        // Caching hint (optional):
        'cache-control': 'no-store',
      },
      body: csv,
    };
  } catch (err) {
    context.log.error(err);
    context.res = { status: 500, body: { error: 'Server error', details: String(err) } };
  }
};
