#!/usr/bin/env node
// Read-only GM TOKEN SQLite consistency report for rehearsal of a Postgres migration.
// Prints aggregate counts and checks only. Never exports players, Telegram IDs, tokens or secrets.
import {existsSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import crypto from 'node:crypto';

const dbFile=process.argv[2];
if(!dbFile||!existsSync(dbFile)){
 console.error('Usage: node --experimental-sqlite scripts/audit-sqlite-readonly.mjs /absolute/path/to/game.sqlite');
 process.exitCode=2;
}else{
 let db;
 try{
  db=new DatabaseSync(dbFile,{readOnly:true});
  const known=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x=>x.name));
  const count=(table)=>known.has(table)?db.prepare('SELECT count(*) AS n FROM "'+table+'"').get().n:null;
  const sum=(table,column)=>known.has(table)?db.prepare('SELECT coalesce(sum("'+column+'"),0) AS n FROM "'+table+'"').get().n:null;
  const negatives=(table,columns)=>known.has(table)?columns.reduce((n,column)=>n+
   db.prepare('SELECT count(*) AS n FROM "'+table+'" WHERE "'+column+'"<0').get().n,0):null;
  const tables=['users','wallets','journal','pools','mining_state','mining_upgrades',
   'points_account','daily_claim','trades','orders','referrals','box_day',
   'request_ids','balance_ledger','holding_state'];
  const counts=Object.fromEntries(tables.map(t=>[t,count(t)]));
  const integrity=db.prepare('PRAGMA quick_check').all().map(x=>Object.values(x).join(','));
  const foreignKeys=db.prepare('PRAGMA foreign_key_check').all();
  const currencyTotals={
   wallets_gm_cents:sum('wallets','gm'),wallets_cr_cents:sum('wallets','cr'),
   pools_gm_cents:sum('pools','gm'),pools_cr_cents:sum('pools','cr'),
   mining_pending_cents:sum('mining_state','pending_cents'),
   points:sum('points_account','points')
  };
  const badValues={
   wallets:negatives('wallets',['gm','cr','vault']),
   pools:negatives('pools',['gm','cr']),
   points:negatives('points_account',['points'])
  };
  const baseline={counts,currencyTotals,badValues};
  const fingerprint=crypto.createHash('sha256').update(JSON.stringify(baseline)).digest('hex');
  const ok=integrity.length===1&&integrity[0]==='ok'&&foreignKeys.length===0&&
   Object.values(badValues).every(n=>n===null||n===0);
  console.log(JSON.stringify({format:'gm-sqlite-readonly-inventory-v1',at:new Date().toISOString(),
   integrity,foreignKeyViolations:foreignKeys.length,ok,baseline,fingerprint},null,2));
  if(!ok)process.exitCode=1;
 }catch(error){
  console.error('Read-only audit failed:',error.message);
  process.exitCode=1;
 }finally{if(db)db.close()}
}
