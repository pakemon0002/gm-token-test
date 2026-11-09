import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
const BOT='123:gm-boosted-mining-test';
const sign=id=>{
 const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id,username:'player'+id})});
 const data=[...p].map(([k,v])=>k+'='+v).sort().join('\n');
 const key=crypto.createHmac('sha256','WebAppData').update(BOT).digest();
 p.set('hash',crypto.createHmac('sha256',key).update(data).digest('hex'));
 return p.toString();
};
test('500 GM/day Mining uses existing pool, 24h storage and idempotent claim; Daily and Boxes have approved reserves',async t=>{
 const folder=mkdtempSync(join(tmpdir(),'gm-premium-v8-'));
 const dbPath=join(folder,'premium.sqlite'),port=51000+Math.floor(Math.random()*1000);
 const base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{
  cwd:new URL('..',import.meta.url).pathname,
  env:{...process.env,PORT:String(port),DB_PATH:dbPath,BOT_TOKEN:BOT,
   PUBLIC_APP_URL:'',BOT_WEBHOOK_SECRET:'',BOT_POLLING:'0',
   OWNER_TELEGRAM_IDS:'870001,870002',OWNER_TOTP_SECRETS:'{}',
   GM_TEST_STARTER_FUNDS:'0',GM_TEST_OPEN_TRADING:'0',
   GM_MINING_FAST_TRACK:'1',GM_ENABLE_REWARDS:'1',GM_TASKS_ENABLED:'1',
   DAILY_REWARD_GM:'10',BOX_REWARDS_GM_JSON:'{"bronze":15,"silver":45,"gold":105}'},
  stdio:['ignore','ignore','pipe']
 });
 let stderr='';child.stderr.on('data',x=>stderr+=String(x));
 t.after(()=>{child.kill();rmSync(folder,{recursive:true,force:true})});
 let ready=false;
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break}}catch{}
  await new Promise(resolve=>setTimeout(resolve,45));
 }
 assert.ok(ready,'server did not start '+stderr);
 async function call(id,path,body){
  const res=await fetch(base+path,{method:body?'POST':'GET',
   headers:{Authorization:'tma '+sign(id),'Content-Type':'application/json'},
   body:body?JSON.stringify(body):undefined});
  return {status:res.status,data:await res.json()};
 }
 const u=870001;
 assert.equal((await call(u,'/api/bootstrap')).status,200);
 const initial=await call(u,'/api/game/status');
 assert.equal(initial.status,200);
 assert.equal(initial.data.mining.rate_cents_day,50000);
 assert.equal(initial.data.config.daily_enabled,true);
 assert.equal(initial.data.config.daily_reward_gm,10);
 assert.equal(initial.data.config.boxes_enabled,true);
 assert.deepEqual(initial.data.config.box_rewards,{bronze:15,silver:45,gold:105});
 const tasks=await call(u,'/api/tasks');
 assert.ok(tasks.data.tasks.length>=5);
 const daily=await call(u,'/api/daily/claim',{operationId:crypto.randomUUID()});
 assert.equal(daily.status,200,JSON.stringify(daily.data));
 assert.equal(daily.data.gm_cents,1000);
 const repeat=await call(u,'/api/daily/claim',{operationId:crypto.randomUUID()});
 assert.equal(repeat.status,400,'daily is once per UTC day');
 // Simulate passage of one full day in the private test database only.
 const db=new DatabaseSync(dbPath);
 db.prepare('UPDATE mining_state SET last_at=? WHERE user_id=?').run(Math.floor(Date.now()/1000)-86400,String(u));
 db.close();
 const mining=await call(u,'/api/game/status');
 assert.equal(mining.status,200,JSON.stringify(mining.data));
 assert.ok(mining.data.mining.pending_cents>=49900&&mining.data.mining.pending_cents<=50000,
  'new level one miner collects almost 500 GM in 24 hours, subject to floor rounding');
 const collect=await call(u,'/api/mining/claim',{operationId:crypto.randomUUID()});
 assert.equal(collect.status,200,JSON.stringify(collect.data));
 assert.ok(collect.data.gm_cents>=49900);
 const again=await call(u,'/api/mining/claim',{operationId:crypto.randomUUID()});
 assert.equal(again.status,400);
 const audit=await call(u,'/api/admin/supply-audit');
 assert.equal(audit.status,200);
 assert.equal(audit.data.ok,true,'total fixed GM/CR supply remains unchanged');
});
