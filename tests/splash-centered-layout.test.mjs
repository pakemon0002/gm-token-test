import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('v4 splash has an unmistakable compact one-axis coin and loading composition',()=>{
 const src=read('miniapp/src/main.tsx');
 const splash=src.slice(src.indexOf('function Splash(){'),src.indexOf('function Mining(){'));
 const steps=['gm-splash-v4-eyebrow','gm-splash-v4-orbit','gm-splash-v4-wordmark',
  'gm-splash-v4-status','gm-splash-v4-tagline'];
 assert.ok(splash.includes('gm-splash-v4'), 'new version must be a distinct component');
 for(const step of steps)assert.ok(splash.includes(step),step);
 for(let i=1;i<steps.length;i++)assert.ok(splash.indexOf(steps[i-1])<splash.indexOf(steps[i]));
 assert.ok(splash.includes('role="status" aria-live="polite"'));
 assert.ok(!splash.includes('gm-splash-v3-halo'),'legacy giant background rings removed');
});
test('v4 CSS is responsive and disables inherited giant ring pseudo-element',()=>{
 const css=read('miniapp/src/styles.css'),production=read('miniapp/public/styles.css');
 assert.equal(css,production,'source and served CSS must remain synchronized');
 for(const token of ['.splash-view.gm-splash-v4{',
  '.splash-view.gm-splash-v4::before,','.gm-splash-v4 .gm-splash-v4-stack{',
  '.gm-splash-v4 .gm-splash-v4-orbit{',
  '.gm-splash-v4 .gm-splash-v4-wordmark h1{',
  '.gm-splash-v4 .gm-splash-v4-status{',
  '.gm-splash-v4 .gm-splash-v4-tagline{',
  '@media(max-height:640px)',
  '@media(prefers-reduced-motion:reduce)'
 ])assert.ok(css.includes(token),token);
 assert.ok(css.includes('content:none!important;display:none!important'));
});
test('Telegram loads versioned entry assets without stale HTML/JS/CSS cache',()=>{
 const html=read('miniapp/public/preview.html');
 const server=read('server/index.mjs');
 assert.ok(html.includes('styles.css?v=boxes-white-20261112'));
 assert.ok(html.includes('main.js?v=boxes-white-20261112'));
 assert.ok(html.includes('http-equiv="Cache-Control"'));
 assert.ok(server.includes("const noCache=ext==='.html'||ext==='.js'||ext==='.css';"));
 assert.ok(server.includes("'Cache-Control':'no-store, max-age=0, must-revalidate'"));
 assert.ok(server.includes("'Pragma':'no-cache'"));
 assert.ok(server.includes("loc==='/tonconnect-manifest.json'"),'manifest route preserved');
});
