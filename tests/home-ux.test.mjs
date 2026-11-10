import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
// TSC emits semantically equivalent whitespace; verify the same tokens across TSX and JS.
const has=(code,fragment)=>code.replace(/\s+/g,'').includes(fragment.replace(/\s+/g,''));
const source=()=>read('../miniapp/src/main.tsx');
const compiled=()=>read('../miniapp/public/main.js');
test('Premium Home is shared across Silver and Graphite and has real server balances/market data',()=>{
 for(const code of [source(),compiled()]){
  assert.ok(has(code,'gm-home-v8'));
  assert.ok(has(code,'gm-home-wallet'));
  assert.ok(has(code,'gm-home-shortcuts'));
  assert.ok(has(code,'gm-home-offer'));
  assert.ok(has(code,'liveTicker?.last_price'));
  assert.ok(has(code,'liveCandles||[]'));
  assert.ok(has(code,'liveState?.points?.points'));
  assert.ok(has(code,'goto(\'mining\')'));
 }
});
test('Mining has single central GM coin and progress from server storage/capacity',()=>{
 for(const code of [source(),compiled()]){
  assert.ok(has(code,'gm-mining-coin-wrap'));
  assert.ok(has(code,'gm-mining-coin-rim'));
  assert.ok(has(code,'onClick:mineClick'));
  assert.ok(has(code,'rate*hours/24'));
  assert.ok(has(code,'wallet.storage'));
  assert.ok(has(code,'miningClaim()'));
 }
});
test('Boxes only reveal the server-approved reward after successful operation',()=>{
 for(const code of [source(),compiled()]){
  assert.ok(has(code,'gm-box-result'));
  assert.ok(has(code,'gm-crate'));
  assert.ok(has(code,'gm_cents!=null'));
  assert.ok(has(code,"api('/api/boxes/open'"));
  assert.ok(has(code,'setBoxReveal'));
  assert.ok(has(code,'disabled:demo||!enabled||points<cost||boxBusy'));
 }
});
test('Daily Reward and Holding retain server verified payouts and themed actions',()=>{
 for(const code of [source(),compiled()]){
  assert.ok(has(code,'gm-daily-v8'));
  assert.ok(has(code,'daily_reward_gm'));
  assert.ok(has(code,'disabled:demo||!enabled||claimed'));
  assert.ok(has(code,'vault-deposit'));
  assert.ok(has(code,'vault-withdraw'));
 }
});
test('Premium design has reduced-motion support, 5 tabs, consistent font and both themes',()=>{
 const css=read('../miniapp/public/styles.css');
 for(const term of ['GM TOKEN Premium v8','gm-home-v8','gm-mining-coin-wrap',
 'gm-box-open','.theme-dark .gm-premium-card','.theme-dark .gm-mining-coin-wrap',
 "font-family:'Inter'",'repeat(5,minmax(0,1fr))','prefers-reduced-motion:reduce']){
  assert.ok(cshas(s,term),'missing '+term);
 }
 assert.ok(cshas(s,'-webkit-tap-highlight-color:transparent'));
 assert.ok(cshas(s,'focus-visible'));
 assert.ok(cshas(s,'.theme-dark .vault-deposit'));
});
