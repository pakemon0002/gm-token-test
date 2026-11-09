import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {totp} from '../server/lib.mjs';
const BOT='123:secure-gm-test';
const TOTP='JBSWY3DPEHPK3PXP';
function auth(id){
 const params=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id,username:'test_'+id})});
 const key=crypto.createHmac('sha256','WebAppData').update(BOT).digest();
 params.set('hash',crypto.createHmac('sha256',key).update([...params].map(([k,v])=>k+'='+v).sort().join('\n')).digest('hex'));
 return params.toString();
}
test('owners can grant virtual GM/CR from finite reserves with strict TOTP, ledger and caps',async t=>{
 const tmp=mkdtempSync(join(tmpdir(),'gm-test-grants-')),port=39500+Math.floor(Math.random()*1100),url='http://127.0.0.1:'+port;
 const env={...process.env,PORT:String(port),DB_PATH:join(tmp,'test.sqlite'),BOT_TOKEN:BOT,
   BOT_WEBHOOK_SECRET:'',PUBLIC_APP_URL:'',BOT_POLLING:'0',GM_ADMIN_TEST_GRANTS:'1',
   OWNER_TELEGRAM_IDS:'101001,101002',OWNER_TOTP_SECRETS:JSON.stringify({'101001':TOTP,'101002':TOTP})};
 const child=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{cwd:new URL('..',import.meta.url).pathname,env,stdio:['ignore','ignore','pipe']});
 let stderr='';child.stderr.on('data',x=>stderr+=String(x));
 t.after(()=>{child.kill();rmSync(tmp,{recursive:true,force:true})});
 let ready=false;for(let i=0;i<90;i++){try{if((await fetch(url+'/api/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,40))}
 assert.ok(ready,stderr);
 async function req(id,path,body){
   const res=await fetch(url+path,{method:body?'POST':'GET',headers:{Authorization:'tma '+auth(id),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
   return {status:res.status,data:await res.json()};
 }
 const owner=101001,coowner=101002,player=202003;
 const a=await req(owner,'/api/bootstrap'),b=await req(coowner,'/api/bootstrap'),c=await req(player,'/api/bootstrap');
 assert.equal(a.data.user.role,'owner');assert.equal(b.data.user.role,'coowner');assert.equal(c.data.user.role,'player');
 assert.equal(a.data.wallet.gm,0);assert.equal(b.data.wallet.gm,0);
 const before=await req(owner,'/api/admin/supply-audit');
 assert.equal(before.status,200);assert.equal(before.data.ok,true);
 const base={recipient:'other-owner',currency:'GM',amount:'10000',reason:'Тестовое начисление для проверки торговой системы',code:totp(TOTP),operationId:crypto.randomUUID()};
 const forbidden=await req(player,'/api/admin/test-grant',base);
 assert.equal(forbidden.status,403,'regular player cannot grant balances');
 const tooMuch=await req(owner,'/api/admin/test-grant',{...base,amount:'10000.01'});
 assert.equal(tooMuch.status,400,'per grant cap');
 const issued=await req(owner,'/api/admin/test-grant',base);
 assert.equal(issued.status,200,JSON.stringify(issued.data));
 assert.equal(issued.data.userId,String(coowner));assert.equal(issued.data.sourcePool,'TREASURY');
 const a2=await req(coowner,'/api/bootstrap');assert.equal(a2.data.wallet.gm,1000000);
 const repeat=await req(owner,'/api/admin/test-grant',base);
 assert.notEqual(repeat.status,200,'TOTP is one time');
 assert.equal((await req(coowner,'/api/bootstrap')).data.wallet.gm,1000000,'replay not credited');
 const cr=await req(coowner,'/api/admin/test-grant',{recipient:'self',currency:'CR',amount:'100000',reason:'Тестовые CR для проверки торгов GM CR',code:totp(TOTP),operationId:crypto.randomUUID()});
 assert.equal(cr.status,200,JSON.stringify(cr.data));
 assert.equal(cr.data.sourcePool,'SHOP');
 assert.equal((await req(coowner,'/api/bootstrap')).data.wallet.cr,10500000);
 const after=await req(owner,'/api/admin/supply-audit');
 assert.equal(after.status,200);assert.equal(after.data.ok,true,'GM/CR supply conserved');
 const history=await req(coowner,'/api/history');
 assert.ok(history.data.events.some(x=>x.kind==='admin_test_grant'),'test grant journaled');
});
