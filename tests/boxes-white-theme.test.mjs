import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('all three white-theme chest cards keep identical compact layout, including selected',()=>{
 const src=read('miniapp/src/main.tsx');
 const boxes=src.slice(src.indexOf('function Boxes(){'),src.indexOf('function BoxRevealModal(){'));
 assert.ok(boxes.includes("className:'gm-flat-card-image'"),'shared image class');
 assert.ok(!boxes.includes('gm-chest-stage-art'),'old hero stage caused selected bronze card to stretch');
 assert.ok(boxes.includes("active?' selected':''"),'selected style remains');
 for(const kind of ['bronze','silver','gold'])assert.ok(boxes.includes("kind:'"+kind+"'"));
 const css=read('miniapp/src/styles.css');
 assert.ok(css.includes('.application .gm-flat-boxes .gm-flat-card{'));
 assert.ok(css.includes('min-height:128px!important;max-height:none!important'));
 assert.ok(css.includes('.application .gm-flat-boxes .gm-flat-card-image{'));
 assert.ok(css.includes('height:104px!important;min-height:0!important;'));
 assert.ok(css.includes('transform:none!important;animation:none!important;perspective:none!important;'));
});

test('white chest screen contains light backgrounds and readable dark text for every main component',()=>{
 const css=read('miniapp/src/styles.css');
 assert.equal(css,read('miniapp/public/styles.css'),'published CSS must match TSX stylesheet');
 const scoped=css.slice(css.indexOf('GM TOKEN 3.5 — unified Silver / White Boxes'));
 assert.ok(scoped.length>6500,'white theme must have an actual dedicated style');
 for(const name of ['.gm-flat-wallet{','.gm-flat-point-icon{','.gm-flat-wallet-balance strong{',
  '.gm-flat-points-help{','.gm-flat-tour-buttons button{','.gm-flat-points-detail{',
  '.gm-flat-card{','.gm-flat-card.silver{','.gm-flat-card.gold{',
  '.gm-flat-card.selected{','.gm-flat-card-body>b{','.gm-flat-card-body>small{',
  '.gm-flat-card-stats strong{','.gm-chests-qty button{','.gm-chests-qty button.active{',
  '.gm-chests-subtotal{','.gm-chests-subtotal b{','.gm-chests-open{',
  '.gm-chests-open:disabled{','.gm-chests-how-points{','.gm-boxes-honest{']){
  assert.ok(scoped.includes('.application.theme-light .gm-flat-boxes '+name),'missing theme-safe rule '+name);
 }
 for(const name of ['.gm-chests-result.gm-flat-result{','.gm-flat-result .gm-chest-reward-tile{',
  '.gm-flat-result .gm-chests-close{']){
  assert.ok(scoped.includes('.application.theme-light '+name),'light reward modal '+name);
 }
 assert.ok(scoped.includes('opacity:1!important;'),'disabled button should not fade to unreadability');
 assert.ok(scoped.includes('color:#192538!important'),'reward amounts need dark ink');
 // All changes should be light-theme scoped, except cross-theme consistency of card sizing.
 assert.ok(scoped.includes('.application.theme-light .gm-flat-boxes'));
 assert.ok(!scoped.includes('.application.theme-dark .gm-flat-boxes'));
});

test('guide points to selected chest card; daily economy and batch endpoints stay intact',()=>{
 const src=read('miniapp/src/main.tsx');
 const guide=src.slice(src.indexOf('const guideCatalog'),src.indexOf('const guideText'));
 assert.ok(guide.includes("'.gm-flat-card.selected .gm-flat-card-image'"));
 assert.ok(src.includes("api('/api/boxes/open'"));
 assert.ok(src.includes("disabled:demo||!enabled||!reward||boxBusy||points<totalCost"));
 assert.ok(src.includes('[1,3,5,10].map(count'));
 assert.ok(src.includes("'gm_tour_v25_gmtokenapp_'+authenticatedUserId+'_'+section"));
});
