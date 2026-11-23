import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const flat=(v)=>v.replace(/\s+/g,'');

test('The centered Farm dock replaces old market/chests navigation and routes all five primary buttons',()=>{
 const src=read('miniapp/src/main.tsx');
 const menu=src.slice(src.indexOf(' const menuItems='),src.indexOf(' function Home(){'));
 assert.ok(menu.includes('gm-pulse-bottom'));
 assert.ok(menu.includes("['tasks','tasks','Задания']"));
 assert.ok(menu.includes("['boosts','coins','Улучшения']"));
 assert.ok(menu.includes("['mining','lightning','Фарм']"));
 assert.ok(menu.includes("['wallet','wallet','Кошелёк']"));
 assert.ok(menu.includes("['more','more','Ещё']"));
 assert.ok(menu.includes("onClick={()=>goto(s)}"));
 const expected=['tasks','boosts','mining','wallet','more'];
 assert.deepEqual([...menu.matchAll(/\['(tasks|boosts|mining|wallet|more)','/g)].map(m=>m[1]),expected);
 assert.ok(src.includes("case 'boosts':view=Boosts();break;"));
 assert.ok(src.includes("case 'mining':view=Mining();break;"));
 assert.ok(src.includes("case 'wallet':view=WalletConnection();break;"));
 assert.ok(src.includes("setScreen(store.getItem(onboardingKey())?'mining':'intro')"));
 assert.ok(src.includes("navStack.current=[];setScreen('mining')"));
 assert.ok(src.includes("const allowed=['home','trade','earn','boosts','tasks'"));
 const js=read('miniapp/public/main.js');
 for(const k of ['gm-pulse-bottom','gm-pulse-shortcuts','function Boosts()','gm-boosts-page'])
  assert.ok(js.includes(k),'compiled Telegram UI missing '+k);
});

test('Farm actions and dedicated upgrades screen keep existing behaviors accessible',()=>{
 const src=read('miniapp/src/main.tsx');
 const mining=src.slice(src.indexOf('function Mining()'),src.indexOf('function Boosts()'));
 const boosts=src.slice(src.indexOf('function Boosts()'),src.indexOf('function WalletConnection()'));
 for(const expected of ['gm-pulse-shortcuts','gm-pulse-shortcut-boosts',"goto('boosts')","goto('tasks')",'gm-pulse-collect','mineClick','gm-pulse-ton-panel','gm-pulse-details','gm-upgrades-purchase','openWalletFromMining'])
  assert.ok(mining.includes(expected),'Mining should retain '+expected);
 for(const expected of ['gm-boosts-hero','gm-boosts-list','gm-boosts-card','gm-boosts-status','gm-boosts-actions',"goto('mining')","goto('wallet')",'TON-награды ещё не активированы','покупка модулей не включены'])
  assert.ok(boosts.includes(expected),'Upgrades screen missing '+expected);
 assert.ok(boosts.includes("e('details',"),'module descriptions expand without a purchase');
 assert.ok(!boosts.includes('sendTransaction('));
 assert.ok(!boosts.includes('/api/ton/withdraw'));
 assert.ok(!boosts.includes('buyMiningUpgrade()'));
});

test('Legacy trading, chests, ranking and admin panel remain reachable in More',()=>{
 const src=read('miniapp/src/main.tsx'),more=src.slice(src.indexOf('function More(){'),src.indexOf('function Intro(){'));
 for(const route of ["['home','home'","['trade','candlesticks'","['boxes','gift'","['leaderboard','trophy'","['referrals','friends'","['admin','crown'","['profile','profile'","['support','shield-check'"])
  assert.ok(more.includes(route),'More must retain '+route);
 assert.ok(src.includes("['owner','coowner'].includes(liveRole)?Admin():Home()"));
});

test('Five-button dock and upgrade cards are responsive and cache-busted in Telegram',()=>{
 const src=read('miniapp/src/styles.css'),css=read('miniapp/public/styles.css');
 assert.equal(src,css,'served CSS must be synced to source');
 for(const term of ['.bottom-nav.gm-pulse-bottom','repeat(5,minmax(0,1fr))','.nav-entry:nth-child(3)',
  '.gm-pulse-shortcuts','.gm-boosts-page','.gm-boosts-card','@media(max-width:360px)',
  '@media(prefers-reduced-motion:reduce)'])
  assert.ok(css.includes(term),'styling missing '+term);
 const html=read('miniapp/public/preview.html');
 assert.ok(html.includes('main.js?v=gm-pulse-nav-20261123-v2'));
 assert.ok(html.includes('styles.css?v=gm-pulse-nav-20261123-v2'));
});
