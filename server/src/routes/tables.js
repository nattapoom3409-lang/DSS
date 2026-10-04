import { Router } from 'express';
import { pool } from '../db.js';
import { TABLES } from '../config.js';
import { toCsv } from '../csv.js';

const router = Router();
const quoteIdent = (name) => `"${name.replaceAll('"', '""')}"`;

async function getColumns(name) {
  const { rows } = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [name]);
  return rows;
}

function csvColumns(columns) {
  return columns.map(({ column_name }) => ({ name: column_name, label: column_name }));
}

function buildWhere(query, columns) {
  const columnNames = columns.map((column) => column.column_name);
  const textColumns = columns.filter((column) => ['character varying', 'text', 'character'].includes(column.data_type));
  const clauses = [];
  const params = [];
  if (typeof query.q === 'string' && query.q.trim() && textColumns.length) {
    params.push(`%${query.q.trim()}%`);
    clauses.push(`(${textColumns.map((column) => `${quoteIdent(column.column_name)}::text ILIKE $${params.length}`).join(' OR ')})`);
  }
  for (const [key, value] of Object.entries(query)) {
    if (!key.startsWith('f.') || value === '') continue;
    const column = key.slice(2);
    if (!columnNames.includes(column) || typeof value !== 'string') continue;
    params.push(value);
    clauses.push(`${quoteIdent(column)}::text = $${params.length}`);
  }
  return { whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

async function queryRows(name, query, paginated) {
  if (!TABLES[name]) {
    const error = new Error('unknown table');
    error.status = 404;
    throw error;
  }
  const columns = await getColumns(name);
  const names = columns.map((column) => column.column_name);
  if (!names.length) {
    const error = new Error('table unavailable');
    error.status = 404;
    throw error;
  }
  const sort = names.includes(query.sort) ? query.sort : TABLES[name].defaultSort;
  const order = query.order === 'desc' ? 'DESC' : 'ASC';
  const { whereSql, params } = buildWhere(query, columns);
  const count = await pool.query(`SELECT COUNT(*)::int AS n FROM ${quoteIdent(name)} ${whereSql}`, params);
  const total = count.rows[0].n;
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(Number.parseInt(query.pageSize, 10) || 25, 1), 200);
  let sql = `SELECT * FROM ${quoteIdent(name)} ${whereSql} ORDER BY ${quoteIdent(sort)} ${order}`;
  const rowParams = [...params];
  if (paginated) {
    rowParams.push(pageSize, (page - 1) * pageSize);
    sql += ` LIMIT $${rowParams.length - 1} OFFSET $${rowParams.length}`;
  }
  const result = await pool.query(sql, rowParams);
  return { columns, rows: result.rows, total, page, pageSize };
}

router.get('/', async (_req, res, next) => {
  try {
    const output = [];
    for (const [name, metadata] of Object.entries(TABLES)) {
      const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM ${quoteIdent(name)}`);
      output.push({ name, label: metadata.label, rowCount: rows[0].n, columns: await getColumns(name) });
    }
    res.json(output);
  } catch (error) { next(error); }
});

router.get('/:name/export.csv', async (req, res, next) => {
  try {
    const result = await queryRows(req.params.name, req.query, false);
    res.type('text/csv; charset=utf-8')
      .attachment(`${req.params.name}.csv`)
      .send(Buffer.from(toCsv(csvColumns(result.columns), result.rows), 'utf8'));
  } catch (error) { next(error); }
});

router.get('/:name', async (req, res, next) => {
  try {
    const result = await queryRows(req.params.name, req.query, true);
    res.json({ table: req.params.name, columns: result.columns, page: result.page, pageSize: result.pageSize, total: result.total, rows: result.rows });
  } catch (error) { next(error); }
});

export default router;
