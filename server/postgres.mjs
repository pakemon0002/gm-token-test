// PostgreSQL connection layer for the GM TOKEN migration branch.
// The existing SQLite server remains unchanged until endpoint parity tests pass.
import pg from 'pg';

const { Pool } = pg;
let pool;

export function getPool() {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required for PostgreSQL');
  pool = new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX || 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: { rejectUnauthorized: true },
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
