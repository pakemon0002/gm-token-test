import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
const src=new URL('../miniapp/src/main.tsx',import.meta.url);
const bundled=new URL('../miniapp/public/main.js',import.meta.url);
const html=new URL('../miniapp/public/preview.html',import.meta.url);
const root=new URL('../miniapp/public/assets/icons/',import.meta.url);
test('new player GUI starts at zero GM, zero vault, level one; no fake account is bundled',()=>{
 const source=readFileSync(src,'utf8'),prod=readFileSync(bundled,'utf8');
 assert.match(source,/firstWallet:Wallet\s*=\s*\{gm:0,cr:0,vault:0,xp:0,level:1/);
 for(const fake of ['12487','12 487','GM_Holder','Web3Rizz','48 256']){
  assert.ok(!source.includes(fake),'source must not contain fake value '+fake);
  assert.ok(!prod.includes(fake),'compiled app must not contain fake value '+fake);
 }
 assert.ok(!source.includes('demoTasks:any[]'));
 assert.ok(source.includes("window.localStorage.removeItem('gm_demo_wallet')"));
 assert.ok(source.includes('Требуется вход через Telegram'));
});
test('production UI uses authenticated server OHLCV/market ticker, with no synthetic chart generator',()=>{
 const source=readFileSync(src,'utf8'),prod=readFileSync(bundled,'utf8');
 for(const uri of ['/api/market/ticker','/api/market/ohlcv','/api/exchange/book']){
  assert.ok(source.includes(uri));assert.ok(prod.includes(uri));
 }
 assert.ok(source.includes('.slice(-48)'),'chart shows only up to 48 real OHLCV candles');
 assert.ok(prod.includes('.slice(-48)'),'compiled chart must match the source');
 assert.ok(source.includes('Пока нет исполненных сделок'),'no-trades state must be honest');
 const page=readFileSync(html,'utf8');assert.ok(page.includes('Telegram Mini App'));assert.ok(!page.includes('офлайн демо'));
});
test('all 216 original icon PNG assets are in the project and bundled build',()=>{
 let n=0;
 for(const theme of ['light','dark'])for(const style of ['tiles','transparent']){
  const loc=new URL(`${theme}/${style}/`,root);const files=readdirSync(loc).filter(x=>x.endsWith('.png'));
  assert.equal(files.length,54,theme+'/'+style+' must retain 54 original icons');n+=files.length;
 }
 assert.equal(n,216);assert.ok(existsSync(new URL('../miniapp/public/styles.css',import.meta.url)));
});
