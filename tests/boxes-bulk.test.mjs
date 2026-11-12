import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
const TOKEN='123:box-bulk-test', USER=990001;
function auth(){
 const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id:USER,username:'boxbulk'})});
 const data=[...p].map(([k,v])=>k+'='+v).sort().join('\n');
 const key=crypto.createHmac('sha256','WebAppData').update(TOKEN).digest();
 p.set('hash',crypto.createHmac('sha256',key).update(data).digest('hex'));return p.toString();
}
test('batch chest opening is atomic, priced correctly, audited, and idempotent',async t=>{
 const tmp=mkdtempSync(join(tmpdir(),'gm-chest-bulk-')),port=43000+Math.floor(Math.random()*1000),base='http://127.0.0.1:'+port;
 const path=join(tmp,'db.sqlite');
 const child=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{
  cwd:new URL('..',import.meta.url).pathname,
  env:{...process.env,BOT_TOKEN:TOKEN,PORT:String(port),DB_PATH:path,BOX_REWARDS_GM_JSON:'{"bronze":15,"silver":45,"gold":105}',GM_ENABLE_REWARDS:'1',GM_BOX_BONUS_REWARDS:'0',BOT_POLLING:'0',PUBLIC_APP_URL:'',BOT_WEBHOOK_SECRET:''},stdio:'ignore'
 });
 t.after(()=>{child.kill();rmSync(tmp,{recursive:true,force:true})});
 let ready=false;
 for(let i=0;i<120;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,50))}
 assert.ok(ready,'test server starts');
 async function req(path,body){
  const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:'tma '+auth(),'Content-Type':'application/json'},
   body:body?JSON.stringify(body):undefined});
  return {status:r.status,data:await r.json()};
 }
 assert.equal((await req('/api/bootstrap')).status,200);
 const db=new DatabaseSync(path);db.exec('PRAGMA busy_timeout=3000');
 db.prepare('UPDATE points_account SET points=? WHERE user_id=?').run(10000,String(USER));
 const firstId=crypto.randomUUID(),first={kind:'bronze',count:3,operationId:firstId};
 const opened=await req('/api/boxes/open',first);
 assert.equal(opened.status,200,JSON.stringify(opened.data));
 assert.equal(opened.data.count,3);
 assert.equal(opened.data.spent_points,900);
 assert.equal(opened.data.gm_cents,4500);
 assert.equal(opened.data.xp,0,'default mode grants no additional XP');
 assert.deepEqual(opened.data.unlocked_frames,[],'no collectible frames without staging opt-in');
 const replay=await req('/api/boxes/open',first);
 assert.equal(replay.status,200);
 assert.deepEqual(replay.data,opened.data,'retry must not charge twice');
 const second=await req('/api/boxes/open',{kind:'silver',count:5,operationId:crypto.randomUUID()});
 assert.equal(second.status,200,JSON.stringify(second.data));
 assert.equal(second.data.spent_points,3750);
 assert.equal(second.data.gm_cents,22500);
 const third=await req('/api/boxes/open',{kind:'bronze',count:10,operationId:crypto.randomUUID()});
 assert.equal(third.status,200,JSON.stringify(third.data));
 assert.equal(third.data.spent_points,3000);
 assert.equal(third.data.gm_cents,15000);
 const invalid=await req('/api/boxes/open',{kind:'bronze',count:2,operationId:crypto.randomUUID()});
 assert.equal(invalid.status,400,'only 1,3,5,10 supported');
 const beyondCap=await req('/api/boxes/open',{kind:'gold',count:10,operationId:crypto.randomUUID()});
 assert.equal(beyondCap.status,400,'daily GM cap remains enforced');
 const status=await req('/api/game/status');
 assert.equal(status.data.points.points,2350);
 assert.equal(db.prepare("SELECT COUNT(*) AS n FROM journal WHERE kind='gm_box_open'").get().n,3);
 assert.equal(db.prepare('SELECT gm_cents FROM box_day WHERE user_id=?').get(String(USER)).gm_cents,42000);
 db.close();
});
