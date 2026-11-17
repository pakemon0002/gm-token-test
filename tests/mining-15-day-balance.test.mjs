import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';

const BOT='123:gm-mining-balance-test';
const sign=id=>{
 const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id,username:'balance_test'})});
 const data=[...p].map(([k,v])=>k+'='+v).sort().join('\n');
 const key=crypto.createHmac('sha256','WebAppData').update(BOT).digest();
 p.set('hash',crypto.createHmac('sha256',key).update(data).digest('hex'));
 return p.toString();
};

test('no paid upgrades: 1000 in-game GM after 15 daily Mining claims, not before',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'gm-mining-15d-'));
 const dbPath=join(dir,'game.sqlite'),port=56000+Math.floor(Math.random()*1000),base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{
  cwd:new URL('..',import.meta.url).pathname,
  env:{...process.env,PORT:String(port),DB_PATH:dbPath,BOT_TOKEN:BOT,
   PUBLIC_APP_URL:'',BOT_WEBHOOK_SECRET:'',BOT_POLLING:'0',
   OWNER_TELEGRAM_IDS:'',OWNER_TOTP_SECRETS:'{}',
   GM_TEST_STARTER_FUNDS:'0',GM_ADMIN_TEST_GRANTS:'0',GM_TEST_OPEN_TRADING:'0',
   GM_MINING_FAST_TRACK:'0',GM_UPGRADE_PAYMENT_MODE:'disabled',
   GM_ENABLE_REWARDS:'0',GM_TASKS_ENABLED:'0',DAILY_REWARD_GM:'0'},
  stdio:['ignore','ignore','pipe']
 });
 let stderr='';child.stderr.on('data',x=>stderr+=String(x));
 t.after(()=>{child.kill();rmSync(dir,{recursive:true,force:true})});
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break}}catch{}
  await new Promise(resolve=>setTimeout(resolve,50));}
 assert.ok(ready,'server did not start '+stderr);
 const user=961001;
 async function request(path,body){
  const res=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:'tma '+sign(user),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  return {status:res.status,data:await res.json()};
 }
 assert.equal((await request('/api/bootstrap')).status,200);
 const first=await request('/api/game/status');
 assert.equal(first.status,200);
 assert.equal(first.data.mining.rate_cents_day,6720,'level 1 = 64 base GM * 1.05 free upgrade factor');
 assert.equal(first.data.mining.upgrade.level,1);
 assert.equal(first.data.mining.upgrade.purchasable,false);

 const db=new DatabaseSync(dbPath);db.exec('PRAGMA busy_timeout=3000');
 t.after(()=>db.close());
 const prePool=db.prepare("SELECT gm FROM pools WHERE name='MINING'").get().gm;
 const balances=[];
 for(let d=1;d<=15;d++){
  // Fixture only: simulate 15 separate UTC dates by moving the stored checkpoint back 24h
  // and clearing the per-day XP latch. This never touches production or real wallets.
  const yesterday=Math.floor(Date.now()/1000)-86400;
  db.prepare("UPDATE mining_state SET last_at=?,last_xp_day='' WHERE user_id=?").run(yesterday,String(user));
  const earned=await request('/api/mining/claim',{operationId:crypto.randomUUID()});
  assert.equal(earned.status,200,'day '+d+' '+JSON.stringify(earned.data));
  assert.equal(earned.data.xp,20,'exactly one free XP award per simulated UTC day');
  const state=await request('/api/game/status');
  assert.equal(state.data.mining.upgrade.level,1,'no paid upgrades');
  const walletGM=state.data.wallet.gm/100;
  balances.push(walletGM);
  if(d<15)assert.ok(walletGM<1000,'cannot reach 1000 by day '+d);
 }
 assert.ok(balances[13]>994&&balances[13]<996,'about 994.15 GM by day 14: '+balances[13]);
 assert.ok(balances[14]>=1000&&balances[14]<1100,'about 1070 GM by day 15: '+balances[14]);
 const afterPool=db.prepare("SELECT gm FROM pools WHERE name='MINING'").get().gm;
 assert.equal(prePool-afterPool,Math.round(balances[14]*100),'all credited game GM backed by a debit from the mining pool');
 const final=await request('/api/game/status');
 assert.equal(final.data.user.xp,300);
 assert.equal(final.data.user.level,3);
});
