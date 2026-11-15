// GM TOKEN — local PostgreSQL STAGING ONLY game/ledger atomic bridge.
// Uses the actual gm_game schema. NEVER connects to Supabase/Render or TON.
// Before a real rollout, replace this with an audited production migration,
// custody accounting and independent opening-balance verification.
import {createHash} from 'node:crypto';
import {snapshotGameAccounts,projectGameTransition,requireGameSupply} from './ton-shadow-projection.mjs';

const CENT_TO_RAW=10000000n; // proposed decimals=9; not approved on-chain
const STAGE_DB='gm_shadow_ci';
const operationId=(s)=>{
  if(typeof s!=='string'||!/^[A-Za-z0-9_.:-]{8,100}$/.test(s))throw new Error('Staging operation ID required');
  return s;
};
function assertLocal(url) {
  if(process.env.NODE_ENV==='production')throw new Error('Staging mirror cannot run in production');
  if(typeof url!=='string')throw new Error('Staging database URL is mandatory');
  const parsed=new URL(url);
  if(!['127.0.0.1','localhost'].includes(parsed.hostname)||parsed.pathname!=='/'+STAGE_DB)
    throw new Error('Staging mirror refuses nonlocal PostgreSQL');
  if(!['postgres:','postgresql:'].includes(parsed.protocol))throw new Error('Not a PostgreSQL URL');
}
function rawAmount(a){return a.currency==='GM' ? a.cents*CENT_TO_RAW : a.cents}
const currencyFor=(a)=>a.currency==='GM'?'GM_RAW':'CR_CENTS';

