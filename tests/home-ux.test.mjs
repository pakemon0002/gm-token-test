import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=()=>readFileSync(new URL('../miniapp/src/main.tsx',import.meta.url),'utf8');
const publicJs=()=>readFileSync(new URL('../miniapp/public/main.js',import.meta.url),'utf8');
const css=()=>readFileSync(new URL('../miniapp/public/styles.css',import.meta.url),'utf8');
test('light and dark Home render the same shortcuts and a direct Mining entry',()=>{
 for(const src of [source(),publicJs()]){
  assert.match(src,/home-quick-grid/);
  assert.match(src,/home-mining-card/);
  assert.match(src,/Mining · добыча GM/);
  assert.match(src,/\['candlesticks','Trade','trade'\]/);
  assert.match(src,/\['friends','Invite','referrals'\]/);
  assert.match(src,/isLight\?lightHome:darkHome/);
 }
});
test('POINTS on Home reference server balance and actual executed trades, never indicative orders',()=>{
 for(const src of [source(),publicJs()]){
  assert.match(src,/liveState\?\.points\?\.points/);
  assert.match(src,/10 POINTS за каждые 10 000 GM/);
  assert.match(src,/POINTS не начисляются/);
  assert.match(src,/Торгуй GM\/CR/);
  assert.match(src,/goto\('boxes'\)/);
 }
});
test('Daily Reward uses real enabled/claimed state with 7 day visuals and links to Mining',()=>{
 for(const src of [source(),publicJs()]){
  assert.match(src,/reward-v2/);
  assert.match(src,/reward-main-action/);
  assert.match(src,/disabled:!enabled\|\|claimed/);
  assert.match(src,/\[1,2,3,4,5,6,7\]/);
  assert.match(src,/goto\('mining'\)/);
  assert.match(src,/размер ежедневной выдачи GM ещё не утверждён/);
 }
});
test('Holding deposit and withdraw have custom themed artwork, without changing server endpoints',()=>{
 for(const src of [source(),publicJs()]){
  assert.match(src,/vault-deposit/);
  assert.match(src,/vault-withdraw/);
  assert.match(src,/icon\('deposit',24\)/);
  assert.match(src,/icon\('withdraw',24\)/);
  assert.match(src,/onClick:depositVault/);
  assert.match(src,/onClick:withdrawVault/);
 }
});
test('blue mobile tap highlight removed while keyboard focus remains visible',()=>{
 const styles=css();
 assert.match(styles,/-webkit-tap-highlight-color:transparent/);
 assert.match(styles,/focus-visible/);
 assert.match(styles,/\.theme-light \.collect-claim/);
 assert.match(styles,/\.theme-dark \.home-quick-grid/);
 assert.match(styles,/\.theme-dark \.vault-deposit/);
 assert.match(styles,/font-family:'Exo 2'/);
 assert.match(styles,/prefers-reduced-motion:reduce/);
});
