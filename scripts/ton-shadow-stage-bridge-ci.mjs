// Actual gm_game PostgreSQL schema + staged shadow ledger, localhost CI only.
// No Render, Supabase, TON Testnet funds, seed phrases or mainnet side effects.
import assert from 'node:assert/strict';
import pg from 'pg';
import {gmFunds,crFunds} from '../server/lib.mjs';
import {
  initializeLocalShadowLedger,runLocalMirroredGameTransaction,
  readStagingGameSnapshot,assertStagingLedgerMatchesGame
} from '../server/ton-shadow-stage-bridge.mjs';

const databaseUrl=process.env.TON_SHADOW_CI_POSTGRES;
if(!databaseUrl||!['localhost','127.0.0.1'].includes(new URL(databaseUrl).hostname)||
    new URL(databaseUrl).pathname!=='/gm_shadow_ci')throw new Error('Only local gm_shadow_ci allowed');
const pool=new pg.Pool({connectionString:databaseUrl,max:6});
const shadow={databaseUrl};
const user='testplayer';
const second='testplayer2';
const third='testplayer3';
const doTxn=(id,mutate)=>runLocalMirroredGameTransaction(pool,{...shadow,id,mutate});
const moved=(result,expected=true)=>assert.equal(result.changed,expected);

async function seed() {
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    for(const [name,gm] of Object.entries(gmFunds))await client.query(
      'INSERT INTO gm_game.pools(name,gm,cr) VALUES($1,$2,0)',[name,String(gm*100)]);
    for(const [name,cr] of Object.entries(crFunds))await client.query(
      'INSERT INTO gm_game.pools(name,gm,cr) VALUES($1,0,$2)',[name,String(cr*100)]);
    await client.query("INSERT INTO gm_game.pools(name,gm,cr) VALUES('HOLDING_FEES',0,0)");
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e}
  finally{client.release()}
}
async function userRows(c,name) {
  await c.query('INSERT INTO gm_game.users(id,created_at,last_seen) VALUES($1,1,1)',[name]);
  await c.query('INSERT INTO gm_game.wallets(user_id) VALUES($1)',[name]);
  await c.query('INSERT INTO gm_game.mining_state(user_id,last_at) VALUES($1,1)',[name]);
  await c.query('INSERT INTO gm_game.holding_state(user_id,last_checkpoint) VALUES($1,1)',[name]);
}
async function unchangedAfterFailure(id,mutate,errorRegex){
  const before=await pool.query('SELECT gm::text AS balance FROM gm_game.wallets WHERE user_id=$1',[user]);
  await assert.rejects(()=>doTxn(id,mutate),errorRegex);
  const after=await pool.query('SELECT gm::text AS balance FROM gm_game.wallets WHERE user_id=$1',[user]);
  assert.deepEqual(after.rows,before.rows);
  const client=await pool.connect();
  try {
    const snap=await readStagingGameSnapshot(client);
    await assertStagingLedgerMatchesGame(client,snap);
  }finally{client.release()}
}
async function main(){
  await seed();
  const init=await initializeLocalShadowLedger(pool,shadow);
  assert.equal(init.changed,true);
  const reinit=()=>initializeLocalShadowLedger(pool,shadow);
  await assert.rejects(reinit,/nonempty shadow journal/);

  const bootstrap=await doTxn('stage:bootstrap:player',async(c)=>{
    await userRows(c,user);
    const n=500000;
    await c.query('UPDATE gm_game.pools SET cr=cr-$1 WHERE name=$2 AND cr>=$1',[n,'WELCOME']);
    await c.query('UPDATE gm_game.wallets SET cr=cr+$1 WHERE user_id=$2',[n,user]);
  });
  moved(bootstrap);
  assert.equal(bootstrap.journalEntries,2);

  const daily=await doTxn('stage:daily:reward1',async(c)=>{
    await c.query('UPDATE gm_game.pools SET gm=gm-1000 WHERE name=$1 AND gm>=1000',['DAILY']);
    await c.query('UPDATE gm_game.wallets SET gm=gm+1000 WHERE user_id=$1',[user]);
  });
  moved(daily);

  moved(await doTxn('stage:vault:deposit1',async(c)=>{
    await c.query('UPDATE gm_game.wallets SET gm=gm-500,vault=vault+500 WHERE user_id=$1 AND gm>=500',[user]);
  }));
  const fee=await doTxn('stage:vault:withdraw1',async(c)=>{
    await c.query('UPDATE gm_game.wallets SET gm=gm+475,vault=vault-500 WHERE user_id=$1 AND vault>=500',[user]);
    await c.query("UPDATE gm_game.pools SET gm=gm+25 WHERE name='HOLDING_FEES'");
  });
  moved(fee);
  assert.equal(fee.journalEntries,3,'withdrawal contains funded 5% fee');

  moved(await doTxn('stage:mining:settle1',async(c)=>{
    await c.query("UPDATE gm_game.pools SET gm=gm-150 WHERE name='MINING' AND gm>=150");
    await c.query('UPDATE gm_game.mining_state SET pending_cents=pending_cents+150 WHERE user_id=$1',[user]);
  }));
  moved(await doTxn('stage:mining:claim1',async(c)=>{
    await c.query('UPDATE gm_game.mining_state SET pending_cents=pending_cents-150 WHERE user_id=$1 AND pending_cents>=150',[user]);
    await c.query('UPDATE gm_game.wallets SET gm=gm+150 WHERE user_id=$1',[user]);
  }));
  moved(await doTxn('stage:holding:settle1',async(c)=>{
    await c.query("UPDATE gm_game.pools SET gm=gm-40 WHERE name='HOLDING' AND gm>=40");
    await c.query('UPDATE gm_game.holding_state SET pending_cents=pending_cents+40 WHERE user_id=$1',[user]);
  }));
  moved(await doTxn('stage:holding:claim1',async(c)=>{
    await c.query('UPDATE gm_game.holding_state SET pending_cents=pending_cents-40 WHERE user_id=$1 AND pending_cents>=40',[user]);
    await c.query('UPDATE gm_game.wallets SET gm=gm+40 WHERE user_id=$1',[user]);
  }));

  moved(await doTxn('stage:order:sell1',async(c)=>{
    await c.query('UPDATE gm_game.wallets SET gm=gm-300 WHERE user_id=$1 AND gm>=300',[user]);
    await c.query("INSERT INTO gm_game.orders(id,user_id,side,limit_price,amount_cents,remaining_cents,locked_cents,status,created_at,priority) VALUES('sell-1',$1,'sell',1200,300,300,300,'open',1,1)",[user]);
  }));
  moved(await doTxn('stage:order:cancel1',async(c)=>{
    await c.query("UPDATE gm_game.orders SET status='cancelled',locked_cents=0 WHERE id='sell-1'");
    await c.query('UPDATE gm_game.wallets SET gm=gm+300 WHERE user_id=$1',[user]);
  }));

  // Account rows with zero balances must not trigger a fake journal payout.
  const users=await doTxn('stage:add:recipients',async(c)=>{
    await userRows(c,second);await userRows(c,third);
  });
  moved(users,false);

  // Duplicate operation ID with an attempted second credit MUST roll back game changes.
  await unchangedAfterFailure('stage:daily:reward1',async(c)=>{
    await c.query("UPDATE gm_game.pools SET gm=gm-1000 WHERE name='DAILY'");
    await c.query('UPDATE gm_game.wallets SET gm=gm+1000 WHERE user_id=$1',[user]);
  },/Duplicate shadow operation ID/);
  await unchangedAfterFailure('stage:synthetic:mint1',async(c)=>{
    await c.query('UPDATE gm_game.wallets SET gm=gm+1 WHERE user_id=$1',[user]);
  },/supply mismatch/i);

  // A failure between game SQL and journal insertion must undo BOTH.
  await unchangedAfterFailure('stage:broken:request1',async(c)=>{
    await c.query("UPDATE gm_game.pools SET gm=gm-100 WHERE name='DAILY'");
    await c.query('UPDATE gm_game.wallets SET gm=gm+100 WHERE user_id=$1',[user]);
    throw new Error('simulated network failure before mirror');
  },/simulated network failure/);
  moved(await doTxn('stage:broken:request1',async(c)=>{
    await c.query("UPDATE gm_game.pools SET gm=gm-100 WHERE name='DAILY'");
    await c.query('UPDATE gm_game.wallets SET gm=gm+100 WHERE user_id=$1',[user]);
  }));

  // Two concurrent spends of 800 cents from one player: only one can succeed.
  const outcomes=await Promise.allSettled([
    doTxn('stage:parallel:one1',async(c)=>{
      const x=await c.query('UPDATE gm_game.wallets SET gm=gm-800 WHERE user_id=$1 AND gm>=800',[user]);
      if(x.rowCount!==1)throw new Error('insufficient wallet GM');
      await c.query('UPDATE gm_game.wallets SET gm=gm+800 WHERE user_id=$1',[second]);
    }),
    doTxn('stage:parallel:two1',async(c)=>{
      const x=await c.query('UPDATE gm_game.wallets SET gm=gm-800 WHERE user_id=$1 AND gm>=800',[user]);
      if(x.rowCount!==1)throw new Error('insufficient wallet GM');
      await c.query('UPDATE gm_game.wallets SET gm=gm+800 WHERE user_id=$1',[third]);
    })
  ]);
  assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1,'exactly one parallel debit succeeded');
  assert.equal(outcomes.filter(x=>x.status==='rejected'&&/insufficient wallet GM/.test(x.reason?.message)).length,1);

  const client=await pool.connect();
  try {
    const after=await readStagingGameSnapshot(client);
    await assertStagingLedgerMatchesGame(client,after);
    const total=await client.query(
      'SELECT currency,COALESCE(SUM(amount_units),0)::text AS net FROM gm_ton_shadow.journal_entries GROUP BY currency');
    assert.ok(total.rows.every(x=>x.net==='0'));
    const cnt=await client.query("SELECT count(*)::int AS n FROM gm_ton_shadow.journal_batches WHERE operation_id='stage:broken:request1'");
    assert.equal(cnt.rows[0].n,1,'retry after failed transaction posted once');
    const cnt2=await client.query("SELECT count(*)::int AS n FROM gm_ton_shadow.journal_batches WHERE operation_id='stage:daily:reward1'");
    assert.equal(cnt2.rows[0].n,1,'no replay credit');
  }finally{client.release()}
  console.log('Local PostgreSQL game+Ledger atomic bridge passed: Mining, Vault, Daily, Holding, orders, rollback, replay, parallel spend');
}
try{await main()}finally{await pool.end()}
