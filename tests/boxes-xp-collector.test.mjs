import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';

const TOKEN='123:gm-box-collection-test',USER=884422;
const sign=()=>{
 const params=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id:USER,username:'collector'})});
 const key=crypto.createHmac('sha256','WebAppData').update(TOKEN).digest();
 params.set('hash',crypto.createHmac('sha256',key).update([...params].map(([k,v])=>k+'='+v).sort().join('\n')).digest('hex'));
 return params.toString();
};
test('fixed GM + XP + collectible frames are granted atomically, once per request, with a daily payout cap',async t=>{
 const tmp=mkdtempSync(join(tmpdir(),'gm-box-collection-')),path=join(tmp,'game.sqlite');
 const port=45500+Math.floor(Math.random()*1000),base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{
  cwd:new URL('..',import.meta.url).pathname,
  env:{...process.env,BOT_TOKEN:TOKEN,PORT:String(port),DB_PATH:path,
   GM_PRIVATE_TEST_ECONOMY:'1',GM_TEST_STARTER_FUNDS:'0',
   BOX_REWARDS_GM_JSON:'{"bronze":15,"silver":45,"gold":105}',
   BOT_POLLING:'0',PUBLIC_APP_URL:'',BOT_WEBHOOK_SECRET:'',
   BOX_DAILY_GM_CAP:'1000',OWNER_TELEGRAM_IDS:String(USER),OWNER_TOTP_SECRETS:'{}'},
  stdio:['ignore','ignore','pipe']});
 let stderr='';child.stderr.on('data',x=>stderr+=String(x));
 t.after(()=>{child.kill();rmSync(tmp,{recursive:true,force:true})});
 let ready=false;for(let i=0;i<100;i++){
  try{if((await fetch(base+'/api/health')).ok){ready=true;break}}catch{}
  await new Promise(resolve=>setTimeout(resolve,55));
 }
 assert.ok(ready,'test game server started '+stderr);
 async function call(path,body){
  const response=await fetch(base+path,{method:body?'POST':'GET',
   headers:{Authorization:'tma '+sign(),'Content-Type':'application/json'},
   body:body?JSON.stringify(body):undefined});
  return {status:response.status,data:await response.json()};
 }
 assert.equal((await call('/api/bootstrap')).status,200);
 const db=new DatabaseSync(path);db.exec('PRAGMA busy_timeout=3000');t.after(()=>db.close());
 db.prepare('UPDATE points_account SET points=40000 WHERE user_id=?').run(String(USER));
 const first=await call('/api/game/status');
 assert.equal(first.status,200,JSON.stringify(first.data));
 assert.equal(first.data.config.box_bonus_enabled,true);
 assert.deepEqual(first.data.config.box_xp_rewards,{bronze:20,silver:60,gold:150});
 assert.equal(first.data.box_collection.total,0);
 const startingXp=first.data.user.xp;
 const open=async(kind,count,operationId=crypto.randomUUID())=>call('/api/boxes/open',{kind,count,operationId});
 const id=crypto.randomUUID();
 const bronze=await open('bronze',5,id);
 assert.equal(bronze.status,200,JSON.stringify(bronze.data));
 assert.equal(bronze.data.xp,100);
 assert.equal(bronze.data.gm_cents,7500);
 assert.deepEqual(bronze.data.unlocked_frames.map(x=>x.id),['box_bronze_5']);
 const repeat=await open('bronze',5,id);
 assert.deepEqual(repeat.data,bronze.data,'replaying operationId never grants XP or frames twice');
 let state=await call('/api/game/status');
 assert.equal(state.data.box_collection.bronze,5);
 assert.equal(state.data.user.xp,startingXp+100);
 assert.equal(state.data.cosmetics.frames.find(x=>x.id==='box_bronze_5').claimed,true);
 const silver=await open('silver',5);
 assert.equal(silver.status,200,JSON.stringify(silver.data));
 assert.equal(silver.data.xp,300);
 assert.deepEqual(silver.data.unlocked_frames.map(x=>x.id),['box_silver_5']);
 const gold=await open('gold',5);
 assert.equal(gold.status,200,JSON.stringify(gold.data));
 assert.equal(gold.data.xp,750);
 assert.deepEqual(gold.data.unlocked_frames.map(x=>x.id),['box_gold_5']);
 const bulk=await open('bronze',10);
 assert.equal(bulk.status,200,JSON.stringify(bulk.data));
 assert.equal(bulk.data.xp,200);
 assert.deepEqual(bulk.data.unlocked_frames,[],'frames are one-time collectibles');
 const beforeFail=await call('/api/game/status');
 assert.equal(beforeFail.data.box_collection.total,25);
 const failed=await open('gold',1);
 assert.equal(failed.status,400,'GM daily cap still blocks overpayment even if XP is available');
 state=await call('/api/game/status');
 assert.equal(state.data.box_collection.total,25,'failed opens do not progress collection');
 assert.equal(state.data.user.xp,beforeFail.data.user.xp,'failed opens do not pay XP');
 assert.equal(state.data.points.points,beforeFail.data.points.points,'failed opens do not consume POINTS');
 // A new UTC day permits continued collecting; test-only DB maintenance does not affect production.
 db.prepare('DELETE FROM box_day WHERE user_id=?').run(String(USER));
 const master=await open('bronze',5);
 assert.equal(master.status,200,JSON.stringify(master.data));
 assert.deepEqual(master.data.unlocked_frames.map(x=>x.id),['box_master_30']);
 state=await call('/api/game/status');
 assert.equal(state.data.box_collection.total,30);
 assert.equal(state.data.box_collection.bronze,20);
 assert.equal(state.data.box_collection.silver,5);
 assert.equal(state.data.box_collection.gold,5);
 assert.equal(state.data.user.xp,startingXp+1450);
 for(const name of ['box_bronze_5','box_silver_5','box_gold_5','box_master_30'])
  assert.equal(state.data.cosmetics.frames.find(x=>x.id===name).claimed,true);
 assert.equal(db.prepare("SELECT count(*) AS n FROM journal WHERE kind='gm_box_open'").get().n,5);
 const audit=await call('/api/admin/supply-audit');
 assert.equal(audit.status,200,JSON.stringify(audit.data));
 assert.equal(audit.data.ok,true,'XP rewards do not inflate GM/CR supply');
});

