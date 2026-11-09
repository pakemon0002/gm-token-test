import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const TOKEN='123:gm-token-premarket-test';
function auth(id){const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id,username:'user'+id})});const data=[...p].map(([k,v])=>`${k}=${v}`).sort().join('\n'),key=crypto.createHmac('sha256','WebAppData').update(TOKEN).digest();p.set('hash',crypto.createHmac('sha256',key).update(data).digest('hex'));return p.toString()}
test('real premarket: zero balances and candles, honest indicative quote, actual auction execution and OHLCV',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'gm-premarket-'));
 const port=33000+Math.floor(Math.random()*5000),url=`http://127.0.0.1:${port}`;
 const env={...process.env,BOT_TOKEN:TOKEN,BOT_WEBHOOK_SECRET:'',PUBLIC_APP_URL:'',PORT:String(port),DB_PATH:join(dir,'game.db'),AUCTION_DURATION_SECONDS:'3',GM_PRIVATE_TEST_ECONOMY:'1'};
 const proc=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{cwd:new URL('..',import.meta.url).pathname,env,stdio:['ignore','ignore','pipe']});let stderr='';proc.stderr.on('data',x=>stderr+=String(x));
 t.after(()=>{proc.kill();rmSync(dir,{recursive:true,force:true})});
 let ready=false;for(let i=0;i<110;i++){try{if((await fetch(url+'/api/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,25))}assert.ok(ready,stderr);
 async function call(id,path,body){const response=await fetch(url+path,{method:body?'POST':'GET',headers:{Authorization:'tma '+auth(id),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:response.status,body:await response.json()}}
 const buyer=808001,seller=808002;
 for(const u of [buyer,seller]){
  const reg=await call(u,'/api/bootstrap');assert.equal(reg.status,200,JSON.stringify(reg.body));
  assert.equal(reg.body.wallet.gm,0,'no fictional initial GM');assert.equal(reg.body.wallet.vault,0,'no fictional initial Vault');
  assert.equal(reg.body.wallet.cr,500000,'one-time welcome grant of 5000 virtual CR');
 }
 let ticker=await call(buyer,'/api/market/ticker'),chart=await call(buyer,'/api/market/ohlcv?interval=1m');
 assert.equal(ticker.status,200);assert.equal(ticker.body.premarket,true);assert.equal(ticker.body.last_price,null);assert.equal(ticker.body.volume_24h_gm_cents,0);
 assert.deepEqual(chart.body.candles,[]);assert.equal(chart.body.synthetic,false);
 const earned=await call(seller,'/api/daily/claim',{operationId:crypto.randomUUID()});assert.equal(earned.status,200,JSON.stringify(earned.body));
 const bid=await call(buyer,'/api/exchange/order',{type:'limit',side:'buy',amount:'10',price:'12',duration:'24h',operationId:crypto.randomUUID()});assert.equal(bid.status,200,JSON.stringify(bid.body));assert.equal(bid.body.auction,true);
 const ask=await call(seller,'/api/exchange/order',{type:'limit',side:'sell',amount:'10',price:'12',duration:'24h',operationId:crypto.randomUUID()});assert.equal(ask.status,200,JSON.stringify(ask.body));
 ticker=await call(buyer,'/api/market/ticker');assert.equal(ticker.body.premarket,true);assert.equal(ticker.body.indicative.price,1200);assert.equal(ticker.body.indicative.volume_gm_cents,1000);assert.equal(ticker.body.indicative.actual_traded_gm_cents,0);
 chart=await call(buyer,'/api/market/ohlcv?interval=1m');assert.deepEqual(chart.body.candles,[]);
 await new Promise(r=>setTimeout(r,3200));
 ticker=await call(buyer,'/api/market/ticker');assert.equal(ticker.body.premarket,false);assert.equal(ticker.body.last_price,1200);assert.equal(ticker.body.volume_24h_gm_cents,1000);assert.equal(ticker.body.trades_24h,1);
 chart=await call(buyer,'/api/market/ohlcv?interval=1m');assert.equal(chart.body.candles.length,1);assert.equal(chart.body.candles[0].close,1200);assert.equal(chart.body.candles[0].volume_gm_cents,1000);
 const trades=await call(buyer,'/api/exchange/trades');assert.equal(trades.body.trades.length,1);assert.equal(trades.body.trades[0].suspect,0);
 const ownerless=await call(buyer,'/api/game/status');assert.equal(ownerless.body.wallet.gm,995,'10GM received - 0.05GM fee');
 assert.equal(ownerless.body.user.level,1);
 assert.ok(!/SQLITE_ERROR|ERR_ASSERTION|Unhandled/.test(stderr),stderr);
});
