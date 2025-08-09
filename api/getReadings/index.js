// api/getReadings/index.js
const { CosmosClient } = require('@azure/cosmos');
const COSMOS_CONNECTION_STRING = process.env.COSMOS_CONNECTION_STRING;
const DB = 'PoolAppDB';
const CONTAINER = 'Readings';

module.exports = async function (context, req) {
  try {
    if (!COSMOS_CONNECTION_STRING) {
      context.res = { status: 500, body: { error: 'Missing COSMOS_CONNECTION_STRING' } };
      return;
    }

    const limit = Math.max(1, Math.min(parseInt(req.query.limit || '30', 10) || 30, 365));
    const startDate = (req.query.startDate || '').trim();
    const endDate = (req.query.endDate || '').trim();
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

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `
      SELECT TOP @limit c.id, c.date, c.ph, c.chlorine, c.salt
      FROM c
      ${whereSql}
      ORDER BY c.date DESC
    `.trim();

    const client = new CosmosClient(COSMOS_CONNECTION_STRING);
    const container = client.database(DB).container(CONTAINER);

    const { resources } = await container.items
      .query({ query: sql, parameters: params }, { enableCrossPartition: true, maxItemCount: limit })
      .fetchAll();

    context.res = { headers: { 'content-type': 'application/json' }, body: resources };
  } catch (err) {
    context.log.error(err);
    context.res = { status: 500, body: { error: 'Server error', details: String(err) } };
  }
};
