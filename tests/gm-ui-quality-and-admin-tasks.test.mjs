import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {totp} from '../server/lib.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const TOKEN='123:ui-quality-test',TOTP='JBSWY3DPEHPK3PXP';
function telegramAuth(id){
 const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id,username:'player'+id})});
 const message=[...p].map(([k,v])=>k+'='+v).sort().join('\n');
 const secret=crypto.createHmac('sha256','WebAppData').update(TOKEN).digest();
 p.set('hash',crypto.createHmac('sha256',secret).update(message).digest('hex'));
 return 'tma '+p.toString();
}
test('GM UI uses available icon aliases, avatar placeholders, owner task editor, 3-second notices and correct mining rate',()=>{
 const src=read('miniapp/src/main.tsx'),css=read('miniapp/src/styles.css');
 for(const token of ['search:\'scanner\'','send:\'telegram\'','function PlayerAvatar','gm-player-avatar','gm-frame-preview-detail',
 'gm-mining-speed-cards','gm-upgrade-rate-preview','gm-points-guide','Как получить POINTS',
 'gm-home-wallet','gmBalanceMenu','gm-balance-option','const [taskForm','function AdminTaskCatalog()',
 'gm-history-ticket','История обращений','showFounderCollection','GM GENESIS · 20 первых игроков']){
  assert.ok(src.includes(token),'Missing UI detail: '+token);
 }
 assert.ok(src.includes("window.setTimeout(()=>setToast(''),3000)"),'toast automatically dismisses');
 assert.ok(!src.includes('Загрузить с сервера</button>'),'no manual history refresh');
 assert.ok(!src.includes("'Заявка GM/CR принята сервером'"),'remove generic trading server toast');
 for(const token of ['.gm-frame-art','.gm-mining-coin-outer-ring','.gm-points-guide',
 '.gm-admin-task-editor','.gm-player-avatar','.gm-toast-progress','.gm-tour-step-content']){
  assert.ok(css.includes(token),'Missing CSS style: '+token);
 }
});
test('Owner can create, update and delete only checkable tasks with TOTP, users only see verified catalog, ticket histories private',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'gm-ui-tasks-')),port=41200+Math.floor(Math.random()*950),base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{
  cwd:new URL('..',import.meta.url).pathname,env:{...process.env,PORT:String(port),DB_PATH:join(dir,'test.sqlite'),
   BOT_TOKEN:TOKEN,OWNER_TELEGRAM_IDS:'910001,910009',OWNER_TOTP_SECRETS:JSON.stringify({'910001':TOTP}),
   GM_TASKS_ENABLED:'1',BOT_WEBHOOK_SECRET:'',PUBLIC_APP_URL:'',GM_JETTON_MASTER_ADDRESS:''},stdio:'ignore'
 });
 t.after(()=>{child.kill();rmSync(dir,{recursive:true,force:true})});
 let ready=false;for(let i=0;i<240;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,50))}
 assert.equal(ready,true,'server starts');
 async function api(id,path,method='GET',body){
  const result=await fetch(base+path,{method,headers:{Authorization:telegramAuth(id),'Content-Type':'application/json'},body:method==='POST'?JSON.stringify(body||{}):undefined});
  return {status:result.status,body:await result.json()};
 }
 const playerTasks=await api(910002,'/api/tasks');
 assert.equal(playerTasks.status,200);
 assert.ok(playerTasks.body.tasks.length>=12,'expanded goal catalogue active');
 assert.ok(playerTasks.body.tasks.some(x=>x.id==='mining_100_claims'));
 assert.ok(playerTasks.body.tasks.some(x=>x.id==='genesis_20'&&x.available),'early player qualifies for founder goal');
 assert.equal((await api(910002,'/api/admin/task-catalog')).status,403);
 const current=await api(910001,'/api/admin/task-catalog');
 assert.equal(current.status,200);
 assert.ok(current.body.tasks.length>=12);
 const baseTask={
  id:'test_unique_goal',title:'Серебряный путь',description:'Выполни 4 сбора в майнинге для достижения',
  category:'Other',icon:'lightning',xp:40,gm:0,daily:false,
  condition:{type:'mining_claim_count',gte:4}
 };
 const badCondition=await api(910001,'/api/admin/task-catalog','POST',{...baseTask,action:'create',condition:{type:'trust_client',gte:1}});
 assert.equal(badCondition.status,400,'unverifiable client condition prohibited');
 const unprivileged=await api(910002,'/api/admin/task-catalog','POST',{...baseTask,action:'create'});
 assert.equal(unprivileged.status,403);
 const created=await api(910001,'/api/admin/task-catalog','POST',{...baseTask,action:'create',code:totp(TOTP)});
 assert.equal(created.status,200,JSON.stringify(created.body));
 assert.ok(created.body.tasks.some(t=>t.id===baseTask.id));
 const replay=await api(910001,'/api/admin/task-catalog','POST',{...baseTask,action:'update',xp:75,code:totp(TOTP)});
 assert.equal(replay.status,403,'TOTP replay blocked as unauthorized');
 const update=await api(910001,'/api/admin/task-catalog','POST',{...baseTask,action:'update',xp:75,code:totp(TOTP,Date.now()+30000)});
 assert.equal(update.status,200,JSON.stringify(update.body));
 assert.equal(update.body.tasks.find(x=>x.id===baseTask.id).xp,75);
 const afterEdit=await api(910002,'/api/tasks');
 assert.equal(afterEdit.body.tasks.find(x=>x.id===baseTask.id).xp,75);
 const remove=await api(910001,'/api/admin/task-catalog','POST',{action:'delete',id:baseTask.id,code:totp(TOTP,Date.now()-30000)});
 assert.equal(remove.status,200,JSON.stringify(remove.body));
 assert.ok(!remove.body.tasks.some(x=>x.id===baseTask.id));
 const ticket=await api(910002,'/api/tickets','POST',{category:'Mining',body:'Не могу увидеть скорость майнинга по часам'});
 assert.equal(ticket.status,201,JSON.stringify(ticket.body));
 const mine=await api(910002,'/api/tickets/my');
 assert.equal(mine.status,200);
 assert.equal(mine.body.tickets.length,1);
 assert.equal(mine.body.tickets[0].body,'Не могу увидеть скорость майнинга по часам');
 const other=await api(910003,'/api/tickets/my');
 assert.equal(other.body.tickets.length,0,'support history scoped to author');
});