export async function readStagingGameSnapshot(client) {
  const all=async(query)=>(await client.query(query)).rows;
  return snapshotGameAccounts({
    pools:await all('SELECT name,gm,cr FROM gm_game.pools ORDER BY name'),
    wallets:await all('SELECT user_id,gm,cr,vault FROM gm_game.wallets ORDER BY user_id'),
    mining:await all('SELECT user_id,pending_cents FROM gm_game.mining_state ORDER BY user_id'),
    holding:await all('SELECT user_id,pending_cents FROM gm_game.holding_state ORDER BY user_id'),
    orders:await all("SELECT id,side,status,locked_cents FROM gm_game.orders WHERE status='open' ORDER BY id")
  });
}
async function ensureShadowAccounts(client,accounts) {
  const rows=[...accounts.values()].sort((a,b)=>a.accountCode.localeCompare(b.accountCode));
  for(const a of rows) {
    const currency=currencyFor(a);
    await client.query('INSERT INTO gm_ton_shadow.accounts(account_code,account_kind,currency) VALUES($1,$2,$3) ON CONFLICT(account_code) DO NOTHING',[a.accountCode,a.accountKind,currency]);
    const check=await client.query('SELECT account_kind,currency FROM gm_ton_shadow.accounts WHERE account_code=$1',[a.accountCode]);
    if(check.rows.length!==1||check.rows[0].account_kind!==a.accountKind||check.rows[0].currency!==currency)
      throw new Error('Shadow account code reused with incompatible type');
  }
}
async function journal(client,id,kind,entries) {
  if(!entries.length)return {changed:false,entries:0};
  const incoming=entries.filter(x=>BigInt(x.amountUnits)!==0n);
  if(incoming.length<2)throw new Error('Journal must have at least two nonzero entries');
  const sums=new Map();
  for(const e of incoming)sums.set(e.currency,(sums.get(e.currency)||0n)+BigInt(e.amountUnits));
  for(const sum of sums.values())if(sum!==0n)throw new Error('Nonzero journal currency net');
  const signature=createHash('sha256').update(JSON.stringify(
    incoming.map(e=>[e.accountCode,e.currency,e.amountUnits]).sort((a,b)=>
      a[0].localeCompare(b[0])||a[1].localeCompare(b[1]))
  )).digest('hex');
  const existing=await client.query('SELECT source_reference FROM gm_ton_shadow.journal_batches WHERE operation_id=$1',[id]);
  if(existing.rows.length)throw new Error('Duplicate shadow operation ID: '+id);
  const batch=(await client.query(
    'INSERT INTO gm_ton_shadow.journal_batches(operation_id,operation_kind,source_reference) VALUES($1,$2,$3) RETURNING id',
    [id,kind,signature])).rows[0];
  const codes=[...new Set(incoming.map(e=>e.accountCode))];
  const lookup=await client.query(
    'SELECT id,account_code,currency FROM gm_ton_shadow.accounts WHERE account_code=ANY($1::text[]) ORDER BY id FOR UPDATE',
    [codes]);
  if(lookup.rows.length!==codes.length)throw new Error('Shadow account missing');
  const mapped=new Map(lookup.rows.map(a=>[a.account_code,a]));
  const ordered=incoming.map(e=>({e,row:mapped.get(e.accountCode)})).sort((a,b)=>{
    const aa=BigInt(a.row.id),bb=BigInt(b.row.id);return aa<bb?-1:aa>bb?1:0;
  });
  for(let i=0;i<ordered.length;i++) {
    const {e,row}=ordered[i];
    if(!row||row.currency!==e.currency)throw new Error('Shadow account currency mismatch');
    await client.query(
      'INSERT INTO gm_ton_shadow.journal_entries(batch_id,line_no,account_id,currency,amount_units) VALUES($1,$2,$3,$4,$5)',
      [batch.id,i+1,row.id,e.currency,e.amountUnits]);
  }
  await client.query('SET CONSTRAINTS ALL IMMEDIATE');
  return {changed:true,entries:ordered.length};
}
export async function assertStagingLedgerMatchesGame(client,snapshot) {
  const rows=(await client.query(
    'SELECT a.account_code,a.currency,a.account_kind,COALESCE(SUM(e.amount_units),0)::text AS balance FROM gm_ton_shadow.accounts a LEFT JOIN gm_ton_shadow.journal_entries e ON e.account_id=a.id GROUP BY a.id,a.account_code,a.currency,a.account_kind'
  )).rows;
  const observed=new Map(rows.filter(x=>x.account_kind!=='clearing').map(x=>[x.currency+':'+x.account_code,BigInt(x.balance)]));
  for(const x of snapshot.accounts.values()) {
    const key=currencyFor(x)+':'+x.accountCode;
    if((observed.get(key)??0n)!==rawAmount(x))throw new Error('Shadow ledger drift on '+key);
    observed.delete(key);
  }
  if([...observed.values()].some(x=>x!==0n))throw new Error('Orphaned shadow funds not present in game');
  return true;
}
export async function initializeLocalShadowLedger(pool,{databaseUrl}={}) {
  assertLocal(databaseUrl);
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('gm_game_writer'))");
    const prior=await readStagingGameSnapshot(client);
    requireGameSupply(prior);
    const exists=await client.query('SELECT count(*)::int AS n FROM gm_ton_shadow.journal_batches');
    if(exists.rows[0].n!==0)throw new Error('Refusing to reinitialize nonempty shadow journal');
    await ensureShadowAccounts(client,prior.accounts);
    const clearing=['GM_RAW','CR_CENTS'].map(currency=>({
      accountCode:'staging:unbacked-clearing:'+currency,
      accountKind:'clearing',currency:currency==='GM_RAW'?'GM':'CR',cents:0n
    }));
    await ensureShadowAccounts(client,new Map(clearing.map(x=>[x.accountCode,x])));
    const entries=[];
    for(const currency of ['GM_RAW','CR_CENTS']) {
      const positive=[...prior.accounts.values()].filter(x=>currencyFor(x)===currency&&rawAmount(x)!==0n);
      const sum=positive.reduce((n,x)=>n+rawAmount(x),0n);
      if(sum===0n)continue;
      entries.push(...positive.map(a=>({accountCode:a.accountCode,currency,amountUnits:String(rawAmount(a))})));
      entries.push({accountCode:'staging:unbacked-clearing:'+currency,currency,amountUnits:String(-sum)});
    }
    const result=await journal(client,'staging:opening:unbacked:v1','unbacked_opening',entries);
    await assertStagingLedgerMatchesGame(client,prior);
    await client.query('COMMIT');
    return result;
  }catch(err){await client.query('ROLLBACK').catch(()=>{});throw err}
  finally{client.release()}
}
// ATOMIC LOCAL STAGING: game mutation + shadow journal commit or both roll back.
// Mutate callback is controlled fixture code, never raw user input.
export async function runLocalMirroredGameTransaction(pool,{databaseUrl,id,mutate}) {
  assertLocal(databaseUrl);
  operationId(id);
  if(typeof mutate!=='function')throw new TypeError('Staging mutation callback required');
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('gm_game_writer'))");
    const before=await readStagingGameSnapshot(client);
    requireGameSupply(before);
    await assertStagingLedgerMatchesGame(client,before);
    const result=await mutate(client);
    const after=await readStagingGameSnapshot(client);
    requireGameSupply(after);
    const projected=projectGameTransition(before,after,id,{jettonDecimals:9});
    if(projected.changed) {
      await ensureShadowAccounts(client,after.accounts);
      const changes=projected.entries.map(e=>({accountCode:e.accountCode,currency:e.currency,amountUnits:e.amountUnits}));
      await journal(client,id,'game_shadow',changes);
    }
    await assertStagingLedgerMatchesGame(client,after);
    await client.query('COMMIT');
    return {result,changed:projected.changed,journalEntries:projected.entries.length};
  }catch(err){await client.query('ROLLBACK').catch(()=>{});throw err}
  finally{client.release()}
}
