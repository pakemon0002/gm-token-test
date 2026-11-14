import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('onboarding uses a compact custom language picker with flags, not OS select',()=>{
 const source=read('miniapp/src/main.tsx');
 const intro=source.slice(source.indexOf('function Intro(){'),source.indexOf('function GuideOverlay(){'));
 assert.ok(intro.includes('gm-intro-lang-trigger'));
 assert.ok(intro.includes('gm-intro-lang-results'));
 assert.ok(intro.includes('gmLanguages'));
 assert.ok(!intro.includes("e('select'"));
 assert.ok(source.includes("['pt','🇵🇹 Português']"));
});
test('per-section guide anchors real UI elements and gives helpful contextual copy',()=>{
 const source=read('miniapp/src/main.tsx'),styles=read('miniapp/src/styles.css');
 const guide=source.slice(source.indexOf('const guideCatalog:any='),source.indexOf('const closeGuide='));
 for(const selector of ['.gm-mining-coin-wrap','.gm-mining-claim','.gm-mining-upgrades',
  '.terminal-periods','.terminal-buy-sell','.gm-trade-quick-card','.gm-support-form']){
  assert.ok(guide.includes(selector),'guide missing target '+selector);
  assert.ok(source.split(selector.slice(1)).length>2,'target is only named in guide, not implemented: '+selector);
 }
 for(const css of ['.gm-tour-shade','.gm-tour-spotlight','.gm-tour-pointer','.gm-tour-card']){
  assert.ok(styles.includes(css),css);
 }
 assert.ok(source.includes("element?.scrollIntoView?.({behavior:'smooth'"),'tutorial scrolls to highlighted controls');
});
test('game market supports segmented buy/sell, inline quantity and separate order review',()=>{
 const source=read('miniapp/src/main.tsx'),styles=read('miniapp/src/styles.css');
 const trade=source.slice(source.indexOf('function Trading(){'),source.indexOf('function TradeOrderModal(){'));
 for(const needle of ['terminal-buy-sell','gm-trade-quick-card','gm-trade-quick-continue',
  'gm-trade-quick-presets','gm-trade-quick-total','onClick:()=>openTrade(side)']){
  assert.ok(trade.includes(needle),'market missing '+needle);
 }
 assert.ok(trade.indexOf("e(Candles,")<trade.indexOf("className:'terminal-periods'"),'timeframes below chart');
 assert.ok(source.includes("className:'gm-trade-type-pills'"));
 assert.ok(source.includes("className:'gm-trade-duration-pills'"));
 assert.ok(styles.includes('.gm-trade-quick-card'));
 assert.ok(styles.includes('.theme-dark .gm-trade-quick-continue'));
});
test('Support uses themed category chips, loads tickets on entering and shows specific confirmation',()=>{
 const source=read('miniapp/src/main.tsx');
 assert.ok(source.includes("if(demo||screen!=='support')return;"));
 const support=source.slice(source.indexOf('function Support(){'),source.indexOf('function AdminTestGrants(){'));
 assert.ok(support.includes('gm-support-category-grid'));
 assert.ok(!support.includes("e('select'"),'no native category drop-down');
 assert.ok(source.includes("flash('Обращение создано и сохранено')"));
 assert.ok(!source.includes("flash('Операция выполнена')"));
});
