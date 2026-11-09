import test from 'node:test';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {verifyInitData,totp,checkTotp,toCents,formatCents,gmFunds,crFunds} from '../server/lib.mjs';
test('GM supply exactly 150M and CR 1B',()=>{assert.equal(Object.values(gmFunds).reduce((a,b)=>a+b,0),150000000);assert.equal(Object.values(crFunds).reduce((a,b)=>a+b,0),1000000000)});
test('integer cents no float rounding',()=>{assert.equal(toCents('0.01'),1);assert.equal(toCents('125.75'),12575);assert.equal(formatCents(12575),'125.75');assert.throws(()=>toCents('0.001'));assert.throws(()=>toCents('0'));assert.throws(()=>toCents('-1'))});
test('real HMAC verification of Telegram initData and tampering detection',()=>{
 const token='123:test-bot';const t=Math.floor(Date.now()/1000);
 const fields=new URLSearchParams({auth_date:String(t),user:JSON.stringify({id:123456,first_name:'Demo'}),query_id:'ABC'});
 const check=[...fields.entries()].map(([k,v])=>`${k}=${v}`).sort().join('\n');
 const secret=crypto.createHmac('sha256','WebAppData').update(token).digest();const hash=crypto.createHmac('sha256',secret).update(check).digest('hex');fields.set('hash',hash);
 const raw=fields.toString();assert.equal(verifyInitData(raw,token).id,'123456');
 assert.throws(()=>verifyInitData(raw.replace('Demo','Bad'),token));assert.throws(()=>verifyInitData(raw,token,t+90000));
});
test('TOTP respects 30sec time window',()=>{const key='JBSWY3DPEHPK3PXP';const t=1700000000000;const code=totp(key,t);assert.equal(code.length,6);assert.equal(checkTotp(key,code,t),true);assert.equal(checkTotp(key,'000000',t+300000),false)});
