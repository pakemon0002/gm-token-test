import test from 'node:test';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {spawn} from 'node:child_process';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {totp} from '../server/lib.mjs';
const BOT='123456:fake-bot';const TOTP_SECRET='JBSWY3DPEHPK3PXP';
function sign(userId){const params=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id:userId,username:'test_user'})});const data=[...params].map(([k,v])=>k+'='+v).sort().join('\n');const key=crypto.createHmac('sha256','WebAppData').update(BOT).digest();params.set('hash',crypto.createHmac('sha256',key).update(data).digest('hex'));return params.toString()}
test('server serves design, registers 5000 CR once, enforces owner roles and fund invariants',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'gm-token-server-'));const port=18000+Math.floor(Math.random()*1200);const url=`http://127.0.0.1:${port}`;
 const child=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{cwd:new URL('..',import.meta.url).pathname,env:{...process.env,PORT:String(port),DB_PATH:join(dir,'test.sqlite'),BOT_TOKEN:BOT,OWNER_TELEGRAM_IDS:'101001,101002',OWNER_TOTP_SECRETS:JSON.stringify({'101001':TOTP_SECRET,'101002':TOTP_SECRET}),NODE_ENV:'development'},stdio:['ignore','pipe','pipe']});
 t.after(()=>{child.kill();rmSync(dir,{recursive:true,force:true})});
 let ready=false;for(let i=0;i<60;i++){try{const r=await fetch(url+'/api/health');if(r.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,75))}assert.ok(ready,'server starts');
 const ask=(id,path,method='GET',body=null)=>fetch(url+path,{method,headers:{Authorization:'tma '+sign(id),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 assert.equal((await fetch(url+'/')).status,200,'standalone offline preview served');
 assert.equal((await fetch(url+'/assets/icons/dark/transparent/gift.png')).status,200,'original PNG served');
 const u1=await (await ask(101001,'/api/bootstrap')).json();assert.equal(u1.user.role,'owner');assert.equal(u1.wallet.cr,500000);assert.equal(u1.wallet.gm,0);
 const u1again=await (await ask(101001,'/api/bootstrap')).json();assert.equal(u1again.wallet.cr,500000,'welcome award idempotent');
 const u2=await (await ask(101002,'/api/bootstrap')).json();assert.equal(u2.user.role,'coowner');
 const player=await (await ask(202003,'/api/bootstrap')).json();assert.equal(player.user.role,'player');assert.equal(player.wallet.cr,500000);
 const poolsBefore=await(await fetch(url+'/api/public/pools')).json();
 assert.equal(poolsBefore.pools.find(x=>x.name==='WELCOME').cr,25000000000-1500000);
 assert.equal((await ask(202003,'/api/admin/team')).status,403,'player has no role access');
 const ticket=await(await ask(202003,'/api/tickets','POST',{category:'Общий вопрос',body:'При начислении вчера не появилась награда в истории'})).json();assert.ok(ticket.ticket);
 const a1=await(await ask(202003,`/api/tickets/${ticket.ticket}/auto`,'POST',{})).json();assert.equal(a1.attempts,1);const a2=await(await ask(202003,`/api/tickets/${ticket.ticket}/auto`,'POST',{})).json();assert.equal(a2.attempts,2);assert.equal(a2.escalated,true);
 assert.equal((await ask(202003,`/api/tickets/${ticket.ticket}/auto`,'POST',{})).status,400,'no third auto attempt');
 const mod=await(await ask(101001,`/api/tickets/${ticket.ticket}/claim`,'POST',{})).json();assert.ok(mod.claimed,'owner can take ticket');
 const op=crypto.randomUUID();const transfer=await ask(101001,'/api/admin/transfer','POST',{source:'TREASURY',target:'HOLDING',amount:'100.00',reason:'Дополнительное пополнение игровых наград',code:totp(TOTP_SECRET),operationId:op});assert.equal(transfer.status,200,await transfer.text());
 const poolsAfter=await(await fetch(url+'/api/public/pools')).json();assert.equal(poolsAfter.pools.find(x=>x.name==='TREASURY').gm,poolsBefore.pools.find(x=>x.name==='TREASURY').gm-10000);assert.equal(poolsAfter.pools.find(x=>x.name==='HOLDING').gm,poolsBefore.pools.find(x=>x.name==='HOLDING').gm+10000);
 const sameCode=await ask(101001,'/api/admin/transfer','POST',{source:'TREASURY',target:'MINING',amount:'1.00',reason:'Пополнение пула при тестировании правил',code:totp(TOTP_SECRET),operationId:crypto.randomUUID()});assert.equal(sameCode.status,403,'one-time TOTP cannot be reused');
 const unauthorized=await fetch(url+'/api/bootstrap');assert.equal(unauthorized.status,400,'unsigned requests rejected');
});
