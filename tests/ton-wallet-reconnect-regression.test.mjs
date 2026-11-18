import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('TON Connect creates only one fresh signed challenge per explicit connect/reverify',()=>{
 for(const path of ['miniapp/src/main.tsx','miniapp/public/main.js']){
  const source=read(path);
  assert.equal((source.match(/\/api\/holders\/challenge/g)||[]).length,1,path);
  assert.ok(!source.includes('prepareProof()'),'auto challenges during disconnect would invalidate the user-initiated nonce');
  assert.ok(source.includes('await tonUi.current.disconnect()'),'restored SDK sessions can be reverified with a fresh signed proof');
  assert.ok(source.includes('setConnectRequestParameters('),'fresh TON challenge still sent to wallet');
 }
});

test('unverified TON session can retry and never masquerades as verified',()=>{
 for(const path of ['miniapp/src/main.tsx','miniapp/public/main.js']){
  const source=read(path);
  assert.ok(/onClick:\s*connectedVerified\s*\?\s*disconnectTonWallet\s*:\s*connectTonWallet/.test(source),path);
  assert.ok(source.includes('Retry TON verification'),path);
  assert.ok(source.includes('Wallet connected, but its signature is not verified.'),path);
  assert.ok(source.includes('holderStatus?.wallet_verified === true')||source.includes('holderStatus?.wallet_verified===true'));
 }
});

test('TON Connect is self-hosted and saved-wallet sessions can be reconnected',()=>{
 const html=read('miniapp/public/preview.html');
 assert.ok(html.includes('./vendor/tonconnect-ui.min.js?v=3.0.2-local'),'local SDK script is used');
 assert.ok(!html.includes('unpkg.com/@tonconnect/ui'),'do not depend on external CDN in Telegram WebView');
 const sdk=statSync(new URL('../miniapp/public/vendor/tonconnect-ui.min.js',import.meta.url));
 assert.ok(sdk.size>100000,'TON Connect bundle is packaged');
 const src=read('miniapp/src/main.tsx'),built=read('miniapp/public/main.js');
 for(const x of [src,built]){
  assert.ok(x.includes('connectionRestored'),'wait for restored session');
  assert.ok(x.includes('Connect verified wallet'),'allow reconnect when previous proof is saved');
 }
});
