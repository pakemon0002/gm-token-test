import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {totp} from '../server/lib.mjs';
const TOKEN='123:test-only-gm',SECRET='JBSWY3DPEHPK3PXP',operationId=()=>crypto.randomUUID();
function auth(id){const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id,username:'player'+id})});const data=[...p].map(([k,v])=>`${k}=${v}`).sort().join('\n'),key=crypto.createHmac('sha256','WebAppData').update(TOKEN).digest();p.set('hash',crypto.createHmac('sha256',key).update(data).digest('hex'));return p.toString()}
test('POINTS are earned from executed volume and one guaranteed GM Box consumes the right points and finite fund',async t=>{
 const tmp=mkdtempSync(join(tmpdir(),'gm-boxes-')),port=28000+Math.floor(Math.random()*1000),base=`http://127.0.0.1:${port}`;
 const env={...process.env,PORT:String(port),DB_PATH:join(tmp,'db.sqlite'),BOT_TOKEN:TOKEN,OWNER_TELEGRAM_IDS:'101001,101002',OWNER_TOTP_SECRETS:JSON.stringify({'101001':SECRET}),AUCTION_DURATION_SECONDS:'1',BOX_REWARDS_GM_JSON:'{"bronze":15,"silver":45,"gold":105}',POINTS_PAIR_DAILY_GM_CAP:'300000'};
 const proc=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{cwd:new URL('..',import.meta.url).pathname,env,stdio:['ignore','ignore','pipe']});t.after(()=>{proc.kill();rmSync(tmp,{recursive:true,force:true})});
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,40))}
 async function call(id,path,body){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:'tma '+auth(id),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()}}
 for(const id of [101001,101002,303003,404004])assert.equal((await call(id,'/api/bootstrap')).status,200);
 const linkedTicket=(await call(303003,'/api/tickets',{category:'Баланс GM/CR',body:'Ошибка начисления, требуется проверка баланса GM'})).data.ticket;
 const correction=await call(101001,'/api/admin/correction',{userId:'303003',sourcePool:'TREASURY',currency:'GM',amount:'300000',direction:'credit',ticket:linkedTicket,reason:'Тестовая передача из резервного фонда',code:totp(SECRET),operationId:operationId()});assert.equal(correction.status,200,JSON.stringify(correction.data));
 const bid=await call(404004,'/api/exchange/order',{type:'limit',side:'buy',amount:'300000',price:'0.01',duration:'24h',operationId:operationId()});assert.equal(bid.status,200,JSON.stringify(bid.data));
 const ask=await call(303003,'/api/exchange/order',{type:'limit',side:'sell',amount:'300000',price:'0.01',duration:'24h',operationId:operationId()});assert.equal(ask.status,200,JSON.stringify(ask.data));
 await new Promise(r=>setTimeout(r,1200));await call(303003,'/api/exchange/book');
 const status=await call(404004,'/api/game/status');assert.equal(status.status,200,JSON.stringify(status.data));assert.equal(status.data.points.points,300,'10 pts for each 10k GM, 300k GM => 300 points');
 const bronze=await call(404004,'/api/boxes/open',{kind:'bronze',operationId:operationId()});assert.equal(bronze.status,200,JSON.stringify(bronze.data));assert.equal(bronze.data.gm_cents,1500);const after=await call(404004,'/api/game/status');assert.equal(after.data.points.points,0);
 const second=await call(404004,'/api/boxes/open',{kind:'bronze',operationId:operationId()});assert.equal(second.status,400);
 const audit=await call(101001,'/api/admin/supply-audit');assert.equal(audit.data.ok,true,JSON.stringify(audit.data));
});
