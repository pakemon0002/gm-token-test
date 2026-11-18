import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Mining claim button stays clickable below 1 GM and explains collection threshold',()=>{
 for(const path of ['miniapp/src/main.tsx','miniapp/public/main.js']){
  const src=read(path);
  const start=src.indexOf('function Mining()');
  const end=src.indexOf('function WalletConnection()',start);
  assert.ok(start>=0&&end>start,path);
  const mining=src.slice(start,end);
  assert.ok(mining.includes('gm-mining-claim'));
  assert.ok(!/disabled:\s*demo\s*\|\|\s*stored\s*<\s*1/.test(mining),'do not dead-disable claim below 1 GM');
  assert.ok(mining.includes('Проверить накопление'));
  assert.ok(mining.includes('Сбор доступен от 1 GM'));
  assert.ok(mining.includes('miningBusy'),'disable only during an in-flight operation');
 }
});

test('Mining claim validates fresh server pending amount before spending idempotency key',()=>{
 for(const path of ['miniapp/src/main.tsx','miniapp/public/main.js']){
  const src=read(path);
  assert.ok(src.includes("'/api/game/status'"),path);
  assert.ok(src.includes("'/api/mining/claim'"),path);
  assert.ok(src.includes('pending<100')||src.includes('pending < 100'),path);
  assert.ok(src.includes('miningClaimLock.current'),path);
  assert.ok(src.includes('Проверяем…'),path);
  assert.ok(src.includes('Покупка улучшений пока отключена'),path);
 }
});

test('Mining upgrades stay server-controlled without misleading disabled button',()=>{
 for(const path of ['miniapp/src/main.tsx','miniapp/public/main.js']){
  const src=read(path);
  assert.ok(src.includes("'/api/mining/upgrade'"),path);
  assert.ok(src.includes('!upgradeData?.upgrade?.purchasable'),path);
  assert.ok(!src.includes("if(!upgradeData?.upgrade?.purchasable){goto('wallet')"),path);
 }
});
