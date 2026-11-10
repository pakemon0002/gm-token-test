import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';

const BOT='123:upgrade-test';
const id='740001';
const op=()=>crypto.randomUUID();
function initData() {
 const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id:Number(id),username:'upgradetester'})});
 const data=[...p].map(([k,v])=>k+'='+v).sort().join('\n');
 const secret=crypto.createHmac('sha256','WebAppData').update(BOT).digest();
 p.set('hash',crypto.createHmac('sha256',secret).update(data).digest('hex'));
 return p.toString();
}
test('mining upgrades: atomic purchase, idempotency, sequential levels, no XP overwrite',async t=>{
 const temp=mkdtempSync(join(tmpdir(),'gm-upgrades-')),dbPath=join(temp,'gm.sqlite');
 const port=37000+Math.floor(Math.random()*1000),base='http://127.0.0.1:'+port;
 const env={...process.env,BOT_TOKEN:BOT,PORT:String(port),DB_PATH:dbPath,GM_MINING_FAST_TRACK:'0',GM_ADMIN_TEST_GRANTS:'0',GM_UPGRADE_PAYMENT_MODE:'virtual_test'};
 const server=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{cwd:new URL('..',import.meta.url).pathname,env,stdio:'ignore'});
 t.after(()=>{server.kill();rmSync(temp,{recursive:true,force:true})});
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,50))}
 assert.equal(ready,true,'server starts');
 async function request(path,method='GET',body) {
  const res=await fetch(base+path,{method,headers:{Authorization:'tma '+initData(),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  return {status:res.status,body:await res.json()};
 }
 assert.equal((await request('/api/bootstrap')).status,200);
 const before=await request('/api/game/status');
 assert.equal(before.body.mining.upgrade.level,1);
 const rateBefore=before.body.mining.rate_cents_day;
 const list=await request('/api/mining/upgrades');
 assert.equal(list.status,200);
 assert.equal(list.body.levels.length,200);
 assert.equal(list.body.upgrade.next_cost_gm,150);
 assert.equal((await request('/api/mining/upgrade','POST',{operationId:op(),level:2})).status,400,'insufficient GM rejected');
 const db=new DatabaseSync(dbPath);
 db.exec('PRAGMA busy_timeout=3000');
 db.prepare('UPDATE wallets SET gm=gm+? WHERE user_id=?').run(20000,id);
 db.prepare("UPDATE pools SET gm=gm-? WHERE name='TREASURY'").run(20000);
 assert.equal((await request('/api/mining/upgrade','POST',{operationId:op(),level:3})).status,400,'skipping level rejected');
 const operationId=op();
 const upgraded=await request('/api/mining/upgrade','POST',{operationId,level:2});
 assert.equal(upgraded.status,200,JSON.stringify(upgraded.body));
 assert.equal(upgraded.body.upgrade.level,2);
 assert.equal(upgraded.body.wallet.gm,5000);
 const retried=await request('/api/mining/upgrade','POST',{operationId,level:2});
 assert.equal(retried.status,200);
 assert.equal(retried.body.wallet.gm,5000,'replay never charges again');
 assert.equal((await request('/api/mining/upgrade','POST',{operationId:op(),level:2})).status,400,'new request cannot rebuy level');
 assert.equal((await request('/api/mining/upgrade','POST',{operationId:op(),level:3})).status,400,'next level requires 200 GM');
 const after=await request('/api/game/status');
 assert.equal(after.body.mining.upgrade.level,2);
 assert.equal(after.body.mining.upgrade.next_cost_gm,200);
 assert.equal(after.body.mining.upgrade.bonus_pct,0.1);
 assert.ok(after.body.mining.rate_cents_day>rateBefore);
 assert.equal(after.body.user.level,before.body.user.level,'account XP level remains untouched');
 assert.equal(after.body.user.xp,before.body.user.xp,'XP remains untouched');
 assert.equal(db.prepare("SELECT COUNT(*) AS n FROM journal WHERE kind='mining_upgrade'").get().n,1);
 db.close();
});
