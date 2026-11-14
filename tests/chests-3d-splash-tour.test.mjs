import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('compact splash v4 has original metallic brand and accessible loading',()=>{
 const source=read('miniapp/src/main.tsx');
 const css=read('miniapp/src/styles.css');
 assert.ok(source.includes('gm-splash-v4-coin-inner'));
 assert.ok(source.includes('role="status" aria-live="polite"'));
 assert.ok(source.includes('gm-splash-v4-track'));
 assert.ok(css.includes('.gm-splash-v4 .gm-splash-v4-coin{'));
 assert.ok(css.includes('width:166px;height:166px'));
 assert.ok(css.includes('@keyframes gm-splash-v4-progress'));
});

test('boxes step tutorial points at five controls that exist in current UI',()=>{
 const source=read('miniapp/src/main.tsx');
 const section=source.slice(source.indexOf('function Boxes(){'),source.indexOf('function BoxRevealModal(){'));
 const entries=source.slice(source.indexOf('boxes:[',source.indexOf('const guideCatalog')),source.indexOf('tasks:[',source.indexOf('const guideCatalog')));
 for(const selector of ['gm-boxes-points','gm-chests-list','gm-chests-qty','gm-chests-open']){
  assert.ok(entries.includes('.'+selector),selector+' missing from tour');
  assert.ok(section.includes(selector),selector+' missing from Boxes');
 }
 assert.ok(entries.includes('.gm-flat-card.selected .gm-flat-card-image'),'selected card anchor missing');
 assert.ok(section.includes("className:'gm-flat-card-image'"),'card image missing');
 assert.ok(section.includes("className:'gm-chest-choice gm-flat-card '"),'selected card class missing');
 for(const k of ['boxes.points','boxes.choose','boxes.preview','boxes.quantity','boxes.claim']){
  assert.ok(source.includes("'"+k+"':{"),k+' copy missing');
 }
 assert.ok(source.includes("'gm_tour_v25_gmtokenapp_'+authenticatedUserId+'_'+section"));
 assert.ok(source.includes("setAuthenticatedUserId(String(d.user?.id||''))"));
 assert.ok(section.includes("onClick:()=>openGuide('boxes')"));
});
test('approved flat catalog replaces 3D staging and keeps reduced-motion support',()=>{
 const source=read('miniapp/src/main.tsx'),css=read('miniapp/src/styles.css');
 const deployed=read('miniapp/public/styles.css');
 assert.equal(css,deployed);
 assert.ok(source.includes('gm-flat-catalog'));
 assert.ok(source.includes('gm-flat-opening'));
 assert.ok(source.includes("className:'gm-flat-card-image'"));
 assert.ok(!source.includes("' gm-chest-stage-art'"));
 assert.ok(css.includes('.gm-flat-boxes .gm-flat-card'));
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
 assert.ok(!source.includes('GMChest3D'));
 assert.ok(!source.includes('gm-chest-3d-canvas'));
});
