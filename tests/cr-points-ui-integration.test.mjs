// Runs against a disposable local SQLite server, never Render or Supabase.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import crypto from 'node:crypto';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const BOT='123:currency-ui-ci';
function sign(id){
  const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id,username:'economy_test'})});
  const data=[...p].map(([k,v])=>k+'='+v).sort().join('\n');
  const key=crypto.createHmac('sha256','WebAppData').update(BOT).digest();
  p.set('hash',crypto.createHmac('sha256',key).update(data).digest('hex'));
  return p.toString();
}

test('the Mini App and standalone JS both expose the CR and POINTS rules in two themes',()=>{
 const src=readFileSync(new URL('../miniapp/src/main.tsx',import.meta.url),'utf8');
 const publicJs=readFileSync(new URL('../miniapp/public/main.js',import.meta.url),'utf8');
 const style=readFileSync(new URL('../miniapp/src/styles.css',import.meta.url),'utf8');
 const publicStyle=readFileSync(new URL('../miniapp/public/styles.css',import.meta.url),'utf8');
 for(const source of [src,publicJs]){
  assert.match(source,/\/api\/game\/economy/,'currency policy must be requested from server');
  assert.match(source,/gm-economy-note-trade/);
  assert.match(source,/gm-economy-note-boxes/);
  assert.match(source,/economy\.boxesPoints/);
  assert.match(source,/economy\.tradePoints/);
  for(const lang of ['ru','uk','en','pt','es','de','fr','tr','pl','it'])assert.match(source,new RegExp('\\b'+lang+':'),lang+' translation available');
 }
 assert.equal(style,publicStyle,'standalone CSS must match source CSS');
 assert.match(style,/\.application\.theme-dark \.gm-economy-note/);
 assert.match(style,/\.application\.theme-light \.gm-economy-note/);
});

test('server policy is read-only: CR is virtual, POINTS buy boxes, CR cannot pay',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'gm-currency-ui-'));
 const port=38000+Math.floor(Math.random()*3000);
 const base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{
  cwd:new URL('..',import.meta.url).pathname,
  env:{...process.env,PORT:String(port),DB_PATH:join(dir,'db.sqlite'),BOT_TOKEN:BOT,
   NODE_ENV:'test',BOT_POLLING:'0',PUBLIC_APP_URL:'',BOT_WEBHOOK_SECRET:'',
   GM_ENABLE_REWARDS:'1',BOX_REWARDS_GM_JSON:'{"bronze":15,"silver":45,"gold":105}'},
  stdio:['ignore','ignore','pipe']});
 let stderr='';child.stderr.on('data',x=>stderr+=x.toString());
 t.after(()=>{child.kill();rmSync(dir,{recursive:true,force:true})});
 let ready=false;
 for(let i=0;i<120;i++){
  try{const r=await fetch(base+'/api/health');if(r.ok){ready=true;break}}catch{}
  if(child.exitCode!==null)break;
  await new Promise(resolve=>setTimeout(resolve,50));
 }
 assert.ok(ready,'server should start in fixture: '+stderr);
 const auth={Authorization:'tma '+sign(300001),'Content-Type':'application/json'};
 const ask=async(path,body)=>{
  const res=await fetch(base+path,{method:body?'POST':'GET',headers:auth,body:body?JSON.stringify(body):undefined});
  return {status:res.status,data:await res.json()};
 };
 assert.equal((await ask('/api/bootstrap')).status,200,stderr);
 const first=await ask('/api/game/economy');
 assert.equal(first.status,200,JSON.stringify(first.data));
 assert.equal(first.data.assets.CR.game_supply,1_000_000_000);
 assert.equal(first.data.assets.CR.blockchain_asset,false);
 assert.equal(first.data.assets.CR.external_withdrawals,false);
 assert.equal(first.data.assets.POINTS.tradable,false);
 assert.equal(first.data.assets.POINTS.transferable,false);
 assert.equal(first.data.boxes.payment_currency,'POINTS');
 assert.deepEqual(first.data.boxes.point_costs,{bronze:300,silver:750,gold:1500});
 assert.equal(first.data.boxes.randomized,false);
 const prior=await ask('/api/game/status');
 assert.equal(prior.status,200,JSON.stringify(prior.data));
 const wrong=await ask('/api/boxes/open',{kind:'bronze',source:'cr',operationId:crypto.randomUUID()});
 assert.equal(wrong.status,400,'CR must never directly pay for a box');
 const after=await ask('/api/game/status');
 assert.equal(after.status,200,JSON.stringify(after.data));
 assert.equal(after.data.wallet.cr,prior.data.wallet.cr,'invalid payment cannot debit CR');
 assert.equal(after.data.wallet.gm,prior.data.wallet.gm,'invalid payment cannot credit GM');
 assert.equal(after.data.points.points,prior.data.points.points,'invalid payment cannot debit POINTS');
 const again=await ask('/api/game/economy');
 assert.deepEqual(again.data,first.data,'public game policy has no mutable state');
});
