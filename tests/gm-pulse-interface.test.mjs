import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('GM PULSE uses a real animated locally rendered reactor in both TSX and compiled JS',()=>{
 for(const path of ['miniapp/src/main.tsx','miniapp/public/main.js']){
  const code=read(path);
  for(const fragment of ['function PulseReactor(', 'gm-pulse-stage','gm-pulse-sphere','gm-pulse-orbit-one',
   'gm-pulse-crystal','gm-pulse-platform','gm-pulse-hero','gm-pulse-progress-track',
   'gm-pulse-collect','gm-boosts-list','gm-pulse-ton-panel','gm-pulse-details']){
   assert.ok(code.includes(fragment),path+' lacks '+fragment);
  }
  assert.ok(code.includes('function Boosts()'),path);
  assert.ok(code.includes('openWalletFromMining'),path);
  assert.ok(code.includes('miningClaim()'),path);
  const start=code.indexOf('function Mining()'),end=code.indexOf('function WalletConnection()',start);
  assert.ok(start>=0&&end>start,path);
  const mining=code.slice(start,end);
  assert.ok(mining.includes('gm-upgrades-purchase'),'legacy in-game progression must remain accessible');
  assert.ok(mining.includes('miningBusy'),'claim button must respect a pending server request');
  assert.ok(!mining.includes('sendTransaction('),'visual concept cannot initiate TON payments');
  assert.ok(!mining.includes('feeNanogram'),'no payment logic in concept UI');
 }
});

test('TON concept is explicitly inactive without fictional rewards or upgrade purchase',()=>{
 const code=read('miniapp/src/main.tsx');
 const start=code.indexOf('function Mining()'),end=code.indexOf('function WalletConnection()',start);
 const ui=code.slice(start,end);
 for(const fragment of ['TON FARM','СКОРО','Выплаты TON и покупки улучшений не включены.',
  'Повышенные выплаты, цены в TON и покупка модулей не включены.','Игровая добыча активна',
  'УРОВЕНЬ','Собрать GM','Проверить накопление']){
  assert.ok(ui.includes(fragment),'must communicate unlaunched TON farm: '+fragment);
 }
 assert.ok(!ui.includes('0,10 TON/день'));
 assert.ok(!ui.includes('5 TON'));
 assert.ok(!ui.includes('Ежедневная прибыль'));
});

test('Tutorial targets visible pulse controls instead of now-collapsed advanced section',()=>{
 const code=read('miniapp/src/main.tsx');
 const line=code.split('\n').find(x=>x.includes('mining:[['));
 assert.ok(line);
 for(const target of ['.gm-pulse-stage','.gm-pulse-collect','.gm-pulse-ton-panel','.gm-pulse-wallet','.gm-pulse-progress'])
  assert.ok(line.includes(target),'missing visible guide target '+target);
 for(const oldHidden of ['.gm-mining-coin-wrap','.gm-mining-claim','.gm-upgrades-purchase'])
  assert.ok(!line.includes(oldHidden),'guide must not point to collapsed details: '+oldHidden);
});

test('Served premium animation CSS stays source-aligned and respects reduced motion',()=>{
 const source=read('miniapp/src/styles.css'),served=read('miniapp/public/styles.css');
 assert.equal(served,source,'deployed CSS must match source');
 for(const part of ['.gm-pulse-stage','@keyframes gm-pulse-orbit-one','@keyframes gm-pulse-orbit-two',
  '@keyframes gm-pulse-hover','.theme-light .gm-pulse-hero','.theme-dark .gm-pulse-boost',
  '@media(prefers-reduced-motion:reduce)','.gm-pulse-collect','.gm-pulse-details'])
  assert.ok(served.includes(part),'missing style '+part);
 const html=read('miniapp/public/preview.html');
 assert.match(html,/main\.js\?v=[A-Za-z0-9_-]+/);
 assert.match(html,/styles\.css\?v=[A-Za-z0-9_-]+/);
});
