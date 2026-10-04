import express from 'express';
import cors from 'cors';
import { pool } from './db.js';
import { persistBalancedSnapshot } from './repository.js';
import overviewRoutes from './routes/overview.js';
import rankingRoutes from './routes/ranking.js';
import tableRoutes from './routes/tables.js';

const app = express();
const origin = process.env.WEB_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin }));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});
app.use('/api', overviewRoutes);
app.use('/api', rankingRoutes);
app.use('/api/tables', tableRoutes);
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ error: error.status ? error.message : 'internal error' });
});

const port = Number(process.env.PORT || 3001);
let server;

async function start() {
  await pool.query('SELECT 1');
  await persistBalancedSnapshot();
  server = app.listen(port, '0.0.0.0', () => console.log(`API ready on ${port}`));
}

start().catch((error) => {
  console.error('API startup failed:', error);
  process.exit(1);
});

async function shutdown() {
  if (server) server.close();
  await pool.end();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
