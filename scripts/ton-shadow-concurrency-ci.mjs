// Run ONLY against disposable localhost database gm_shadow_ci, after shadow schema setup.
// Tests real PostgreSQL concurrent-account locking, idempotency and aborted sessions.
// It never connects to Supabase, Render or TON.
import assert from 'node:assert/strict';
import pg from 'pg';

const address=process.env.TON_SHADOW_CI_POSTGRES;
if(!address)throw new Error('TON_SHADOW_CI_POSTGRES is required; test cannot access a real database');
const endpoint=new URL(address);
if(!['127.0.0.1','localhost'].includes(endpoint.hostname)||endpoint.pathname!=='/gm_shadow_ci')
  throw new Error('This test can only run against disposable local gm_shadow_ci');
const pool=new pg.Pool({connectionString:address,max:6});
const raw=(n)=>String(BigInt(n)*1_000_000_000n);

async function post(id,from,to,amount) {
  const signature=from+'|'+to+'|'+amount;
  const c=await pool.connect();
  try {
    await c.query('BEGIN');
    const batch=await c.query(
      "INSERT INTO gm_ton_shadow.journal_batches(operation_id,operation_kind,source_reference) VALUES($1,'simulated_transfer',$2) ON CONFLICT(operation_id) DO NOTHING RETURNING id",
      [id,signature]);
    if(!batch.rows.length){
      const prior=await c.query('SELECT source_reference FROM gm_ton_shadow.journal_batches WHERE operation_id=$1',[id]);
      if(prior.rows.length!==1||prior.rows[0].source_reference!==signature)throw Error('Idempotency request conflict');
      await c.query('ROLLBACK');
      return 'replayed';
    }
    // Lock every relevant account in stable order before inserting any journal entries.
    const locked=await c.query(
      "SELECT id,account_code FROM gm_ton_shadow.accounts WHERE account_code=ANY($1::text[]) AND currency='GM_RAW' ORDER BY id FOR UPDATE",
      [[from,to]]);
    assert.equal(locked.rows.length,2);
    const changes=[{account_code:from,units:-BigInt(amount)},{account_code:to,units:BigInt(amount)}];
    changes.sort((a,b)=>{
      const aa=BigInt(locked.rows.find(x=>x.account_code===a.account_code).id);
      const bb=BigInt(locked.rows.find(x=>x.account_code===b.account_code).id);
      return aa<bb?-1:aa>bb?1:0;
    });
    for(let i=0;i<changes.length;i++){
      const e=changes[i],account=locked.rows.find(x=>x.account_code===e.account_code);
      await c.query(
        'INSERT INTO gm_ton_shadow.journal_entries(batch_id,line_no,account_id,currency,amount_units) VALUES($1,$2,$3,$4,$5)',
        [batch.rows[0].id,i+1,account.id,'GM_RAW',String(e.units)]);
    }
    await c.query('COMMIT');
    return 'applied';
  }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e}
  finally{c.release()}
}
async function balance(code){
  const r=await pool.query(
    "SELECT coalesce(sum(e.amount_units),0)::text AS units FROM gm_ton_shadow.journal_entries e JOIN gm_ton_shadow.accounts a ON a.id=e.account_id WHERE a.account_code=$1",
    [code]);
  return BigInt(r.rows[0].units);
}
async function main(){
  const fund='test:concurrent:fund',one='test:concurrent:one',two='test:concurrent:two',clearing='test:concurrent:clearing';
  await pool.query(
    "INSERT INTO gm_ton_shadow.accounts(account_code,account_kind,currency) VALUES ($1,'clearing','GM_RAW'),($2,'fund','GM_RAW'),($3,'user_available','GM_RAW'),($4,'user_available','GM_RAW')",
    [clearing,fund,one,two]);
  const seed=await post('test:concurrency:opening',clearing,fund,raw(1000));
  assert.equal(seed,'applied');
  const [a,b]=await Promise.allSettled([
    post('test:concurrency:spend:a',fund,one,raw(800)),
    post('test:concurrency:spend:b',fund,two,raw(800))
  ]);
  const ok=[a,b].filter(x=>x.status==='fulfilled'&&x.value==='applied');
  const refused=[a,b].filter(x=>x.status==='rejected'&&x.reason?.code==='23514');
  assert.equal(ok.length,1,'exactly one spend succeeded');
  assert.equal(refused.length,1,'overdrawn parallel spend was rejected');
  assert.equal(await balance(fund),BigInt(raw(200)));
  assert.equal(await balance(one)+await balance(two),BigInt(raw(800)));

  // Simulate a worker lost mid-transaction. PostgreSQL must roll back on disconnect.
  const lost=await pool.connect();
  await lost.query('BEGIN');
  await lost.query(
    "INSERT INTO gm_ton_shadow.journal_batches(operation_id,operation_kind,source_reference) VALUES('test:concurrency:crash','simulated_transfer',$1)",
    [fund+'|'+one+'|'+raw(100)]);
  lost.release(true);
  // A new client must not see a phantom pending operation.
  const pending=await pool.query(
    "SELECT count(*)::int AS n FROM gm_ton_shadow.journal_batches WHERE operation_id='test:concurrency:crash'");
  assert.equal(pending.rows[0].n,0,'abandoned uncommitted batch rolled back');
  assert.equal(await post('test:concurrency:crash',fund,one,raw(100)),'applied');
  assert.equal(await post('test:concurrency:crash',fund,one,raw(100)),'replayed');
  await assert.rejects(()=>post('test:concurrency:crash',fund,one,raw(101)),/Idempotency request conflict/);
  assert.equal(await balance(fund),BigInt(raw(100)));
  assert.equal(await balance(one)+await balance(two),BigInt(raw(900)));
  const net=await pool.query("SELECT COALESCE(sum(amount_units),0)::text AS units FROM gm_ton_shadow.journal_entries WHERE currency='GM_RAW'");
  assert.equal(BigInt(net.rows[0].units),0n);
  console.log('Isolated PostgreSQL: parallel overspend rejected, replay and disconnect recovery confirmed');
}
try{await main()}finally{await pool.end()}
