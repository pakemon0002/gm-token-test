import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
// TSC emits semantically equivalent whitespace; verify the same tokens across TSX and JS.
const has=(code,fragment)=>code.replace(/\\s+/g,'').includes(fragment.replace(/\\s+/g,''));
test('Admin entry and route are restricted to verified Owner/Co-Owner in both UIs and server',()=>{
 const tsx=read('../miniapp/src/main.tsx'),js=read('../miniapp/public/main.js');
 for(const code of [tsx,js]){
  assert.ok(has(code,"if(['owner','coowner'].includes(liveRole))groups.push"));
 }
 assert.ok(has(tsx,"case 'admin':view=['owner','coowner'].includes(liveRole)?Admin():Home()"));
 assert.ok(jhas(s,"view = ['owner', 'coowner'].includes(liveRole) ? Admin() : Home();"));
 const server=read('../server/index.mjs');
 assert.ok(has(server,"roleCheck({id},['owner','coowner'])"));
 assert.ok(has(server,"const ownerIds=(process.env.OWNER_TELEGRAM_IDS||'')"));
});
test('Spot ribbon uses real server state rather than synthetic prices',()=>{
 for(const code of [read('../miniapp/src/main.tsx'),read('../miniapp/public/main.js')]){
  assert.ok(has(code,'TEST SPOT'));
  assert.ok(has(code,'Цена появится после первой исполненной сделки между разными игроками'));
 }
 const market=read('../server/game.mjs');
 assert.ok(has(market,"GM_TEST_OPEN_TRADING==='1'"));
 assert.ok(has(market,"trade_test_mode:v('trade_test_mode')==='1'"));
});
