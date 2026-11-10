import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';

const BOT='123:genesis-badges-test';
const sign=id=>{
 const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id,username:'genesis'+id})});
 const message=[...p].map(([k,v])=>k+'='+v).sort().join('\n');
 const key=crypto.createHmac('sha256','WebAppData').update(BOT).digest();
 p.set('hash',crypto.createHmac('sha256',key).update(message).digest('hex'));
 return p.toString();
};
test('V2 Genesis: exactly 20 unique first-claim slots, protected skin selection, no GM supply inflation',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'gm-genesis-')),dbPath=join(dir,'data.sqlite');
 const port=53500+Math.floor(Math.random()*800),base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{
  cwd:new URL('..',import.meta.url).pathname,
  env:{...process.env,PORT:String(port),DB_PATH:dbPath,BOT_TOKEN:BOT,GM_MINING_V2:'1',
   GM_TEST_STARTER_FUNDS:'0',GM_MINING_FAST_TRACK:'0',GM_TEST_OPEN_TRADING:'0',
   OWNER_TELEGRAM_IDS:'870011,870012',PUBLIC_APP_URL:'',BOT_WEBHOOK_SECRET:''},
  stdio:['ignore','ignore','pipe']});
 let stderr='';child.stderr.on('data',x=>stderr+=x);
 t.after(()=>{child.kill();rmSync(dir,{recursive:true,force:true})});
 let ready=false;
 for(let n=0;n<100;n++){try{if((await fetch(base+'/api/health')).ok){ready=true;break}}catch{}
  await new Promise(r=>setTimeout(r,45));}
 assert.ok(ready,stderr);
 const call=async(id,path,data)=>{const r=await fetch(base+path,{method:data?'POST':'GET',
  headers:{Authorization:'tma '+sign(id),'Content-Type':'application/json'},
  body:data?JSON.stringify(data):undefined});return {status:r.status,data:await r.json()}};
 const ids=Array.from({length:21},(_,i)=>890000+i);
 for(const id of ids)assert.equal((await call(id,'/api/bootstrap')).status,200);
 const db=new DatabaseSync(dbPath);db.exec('BEGIN IMMEDIATE');
 db.prepare("UPDATE pools SET gm=gm-2100 WHERE name='MINING'").run();
 for(const id of ids)db.prepare('UPDATE mining_state SET pending_cents=100 WHERE user_id=?').run(String(id));
 db.exec('COMMIT');db.close();
 const slots=[];
 for(const id of ids){
  const res=await call(id,'/api/mining/claim',{operationId:crypto.randomUUID()});
  assert.equal(res.status,200,JSON.stringify(res.data));
  slots.push(res.data.genesis_slot);
 }
 assert.deepEqual(slots.slice(0,20),Array.from({length:20},(_,i)=>i+1));
 assert.equal(slots[20],null);
 const first=await call(ids[0],'/api/game/status');
 assert.equal(first.data.cosmetics.slot,1);
 assert.equal(first.data.cosmetics.claimed_slots,20);
 assert.equal((await call(ids[0],'/api/cosmetics/equip',{operationId:crypto.randomUUID(),skin:'genesis_silver'})).status,200);
 assert.equal((await call(ids[20],'/api/cosmetics/equip',{operationId:crypto.randomUUID(),skin:'genesis_silver'})).status,400);
 assert.equal((await call(ids[0],'/api/game/status')).data.cosmetics.coin_skin,'genesis_silver');
 assert.equal((await call(ids[0],'/api/admin/supply-audit')).data.ok,true);
 assert.ok(!/SQLITE_ERROR|ReferenceError/.test(stderr),stderr);
});
