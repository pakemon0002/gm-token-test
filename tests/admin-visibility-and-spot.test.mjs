import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('Admin entry and route are restricted to verified Owner/Co-Owner in both UIs and server',()=>{
 const tsx=read('../miniapp/src/main.tsx'),js=read('../miniapp/public/main.js');
 for(const code of [tsx,js]){
  assert.ok(code.includes("if(['owner','coowner'].includes(liveRole))groups.push"));
 }
 assert.ok(tsx.includes("case 'admin':view=['owner','coowner'].includes(liveRole)?Admin():Home()"));
 assert.ok(js.includes("view = ['owner', 'coowner'].includes(liveRole) ? Admin() : Home();"));
 const server=read('../server/index.mjs');
 assert.ok(server.includes("roleCheck({id},['owner','coowner'])"));
 assert.ok(server.includes("const ownerIds=(process.env.OWNER_TELEGRAM_IDS||'')"));
});
test('Spot ribbon uses real server state rather than synthetic prices',()=>{
 for(const code of [read('../miniapp/src/main.tsx'),read('../miniapp/public/main.js')]){
  assert.ok(code.includes('TEST SPOT'));
  assert.ok(code.includes('Цена появится после первой исполненной сделки между разными игроками'));
 }
 const market=read('../server/game.mjs');
 assert.ok(market.includes("GM_TEST_OPEN_TRADING==='1'"));
 assert.ok(market.includes("trade_test_mode:v('trade_test_mode')==='1'"));
});
