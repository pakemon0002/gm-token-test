import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';

const TOKEN='123:gm-streak-test',DAY=86400000;
function auth(id){
 const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id,username:'streak'+id})});
 const key=crypto.createHmac('sha256','WebAppData').update(TOKEN).digest();
 p.set('hash',crypto.createHmac('sha256',key).update([...p].map(([k,v])=>k+'='+v).sort().join('\n')).digest('hex'));
 return p.toString();
}
const utcDaysAgo=n=>new Date(Date.now()-n*DAY).toISOString().slice(0,10);
test('server-backed UTC daily streak: day 5/10/30 milestones, replay protection, 100+ history and inactivity reset',async t=>{
 const folder=mkdtempSync(join(tmpdir(),'gm-streak-'));
 const dbPath=join(folder,'rewards.sqlite'),port=51000+Math.floor(Math.random()*1000),base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{
  cwd:new URL('..',import.meta.url).pathname,
  env:{...process.env,PORT:String(port),DB_PATH:dbPath,BOT_TOKEN:TOKEN,
   PUBLIC_APP_URL:'',BOT_WEBHOOK_SECRET:'',BOT_POLLING:'0',OWNER_TELEGRAM_IDS:'783001,783002',OWNER_TOTP_SECRETS:'{}',GM_PRIVATE_TEST_ECONOMY:'1',
   GM_ENABLE_REWARDS:'1',GM_DAILY_MILESTONE_TEST:'1',DAILY_REWARD_GM:'10'},
  stdio:['ignore','ignore','pipe']});
 let stderr='';child.stderr.on('data',x=>stderr+=String(x));
 t.after(()=>{child.kill();rmSync(folder,{recursive:true,force:true})});
 let ready=false;for(let i=0;i<100;i++){
  try{if((await fetch(base+'/api/health')).ok){ready=true;break}}catch{}
  await new Promise(r=>setTimeout(r,60));
 }
 assert.ok(ready,'server failed '+stderr);
 async function call(id,path,body){
  const r=await fetch(base+path,{method:body?'POST':'GET',
   headers:{Authorization:'tma '+auth(id),'Content-Type':'application/json'},
   body:body?JSON.stringify(body):undefined});
  return {status:r.status,data:await r.json()};
 }
 const db=new DatabaseSync(dbPath);db.exec('PRAGMA busy_timeout=3000');
 t.after(()=>db.close());
 const seed=(id,n,offset=1)=>{
  const insert=db.prepare('INSERT INTO daily_claim(user_id,day) VALUES(?,?)');
  for(let d=n+offset-1;d>=offset;d--)insert.run(String(id),utcDaysAgo(d));
 };
 for(const id of [783001,783002,783003,783004,783005])assert.equal((await call(id,'/api/bootstrap')).status,200);
 seed(783001,4);seed(783002,9);seed(783003,29);seed(783004,105);seed(783005,1,9);
 let state=await call(783001,'/api/game/status');
 assert.equal(state.data.daily.streak,4);
 assert.equal(state.data.daily.next_streak,5);
 assert.equal(state.data.daily.next_reward_gm,25);
 assert.equal(state.data.daily.best_streak,4);
 assert.equal(state.data.daily.milestone_enabled,true);
 const claimId=crypto.randomUUID();
 const five=await call(783001,'/api/daily/claim',{operationId:claimId});
 assert.equal(five.status,200,JSON.stringify(five.data));
 assert.equal(five.data.gm_cents,2500);
 assert.equal(five.data.streak,5);
 assert.equal(five.data.milestone,true);
 assert.deepEqual((await call(783001,'/api/daily/claim',{operationId:claimId})).data,five.data);
 assert.equal((await call(783001,'/api/daily/claim',{operationId:crypto.randomUUID()})).status,400);
 state=await call(783001,'/api/game/status');
 assert.equal(state.data.daily.streak,5);
 assert.equal(state.data.daily.best_streak,5);
 assert.equal(state.data.daily.claimed_today,true);
 const ten=await call(783002,'/api/daily/claim',{operationId:crypto.randomUUID()});
 assert.equal(ten.status,200,JSON.stringify(ten.data));
 assert.equal(ten.data.gm_cents,5000);
 assert.equal(ten.data.cycle_day,10);
 const thirty=await call(783003,'/api/daily/claim',{operationId:crypto.randomUUID()});
 assert.equal(thirty.status,200,JSON.stringify(thirty.data));
 assert.equal(thirty.data.gm_cents,20000);
 state=await call(783003,'/api/game/status');
 assert.equal(state.data.daily.best_streak,30);
 assert.equal(state.data.daily.next_cycle_day,1);
 assert.equal(state.data.daily.next_reward_gm,10);
 state=await call(783004,'/api/game/status');
 assert.equal(state.data.daily.streak,105,'no 100-day truncation');
 assert.equal(state.data.daily.best_streak,105);
 assert.equal(state.data.daily.next_streak,106);
 state=await call(783005,'/api/game/status');
 assert.equal(state.data.daily.streak,0,'missed days reset current streak');
 assert.equal(state.data.daily.best_streak,1,'historical record is preserved');
 const res=await call(783005,'/api/daily/claim',{operationId:crypto.randomUUID()});
 assert.equal(res.status,200);
 assert.equal(res.data.streak,1);
 const audit=await call(783001,'/api/admin/supply-audit');
 assert.equal(audit.status,200);
 assert.equal(audit.data.ok,true,'rewards may only come from pre-funded DAILY pool');
});
test('daily UI renders original flame, milestone calendar and POINTS step-by-step tutorial',()=>{
 const source=readFileSync(new URL('../miniapp/src/main.tsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../miniapp/src/styles.css',import.meta.url),'utf8');
 const markup=source.slice(source.indexOf('function Reward(){'),source.indexOf('function Splash(){'));
 for(const token of ['gm-streak-flame','gm-daily-milestones-grid','best_streak','next_reward_gm','claimed_today']){
  assert.ok(markup.includes(token),token);
 }
 for(const term of ['points.balance','points.earn','points.market','points.spend','points.open',
  "openGuide('points')"]){assert.ok(source.includes(term),term)}
 assert.ok(css.includes('gm-flame-5'));
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
});