test('extra prizes remain unavailable outside the isolated virtual testing mode',()=>{
 const server=readFileSync(new URL('../server/game.mjs',import.meta.url),'utf8');
 assert.ok(server.includes('const boxBonusEnabled=testEconomy;'));
 assert.ok(server.includes('box_bonus_enabled:boxBonusEnabled'));
 assert.ok(server.includes("return {...row,total:row.bronze+row.silver+row.gold}"));
 assert.ok(server.includes('takePool(\'BOXES\',\'gm\',n)'));
 assert.ok(server.includes("return once(op(),id,'box_open'"));
});

test('Boxes page and reveal explicitly display extra XP and collector frames in light and dark themes',()=>{
 const app=readFileSync(new URL('../miniapp/src/main.tsx',import.meta.url),'utf8');
 const styles=readFileSync(new URL('../miniapp/src/styles.css',import.meta.url),'utf8');
 const published=readFileSync(new URL('../miniapp/public/styles.css',import.meta.url),'utf8');
 assert.equal(styles,published);
 for(const name of ['gm-box-bonus','gm-box-total-bonuses','gm-box-reveal-xp','gm-box-reveal-total-xp',
  'gm-box-reveal-unlocks','gm-frame-box']){
  assert.ok(app.includes(name),name+' must be visible in client');
  assert.ok(styles.includes(name),name+' must have themed styling');
 }
 assert.ok(app.includes('unlocked:Array.isArray(result.unlocked_frames)?result.unlocked_frames:[]'));
 assert.ok(app.includes("unitXp:Number(result.unit_xp||0)"));
 assert.ok(app.includes("f.category==='box'?'gm-frame-box'"));
});
