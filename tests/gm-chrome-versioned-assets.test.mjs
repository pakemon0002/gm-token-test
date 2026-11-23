import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Metallic icons and cache-fresh premium panels are deployed for both themes',()=>{
 const src=get('miniapp/src/main.tsx'),js=get('miniapp/public/main.js'),css=get('miniapp/src/styles.css'),
  published=get('miniapp/public/styles.css'),html=get('miniapp/public/preview.html');
 assert.equal(css,published);
 for(const t of ['ChromeAsset','gm-premium-bonus-panel','gm-premium-prize-preview','prizeFrameIcon']){
  assert.ok(src.includes(t),t);assert.ok(js.includes(t),t);
 }
 for(const name of ['gift','coins','hp','chest','xp','diamond','star','chevrons','bars','cube','frame','starframe','crownframe']){
  assert.ok(existsSync(new URL('../miniapp/public/assets/premium/chrome-'+name+'.svg',import.meta.url)),name);
 }
 assert.match(html,/styles\.css\?v=[A-Za-z0-9_-]+/,'Mini App CSS must be cache-busted in Telegram');
 assert.match(html,/main\.js\?v=[A-Za-z0-9_-]+/,'Mini App entry must remain versioned for Telegram cache busting');
 assert.ok(css.includes('.application.theme-dark .gm-calendar .gm-premium-bonus-panel'));
 assert.ok(css.includes('.application.theme-light .gm-calendar .gm-premium-bonus-panel'));
});
