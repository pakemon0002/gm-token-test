import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const TOKEN='123:gm-owner-spot-funds-test';
function auth(id){
 const params=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id,username:'test_'+id})});
 const data=[...params].map(([k,v])=>k+'='+v).sort().join('\n');
 const key=crypto.createHmac('sha256','WebAppData').update(TOKEN).digest();
 params.set('hash',crypto.createHmac('sha256',key).update(data).digest('hex'));
 return params.toString();
}
test('owners receive once-per-DB virtual starter balances from reserves and can match spot orders',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'gm-owner-spot-')),port=42100+Math.floor(Math.random()*1400),url='http://127.0.0.1:'+port;
 const env={...process.env,PORT:String(port),DB_PATH:join(dir,'owner-spot.sqlite'),BOT_TOKEN:TOKEN,
  NODE_ENV:'test',BOT_WEBHOOK_SECRET:'',PUBLIC_APP_URL:'',BOT_POLLING:'0',
  OWNER_TELEGRAM_IDS:'910001,910002',OWNER_TOTP_SECRETS:'{}',GM_PRIVATE_TEST_ECONOMY:'0',
  GM_TEST_STARTER_FUNDS:'1',GM_TEST_OPEN_TRADING:'1'};
 const processServer=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{cwd:new URL('..',import.meta.url).pathname,env,stdio:['ignore','ignore','pipe']});
 let errors='';processServer.stderr.on('data',b=>errors+=String(b));
 t.after(()=>{processServer.kill();rmSync(dir,{recursive:true,force:true})});
 let ready=false;
 for(let i=0;i<100;i++){try{if((await fetch(url+'/api/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,40))}
 assert.ok(ready,errors);
 async function ask(id,path,body){
  const res=await fetch(url+path,{method:body?'POST':'GET',headers:{Authorization:'tma '+auth(id),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  return {status:res.status,data:await res.json()};
 }
 const firstOwner=await ask(910001,'/api/bootstrap');
 const secondOwner=await ask(910002,'/api/bootstrap');
 const player=await ask(910003,'/api/bootstrap');
 assert.equal(firstOwner.status,200);assert.equal(secondOwner.status,200);assert.equal(player.status,200);
 assert.equal(firstOwner.data.user.role,'owner');
 assert.equal(secondOwner.data.user.role,'coowner');
 assert.equal(firstOwner.data.wallet.gm,1000000);
 assert.equal(secondOwner.data.wallet.gm,1000000);
 assert.equal(firstOwner.data.wallet.cr,5500000);
 assert.equal(secondOwner.data.wallet.cr,5500000);
 assert.equal(player.data.wallet.gm,0,'ordinary players receive no owner starter GM');
 assert.equal(player.data.wallet.cr,500000,'ordinary players still get the single standard welcome award');
 const reentry=await ask(910001,'/api/bootstrap');
 assert.equal(reentry.data.wallet.gm,1000000,'repeat bootstrap must never mint or regrant funds');
 assert.equal(reentry.data.wallet.cr,5500000);
 const initialAudit=await ask(910001,'/api/admin/supply-audit');
 assert.equal(initialAudit.status,200);
 assert.equal(initialAudit.data.ok,true,'finite GM and CR supply conserved on starter grant');
 const market=await ask(910001,'/api/market/ticker');
 assert.equal(market.data.premarket,false);
 assert.equal(market.data.trade_test_mode,true);
 assert.equal(market.data.last_price,null,'startup grants do not fabricate a market price');
 assert.equal(market.data.volume_24h_gm_cents,0);
 const sell=await ask(910001,'/api/exchange/order',{type:'limit',side:'sell',amount:'5000',price:'0.50',duration:'24h',operationId:crypto.randomUUID()});
 assert.equal(sell.status,200,JSON.stringify(sell.data));
 assert.equal(sell.data.auction,false);
 const buy=await ask(910002,'/api/exchange/order',{type:'limit',side:'buy',amount:'5000',price:'0.50',duration:'24h',operationId:crypto.randomUUID()});
 assert.equal(buy.status,200,JSON.stringify(buy.data));
 const after=await ask(910001,'/api/market/ticker');
 assert.equal(after.data.last_price,50,'0.50 CR per GM from a REAL executed trade');
 assert.ok(after.data.volume_24h_gm_cents>0);
 const chart=await ask(910001,'/api/market/ohlcv?interval=1m');
 assert.ok(chart.data.candles.length>0,'real trade must create a candle');
 assert.equal(chart.data.synthetic,false,'never fabricate OHLCV');
 const finalAudit=await ask(910001,'/api/admin/supply-audit');
 assert.equal(finalAudit.data.ok,true,'trade fees and holdings preserve supply accounting');
});
