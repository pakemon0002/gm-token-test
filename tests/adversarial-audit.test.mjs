import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {totp} from '../server/lib.mjs';
const BOT='123:gm-audit-fixture', OTP='JBSWY3DPEHPK3PXP', op=()=>crypto.randomUUID();
function signed(id){const q=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id,username:'audit'+id})});const data=[...q].map(([k,v])=>`${k}=${v}`).sort().join('\n');const key=crypto.createHmac('sha256','WebAppData').update(BOT).digest();q.set('hash',crypto.createHmac('sha256',key).update(data).digest('hex'));return q.toString()}
async function fixture(t,extra={}){
 const folder=mkdtempSync(join(tmpdir(),'gm-adversary-')),dbPath=join(folder,'app.sqlite'),port=32000+Math.floor(Math.random()*10000),base=`http://127.0.0.1:${port}`;
 const env={...process.env,BOT_TOKEN:BOT,DB_PATH:dbPath,PORT:String(port),OWNER_TELEGRAM_IDS:'111111,222222',OWNER_TOTP_SECRETS:JSON.stringify({111111:OTP}),AUCTION_DURATION_SECONDS:'3600',DAILY_REWARD_GM:'100',...extra};
 let proc; const start=async(e=env)=>{proc=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{cwd:new URL('..',import.meta.url).pathname,env:e,stdio:['ignore','pipe','pipe']});for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,30))}throw Error('server did not start')};
 await start();t.after(()=>{proc?.kill();rmSync(folder,{recursive:true,force:true})});
 const req=async(id,path,method='GET',body)=>{const r=await fetch(base+path,{method,headers:{Authorization:'tma '+signed(id),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()}};
 return {req,dbPath,env,base,start,stop:async()=>{proc.kill();await new Promise(r=>proc.once('exit',r))}};
}
test('Auction cutoff: cancellation cannot skip clearing even before housekeeping',async t=>{
 const f=await fixture(t),a=f.req;for(const x of [111111,333333,444444])assert.equal((await a(x,'/api/bootstrap')).status,200);
 assert.equal((await a(333333,'/api/daily/claim','POST',{operationId:op()})).status,200);
 const buy=(await a(444444,'/api/exchange/order','POST',{type:'limit',side:'buy',amount:'10.00',price:'2.00',operationId:op()})).data.order;
 assert.equal((await a(333333,'/api/exchange/order','POST',{type:'limit',side:'sell',amount:'10.00',price:'2.00',operationId:op()})).status,200);
 const db=new DatabaseSync(f.dbPath);db.prepare("UPDATE game_settings SET v=? WHERE k='auction_end'").run(String(Math.floor(Date.now()/1000)-1));db.close();
 const cancel=await a(444444,'/api/exchange/cancel','POST',{orderId:buy.id,operationId:op()});assert.equal(cancel.status,400,'already filled order cannot be withdrawn after cutoff');
 const tr=(await a(444444,'/api/exchange/trades')).data.trades;assert.equal(tr.length,1,'auction was cleared before handling cancellation');
 assert.equal((await a(111111,'/api/admin/supply-audit')).data.ok,true);
});
test('Expired order cannot be edited after its deadline; locked funds are released',async t=>{
 const f=await fixture(t),a=f.req;for(const x of [111111,333333])await a(x,'/api/bootstrap');
 let db=new DatabaseSync(f.dbPath);db.prepare("UPDATE game_settings SET v=? WHERE k='auction_end'").run(String(Math.floor(Date.now()/1000)-1));db.close();
 await a(333333,'/api/exchange/book');await a(333333,'/api/daily/claim','POST',{operationId:op()});
 const res=await a(333333,'/api/exchange/order','POST',{type:'limit',side:'sell',amount:'10',price:'999.99',duration:'1h',operationId:op()});assert.equal(res.status,200,JSON.stringify(res.data));
 db=new DatabaseSync(f.dbPath);db.prepare('UPDATE orders SET expires_at=? WHERE id=?').run(Math.floor(Date.now()/1000)-1,res.data.order.id);db.close();
 const edit=await a(333333,'/api/exchange/edit','POST',{orderId:res.data.order.id,amount:'10',price:'999',operationId:op()});assert.equal(edit.status,400,'expired order cannot be restored by editing');
 const list=(await a(333333,'/api/exchange/orders')).data.orders;assert.equal(list.find(x=>x.id===res.data.order.id).status,'expired');
 assert.equal((await a(111111,'/api/admin/supply-audit')).data.ok,true);
});
test('Owners 2FA rate limit blocks sixth attempt even with correct code',async t=>{
 const f=await fixture(t),a=f.req;await a(111111,'/api/bootstrap');await a(333333,'/api/bootstrap');
 for(let i=0;i<5;i++)assert.equal((await a(111111,'/api/admin/moderators','POST',{telegramId:'333333',action:'grant',code:'INVALID'})).status,403);
 const sixth=await a(111111,'/api/admin/moderators','POST',{telegramId:'333333',action:'grant',code:totp(OTP)});
 assert.equal(sixth.status,403);assert.match(sixth.data.error,/limited/);
});
test('Owner removed from secure configuration loses administrative access on existing database',async t=>{
 const f=await fixture(t),a=f.req;await a(111111,'/api/bootstrap');assert.equal((await a(111111,'/api/admin/team')).status,200);
 await f.stop();await f.start({...f.env,OWNER_TELEGRAM_IDS:'222222,555555'});
 assert.equal((await a(111111,'/api/admin/team')).status,403);
});
test('Support creation is rate limited to avoid unlimited ticket spam',async t=>{
 const f=await fixture(t),a=f.req;await a(333333,'/api/bootstrap');
 for(let i=0;i<10;i++)assert.equal((await a(333333,'/api/tickets','POST',{category:'Общий вопрос',body:'Подскажите почему у меня нет начисления '+i})).status,201);
 assert.equal((await a(333333,'/api/tickets','POST',{category:'Общий вопрос',body:'Еще одно обращение без ограничения'})).status,400);
});
test('Crossing orders at 0.01 CR are matched despite fragmented CR rounding',async t=>{
 const f=await fixture(t),a=f.req;for(const id of [111111,333333,444444])await a(id,'/api/bootstrap');
 let db=new DatabaseSync(f.dbPath);db.prepare("UPDATE game_settings SET v=? WHERE k='auction_end'").run(String(Math.floor(Date.now()/1000)-1));db.close();await a(444444,'/api/exchange/book');await a(333333,'/api/daily/claim','POST',{operationId:op()});
 assert.equal((await a(444444,'/api/exchange/order','POST',{type:'limit',side:'buy',amount:'20.02',price:'0.01',operationId:op()})).status,200);
 assert.equal((await a(333333,'/api/exchange/order','POST',{type:'limit',side:'sell',amount:'10.01',price:'0.01',operationId:op()})).status,200);
 const tr=(await a(333333,'/api/exchange/trades')).data.trades;assert.equal(tr.length,1,'both orders cross: buyer-side remainder allows execution');assert.equal(tr[0].amount_cents,1001);
 assert.equal((await a(111111,'/api/admin/supply-audit')).data.ok,true);
});
test('XP award does not retroactively raise Mining rate over elapsed hours',async t=>{
 const tasks=JSON.stringify([{id:'daily_milestone',title:'Достижение дня',xp:4400,gm:0,condition:{type:'daily_claim',gte:1}}]);
 const f=await fixture(t,{GAME_TASKS_JSON:tasks}),a=f.req;await a(333333,'/api/bootstrap');
 assert.equal((await a(333333,'/api/daily/claim','POST',{operationId:op()})).status,200);
 const db=new DatabaseSync(f.dbPath);db.prepare('UPDATE mining_state SET last_at=? WHERE user_id=?').run(Math.floor(Date.now()/1000)-4*3600,'333333');db.close();
 assert.equal((await a(333333,'/api/tasks/claim','POST',{id:'daily_milestone',operationId:op()})).status,200);
 const state=(await a(333333,'/api/game/status')).data;
 assert.equal(state.user.level,10);
 assert.ok(state.mining.pending_cents>=160&&state.mining.pending_cents<=175,'past 4h accrual remains at LVL 1 rate; no retroactive Level 10');
 assert.equal((await a(111111,'/api/bootstrap')).status,200);
 assert.equal((await a(111111,'/api/admin/supply-audit')).data.ok,true);
});
test('Concurrent retries with one operationId do not duplicate Vault deposits',async t=>{
 const f=await fixture(t),a=f.req;await a(333333,'/api/bootstrap');await a(111111,'/api/bootstrap');await a(333333,'/api/daily/claim','POST',{operationId:op()});
 const transaction=op();const all=await Promise.all(Array.from({length:18},()=>a(333333,'/api/vault/deposit','POST',{amount:'10',operationId:transaction})));
 assert.ok(all.every(r=>r.status===200),JSON.stringify(all.filter(r=>r.status!==200)));
 const state=(await a(333333,'/api/game/status')).data;
 assert.equal(state.wallet.vault,1000);assert.equal(state.wallet.gm,9000);
 assert.equal((await a(111111,'/api/admin/supply-audit')).data.ok,true);
});
test('Holding Fee Reserve can pay holder rewards if primary holder bucket is exhausted',async t=>{
 const f=await fixture(t,{HOLDING_DAILY_BPS:'50'}),a=f.req;await a(333333,'/api/bootstrap');await a(111111,'/api/bootstrap');
 await a(333333,'/api/daily/claim','POST',{operationId:op()});
 assert.equal((await a(333333,'/api/vault/deposit','POST',{amount:'100',operationId:op()})).status,200);
 assert.equal((await a(333333,'/api/vault/withdraw','POST',{amount:'100',operationId:op()})).status,200);
 assert.equal((await a(333333,'/api/vault/deposit','POST',{amount:'95',operationId:op()})).status,200);
 const db=new DatabaseSync(f.dbPath);const hour=Math.floor(Date.now()/3600000)*3600;
 db.prepare("UPDATE holding_buckets SET gm=0 WHERE name='HOLDER'").run();
 db.prepare("UPDATE game_settings SET v=? WHERE k='holding_last_hour'").run(String(hour-3600));
 db.prepare('UPDATE holding_state SET last_checkpoint=?,partial_micro=0,carry_micro=0 WHERE user_id=?').run(hour-3600,'333333');
 // The fixture changes an internal bucket without transferring the backing funds;
 // this test validates fallback payout, not bucket-to-pool invariant accounting.
 db.close();
 const status=(await a(333333,'/api/game/status')).data;
 assert.ok(status.holding.pending_cents>0,'Holding Fee Reserve should pay a holder when the dedicated reward bucket is empty');
 assert.equal((await a(111111,'/api/admin/supply-audit')).data.ok,true);
});
test('Market BUY at lowest ticks never accepts more than +3% actual slippage',async t=>{
 const f=await fixture(t),a=f.req;for(const x of [333333,444444,555555,111111])await a(x,'/api/bootstrap');
 const db=new DatabaseSync(f.dbPath);db.prepare("UPDATE game_settings SET v=? WHERE k='auction_end'").run(String(Math.floor(Date.now()/1000)-1));db.close();await a(444444,'/api/exchange/book');
 for(const id of [333333,555555])await a(id,'/api/daily/claim','POST',{operationId:op()});
 await a(333333,'/api/exchange/order','POST',{type:'limit',side:'sell',price:'0.01',amount:'10',operationId:op()});
 await a(555555,'/api/exchange/order','POST',{type:'limit',side:'sell',price:'0.02',amount:'10',operationId:op()});
 const result=await a(444444,'/api/exchange/order','POST',{type:'market',side:'buy',amount:'20',operationId:op()});
 assert.equal(result.status,200,JSON.stringify(result.data));assert.equal(result.data.slippage_limit,1,'price max 0.01 CR');
 assert.equal(result.data.filled_gm_cents,1000,'only 10 GM at 0.01 CR should fill, 0.02 is >3%');
 assert.equal((await a(111111,'/api/admin/supply-audit')).data.ok,true);
});
test('Market SELL at lowest ticks never accepts more than -3% actual slippage',async t=>{
 const f=await fixture(t),a=f.req;for(const x of [333333,444444,555555,111111])await a(x,'/api/bootstrap');
 const db=new DatabaseSync(f.dbPath);db.prepare("UPDATE game_settings SET v=? WHERE k='auction_end'").run(String(Math.floor(Date.now()/1000)-1));db.close();await a(444444,'/api/exchange/book');
 await a(333333,'/api/daily/claim','POST',{operationId:op()});
 await a(444444,'/api/exchange/order','POST',{type:'limit',side:'buy',price:'0.02',amount:'10',operationId:op()});
 await a(555555,'/api/exchange/order','POST',{type:'limit',side:'buy',price:'0.01',amount:'10',operationId:op()});
 const result=await a(333333,'/api/exchange/order','POST',{type:'market',side:'sell',amount:'20',operationId:op()});
 assert.equal(result.status,200,JSON.stringify(result.data));assert.equal(result.data.slippage_limit,2,'minimum price 0.02 CR');
 assert.equal(result.data.filled_gm_cents,1000,'only 10 GM at 0.02 should fill, 0.01 is >3%');
 assert.equal((await a(111111,'/api/admin/supply-audit')).data.ok,true);
});
test('Holding achievement uses highest historical Vault, not current balance after withdrawal',async t=>{
 const achievements=JSON.stringify([{id:'vault_100',title:'Накопи 100 GM',xp:25,gm:0,condition:{type:'vault_balance_gm',gte:100}}]);
 const f=await fixture(t,{GAME_ACHIEVEMENTS_JSON:achievements}),a=f.req;await a(333333,'/api/bootstrap');
 await a(333333,'/api/daily/claim','POST',{operationId:op()});
 assert.equal((await a(333333,'/api/vault/deposit','POST',{amount:'100',operationId:op()})).status,200);
 assert.equal((await a(333333,'/api/vault/withdraw','POST',{amount:'100',operationId:op()})).status,200);
 const check=await a(333333,'/api/achievements');assert.equal(check.data.achievements[0].available,true);
 assert.equal((await a(333333,'/api/achievements/claim','POST',{id:'vault_100',operationId:op()})).status,200);
 assert.equal((await a(333333,'/api/achievements/claim','POST',{id:'vault_100',operationId:op()})).status,400);
});
test('Consolidated quote rounding never exceeds reserve across varied partial fills (randomized)',()=>{
 let seed=0x7261B;const rand=(m)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%m};
 for(let trial=0;trial<25000;trial++){
  const qty=1000+rand(250000),limit=1+rand(100000);
  let left=qty,carry=0n,cost=0n,value=0n;
  while(left){const part=Math.min(left,1+rand(Math.max(1,left))),price=1+rand(limit);const raw=BigInt(part)*BigInt(price)+carry;
   cost+=raw/100n;carry=raw%100n;value+=BigInt(part)*BigInt(price);left-=part;
  }
  const locked=(BigInt(qty)*BigInt(limit)+99n)/100n;
  assert.ok(cost<=locked,`reserved balance enough for complete order ${trial}`);
  assert.equal(cost,value/100n,'cumulative rounded quote equals floor of exact executed quote');
 }
});
test('Critical ban is owner-only, appeal remains available, second owner can lift ban',async t=>{
 const secondOtp='JBSWY3DPEHPK3PXS';const f=await fixture(t,{OWNER_TOTP_SECRETS:JSON.stringify({111111:OTP,222222:secondOtp})}),a=f.req;
 for(const x of [111111,222222,333333])await a(x,'/api/bootstrap');
 const modBlocked=await a(333333,'/api/admin/restrictions','POST',{userId:'222222',critical:true,reason:'Critical test'});assert.equal(modBlocked.status,403);
 const ban=await a(111111,'/api/admin/restrictions','POST',{userId:'333333',critical:true,reason:'Подтверждённый критический инцидент на тестовой бирже',code:totp(OTP)});
 assert.equal(ban.status,200,JSON.stringify(ban.data));assert.equal(ban.data.endAt,null);
 assert.ok((await a(333333,'/api/me')).data.restriction,'player can see active restriction reason');
 const trade=await a(333333,'/api/exchange/order','POST',{side:'buy',type:'limit',amount:'10',price:'1',operationId:op()});assert.equal(trade.status,400);
 const appeal=await a(333333,'/api/tickets','POST',{category:'Апелляция',body:'Прошу повторно рассмотреть ситуацию и торговые ограничения'});assert.equal(appeal.status,201);
 const revoke=await a(222222,'/api/admin/restrictions/revoke','POST',{userId:'333333',reason:'После проверки ограничение признано необязательным',code:totp(secondOtp)});
 assert.equal(revoke.status,200,JSON.stringify(revoke.data));assert.equal((await a(333333,'/api/me')).data.restriction,null);
 assert.equal((await a(111111,'/api/admin/supply-audit')).data.ok,true);
});
