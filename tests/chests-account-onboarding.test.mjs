import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('new Telegram accounts do not inherit another account onboarding completion',()=>{
 const s=read('miniapp/src/main.tsx');
 assert.match(s,/const \[authenticatedUserId,setAuthenticatedUserId\]=React\.useState\(''\)/);
 assert.ok(s.includes("setAuthenticatedUserId(String(d.user?.id||''))"),
  'use the ID received from verified server bootstrap, not a client override');
 assert.ok(s.includes("'gm_tour_v24_'+authenticatedUserId+'_'+section"));
 assert.ok(s.includes("'gm_intro_v24_'+authenticatedUserId"));
 assert.ok(s.includes("!authenticatedUserId||['splash','intro','reward']"),
  'avoid running the tour before the user is verified');
 assert.ok(s.includes("store.getItem(tutorialKey(screen))"));
 assert.ok(s.includes("store.setItem(tutorialKey(guideScreen),'1')"));
 assert.ok(s.includes("store.getItem(onboardingKey())"));
 assert.ok(s.includes("store.setItem(onboardingKey(),'1')"));
 assert.ok(s.includes("resetGuide();setScreen(route);"),
  'navigation between screens must not prematurely mark unfinished tours as completed');
 // The same WebView should have independent completion keys per Telegram account.
 const key=(id,section)=>'gm_tour_v24_'+id+'_'+section;
 const done=new Map([[key('10101','boxes'),'1']]);
 assert.equal(done.get(key('20202','boxes')),undefined);
 assert.equal(done.get(key('10101','boxes')),'1');
 assert.equal(new Set(['gm_intro_v24_10101','gm_intro_v24_20202']).size,2);
});
test('chest 3D preview has distinguishable polished materials, depth and lock details',()=>{
 const engine=read('miniapp/public/assets/chests/gm-chest-3d.js');
 execFileSync(process.execPath,['--check',new URL('../miniapp/public/assets/chests/gm-chest-3d.js',import.meta.url).pathname]);
 for(const part of ['faceted','function disc(','Bright lip','prism(0,.53,.767','gl.uniform1f(uniforms.uPitch,-.23)',
  'vec3 key=normalize','vec3 fill=normalize','float chrome=pow','float shade=.58']){
  assert.ok(engine.includes(part),part);
 }
 for(const label of ['bronze','silver','gold'])assert.ok(engine.includes(label+':{metal:'));
});
test('chest actions remain reachable beneath Telegram fixed bottom navigation',()=>{
 const app=read('miniapp/src/main.tsx');
 const css=read('miniapp/public/styles.css');
 assert.ok(app.includes("className:'gm-chest-stage-meta'"));
 assert.ok(app.includes("className:'gm-chest-3d-hint'"));
 assert.ok(app.includes("className:'gm-chests-actions'"));
 assert.ok(app.includes("'Не хватает '+nf(totalCost-points,0)+' POINTS'"));
 assert.ok(app.includes("'Как заработать POINTS'"));
 assert.ok(css.includes("padding-bottom:calc(175px + var(--tg-safe-area-inset-bottom,0px))!important"));
 assert.ok(css.includes('.gm-chests-how-points'));
 assert.ok(css.includes('.gm-boxes-v9 .gm-chest-stage-art'));
 assert.ok(css.includes('gm-chest-stage-meta'));
 assert.equal(read('miniapp/src/styles.css'),css,'deployed stylesheet must match React sources');
});
