import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {miningUpgradeBonusPct, miningUpgradeBonusBps, miningUpgradeTable} from '../server/mining-progression.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('200 upgrades have a server-authoritative linear +5% to +1000% bonus',()=>{
 const table=miningUpgradeTable();
 assert.equal(table.length,200);
 assert.equal(miningUpgradeBonusPct(1),5);
 assert.equal(miningUpgradeBonusPct(100),500);
 assert.equal(miningUpgradeBonusPct(200),1000);
 assert.equal(miningUpgradeBonusBps(1),500);
 assert.equal(miningUpgradeBonusBps(200),100000);
 for(let i=2;i<=200;i++)assert.equal(table[i-1].bonus_pct-table[i-2].bonus_pct,5);
});

test('responsive trading corrections ship in the served stylesheet',()=>{
 const source=read('miniapp/src/styles.css'),served=read('miniapp/public/styles.css');
 assert.equal(source,served,'shipped CSS must not lag behind source');
 for(const term of ['@media(max-width:600px)', 'grid-template-columns:repeat(2,minmax(0,1fr))!important',
  '.application .gm-trade-quick-presets', '.application .gm-trade-quick-continue'])assert.ok(served.includes(term),term);
});

test('mining uses a high-resolution vector emblem served with SVG MIME',()=>{
 const css=read('miniapp/public/styles.css'),svg=read('miniapp/public/assets/brand-original-reference/gm-mining-coin-hd.svg'),server=read('server/index.mjs');
 assert.ok(css.includes('gm-mining-coin-hd.svg'));
 assert.ok(svg.includes('viewBox="0 0 1024 1024"'));
 assert.ok(server.includes("'.svg':'image/svg+xml'"));
});

test('Telegram long-press avoids native asset links without breaking inputs',()=>{
 const css=read('miniapp/public/styles.css'),html=read('miniapp/public/preview.html');
 assert.ok(css.includes('-webkit-touch-callout:none'));
 assert.ok(css.includes('.application .gm-icon'));
 assert.ok(html.includes("document.addEventListener('contextmenu'"));
 assert.ok(html.includes("e.preventDefault()"));
 assert.ok(!html.includes("closest('input'"),'do not block text input copy/paste');
});
