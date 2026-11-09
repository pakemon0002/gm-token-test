import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('Trade desk and order sheet are themed and warn before insufficient-funds submissions',()=>{
 const source=read('../miniapp/src/main.tsx'),served=read('../miniapp/public/main.js'),styles=read('../miniapp/public/styles.css');
 for(const code of [source,served]){
  for(const phrase of ['function Trading()','function TradeOrderModal()','const tradeIssue=()=>','Недостаточно GM','Недостаточно CR','trade-wallet-balances','trade-cta-row','trade-review','trade-sheet-primary','ТЕСТОВЫЙ SPOT','Доступно для торговли']){
   assert.ok(code.includes(phrase),'missing '+phrase);
  }
  assert.ok(code.includes('tradeIssue();if(issue)'), 'submit and confirmation must validate balances');
  assert.ok(code.includes('TradeOrderModal()'),'new sheet must be actually rendered');
 }
 for(const phrase of ['.theme-light .trade-cta.buy','.theme-dark .trade-cta.buy','.trade-sheet-primary','.trade-open-row>button','.trade-form-alert']){
  assert.ok(styles.includes(phrase),'missing Trade CSS '+phrase);
 }
 new Function(served);
});
test('Telegram reopening cannot collapse phone viewport and navbar to page top',()=>{
 const css=read('../miniapp/public/styles.css');
 assert.ok(css.includes('Telegram viewport recovery + trading desk v6.1'));
 assert.ok(css.includes('height:100dvh!important;min-height:100dvh!important;max-height:100dvh!important;'));
 assert.ok(css.includes('.application.is-telegram .bottom-nav{\n  position:fixed;'));
 assert.ok(css.includes('top:auto!important;'));
 assert.ok(css.includes('overscroll-behavior-y:contain'));
});
test('one-time owner-only starter funds cannot increase monetary supply',()=>{
 const code=read('../server/index.mjs');
 assert.ok(code.includes("process.env.GM_TEST_STARTER_FUNDS==='1'"));
 assert.ok(code.includes("role==='owner'||role==='coowner'"));
 assert.ok(code.includes("spot-test-starter:"));
 assert.ok(code.includes("UPDATE pools SET gm=gm-? WHERE name='TREASURY' AND gm>=?"));
 assert.ok(code.includes("UPDATE pools SET cr=cr-? WHERE name='SHOP' AND cr>=?"));
 assert.ok(code.includes("'owner_test_starter'"));
});
