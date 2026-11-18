import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Mining wallet button starts the existing TON Connect flow instead of only showing a notification',()=>{
 for(const path of ['miniapp/src/main.tsx','miniapp/public/main.js']){
  const code=read(path);
  const start=code.indexOf('function Mining()');
  const end=code.indexOf('function WalletConnection()',start);
  assert.ok(start>=0&&end>start,path);
  const mining=code.slice(start,end);
  assert.ok(mining.includes("className: 'gm-upgrades-purchase'")||mining.includes("className:'gm-upgrades-purchase'"),path);
  assert.ok(mining.includes('Подключить кошелёк'),path);
  assert.ok(mining.includes('onClick:upgrade.purchasable?buyMiningUpgrade:openWalletFromMining')||
            mining.includes('onClick: upgrade.purchasable ? buyMiningUpgrade : openWalletFromMining'),path);
  assert.ok(mining.includes('goto(\'wallet\')'),path);
  assert.ok(mining.includes('connectTonWallet()'),path);
  assert.ok(!mining.includes('Привязка GM к кошельку ещё не настроена'),path);
 }
});

test('Connecting from Mining does not enable purchases or initiate any token transfer',()=>{
 for(const path of ['miniapp/src/main.tsx','miniapp/public/main.js']){
  const code=read(path);
  const start=code.indexOf('function Mining()'),end=code.indexOf('function WalletConnection()',start);
  const mining=code.slice(start,end);
  assert.ok(mining.includes('upgrade.purchasable?buyMiningUpgrade:openWalletFromMining')||
    mining.includes('upgrade.purchasable ? buyMiningUpgrade : openWalletFromMining'));
  assert.ok(!mining.includes('sendTransaction('),'opening a wallet link must not charge a verification fee or purchase an upgrade');
 }
 const html=read('miniapp/public/preview.html');
 assert.ok(html.includes('main.js?v=gm-wallet-entry-20261118-v1'),'force fresh bundle in Telegram WebView');
});
