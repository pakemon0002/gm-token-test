import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../miniapp/src/main.tsx',import.meta.url),'utf8');
const served=readFileSync(new URL('../miniapp/public/main.js',import.meta.url),'utf8');
const styles=readFileSync(new URL('../miniapp/src/styles.css',import.meta.url),'utf8');
const servedStyles=readFileSync(new URL('../miniapp/public/styles.css',import.meta.url),'utf8');

test('bonus cards and chest preview keep real rewards and get original monochrome icons in both builds',()=>{
 for(const code of [source,served]){
  for(const token of ['gm-premium-bonus-panel','gm-premium-prize-preview','gm-bonus-stat-hp','gm-bonus-stat-box',
   'gm-hp-collectible-art','gm-hp-collectible-state','ChromeAsset','gm-chest-prize-guaranteed',
   'gm-chest-prize-progress','prizeFrameIcon']){
   assert.ok(code.includes(token),'missing '+token);
  }
  assert.ok(code.includes("this.unlockCosmetic(item.id)"));
  assert.ok(code.includes("reward>0?")||code.includes("reward > 0 ?"));
  assert.ok(code.includes("collection[selected.kind]")||code.includes("collection[selected.kind]"));
  assert.ok(code.includes("data.inventory"));
  assert.ok(code.includes("name:'xp'")||code.includes("name: 'xp'"),'XP should use metallic artwork');
  assert.doesNotMatch(code,/icon\(['"]award['"],\s*23|icon\(['"]sparkles['"],\s*23/);
 }
 assert.equal(styles,servedStyles,'source stylesheet is the one served in Telegram');
 for(const token of ['.application.theme-dark .gm-premium-bonus-panel',
  '.application.theme-light .gm-premium-bonus-panel',
  '.theme-dark .gm-flat-boxes .gm-premium-prize-preview',
  '.application.theme-light .gm-flat-boxes .gm-premium-prize-preview',
  '.gm-hp-lock','.gm-hp-collectible-state','.gm-chest-prize-value']){
  assert.ok(styles.includes(token),'missing '+token);
 }
});
test('disabled cosmetics remain server-controlled and no fabricated milestones added',()=>{
 assert.ok(source.includes('disabled:busy||!canUnlock'));
 assert.ok(source.includes('onClick:()=>this.unlockCosmetic(item.id)'));
 assert.ok(source.includes('frameRewards.filter((f:any)=>f.kind===selected.kind)'));
 assert.ok(source.includes('progress>=required'));
 assert.ok(source.includes('data.hp_cosmetics'));
});
