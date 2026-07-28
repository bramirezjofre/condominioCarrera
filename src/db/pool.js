import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
  ssl: env.DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false
});

pool.on('error', (error) => {
  logger.error({ err: error }, 'Error inesperado en el pool PostgreSQL');
});

export async function closePool() {
  await pool.end();
}