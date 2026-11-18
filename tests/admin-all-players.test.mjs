import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';

const TOKEN='12345:gm-admin-players-test';
const sign=id=>{
 const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id,username:'owner_'+id})});
 const text=[...p].map(([key,val])=>key+'='+val).sort().join('\n');
 const secret=crypto.createHmac('sha256','WebAppData').update(TOKEN).digest();
 p.set('hash',crypto.createHmac('sha256',secret).update(text).digest('hex'));
 return p.toString();
};

test('only Owner and Co-Owner can list ALL real players with safe search and bounded pagination',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'gm-admin-player-dir-'));
 const dbPath=join(dir,'game.sqlite'),port=57000+Math.floor(Math.random()*800),base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{
  cwd:new URL('..',import.meta.url).pathname,
  env:{...process.env,PORT:String(port),DB_PATH:dbPath,BOT_TOKEN:TOKEN,
   GM_DATABASE_DRIVER:'sqlite',BOT_POLLING:'0',PUBLIC_APP_URL:'',BOT_WEBHOOK_SECRET:'',
   OWNER_TELEGRAM_IDS:'810001,810002',OWNER_TOTP_SECRETS:'{}',GM_ADMIN_TEST_GRANTS:'0'},
  stdio:['ignore','ignore','pipe']
 });
 let stderr='';child.stderr.on('data',c=>stderr+=String(c));
 t.after(()=>{child.kill();rmSync(dir,{recursive:true,force:true})});
 let ready=false;for(let i=0;i<110;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,50))}
 assert.ok(ready,'server failed to start '+stderr);
 async function api(id,path){
  const resp=await fetch(base+path,{headers:{Authorization:'tma '+sign(id)}});
  return {status:resp.status,data:await resp.json()};
 }
 for(const id of [810001,810002,810003]){
  assert.equal((await api(id,'/api/bootstrap')).status,200);
 }
 const db=new DatabaseSync(dbPath);db.exec('PRAGMA busy_timeout=3000');
 t.after(()=>db.close());
 // Fixtures are created ONLY in a test-local SQLite DB, never the real players table.
 const q=db.prepare('INSERT INTO users(id,username,role,created_at,last_seen,level,xp) VALUES(?,?,?, ?,?,?,?)');
 const w=db.prepare('INSERT INTO wallets(user_id,gm,cr,vault) VALUES(?,?,?,?)');
 for(let n=0;n<37;n++){
  const userId=String(860000+n),username='pilot_'+String(n).padStart(3,'0');
  q.run(userId,username,'player',1700000000+n,1700001000+n,1+n%9,n*25);
  w.run(userId,100*n,200*n,300*n);
 }
 const first=await api(810001,'/api/admin/players');
 assert.equal(first.status,200,JSON.stringify(first.data));
 assert.equal(first.data.total,40,'3 bootstrapped accounts + 37 fixture accounts');
 assert.equal(first.data.users.length,25);
 assert.equal(first.data.next_offset,25);
 assert.equal(first.data.has_more,true);
 assert.ok(first.data.users[0].id);
 assert.ok(Object.prototype.hasOwnProperty.call(first.data.users[0],'gm_cents'));
 assert.ok(Object.prototype.hasOwnProperty.call(first.data.users[0],'cr_cents'));
 assert.ok(Object.prototype.hasOwnProperty.call(first.data.users[0],'vault_cents'));
 assert.ok(Object.prototype.hasOwnProperty.call(first.data.users[0],'last_seen'));
 assert.ok(Object.prototype.hasOwnProperty.call(first.data.users[0],'created_at'));
 assert.ok(!JSON.stringify(first.data).includes('seed_phrase'));
 const next=await api(810002,'/api/admin/players?offset=25&limit=25');
 assert.equal(next.status,200,'Co-Owner has same rights');
 assert.equal(next.data.users.length,15);
 assert.equal(next.data.has_more,false);
 const unique=new Set([...first.data.users,...next.data.users].map(u=>u.id));
 assert.equal(unique.size,40,'no duplicates, every player accounted for');
 const found=await api(810001,'/api/admin/players?q=pilot_003');
 assert.equal(found.status,200);
 assert.equal(found.data.total,1,'underscore must be searched literally, not as LIKE wildcard');
 assert.equal(found.data.users[0].id,'860003');
 assert.equal(found.data.users[0].gm_cents,300);
 assert.equal(found.data.users[0].cr_cents,600);
 assert.equal(found.data.users[0].vault_cents,900);
 assert.equal((await api(810002,'/api/admin/players?q=860004')).data.users[0].username,'pilot_004');
 assert.equal((await api(810001,'/api/admin/players?q=PILOT_001')).data.total,1,'case insensitive username');
 const player=await api(810003,'/api/admin/players');
 assert.notEqual(player.status,200,'a regular player must never receive the roster');
 assert.ok(!player.data.users,'no leakage for non-owners');
 const unauth=await fetch(base+'/api/admin/players');
 assert.notEqual(unauth.status,200,'Telegram auth is required');
 assert.notEqual((await api(810001,'/api/admin/players?limit=5000')).status,200,'no unbounded result sets');
 assert.notEqual((await api(810001,'/api/admin/players?offset=-1')).status,200,'negative offset prohibited');
 assert.notEqual((await api(810001,'/api/admin/players?q=%25')).status,200,'reject wildcard injection patterns');
});

test('Admin panel has player search, details, pagination and identical privileged access',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const server=read('server/index.mjs');
 assert.ok(server.includes("p==='/api/admin/players'"));
 assert.ok(server.includes("roleCheck({id},['owner','coowner'])"));
 for(const path of ['miniapp/src/main.tsx','miniapp/public/main.js']){
  const src=read(path);
  for(const needle of ['/api/admin/players','gm-admin-players','PLAYER DIRECTORY','Выбрать ID','adminPlayerSearch','Все игроки','adminPlayersBusy']){
   // TypeScript emits unicode escapes in the browser bundle; key assertions use ASCII.
   if(!path.endsWith('main.tsx')&&['Выбрать ID','Все игроки'].includes(needle))continue;
   assert.ok(src.includes(needle),path+' missing '+needle);
  }
 }
 const css=read('miniapp/src/styles.css'),served=read('miniapp/public/styles.css');
 assert.equal(css,served,'public styles must match edited source');
 assert.ok(css.includes('.theme-dark .gm-admin-player'));
 assert.ok(css.includes('.gm-admin-players-pagination'));
});
