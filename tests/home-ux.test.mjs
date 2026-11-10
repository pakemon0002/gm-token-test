import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const source=()=>read('../miniapp/src/main.tsx');
// Generated JS may add whitespace and unicode-escape JSX text; compare semantics.
const compiled=()=>read('../miniapp/public/main.js').replace(/\\u([0-9a-fA-F]{4})/g,(_,hex)=>String.fromCharCode(parseInt(hex,16))).replace(/\s+/g,'');
test('Premium Home is shared across Silver and Graphite and has real server balances/market data',()=>{
 for(const code of [source(),compiled()]){
  assert.ok(code.includes('gm-home-v8'));
  assert.ok(code.includes('gm-home-wallet'));
  assert.ok(code.includes('gm-home-shortcuts'));
  assert.ok(code.includes('gm-home-offer'));
  assert.ok(code.includes('liveTicker?.last_price'));
  assert.ok(code.includes('liveCandles||[]'));
  assert.ok(code.includes('liveState?.points?.points'));
  assert.ok(code.includes('goto(\'mining\')'));
 }
});
test('Mining has single central GM coin and progress from server storage/capacity',()=>{
 for(const code of [source(),compiled()]){
  assert.ok(code.includes('gm-mining-coin-wrap'));
  assert.ok(code.includes('gm-mining-coin-rim'));
  assert.ok(code.includes('onClick:mineClick'));
  assert.ok(code.includes('rate*hours/24'));
  assert.ok(code.includes('wallet.storage'));
  assert.ok(code.includes('miningClaim()'));
 }
});
test('Boxes only reveal the server-approved reward after successful operation',()=>{
 for(const code of [source(),compiled()]){
  assert.ok(code.includes('gm-box-result'));
  assert.ok(code.includes('gm-crate'));
  assert.ok(code.includes('gm_cents!=null'));
  assert.ok(code.includes("api('/api/boxes/open'"));
  assert.ok(code.includes('setBoxReveal'));
  assert.ok(code.includes('disabled:demo||!enabled||points<cost||boxBusy'));
 }
});
test('Daily Reward and Holding retain server verified payouts and themed actions',()=>{
 for(const code of [source(),compiled()]){
  assert.ok(code.includes('gm-daily-v8'));
  assert.ok(code.includes('daily_reward_gm'));
  assert.ok(code.includes('disabled:demo||!enabled||claimed'));
  assert.ok(code.includes('vault-deposit'));
  assert.ok(code.includes('vault-withdraw'));
 }
});
test('Premium design has reduced-motion support, 5 tabs, consistent font and both themes',()=>{
 const css=read('../miniapp/public/styles.css');
 for(const term of ['GM TOKEN Premium v8','gm-home-v8','gm-mining-coin-wrap',
 'gm-box-open','.theme-dark .gm-premium-card','.theme-dark .gm-mining-coin-wrap',
 "font-family:'Inter'",'repeat(5,minmax(0,1fr))','prefers-reduced-motion:reduce']){
  assert.ok(css.includes(term),'missing '+term);
 }
 assert.ok(css.includes('-webkit-tap-highlight-color:transparent'));
 assert.ok(css.includes('focus-visible'));
 assert.ok(css.includes('.theme-dark .vault-deposit'));
});
