import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {once} from 'node:events';

const TOKEN='123:gm-token-spot-early-test';
function auth(id){
  const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id,username:'gm_test_'+id})});
  const key=crypto.createHmac('sha256','WebAppData').update(TOKEN).digest();
  const data=[...p].map(([k,v])=>k+'='+v).sort().join('\n');
  p.set('hash',crypto.createHmac('sha256',key).update(data).digest('hex'));
  return p.toString();
}
test('test launch opens EXISTING premarket immediately without fake price, trades or GM balances',async t=>{
 const tmp=mkdtempSync(join(tmpdir(),'gm-spot-early-'));
 const db=join(tmp,'persistent.sqlite');
 const port=38200+Math.floor(Math.random()*1000);
 const url='http://127.0.0.1:'+port;
 const id=740001;
 const childEnv={...process.env,BOT_TOKEN:TOKEN,BOT_WEBHOOK_SECRET:'',PUBLIC_APP_URL:'',OWNER_TELEGRAM_IDS:'',OWNER_TOTP_SECRETS:'',BOT_POLLING:'0',PORT:String(port),DB_PATH:db,AUCTION_DURATION_SECONDS:'86400'};
 let current=null;
 t.after(async()=>{if(current && current.exitCode===null){current.kill();await once(current,'exit').catch(()=>{})}rmSync(tmp,{recursive:true,force:true})});
 async function start(testMode){
   const env={...childEnv,GM_TEST_OPEN_TRADING:testMode?'1':'0'};
   let errors='';
   const p=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{cwd:new URL('..',import.meta.url).pathname,env,stdio:['ignore','ignore','pipe']});
   current=p;p.stderr.on('data',x=>errors+=String(x));
   for(let i=0;i<85;i++){
     if(p.exitCode!==null)break;
     try{if((await fetch(url+'/api/health')).ok)return p}catch{}
     await new Promise(resolve=>setTimeout(resolve,45));
   }
   throw Error('test server unavailable '+errors);
 }
 async function stop(p){if(p.exitCode===null){p.kill();await once(p,'exit')};if(current===p)current=null;}
 async function call(path,body){
   const res=await fetch(url+path,{method:body?'POST':'GET',headers:{Authorization:'tma '+auth(id),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
   return {status:res.status,data:await res.json()};
 }
 const old=await start(false);
 const registered=await call('/api/bootstrap');
 assert.equal(registered.status,200);
 assert.equal(registered.data.wallet.gm,0);
 assert.equal(registered.data.wallet.cr,500000);
 const before=await call('/api/market/ticker');
 assert.equal(before.status,200);
 assert.equal(before.data.premarket,true,'old database has 24h premarket');
 await stop(old);
 await start(true); // same SQLite DB, now switch to explicit test spot
 const after=await call('/api/market/ticker');
 assert.equal(after.status,200);
 assert.equal(after.data.premarket,false);
 assert.equal(after.data.auction_done,true);
 assert.equal(after.data.trade_test_mode,true);
 assert.equal(after.data.last_price,null);
 assert.equal(after.data.volume_24h_gm_cents,0);
 assert.equal(after.data.trades_24h,0);
 const candles=await call('/api/market/ohlcv?interval=1m');
 assert.equal(candles.status,200);
 assert.deepEqual(candles.data.candles,[]);
 const persisted=await call('/api/bootstrap');
 assert.equal(persisted.data.wallet.gm,0,'no invented GM liquidity');
 assert.equal(persisted.data.wallet.cr,500000,'welcome grant not repeated');
 const bid=await call('/api/exchange/order',{type:'limit',side:'buy',amount:'10',price:'1',duration:'24h',operationId:crypto.randomUUID()});
 assert.equal(bid.status,200,JSON.stringify(bid.data));
 assert.equal(bid.data.auction,false,'order should be a regular spot order');
 const book=await call('/api/exchange/book');
 assert.equal(book.status,200);
 assert.ok(book.data.bids.some(x=>x.limit_price===100 && x.gm_cents===1000),'limit order appears in live book');
 const finalTicker=await call('/api/market/ticker');
 assert.equal(finalTicker.data.last_price,null,'unfilled orders must not fabricate price');
});
