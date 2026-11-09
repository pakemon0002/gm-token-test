import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('test grant interface exists in both source and served JS with separate owner+coowner controls',()=>{
 for(const path of ['../miniapp/src/main.tsx','../miniapp/public/main.js']){
  const code=read(path);
  for(const s of ['function AdminTestGrants()',"/api/admin/test-grant",'Совладельцу','Себе','Игроку','testCode','testCurrency','testRecipient','test-grants']){
   assert.ok(code.includes(s),path+' missing '+s);
  }
 }
});
test('GM TOKEN test grants have themed buttons and do not modify production economy gates',()=>{
 const css=read('../miniapp/public/styles.css');
 assert.ok(css.includes('.test-grants-options button.selected'));
 assert.ok(css.includes('.theme-dark .test-grants'));
 const srv=read('../server/index.mjs');
 assert.ok(srv.includes("GM_ADMIN_TEST_GRANTS!=='1'"));
 assert.ok(srv.includes("currency==='GM'?'TREASURY':'SHOP'"));
 assert.ok(srv.includes("roleCheck({id},['owner','coowner'])"));
 assert.ok(srv.includes("require2FA({id},body)"));
});
