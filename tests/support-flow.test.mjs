import test from 'node:test';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {spawn} from 'node:child_process';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
const TOKEN='123:support-test';function init(id){const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id,username:'s'+id})});const msg=[...p].map(([k,v])=>`${k}=${v}`).sort().join('\n'),secret=crypto.createHmac('sha256','WebAppData').update(TOKEN).digest();p.set('hash',crypto.createHmac('sha256',secret).update(msg).digest('hex'));return p.toString()}
test('support Auto Support two tries, then manual moderator queue; only assigned moderator resolves',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'gm-support-')),port=27000+Math.floor(Math.random()*1000),base=`http://127.0.0.1:${port}`,env={...process.env,PORT:String(port),DB_PATH:join(dir,'data.sqlite'),BOT_TOKEN:TOKEN,OWNER_TELEGRAM_IDS:'101001,101002'};
 const child=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{cwd:new URL('..',import.meta.url).pathname,env,stdio:'ignore'});t.after(()=>{child.kill();rmSync(dir,{recursive:true,force:true})});for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,50))}
 async function call(id,path,body){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:'tma '+init(id),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()}}
 for(const id of [101001,101002,303003])assert.equal((await call(id,'/api/bootstrap')).status,200);
 const item=await call(303003,'/api/tickets',{category:'Mining',body:'Мой Claim не работает после долгого ожидания'});assert.equal(item.status,201,JSON.stringify(item.data));const id=item.data.ticket;
 assert.equal((await call(303003,'/api/tickets')).data.tickets[0].status,'auto_support');assert.equal((await call(101001,'/api/tickets')).data.tickets.length,0,'pending auto ticket not shown in moderator queue');
 assert.equal((await call(303003,`/api/tickets/${id}/auto`,{})).data.attempts,1);
 assert.equal((await call(101001,'/api/tickets')).data.tickets.length,0);
 assert.equal((await call(303003,`/api/tickets/${id}/auto`,{})).data.escalated,true);
 assert.equal((await call(101001,'/api/tickets')).data.tickets.length,1);
 assert.equal((await call(101001,`/api/tickets/${id}/claim`,{})).status,200);
 assert.equal((await call(101001,`/api/tickets/${id}/reply`,{body:'Просмотрел журнал, попробуйте обновить раздел'})).status,200);
 assert.equal((await call(101001,`/api/tickets/${id}/resolve`,{})).status,200);
 assert.equal((await call(303003,`/api/tickets/${id}/reopen`,{})).status,200);
 const reopened=(await call(303003,'/api/tickets')).data.tickets[0];assert.equal(reopened.status,'open');assert.equal(reopened.assigned_to,null);
});
