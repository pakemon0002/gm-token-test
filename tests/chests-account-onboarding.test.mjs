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
 assert.ok(s.includes("'gm_tour_v25_gmtokenapp_'+authenticatedUserId+'_'+section"));
 assert.ok(s.includes("'gm_intro_v25_gmtokenapp_'+authenticatedUserId"));
 assert.ok(s.includes("!authenticatedUserId||['splash','intro','reward']"),
  'avoid running the tour before the user is verified');
 assert.ok(s.includes("store.getItem(tutorialKey(screen))"));
 assert.ok(s.includes("store.setItem(tutorialKey(guideScreen),'1')"));
 assert.ok(s.includes("store.getItem(onboardingKey())"));
 assert.ok(s.includes("store.setItem(onboardingKey(),'1')"));
 assert.ok(s.includes("resetGuide();if(route==='intro')setIntroStep(0);setScreen(route);"),
  'navigation between screens must not prematurely mark unfinished tours as completed');
 // The same WebView should have independent completion keys per Telegram account.
 const key=(id,section)=>'gm_tour_v25_gmtokenapp_'+id+'_'+section;
 const done=new Map([[key('10101','boxes'),'1']]);
 assert.equal(done.get(key('20202','boxes')),undefined);
 assert.equal(done.get(key('10101','boxes')),'1');
 assert.equal(new Set(['gm_intro_v25_gmtokenapp_10101','gm_intro_v25_gmtokenapp_20202']).size,2);
 // Old bot completion must never suppress first-run guidance in @GmTokenApp.
 assert.notEqual(key('10101','boxes'),'gm_tour_v24_10101_boxes');
 assert.notEqual('gm_intro_v25_gmtokenapp_10101','gm_intro_v24_10101');
 assert.equal(done.get('gm_tour_v24_10101_boxes'),undefined);
});
test('approved chest badges are premium 2D graphics and no WebGL is loaded',()=>{
 const source=read('miniapp/src/main.tsx');
 const html=read('miniapp/public/preview.html');
 const htmlVite=read('miniapp/index.html');
 for(const kind of ['bronze','silver','gold']){
  const svg=read('miniapp/public/assets/chests/gm-chest-badge-'+kind+'.svg');
  assert.ok(svg.includes('GM TOKEN '+kind+' chest badge'));
 }
 assert.ok(!html.includes('gm-chest-3d.js'));
 assert.ok(!htmlVite.includes('gm-chest-3d.js'));
 assert.ok(!source.includes('GMChest3D'));
 assert.ok(source.includes('gm-flat-catalog'));
});

test('chest actions remain visible above Telegram navigation',()=>{
 const app=read('miniapp/src/main.tsx'),css=read('miniapp/public/styles.css');
 assert.ok(app.includes("className:'gm-flat-opening'"));
 assert.ok(app.includes("className:'gm-chests-actions'"));
 assert.ok(app.includes("'Не хватает '+nf(totalCost-points,0)+' POINTS'"));
 assert.ok(app.includes('Как заработать POINTS'));
 assert.ok(css.includes('padding:5px 1px calc(154px + var(--tg-safe-area-inset-bottom,0px))!important'));
 assert.ok(css.includes('.gm-flat-opening .gm-chests-open'));
 assert.equal(read('miniapp/src/styles.css'),css);
});
