// PostgreSQL connection layer for the GM TOKEN migration branch.
// The existing SQLite server remains unchanged until endpoint parity tests pass.
import { readFileSync } from 'node:fs';
import pg from 'pg';

const { Pool } = pg;
let pool;

export function getPool() {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required for PostgreSQL');
  const url = new URL(connectionString);
  for (const key of ['ssl','sslmode','sslrootcert','sslcert','sslkey']) url.searchParams.delete(key);
  const ca = readFileSync(new URL('./supabase-ca.pem', import.meta.url), 'utf8');
  pool = new Pool({
    connectionString: url.href,
    max: Number(process.env.PG_POOL_MAX || 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: { ca, rejectUnauthorized: true },
  });
  pool.on('error', error => console.error('PostgreSQL idle client error:', error.message));
  return pool;
}

export async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (rollbackError) {
      console.error('PostgreSQL rollback failed:', rollbackError.message);
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function postgresHealth() {
  const result = await getPool().query('SELECT 1 AS ok');
  return result.rows[0]?.ok === 1;
}

export async function closePool() {
  if (pool) {
    const closing = pool;
    pool = undefined;
    await closing.end();
  }
}
