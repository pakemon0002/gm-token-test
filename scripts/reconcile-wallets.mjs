// Compare GM and CR in their original integer (cent) representation.
import {withTransaction,closePool} from '../server/postgres.mjs';
const id = process.argv[2];
if (!/^[a-f0-9]{64}$/.test(id || '')) throw new Error('Pass a staged snapshot SHA-256');
try {
  await withTransaction(async client => {
    await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
    const snapshot = await client.query("SELECT row_count FROM gm_migration.source_tables WHERE snapshot_id=$1 AND name='wallets'",[id]);
    if (!snapshot.rowCount) throw new Error('Wallet snapshot is missing');
    const actual = await client.query("SELECT count(*) AS count FROM gm_migration.source_rows WHERE snapshot_id=$1 AND name='wallets'",[id]);
    if (actual.rows[0].count !== snapshot.rows[0].row_count) throw new Error('Wallet snapshot is incomplete');
    const differences = await client.query(`WITH source AS (
  SELECT (r.payload->>'user_id')::bigint AS player_id,
         amounts.currency, amounts.balance
  FROM gm_migration.source_rows AS r
  CROSS JOIN LATERAL (VALUES
    ('GM', (r.payload #>> '{gm,integer}')::bigint),
    ('CR', (r.payload #>> '{cr,integer}')::bigint)
  ) AS amounts(currency,balance)
  WHERE r.snapshot_id = $1 AND r.name = 'wallets'
), target AS (
  SELECT player_id, currency, balance
  FROM gm_internal.wallets
  WHERE currency IN ('GM','CR')
)
SELECT coalesce(s.player_id,t.player_id) AS player_id,
       coalesce(s.currency,t.currency) AS currency,
       s.balance AS source_balance, t.balance AS target_balance,
       CASE WHEN s.player_id IS NULL THEN 'target_only'
            WHEN t.player_id IS NULL THEN 'source_only'
            WHEN s.balance IS NULL THEN 'invalid_source'
            ELSE 'amount_mismatch' END AS discrepancy
FROM source s FULL JOIN target t USING(player_id,currency)
WHERE s.player_id IS NULL OR t.player_id IS NULL OR s.balance IS NULL
   OR s.balance IS DISTINCT FROM t.balance
ORDER BY 1,2`, [id]);
    console.log(JSON.stringify({snapshot:id,wallets:snapshot.rows[0].row_count,differences:differences.rows},null,2));
    if (differences.rowCount) process.exitCode=1;
  });
} finally { await closePool(); }
