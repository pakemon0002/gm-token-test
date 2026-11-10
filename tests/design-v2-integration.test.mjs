import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import crypto from 'node:crypto';
import {totp} from '../server/lib.mjs';

const BOT='12345:design-v2',SECRET='JBSWY3DPEHPK3PXP';
function initData(id){
 const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id,username:'test'+id})});
 const text=[...p].map(([k,v])=>k+'='+v).sort().join('\n');
 const key=crypto.createHmac('sha256','WebAppData').update(BOT).digest();
 p.set('hash',crypto.createHmac('sha256',key).update(text).digest('hex'));
 return p.toString();
}
test('v2: unique founder frames, XP league, safe wallet pending mode and audited POINTS grants',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'gm-v2-')),port=42000+Math.floor(Math.random()*1200),url='http://127.0.0.1:'+port;
 const env={...process.env,BOT_TOKEN:BOT,PORT:String(port),DB_PATH:join(dir,'test.sqlite'),
  OWNER_TELEGRAM_IDS:'810001,810009',OWNER_TOTP_SECRETS:JSON.stringify({'810001':SECRET}),
  GM_ADMIN_TEST_GRANTS:'1',GM_UPGRADE_PAYMENT_MODE:'wallet_pending'};
 const child=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{cwd:new URL('..',import.meta.url).pathname,env,stdio:'ignore'});
 t.after(()=>{child.kill();rmSync(dir,{recursive:true,force:true})});
 let ready=false;
 for(let i=0;i<100;i++){try{if((await fetch(url+'/api/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,50))}
 assert.equal(ready,true);
 const request=async(id,path,method='GET',data)=>{
  const response=await fetch(url+path,{method,headers:{Authorization:'tma '+initData(id),'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});
  return {status:response.status,body:await response.json()};
 };
 assert.equal((await request(810001,'/api/bootstrap')).status,200);
 assert.equal((await request(810002,'/api/bootstrap')).status,200);
 const a=(await request(810001,'/api/game/status')).body;
 const b=(await request(810002,'/api/game/status')).body;
 assert.equal(a.cosmetics.founder_slot,1);
 assert.equal(b.cosmetics.founder_slot,2);
 assert.equal(a.cosmetics.frames.filter(x=>x.claimed&&x.category==='founder').length,1);
 assert.equal(b.cosmetics.frames.filter(x=>x.claimed&&x.category==='founder').length,1);
 assert.equal(a.cosmetics.frames.filter(x=>x.category==='founder').length,20);
 assert.equal(a.league.name,'Bronze');
 assert.equal(a.leagues.length,10);
 assert.equal(b.points.points,0);
 const denied=await request(810002,'/api/admin/points-grant','POST',{recipient:'self',amount:100});
 assert.equal(denied.status,403,'player cannot grant POINTS');
 const grant=await request(810001,'/api/admin/points-grant','POST',{
  recipient:'id',userId:'810002',amount:250,reason:'Manual GM TOKEN test points validation',
  operationId:crypto.randomUUID(),code:totp(SECRET)
 });
 assert.equal(grant.status,200,JSON.stringify(grant.body));
 assert.equal(grant.body.points,250);
 assert.equal((await request(810002,'/api/game/status')).body.points.points,250);
 const forbidden=await request(810002,'/api/mining/upgrade','POST',{level:2,operationId:crypto.randomUUID()});
 assert.equal(forbidden.status,400);
 assert.match(String(forbidden.body.error),/wallet-backed upgrades/);
 assert.equal((await request(810002,'/api/game/status')).body.mining.upgrade.level,1);
 const manifest=await fetch(url+'/tonconnect-manifest.json');
 assert.equal(manifest.status,200);
 assert.equal(manifest.headers.get('access-control-allow-origin'),'*');
 assert.equal((await manifest.json()).name,'GM TOKEN — Test Mini App');
});
