import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {totp} from '../server/lib.mjs';

const BOT='123:bootstrap-recovery',TOTP='JBSWY3DPEHPK3PXP';
function telegramInit(id){
 const params=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id,username:'t'+id})});
 const message=[...params].map(([k,v])=>k+'='+v).sort().join('\n');
 const secret=crypto.createHmac('sha256','WebAppData').update(BOT).digest();
 params.set('hash',crypto.createHmac('sha256',secret).update(message).digest('hex'));
 return params.toString();
}
test('support and Owner POINTS work without prior bootstrap after test database reset',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'gm-auto-bootstrap-')),port=38900+Math.floor(Math.random()*1200),base='http://127.0.0.1:'+port;
 const proc=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{
  cwd:new URL('..',import.meta.url).pathname,
  env:{...process.env,PORT:String(port),DB_PATH:join(dir,'db.sqlite'),BOT_TOKEN:BOT,
   OWNER_TELEGRAM_IDS:'910001,910009',OWNER_TOTP_SECRETS:JSON.stringify({'910001':TOTP}),GM_ADMIN_TEST_GRANTS:'1'},
  stdio:'ignore'
 });
 t.after(()=>{proc.kill();rmSync(dir,{recursive:true,force:true})});
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,50))}
 assert.equal(ready,true,'server starts');
 async function api(id,path,body,header=telegramInit(id)){
  const resp=await fetch(base+path,{method:body?'POST':'GET',headers:{authorization:'tma '+header,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
  return {status:resp.status,result:await resp.json()};
 }
 const ticket=await api(910002,'/api/tickets',{category:'Mining',body:'Support request submitted without a prior bootstrap'});
 assert.equal(ticket.status,201,JSON.stringify(ticket.result));
 assert.equal((await api(910002,'/api/tickets')).result.tickets.length,1);
 const noRole=await api(910002,'/api/admin/points-grant',{recipient:'self',amount:500,reason:'Test unauthorized request should be rejected'});
 assert.equal(noRole.status,403);
 const credit=await api(910001,'/api/admin/points-grant',{
  recipient:'id',userId:'910002',amount:123,reason:'Owner grant after test database reset',
  operationId:crypto.randomUUID(),code:totp(TOTP)
 });
 assert.equal(credit.status,200,JSON.stringify(credit.result));
 assert.equal((await api(910002,'/api/game/status')).result.points.points,123);
 const bad=telegramInit(910003).replace(/hash=[0-9a-f]+/,'hash=000');
 const rejected=await api(910003,'/api/tickets',{category:'Mining',body:'Forged credentials must not bootstrap'},bad);
 assert.notEqual(rejected.status,201);
 const self=await api(910002,'/api/bootstrap');
 assert.equal(self.status,200);
 assert.equal(self.result.user.id,'910002');
});
