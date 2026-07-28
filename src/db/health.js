import { pool } from './pool.js';

export async function pingDatabase() {
  const result = await pool.query('SELECT 1 AS ok');
  return result.rows[0]?.ok === 1;
}