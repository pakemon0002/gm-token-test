import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';

const BOT='123:gm-upgrade-v2';
const sign=id=>{
 const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id,username:'user'+id})});
 const str=[...p].map(([k,v])=>k+'='+v).sort().join('\n');
 const secret=crypto.createHmac('sha256','WebAppData').update(BOT).digest();
 p.set('hash',crypto.createHmac('sha256',secret).update(str).digest('hex'));
 return p.toString();
};
test('V2: upgrades are sequential, atomic, idempotent, do not affect XP or circulating supply',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'gm-upgrades-v2-')),dbPath=join(dir,'db.sqlite');
 const port=52000+Math.floor(Math.random()*800),base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{
  cwd:new URL('..',import.meta.url).pathname,stdio:['ignore','ignore','pipe'],
  env:{...process.env,PORT:String(port),DB_PATH:dbPath,BOT_TOKEN:BOT,GM_MINING_V2:'1',
   GM_TEST_STARTER_FUNDS:'0',GM_ENABLE_REWARDS:'0',GM_MINING_FAST_TRACK:'0',
   GM_PRIVATE_TEST_ECONOMY:'0',GM_TEST_OPEN_TRADING:'0',
   OWNER_TELEGRAM_IDS:'870011,870012',PUBLIC_APP_URL:'',BOT_WEBHOOK_SECRET:''}
 });
 let stderr='';child.stderr.on('data',d=>stderr+=d);
 t.after(()=>{child.kill();rmSync(dir,{recursive:true,force:true})});
 let ready=false;
 for(let i=0;i<120;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break}}catch{}
  await new Promise(resolve=>setTimeout(resolve,35));}
 assert.ok(ready,stderr);
 const id=870011;
 const call=async(path,body)=>{const r=await fetch(base+path,{method:body?'POST':'GET',
  headers:{Authorization:'tma '+sign(id),'Content-Type':'application/json'},
  body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()}};
 assert.equal((await call('/api/bootstrap')).status,200,stderr);
 // Controlled test-only reserve transfer (not a public grant endpoint).
 const db=new DatabaseSync(dbPath);
 db.exec('BEGIN IMMEDIATE');
 db.prepare("UPDATE pools SET gm=gm-20000 WHERE name='TREASURY'").run();
 db.prepare('UPDATE wallets SET gm=gm+20000 WHERE user_id=?').run(String(id));
 db.exec('COMMIT');db.close();
 const before=await call('/api/game/status');
 assert.equal(before.data.mining.upgrade_level,1);
 assert.equal(before.data.mining.rate_cents_day,1000);
 assert.equal(before.data.league.current.id,'bronze');
 assert.equal(before.data.config.mining_upgrade_enabled,true);
 const operationId=crypto.randomUUID();
 const first=await call('/api/mining/upgrade',{operationId,toLevel:2});
 assert.equal(first.status,200,JSON.stringify(first.data));
 assert.equal(first.data.paid_gm_cents,15000);
 assert.equal(first.data.upgrade_level,2);
 const repeated=await call('/api/mining/upgrade',{operationId,toLevel:2});
 assert.equal(repeated.status,200);
 assert.deepEqual(first.data,repeated.data);
 assert.equal((await call('/api/mining/upgrade',{operationId:crypto.randomUUID(),toLevel:4})).status,400);
 assert.equal((await call('/api/mining/upgrade',{operationId:crypto.randomUUID(),toLevel:201})).status,400);
 const status=await call('/api/game/status');
 assert.equal(status.data.mining.upgrade_level,2);
 assert.equal(status.data.mining.bonus_pct,10);
 assert.equal(status.data.mining.next_cost_gm,200);
 assert.equal(status.data.mining.rate_cents_day,1100);
 assert.equal(status.data.user.level,1);
 assert.equal(status.data.wallet.gm,5000);
 assert.equal((await call('/api/admin/supply-audit')).data.ok,true);
 assert.ok(!/SQLITE_ERROR|ReferenceError/.test(stderr),stderr);
});
