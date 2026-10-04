import pg from 'pg';
import { DATABASE_URL } from './config.js';

const { Pool, types } = pg;
types.setTypeParser(1700, (value) => (value === null ? null : Number(value)));
types.setTypeParser(20, (value) => (value === null ? null : Number.parseInt(value, 10)));

export const pool = new Pool({ connectionString: DATABASE_URL });
