// Isolated game-engine integration. No Telegram, TON, Supabase, Render or live wallet.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gmFunds,crFunds} from '../server/lib.mjs';
import {readGameAccountSnapshot,requireGameSupply,projectGameTransition} from '../server/ton-shadow-projection.mjs';

test('real game handlers project balanced Mining Vault Daily Holding and replay after reopening DB',async t=>{
  const previous={PRIVATE:process.env.GM_PRIVATE_TEST_ECONOMY,DAILY:process.env.DAILY_REWARD_GM,HOLD:process.env.HOLDING_DAILY_BPS};
  process.env.GM_PRIVATE_TEST_ECONOMY='1';
  process.env.DAILY_REWARD_GM='10';
  process.env.HOLDING_DAILY_BPS='10';
  const {makeGame}=await import('../server/game.mjs');
  const dir=mkdtempSync(join(tmpdir(),'gm-engine-shadow-')),file=join(dir,'fixture.sqlite');
  let db;
  t.after(()=>{
    db?.close();rmSync(dir,{recursive:true,force:true});
    for(const [key,value] of [['GM_PRIVATE_TEST_ECONOMY',previous.PRIVATE],['DAILY_REWARD_GM',previous.DAILY],['HOLDING_DAILY_BPS',previous.HOLD]]){
      if(value===undefined)delete process.env[key];else process.env[key]=value;
    }
  });
  let clock=1763208000;
  let engine;
  const stmt=(sql)=>db.prepare(sql);
  const tx=(fn)=>{db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}};
  const log=(actor,kind,data)=>stmt('INSERT INTO journal(id,at,actor,kind,info) VALUES(?,?,?,?,?)').run(
    'test-'+Math.random().toString(36).slice(2)+Date.now(),clock,actor,kind,JSON.stringify(data));
  function launch() {
    db=new DatabaseSync(file);
    db.exec('PRAGMA foreign_keys=ON;');
    db.exec('CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT DEFAULT \'\', role TEXT NOT NULL DEFAULT \'player\',created_at INTEGER NOT NULL,last_seen INTEGER NOT NULL,level INTEGER DEFAULT 1,xp INTEGER DEFAULT 0);'+
      'CREATE TABLE IF NOT EXISTS wallets(user_id TEXT PRIMARY KEY REFERENCES users(id),gm INTEGER NOT NULL DEFAULT 0 CHECK(gm>=0),cr INTEGER NOT NULL DEFAULT 0 CHECK(cr>=0),vault INTEGER NOT NULL DEFAULT 0 CHECK(vault>=0));'+
      'CREATE TABLE IF NOT EXISTS pools(name TEXT PRIMARY KEY,gm INTEGER NOT NULL DEFAULT 0 CHECK(gm>=0),cr INTEGER NOT NULL DEFAULT 0 CHECK(cr>=0));'+
      'CREATE TABLE IF NOT EXISTS journal(id TEXT PRIMARY KEY,at INTEGER NOT NULL,actor TEXT NOT NULL,kind TEXT NOT NULL,info TEXT NOT NULL);'+
      'CREATE TABLE IF NOT EXISTS holding_buckets(name TEXT PRIMARY KEY,gm INTEGER NOT NULL DEFAULT 0 CHECK(gm>=0));');
    for(const [name,gm] of Object.entries(gmFunds))stmt('INSERT OR IGNORE INTO pools(name,gm,cr) VALUES(?,?,0)').run(name,gm*100);
    for(const [name,cr] of Object.entries(crFunds))stmt('INSERT OR IGNORE INTO pools(name,gm,cr) VALUES(?,0,?)').run(name,cr*100);
    stmt('INSERT OR IGNORE INTO holding_buckets(name,gm) VALUES(?,?)').run('HOLDER',18400000*100);
    stmt('INSERT OR IGNORE INTO holding_buckets(name,gm) VALUES(?,?)').run('REFERRAL',4600000*100);
    engine=makeGame({db,stmt,tx,log,now:()=>clock,send:(_res,status,value)=>({status,value}),
      readBody:async(req)=>req.body||{},sendTelegram:async()=>{}});
  }
  launch();
  for(const id of ['test-owner','test-player']) {
    stmt('INSERT INTO users(id,username,role,created_at,last_seen) VALUES(?,?,?,?,?)').run(id,id,'player',clock,clock);
    stmt('INSERT INTO wallets(user_id) VALUES(?)').run(id);
    engine.ensure(id);
  }
  function snap(){const s=readGameAccountSnapshot(db);requireGameSupply(s);return s}
  let counter=0;
  async function step(kind,id,body,user='test-player') {
    const before=snap();
    const output=await engine.handle(kind,'POST',user,{url:kind,body},null);
    const after=snap();
    const journal=projectGameTransition(before,after,'test:engine:'+String(++counter));
    assert.equal(output.status,200,JSON.stringify(output.value));
    for(const cur of ['GM_RAW','CR_CENTS'])assert.equal(
      journal.entries.filter(e=>e.currency===cur).reduce((sum,e)=>sum+BigInt(e.amountUnits),0n),0n);
    return {output,journal};
  }
  async function settle(user) {
    const before=snap();
    const output=await engine.handle('/api/game/status','GET',user,{url:'/api/game/status'},null);
    const journal=projectGameTransition(before,snap(),'test:settle:'+String(++counter));
    assert.equal(output.status,200,JSON.stringify(output.value));
    return {output,journal};
  }
  const dailyId='test:daily:replay';
  const daily=await step('/api/daily/claim',null,{operationId:dailyId});
  assert.equal(daily.output.value.gm_cents,1000);
  assert.equal(daily.journal.changed,true);
  const once=await step('/api/daily/claim',null,{operationId:dailyId});
  assert.equal(once.journal.changed,false);

  const deposit=await step('/api/vault/deposit',null,{amount:'5',operationId:'test:vault:deposit'});
  assert.equal(deposit.output.value.wallet.vault,500);
  const withdrawal=await step('/api/vault/withdraw',null,{amount:'5',operationId:'test:vault:withdraw'});
  assert.equal(withdrawal.output.value.fee_cents,25);

  clock+=86400;
  const miningSettle=await settle('test-player');
  assert.equal(miningSettle.journal.changed,true);
  const mined=await step('/api/mining/claim',null,{operationId:'test:mining:claim'});
  assert.ok(mined.output.value.gm_cents>=100);
  assert.equal(mined.journal.changed,true);

  // Fixture-only funding mirrors an admin reserve transfer without minting GM.
  const before=snap();
  tx(()=>{
    stmt("UPDATE pools SET gm=gm-100000 WHERE name='TREASURY' AND gm>=100000").run();
    stmt('UPDATE wallets SET gm=gm+100000 WHERE user_id=?').run('test-owner');
  });
  const funded=projectGameTransition(before,snap(),'test:fixture:funding');
  assert.equal(funded.entries.length,2);
  const holding=await step('/api/vault/deposit',null,{amount:'1000',operationId:'test:holder:deposit'},'test-owner');
  assert.equal(holding.output.value.wallet.vault,100000);
  clock+=86400+3600;
  const holdSettle=await settle('test-owner');
  assert.ok(holdSettle.journal.entries.some(e=>e.accountCode==='pending:holding:test-owner:GM'));
  const claimed=await step('/api/vault/claim',null,{operationId:'test:holder:claim'},'test-owner');
  assert.ok(claimed.output.value.gm_cents>0);
  assert.equal(claimed.journal.changed,true);

  // Reopen durable fixture to emulate a server-engine restart; same requestId cannot double-pay.
  const prior=snap();
  db.close();db=null;launch();
  assert.equal(requireGameSupply(snap()),true);
  const replay=await engine.handle('/api/daily/claim','POST','test-player',{body:{operationId:dailyId}},null);
  assert.equal(replay.status,200);
  assert.equal(projectGameTransition(prior,snap(),'test:after:restart').changed,false);
});
