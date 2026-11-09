import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('Admin navigation is shown only for verified Owner / Co-Owner and direct client routes are guarded',()=>{
 const tsx=read('../miniapp/src/main.tsx'),js=read('../miniapp/public/main.js');
 assert.match(tsx,/filter\(\(\[i,t,s\]\)=>s!=='admin'\|\|\['owner','coowner'\]\.includes\(liveRole\)\)/);
 assert.match(js,/filter\(\(\[i, t, s\]\) => s !== 'admin' \|\| \['owner', 'coowner'\]\.includes\(liveRole\)\)/);
 assert.ok(tsx.includes("case 'admin':view=['owner','coowner'].includes(liveRole)?Admin():Home()"));
 assert.ok(js.includes("view = ['owner', 'coowner'].includes(liveRole) ? Admin() : Home();"));
 const server=read('../server/index.mjs');
 assert.ok(server.includes("roleCheck({id},['owner','coowner'])"));
 assert.ok(server.includes("const ownerIds=(process.env.OWNER_TELEGRAM_IDS||'')"));
});
test('spot test ribbon is based on server status and is not a fake market price',()=>{
 for(const s of [read('../miniapp/src/main.tsx'),read('../miniapp/public/main.js')]){
  assert.ok(s.includes('ТЕСТОВЫЙ SPOT · GM/CR'));
  assert.ok(s.includes('Цена и объём появятся после настоящих сделок.'));
 }
 const market=read('../server/game.mjs');
 assert.ok(market.includes("GM_TEST_OPEN_TRADING==='1'"));
 assert.ok(market.includes("trade_test_mode:v('trade_test_mode')==='1'"));
});
