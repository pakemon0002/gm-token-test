import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const BOT='12345:holders-http-test';
function telegramAuth(id){
 const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id,username:'holder_'+id})});
 const data=[...p].map(([k,v])=>k+'='+v).sort().join('\n');
 const secret=crypto.createHmac('sha256','WebAppData').update(BOT).digest();
 p.set('hash',crypto.createHmac('sha256',secret).update(data).digest('hex'));
 return 'tma '+p.toString();
}
test('holder API refuses forged proof, arbitrary balances, cross-origin and unverified entries',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'gm-holder-http-')),port=40000+Math.floor(Math.random()*1700);
 const base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['--experimental-sqlite','server/index.mjs'],{
  cwd:new URL('..',import.meta.url).pathname,
  env:{...process.env,BOT_TOKEN:BOT,DB_PATH:join(dir,'game.sqlite'),PORT:String(port),
   PUBLIC_APP_URL:base,GM_JETTON_MASTER_ADDRESS:'',TONAPI_KEY:''},stdio:'ignore'
 });
 t.after(()=>{child.kill();rmSync(dir,{recursive:true,force:true})});
 let ready=false;
 for(let i=0;i<90;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,60))}
 assert.equal(ready,true,'server starts with TON verifier installed');
 async function api(id,path,method='GET',data,origin){
  const headers={authorization:telegramAuth(id),'content-type':'application/json'};
  if(origin)headers.origin=origin;
  const response=await fetch(base+path,{method,headers,body:method==='POST'?JSON.stringify(data??{}):undefined});
  return {status:response.status,data:await response.json()};
 }
 const first=await api(720001,'/api/holders');
 assert.equal(first.status,200);
 assert.equal(first.data.enabled,false);
 assert.equal(first.data.reason,'contract_pending');
 assert.equal(first.data.participants,0);
 assert.deepEqual(first.data.podium,[]);
 const status=await api(720001,'/api/holders/status');
 assert.equal(status.data.wallet_verified,false);
 const challenge=await api(720001,'/api/holders/challenge','POST',{});
 assert.equal(challenge.status,200);
 assert.match(challenge.data.payload,/^[a-f0-9]{64}$/);
 const fake=await api(720001,'/api/holders/verify','POST',{
  address:'0:'+'0'.repeat(64),network:'-239',public_key:'f'.repeat(64),proof:{
   domain:{value:'127.0.0.1',lengthBytes:9},timestamp:Math.floor(Date.now()/1000),
   payload:challenge.data.payload,signature:Buffer.alloc(64).toString('base64'),state_init:'AAAA'
  }
 });
 assert.equal(fake.status,400);
 assert.equal(fake.data.verified,false);
 const noConsent=await api(720001,'/api/holders/consent','POST',{opt_in:true});
 assert.equal(noConsent.status,400);
 const noRefresh=await api(720001,'/api/holders/refresh','POST',{});
 assert.equal(noRefresh.status,400);
 const wrongOrigin=await api(720001,'/api/holders/challenge','POST',{},'https://evil.example.com');
 assert.equal(wrongOrigin.status,400);
 const unsigned=await fetch(base+'/api/holders',{method:'GET'});
 assert.notEqual(unsigned.status,200);
 const separate=await api(720002,'/api/holders/status');
 assert.equal(separate.data.wallet_verified,false);
 const fakeAmount=await api(720001,'/api/holders','POST',{wallet:'0:'+'1'.repeat(64),amount_raw:'999999999999999999'});
 assert.equal(fakeAmount.status,404,'no endpoint accepts client-submitted holdings');
 assert.deepEqual((await api(720001,'/api/holders')).data.users,[]);
});
