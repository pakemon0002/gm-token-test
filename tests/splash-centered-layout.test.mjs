import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('loading screen uses one centered vertical composition from badge through footer',()=>{
 const src=read('miniapp/src/main.tsx');
 const splash=src.slice(src.indexOf('function Splash(){'),src.indexOf('function Mining(){'));
 assert.ok(splash.includes('gm-splash-v3-content'));
 assert.ok(splash.includes('gm-splash-v3-coin-wrap'));
 assert.ok(splash.includes('gm-splash-v3-brand'));
 assert.ok(splash.includes('gm-splash-v3-loading'));
 assert.ok(splash.includes('gm-splash-v3-footer'));
 assert.ok(splash.indexOf('gm-splash-v3-badge')<splash.indexOf('gm-splash-v3-coin-wrap'));
 assert.ok(splash.indexOf('gm-splash-v3-coin-wrap')<splash.indexOf('gm-splash-v3-brand'));
 assert.ok(splash.indexOf('gm-splash-v3-brand')<splash.indexOf('gm-splash-v3-loading'));
 assert.ok(splash.indexOf('gm-splash-v3-loading')<splash.indexOf('gm-splash-v3-footer'));
 assert.ok(splash.indexOf('gm-splash-v3-footer')<splash.lastIndexOf('</div>'),'footer is part of inner content');
 assert.ok(splash.includes('role="status" aria-live="polite"'));
});
test('coin halo and brand, progress and footer have responsive shared alignment',()=>{
 const css=read('miniapp/src/styles.css'),production=read('miniapp/public/styles.css');
 assert.equal(css,production,'source and served CSS must remain synchronized');
 for(const token of [
  '.splash-view.gm-splash-v3{',
  '.splash-view.gm-splash-v3::before{',
  '.gm-splash-v3-coin-wrap{',
  'transform:translate(-50%,-50%)!important',
  '.gm-splash-v3 .gm-splash-v3-brand{',
  '.gm-splash-v3-loading{',
  '.gm-splash-v3 .gm-splash-v3-footer{',
  'position:static!important',
  '@media(max-height:640px)',
  '@media(prefers-reduced-motion:reduce)'
 ]) assert.ok(css.includes(token),token+' missing');
 assert.ok(css.includes('justify-content:center!important'));
});
