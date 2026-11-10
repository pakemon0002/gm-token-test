import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {totp} from '../server/lib.mjs';
const BOT='123456:test-gm-redesign',OTP='JBSWY3DPEHPK3PXP';
function sign(id){
 const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id,username:'qa'+id})});
 const source=[...p].map(([k,v])=>k+'='+v).sort().join('\n');
 const secret=crypto.createHmac('sha256','WebAppData').update(BOT).digest();
 p.set('hash',crypto.createHmac('sha256',secret).update(source).digest('hex'));
 return p.toString();
}
test('redesign: block game-GM upgrades; grant test POINTS only to owner with 2FA; reserve Pioneer serial',async t=>{
 const tmp=mkdtempSync(join(tmpdir(),'gm-ui-qa-')),port=39000+Math.floor(Math.random()*1000);
 const env={...process.env,PORT:String(port),DB_PATH:join(tmp,'test.sqlite'),BOT_TOKEN:BOT,
  GM_ADMIN_TEST_GRANTS:'1',GM_PRIVATE_TEST_UPGRADES:'0',OWNER_TELEGRAM_IDS:'101001,101002',
  OWNER_TOTP_SECRETS:JSON.stringify({'101001':OTP,'101002':OTP})};
 const proc=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{cwd:new URL('..',import.meta.url).pathname,env,stdio:'ignore'});
 t.after(()=>{proc.kill();rmSync(tmp,{recursive:true,force:true})});
 const base='http://127.0.0.1:'+port;let ready=false;
 for(let i=0;i<90;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,50))}
 assert.equal(ready,true,'server ready');
 async function call(id,path,method='GET',data){
  const res=await fetch(base+path,{method,headers:{Authorization:'tma '+sign(id),'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});
  return {status:res.status,data:await res.json()};
 }
 assert.equal((await call(101001,'/api/bootstrap')).status,200);
 assert.equal((await call(202002,'/api/bootstrap')).status,200);
 const status=await call(202002,'/api/game/status');
 assert.equal(status.data.user.pioneer_rank,2);
 assert.equal(status.data.mining.upgrade.level,1);
 const upgrade=await call(202002,'/api/mining/upgrade','POST',{operationId:crypto.randomUUID(),level:2});
 assert.equal(upgrade.status,400,'real wallet verification is required, not in-game funds');
 assert.match(upgrade.data.error,/External GM wallet verification required/);
 const after=await call(202002,'/api/game/status');
 assert.equal(after.data.wallet.gm,status.data.wallet.gm,'no debit');
 assert.equal(after.data.mining.upgrade.level,1);
 assert.equal((await call(202002,'/api/admin/points/grant','POST',{userId:'202002',points:100,reason:'Тестовый запрос на начисление игровой валюты',code:'000000',operationId:crypto.randomUUID()})).status,403);
 const operationId=crypto.randomUUID();
 const request={userId:'202002',points:1000,reason:'Тестирование работы боксов после обновления',code:totp(OTP),operationId};
 const first=await call(101001,'/api/admin/points/grant','POST',request);
 assert.equal(first.status,200,JSON.stringify(first.data));
 assert.equal(first.data.points,1000);
 const replay=await call(101001,'/api/admin/points/grant','POST',request);
 assert.equal(replay.status,200,JSON.stringify(replay.data));
 assert.equal(replay.data.duplicate,true);
 const state=await call(202002,'/api/game/status');
 assert.equal(state.data.points.points,1000,'no double payment');
});
