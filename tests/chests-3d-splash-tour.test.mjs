import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('compact splash uses dedicated silver/graphite coin and accessible loading status',()=>{
 const source=read('miniapp/src/main.tsx');
 const css=read('miniapp/src/styles.css');
 assert.ok(source.includes('gm-splash-v3-seal'));
 assert.ok(source.includes('role="status" aria-live="polite"'));
 assert.ok(source.includes('gm-splash-v3-progress'));
 assert.ok(css.includes('.gm-splash-v3-seal{'));
 assert.ok(css.includes('width:176px;height:176px'));
 assert.ok(css.includes('@keyframes gm-splash-v3-load'));
});
test('boxes step tutorial points at five controls that exist in current UI',()=>{
 const source=read('miniapp/src/main.tsx');
 const section=source.slice(source.indexOf('function Boxes(){'),source.indexOf('function BoxRevealModal(){'));
 const entries=source.slice(source.indexOf('boxes:[',source.indexOf('const guideCatalog')),source.indexOf('tasks:[',source.indexOf('const guideCatalog')));
 for(const selector of ['gm-boxes-points','gm-chests-list','gm-chest-stage-art','gm-chests-qty','gm-chests-open']){
  assert.ok(entries.includes('.'+selector),selector+' missing from tour');
  assert.ok(section.includes(selector),selector+' missing from Boxes');
 }
 for(const k of ['boxes.points','boxes.choose','boxes.preview','boxes.quantity','boxes.claim']){
  assert.ok(source.includes("'"+k+"':{"),k+' copy missing');
 }
 assert.ok(source.includes("'gm_tour_v24_'+authenticatedUserId+'_'+section"));
 assert.ok(source.includes("setAuthenticatedUserId(String(d.user?.id||''))"));
 assert.ok(section.includes("onClick:()=>openGuide('boxes')"));
});
test('3D chest style stays within silver graphite look with accessibility fallback',()=>{
 const css=read('miniapp/src/styles.css');
 const served=read('miniapp/public/styles.css');
 assert.equal(css,served);
 assert.ok(css.includes('gm-chest-3d'));
 assert.ok(css.includes('@keyframes gm-chest-3d-hover'));
 assert.ok(css.includes('.gm-boxes-v9 .gm-chest-choice.selected'));
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
 assert.ok(css.includes('gm-chests-animation-lid'));
});
