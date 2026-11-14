import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const code = readFileSync(new URL('../server/game.mjs', import.meta.url),'utf8');
const calendar = readFileSync(new URL('../server/postgres-calendar.mjs',import.meta.url),'utf8');
const ui = readFileSync(new URL('../miniapp/src/main.tsx',import.meta.url),'utf8');

test('calendar gift opening is paid by owned box inventory, not caller claims',()=>{
  const start=code.indexOf("if(p==='/api/boxes/open'");
  const end=code.indexOf("if(p==='/api/exchange/book'",start);
  const handler=code.slice(start,end);
  assert.ok(start>0 && end>start);
  assert.match(handler,/body\.source==='calendar'/);
  assert.match(handler,/GM_DATABASE_DRIVER!=='postgres'/);
  assert.match(handler,/gm_internal\.box_inventory SET quantity=quantity-\?/);
  assert.match(handler,/quantity>=\?/);
  assert.match(handler,/calendarGift\?0:unitCost\*count/);
  assert.match(handler,/takePool\('BOXES','gm',n\)/);
  assert.match(handler,/walletChange\(id,'gm',n\)/);
  assert.match(handler,/box_day/);
  assert.match(handler,/once\(op\(\),id,'box_open'/);
  assert.match(handler,/source:calendarGift\?'calendar':'points'/);
  assert.match(handler,/not enough POINTS/);
});

test('calendar queries player-bound HP and earned box quantities',()=>{
  assert.match(calendar,/WHERE player_id=\$1/);
  assert.match(calendar,/currency='HP'/);
  assert.match(calendar,/SELECT tier,quantity FROM gm_internal\.box_inventory/);
  assert.match(calendar,/hp:Number\(hp\.rows\[0\]\?\.balance\?\?0\)/);
  assert.match(calendar,/pg_advisory_xact_lock/);
});

test('gift UI never invents award counts and passes authenticated box source',()=>{
  assert.match(ui,/calendarAssets\?\.inventory/);
  assert.match(ui,/api\('\/api\/autumn-calendar'/);
  assert.match(ui,/source,operationId:cryptoId\(\)/);
  assert.match(ui,/openBox\(selected\.kind,1,'calendar'\)/);
  assert.match(ui,/giftCount<1/);
  assert.match(ui,/Полученные бонусы/);
});
