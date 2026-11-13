// Import a consistent SQLite backup into private PostgreSQL staging for reconciliation.
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const quote = name => '"' + name.replaceAll('"','""') + '"';

export function readSnapshot(filename) {
  const db = new DatabaseSync(filename, {readOnly:true});
  try {
    db.exec('BEGIN');
    if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok' ||
        db.prepare('PRAGMA foreign_key_check').get()) throw new Error('SQLite integrity check failed');
    const schema = db.prepare("SELECT type,name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all();
    const tables = schema.filter(entry => entry.type === 'table');
    for (const name of ['users','wallets','balance_ledger','journal']) {
      if (!tables.some(entry => entry.name === name)) throw new Error('Missing game table: ' + name);
    }
    const hash = createHash('sha256').update(JSON.stringify(schema));
    const snapshots = tables.map(({name}) => {
      const statement = db.prepare((name === 'trades' ? 'SELECT rowid, * FROM ' : 'SELECT * FROM ') + quote(name));
      statement.setReadBigInts(true);
      // Preserve SQL storage classes, including exact 64-bit integers and blobs.
      const rows = Array.from(statement.iterate(), row => JSON.stringify(row, (_, value) => {
        if (typeof value === 'bigint') return {integer:String(value)};
        if (value instanceof Uint8Array) return {blob:Buffer.from(value).toString('base64')};
        return value;
      })).sort();
      hash.update(JSON.stringify([name,rows]));
      return {name,rows};
    });
    return {id:hash.digest('hex'), schema, tables:snapshots};
  } finally { db.close(); }
}

async function importSnapshot(filename) {
  const snapshot = readSnapshot(filename);
  const {withTransaction,closePool} = await import('../server/postgres.mjs');
  try {
    await withTransaction(async client => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext('gm_sqlite_import'))");
      await client.query('CREATE SCHEMA IF NOT EXISTS gm_migration');
      await client.query('REVOKE ALL ON SCHEMA gm_migration FROM PUBLIC,anon,authenticated');
      await client.query('CREATE TABLE IF NOT EXISTS gm_migration.snapshots (id text PRIMARY KEY, schema_json jsonb NOT NULL, imported_at timestamptz NOT NULL DEFAULT now())');
      await client.query('CREATE TABLE IF NOT EXISTS gm_migration.source_tables (snapshot_id text REFERENCES gm_migration.snapshots, name text, row_count bigint NOT NULL, PRIMARY KEY(snapshot_id,name))');
      await client.query('CREATE TABLE IF NOT EXISTS gm_migration.source_rows (snapshot_id text, name text, position bigint, payload jsonb NOT NULL, PRIMARY KEY(snapshot_id,name,position), FOREIGN KEY(snapshot_id,name) REFERENCES gm_migration.source_tables)');
      const result = await client.query('INSERT INTO gm_migration.snapshots(id,schema_json) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING id',[snapshot.id,JSON.stringify(snapshot.schema)]);
      if (!result.rowCount) return;
      for (const {name,rows} of snapshot.tables) {
        await client.query('INSERT INTO gm_migration.source_tables VALUES($1,$2,$3)',[snapshot.id,name,rows.length]);
        for (let start=0; start<rows.length; start+=250) {
          await client.query('INSERT INTO gm_migration.source_rows SELECT $1,$2,$3::bigint+ordinality,value FROM jsonb_array_elements($4::jsonb) WITH ORDINALITY AS batch(value,ordinality)',[snapshot.id,name,start,'['+rows.slice(start,start+250).join(',')+']']);
        }
        const count = await client.query('SELECT count(*) AS n FROM gm_migration.source_rows WHERE snapshot_id=$1 AND name=$2',[snapshot.id,name]);
        if (Number(count.rows[0].n)!==rows.length) throw new Error('Imported count mismatch: '+name);
      }
    });
    console.log('Verified staging snapshot',snapshot.id,'tables',snapshot.tables.length);
  } finally { await closePool(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.argv[2]) throw new Error('Pass the path to a consistent SQLite backup');
  await importSnapshot(process.argv[2]);
}
