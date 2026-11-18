import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const BOT='123:xp-ranking-test';
function token(id){
 const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id,username:'player_'+id})});
 const data=[...p].map(([key,value])=>key+'='+value).sort().join('\n');
 const key=crypto.createHmac('sha256','WebAppData').update(BOT).digest();
 p.set('hash',crypto.createHmac('sha256',key).update(data).digest('hex'));
 return p.toString();
}
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('server XP leaderboard ranks real players without wallet connection or leaking other usernames',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'gm-xp-rank-'));
 const dbPath=join(dir,'game.sqlite'),port=56100+Math.floor(Math.random()*800),base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{
  cwd:new URL('..',import.meta.url).pathname,
  env:{...process.env,PORT:String(port),DB_PATH:dbPath,BOT_TOKEN:BOT,GM_DATABASE_DRIVER:'sqlite',
   PUBLIC_APP_URL:'',BOT_WEBHOOK_SECRET:'',BOT_POLLING:'0',
   OWNER_TELEGRAM_IDS:'',OWNER_TOTP_SECRETS:'{}',
   GM_GRAM_VERIFICATION_ENABLED:'0'},
  stdio:['ignore','ignore','pipe']
 });
 let stderr='';child.stderr.on('data',c=>stderr+=String(c));
 t.after(()=>{child.kill();rmSync(dir,{recursive:true,force:true})});
 let started=false;
 for(let i=0;i<120;i++){
  try{if((await fetch(base+'/api/health')).ok){started=true;break}}catch{}
  await new Promise(resolve=>setTimeout(resolve,50));
 }
 assert.ok(started,'server failed to start: '+stderr);
 const fetchRank=async(id,path)=>{
  const res=await fetch(base+path,{headers:{Authorization:'tma '+token(id)}});
  return {status:res.status,data:await res.json()};
 };
 for(const id of [820001,820002,820003]){
  const response=await fetchRank(id,'/api/bootstrap');
  assert.equal(response.status,200,'bootstrap '+id);
 }
 const db=new DatabaseSync(dbPath);db.exec('PRAGMA busy_timeout=3000');
 t.after(()=>db.close());
 db.prepare('UPDATE users SET xp=?,level=? WHERE id=?').run(100,2,'820001');
 db.prepare('UPDATE users SET xp=?,level=? WHERE id=?').run(250,3,'820002');
 db.prepare('UPDATE users SET xp=?,level=? WHERE id=?').run(0,1,'820003');
 const first=await fetchRank(820001,'/api/leaderboard');
 assert.equal(first.status,200,JSON.stringify(first.data));
 assert.equal(first.data.enabled,true);
 assert.equal(first.data.score_source,'server_game_xp');
 assert.equal(first.data.public_usernames,false);
 assert.equal(first.data.participants,3);
 assert.deepEqual(first.data.podium.map(r=>r.xp),[250,100,0]);
 assert.deepEqual(first.data.podium.map(r=>r.rank),[1,2,3]);
 assert.equal(first.data.my_rank,2);
 assert.equal(first.data.my_xp,100);
 assert.equal(first.data.podium[0].username,'Игрок #1');
 assert.equal(first.data.podium[1].username,'player_820001','only own username disclosed to its owner');
 assert.equal(first.data.podium[2].username,'Игрок #3');
 assert.ok(!JSON.stringify(first.data).includes('820002'),'other Telegram ids not exposed');
 assert.ok(!JSON.stringify(first.data).includes('player_820002'),'other usernames not exposed');
 assert.ok(!JSON.stringify(first.data).includes('gm_cents'),'game currencies are not ranked');
 const second=await fetchRank(820002,'/api/leaderboard?limit=2&offset=0');
 assert.equal(second.status,200);
 assert.equal(second.data.my_rank,1);
 assert.equal(second.data.users.length,2);
 assert.equal(second.data.has_more,true);
 assert.equal(second.data.next_offset,2);
 const next=await fetchRank(820002,'/api/leaderboard?limit=2&offset=2');
 assert.equal(next.status,200);
 assert.equal(next.data.users[0].rank,3);
 assert.equal(next.data.has_more,false);
 const holders=await fetchRank(820002,'/api/holders');
 assert.equal(holders.status,200);
 assert.equal(holders.data.score_source||'verified_onchain_gm_only','verified_onchain_gm_only');
 assert.deepEqual(holders.data.podium,[],'holder ranks stay on-chain-only');
});

test('UI has separate functional XP and TON tabs with loading and refresh',()=>{
 const src=read('miniapp/src/main.tsx'),bundle=read('miniapp/public/main.js');
 for(const code of [src,bundle]){
  assert.ok(code.includes('Игроки · XP'));
  assert.ok(code.includes('Держатели · TON'));
  assert.ok(code.includes("'/api/leaderboard?limit=30&offset='"));
  assert.ok(code.includes('fetchGameRanks'));
  assert.ok(code.includes('fetchHolders'));
  assert.ok(code.includes('Проверяем подтверждённых держателей')||code.includes('Проверяем подтверждённых держателей…'));
  assert.ok(code.includes("server_game_xp"));
  assert.ok(code.includes('GM TOKEN · GAME XP'));
  assert.ok(!code.includes('Отображаются вымышленные балансы'));
 }
 const css=read('miniapp/src/styles.css'),served=read('miniapp/public/styles.css');
 assert.equal(css,served,'compiled public stylesheet must match source');
 assert.ok(css.includes('.gm-ranking-tabs'));
});
