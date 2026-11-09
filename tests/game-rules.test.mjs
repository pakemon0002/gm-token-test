import test from 'node:test';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {spawn} from 'node:child_process';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {DatabaseSync} from 'node:sqlite';import {totp} from '../server/lib.mjs';
const BOT='123:games',OTP='JBSWY3DPEHPK3PXP';const op=()=>crypto.randomUUID();
function init(id,ref=null){const f=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id,username:'test'+id})});if(ref)f.set('start_param',`ref_${ref}`);const msg=[...f].map(([k,v])=>`${k}=${v}`).sort().join('\n'),sec=crypto.createHmac('sha256','WebAppData').update(BOT).digest();f.set('hash',crypto.createHmac('sha256',sec).update(msg).digest('hex'));return f.toString()}
test('game: referral from signed initData, XP tasks, mining accrual, Holding elapsed time, supply invariants',async t=>{
 const tmp=mkdtempSync(join(tmpdir(),'gm-games-')),dbPath=join(tmp,'db.sqlite'),port=24000+Math.floor(Math.random()*1000),root=new URL('..',import.meta.url).pathname,base=`http://127.0.0.1:${port}`;
 const tasks=[{id:'starter_vault',title:'Первый депозит в Vault',xp:25,gm:0,condition:{type:'vault_balance_gm',gte:1}}];
 const env={...process.env,PORT:String(port),DB_PATH:dbPath,BOT_TOKEN:BOT,OWNER_TELEGRAM_IDS:'101001,101002',OWNER_TOTP_SECRETS:JSON.stringify({'101001':OTP}),AUCTION_DURATION_SECONDS:'10',HOLDING_DAILY_BPS:'10',GAME_TASKS_JSON:JSON.stringify(tasks)};
 const proc=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{cwd:root,env,stdio:'ignore'});t.after(()=>{proc.kill();rmSync(tmp,{recursive:true,force:true})});
 for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,50))}
 async function request(id,path,method='GET',body=null,ref){const r=await fetch(base+path,{method,headers:{Authorization:'tma '+init(id,ref),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()}}
 for(const id of [101001,101002,400004])assert.equal((await request(id,'/api/bootstrap')).status,200);
 assert.equal((await request(500005,'/api/bootstrap','GET',null,400004)).status,200);
 assert.equal((await request(500005,'/api/referrals/me')).data.my_referrer,'400004');assert.equal((await request(400004,'/api/referrals/me')).data.referred.length,1);
 const linkedTicket=(await request(500005,'/api/tickets','POST',{category:'Баланс GM/CR',body:'Проверка ошибочного баланса GM после начисления'})).data.ticket;
 const credit=await request(101001,'/api/admin/correction','POST',{userId:'500005',sourcePool:'MINING',currency:'GM',amount:'2000',direction:'credit',reason:'Тестовый перевод с покрытием резерва',ticket:linkedTicket,operationId:op(),code:totp(OTP)});assert.equal(credit.status,200,JSON.stringify(credit.data));
 const before=(await request(500005,'/api/tasks')).data.tasks;assert.equal(before.length,1);assert.equal(before[0].available,false);
 assert.equal((await request(500005,'/api/vault/deposit','POST',{amount:'1500',operationId:op()})).status,200);
 const task=await request(500005,'/api/tasks/claim','POST',{id:'starter_vault',operationId:op()});assert.equal(task.status,200,JSON.stringify(task.data));assert.equal(task.data.xp,25);
 assert.equal((await request(500005,'/api/tasks/claim','POST',{id:'starter_vault',operationId:op()})).status,400);
 // Test-only time travel by moving persisted settlement checkpoints back; no such endpoint exists publicly.
 const db=new DatabaseSync(dbPath);db.exec('PRAGMA busy_timeout=3000');const now=Math.floor(Date.now()/1000);
 db.prepare("UPDATE mining_state SET last_at=? WHERE user_id=?").run(now-4*3600,'500005');
 const s=await request(500005,'/api/game/status');assert.equal(s.status,200,JSON.stringify(s.data));assert.ok(s.data.mining.pending_cents>=100,'hour of mining should earn at least 1 GM');
 const first=await request(500005,'/api/mining/claim','POST',{operationId:op()});assert.equal(first.status,200,JSON.stringify(first.data));assert.equal(first.data.xp,20);
 const second=await request(500005,'/api/mining/claim','POST',{operationId:op()});assert.equal(second.status,400,'no immediate repeated mining Claim');
 const tHour=Math.floor(now/3600)*3600;
 db.prepare('UPDATE game_settings SET v=? WHERE k=?').run(String(tHour-3600),'holding_last_hour');db.prepare('UPDATE holding_state SET last_checkpoint=?,partial_micro=0 WHERE user_id=?').run(tHour-3600,'500005');
 const hold=await request(500005,'/api/game/status');assert.equal(hold.status,200,JSON.stringify(hold.data));assert.ok(hold.data.holding.pending_cents>0,'hourly Holding rate is enabled in test');
 const claim=await request(500005,'/api/vault/claim','POST',{operationId:op()});assert.equal(claim.status,200,JSON.stringify(claim.data));
 const referred=(await request(400004,'/api/me')).data.wallet;assert.ok(referred.gm>0,'referrer credited on actual Holding claim');const referrals=await request(400004,'/api/referrals/me');assert.ok(referrals.data.received_gm_cents>0,'referral earnings visible to inviter');const leaderboard=await request(400004,'/api/leaderboard');assert.equal(leaderboard.data.pending_rule,true,'unapproved leaderboard scoring is not published as official');
 const audit=await request(101001,'/api/admin/supply-audit');assert.equal(audit.data.ok,true,JSON.stringify(audit.data));db.close();
});
test('self-trade rejected, 10 order creations per rolling minute, POINTS require executed trade',async t=>{
 const tmp=mkdtempSync(join(tmpdir(),'gm-book-')),port=25000+Math.floor(Math.random()*1000),base=`http://127.0.0.1:${port}`;
 const env={...process.env,PORT:String(port),DB_PATH:join(tmp,'db.sqlite'),BOT_TOKEN:BOT,AUCTION_DURATION_SECONDS:'1',DAILY_REWARD_GM:'1000',OWNER_TELEGRAM_IDS:'101001,101002'};
 const proc=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{cwd:new URL('..',import.meta.url).pathname,env,stdio:'ignore'});t.after(()=>{proc.kill();rmSync(tmp,{recursive:true,force:true})});for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,50))}
 async function ask(id,path,method='GET',body){const r=await fetch(base+path,{method,headers:{Authorization:'tma '+init(id),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()}}
 await ask(303303,'/api/bootstrap');await ask(303303,'/api/daily/claim','POST',{operationId:op()});
 assert.equal((await ask(303303,'/api/exchange/order','POST',{side:'sell',type:'limit',amount:'20',price:'10',duration:'24h',operationId:op()})).status,200);
 assert.equal((await ask(303303,'/api/exchange/order','POST',{side:'buy',type:'limit',amount:'20',price:'10',duration:'24h',operationId:op()})).status,200);
 await new Promise(r=>setTimeout(r,1100));await ask(303303,'/api/exchange/book');assert.equal((await ask(303303,'/api/exchange/trades')).data.trades.length,0,'same user cannot trade with themselves');assert.equal((await ask(303303,'/api/game/status')).data.points.points,0);
 for(let i=0;i<8;i++)assert.equal((await ask(303303,'/api/exchange/order','POST',{side:'buy',type:'limit',amount:'10',price:'0.01',duration:'24h',operationId:op()})).status,200);
 const reject=await ask(303303,'/api/exchange/order','POST',{side:'buy',type:'limit',amount:'10',price:'0.01',duration:'24h',operationId:op()});assert.equal(reject.status,400,JSON.stringify(reject.data));
 const order=(await ask(303303,'/api/exchange/orders')).data.orders.find(x=>x.status==='open');assert.ok(order);assert.equal((await ask(303303,'/api/exchange/cancel','POST',{orderId:order.id,operationId:op()})).status,200,'cancellation exempt from create/edit rate limit');
});
