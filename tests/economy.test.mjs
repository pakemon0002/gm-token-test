import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {totp} from '../server/lib.mjs';
const TOKEN='123:gm-token-test',SECRET='JBSWY3DPEHPK3PXP';
function sign(id,start){const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id,username:`user${id}`})});if(start)p.set('start_param',start);const s=[...p].map(([k,v])=>`${k}=${v}`).sort().join('\n'),k=crypto.createHmac('sha256','WebAppData').update(TOKEN).digest();p.set('hash',crypto.createHmac('sha256',k).update(s).digest('hex'));return p.toString()}
const op=()=>crypto.randomUUID();
test('e2e: transfers, auction fills, fees, points, partial cancellation, 3% market guard, vault and idempotency',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'gm-economy-')),port=21000+Math.floor(Math.random()*2000),base=`http://127.0.0.1:${port}`;
 const env={...process.env,PORT:String(port),DB_PATH:join(dir,'db.sqlite'),BOT_TOKEN:TOKEN,OWNER_TELEGRAM_IDS:'101001,101002',OWNER_TOTP_SECRETS:JSON.stringify({'101001':SECRET,'101002':SECRET}),AUCTION_DURATION_SECONDS:'2',DAILY_REWARD_GM:'10',HOLDING_DAILY_BPS:'10',BOX_REWARDS_GM_JSON:'{"bronze":15,"silver":45,"gold":105}',SHOP_RATE_MODE:'median95',SHOP_MIN_TRADES:'1',SHOP_MIN_VOLUME_GM:'1'};
 const ps=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{cwd:new URL('..',import.meta.url).pathname,env,stdio:['ignore','pipe','pipe']});let stderr='';ps.stderr.on('data',x=>stderr+=x);
 t.after(()=>{ps.kill();rmSync(dir,{recursive:true,force:true})});for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,30))};
 async function ask(id,path,method='GET',body){const r=await fetch(base+path,{method,headers:{Authorization:'tma '+sign(id),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});let v=await r.json();return {r,v,status:r.status}}
 const owner=101001,seller=303003,buyer=404004;
 for(const id of [owner,101002,seller,buyer,505005,606006])assert.equal((await ask(id,'/api/bootstrap')).status,200,stderr);
 const linkedTicket=(await ask(seller,'/api/tickets','POST',{category:'Баланс GM/CR',body:'Ошибка баланса игрока, требуется сверка начисления'})).v.ticket;
 const credit=await ask(owner,'/api/admin/correction','POST',{userId:String(seller),sourcePool:'TREASURY',currency:'GM',amount:'1000',direction:'credit',ticket:linkedTicket,reason:'Тестовый перевод из фонда с аудитом',operationId:op(),code:totp(SECRET)});assert.equal(credit.status,200,JSON.stringify(credit.v));
 const deposit=await ask(seller,'/api/vault/deposit','POST',{amount:'100',operationId:op()});assert.equal(deposit.status,200,JSON.stringify(deposit.v));assert.equal(deposit.v.wallet.vault,10000);
 const withdrawal=await ask(seller,'/api/vault/withdraw','POST',{amount:'100',operationId:op()});assert.equal(withdrawal.status,200,JSON.stringify(withdrawal.v));assert.equal(withdrawal.v.received_cents,9500);assert.equal((await ask(seller,'/api/vault/withdraw','POST',{amount:'10',operationId:op()})).status,400);
 const dailyID=op(),daily=await ask(buyer,'/api/daily/claim','POST',{operationId:dailyID});assert.equal(daily.status,200,JSON.stringify(daily.v));const again=await ask(buyer,'/api/daily/claim','POST',{operationId:dailyID});assert.equal(again.status,200);assert.deepEqual(again.v,daily.v);
 // Buyer has 5000 CR, enough for 100 GM at 12 CR each.
 const bid=await ask(buyer,'/api/exchange/order','POST',{type:'limit',side:'buy',amount:'100',price:'12',duration:'24h',operationId:op()});assert.equal(bid.status,200,JSON.stringify(bid.v));assert.equal(bid.v.auction,true);
 const askOrder=await ask(seller,'/api/exchange/order','POST',{type:'limit',side:'sell',amount:'100',price:'12',duration:'24h',operationId:op()});assert.equal(askOrder.status,200,JSON.stringify(askOrder.v));
 await new Promise(r=>setTimeout(r,2100));const book=await ask(buyer,'/api/exchange/book');assert.equal(book.status,200,JSON.stringify(book.v));assert.equal(book.v.auction_done,true);const trades=await ask(buyer,'/api/exchange/trades');assert.equal(trades.v.trades.length,1,JSON.stringify(trades.v));assert.equal(trades.v.trades[0].price,1200);
 const bstatus=(await ask(buyer,'/api/me')).v;assert.equal(bstatus.wallet.gm,10950,'100 GM gross -0.5 GM fee +10 daily');assert.equal(bstatus.wallet.cr,380000,'5000 -1200 CR');
 const sstatus=(await ask(seller,'/api/me')).v;assert.equal(sstatus.wallet.cr,619400,'5000 welcome CR +1200 -6 CR fee');
 const status=await ask(seller,'/api/game/status');assert.equal(status.status,200,JSON.stringify(status.v));
 // Trustworthy GM Shop needs at least four distinct executed-trade participants.
 // Bootstrap two additional legitimate sellers and let each earn a daily GM reward.
 for(const id of [505005,606006]){
  assert.equal((await ask(id,'/api/daily/claim','POST',{operationId:op()})).status,200);
  const bid2=await ask(buyer,'/api/exchange/order','POST',{type:'limit',side:'buy',amount:'10',price:'12',duration:'24h',operationId:op()});
  assert.equal(bid2.status,200,JSON.stringify(bid2.v));
  const sell2=await ask(id,'/api/exchange/order','POST',{type:'limit',side:'sell',amount:'10',price:'12',duration:'24h',operationId:op()});
  assert.equal(sell2.status,200,JSON.stringify(sell2.v));
 }
 const shop=await ask(buyer,'/api/shop/quote?amount=2');assert.equal(shop.status,200,JSON.stringify(shop.v));assert.equal(shop.v.fee_gm_cents,2);assert.equal(shop.v.cr_cents,2257,'2GM -> 1.98 GM * 12 CR * .95 => 22.57 CR');
 const shopBuy=await ask(buyer,'/api/shop/exchange','POST',{amount:'2',minCrCents:shop.v.cr_cents,quoteExpiresAt:shop.v.quote_expires_at,operationId:op()});assert.equal(shopBuy.status,200,JSON.stringify(shopBuy.v));
 const mktOffer=await ask(seller,'/api/exchange/order','POST',{type:'limit',side:'sell',amount:'20',price:'20',duration:'24h',operationId:op()});assert.equal(mktOffer.status,200,JSON.stringify(mktOffer.v));
 const market=await ask(buyer,'/api/exchange/order','POST',{type:'market',side:'buy',amount:'10',duration:'24h',operationId:op()});assert.equal(market.status,200,JSON.stringify(market.v));assert.equal(market.v.filled_gm_cents,1000);assert.equal(market.v.order.remaining_cents,0);
 const rest=await ask(seller,'/api/exchange/orders');const active=rest.v.orders.find(x=>x.id===mktOffer.v.order.id);assert.equal(active.remaining_cents,1000);const cancel=await ask(seller,'/api/exchange/cancel','POST',{orderId:active.id,operationId:op()});assert.equal(cancel.status,200,JSON.stringify(cancel.v));assert.equal((await ask(seller,'/api/exchange/orders')).v.orders.find(x=>x.id===active.id).locked_cents,0);
 const pools=(await fetch(base+'/api/public/pools').then(r=>r.json())).pools;
 const gmPool=pools.reduce((s,x)=>s+x.gm,0),crPool=pools.reduce((s,x)=>s+x.cr,0);
 // Pending mining/holding rewards and locked orders are tracked separately; tiny initial underflow catches bugs.
 const audit=await ask(owner,'/api/admin/supply-audit');assert.equal(audit.status,200,JSON.stringify(audit.v));assert.equal(audit.v.ok,true,JSON.stringify(audit.v));assert.equal(audit.v.gm_cents,15000000000);assert.equal(audit.v.cr_cents,100000000000);
 assert.ok(gmPool>=0&&crPool>=0);assert.ok(!/request failure|Error:|SQLITE_ERROR/.test(stderr),stderr);
});
