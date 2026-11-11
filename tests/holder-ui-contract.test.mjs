import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('holders screen uses real verified server data and 3-1-2 podium, never fabricated accounts',()=>{
 const src=read('miniapp/src/main.tsx');
 const start=src.indexOf(' function Leaderboard(){');
 const end=src.indexOf(' function Profile(){',start);
 assert.ok(start>=0&&end>start);
 const part=src.slice(start,end);
 for(const needle of ['const podium=data?.podium||[]','const slots=[3,1,2]','data.participants',
   'data?.my_rank','data?.has_more','data.next_offset','void fetchHolders','void refreshHolderBalance']){
  if(needle==='void refreshHolderBalance')continue; // Lives in Wallet, not on leaderboard.
  assert.ok(part.includes(needle),'missing real holder feature: '+needle);
 }
 assert.ok(!part.includes('liveRanks?.users'),'old virtual GM rank must not appear');
 assert.ok(!part.includes('score_cents'),'do not show in-game GM');
 assert.ok(part.includes("if(")===false||part.includes('statusMessage')); // visible inactive state
});
test('wallet page presents an explicit proof status, opt-in and no GM payment request',()=>{
 const src=read('miniapp/src/main.tsx');
 const start=src.indexOf(' function WalletConnection(){'),end=src.indexOf(' function Vault(){',start);
 const code=src.slice(start,end);
 for(const key of ['holderStatus?.wallet_verified','gm-wallet-proof-status','gm-wallet-consent',
   'setHolderOptIn','holderStatus?.configured','refreshHolderBalance','goto(\'leaderboard\')']){
  assert.ok(code.includes(key),key);
 }
 assert.ok(!code.includes('sendTransaction('));
 assert.ok(!code.includes('seedPhrase'));
});
test('server requires a signed wallet for ranking and never exposes virtual-GM leaderboard',()=>{
 const server=read('server/index.mjs'),game=read('server/game.mjs'),holders=read('server/holders.mjs');
 assert.ok(server.includes("p==='/api/holders/verify'"));
 assert.ok(server.includes("p==='/api/holders/consent'"));
 assert.ok(server.includes("p==='/api/holders/refresh'"));
 assert.ok(holders.includes('verifyTonProof'));
 assert.ok(holders.includes("wallet signature must be verified first"));
 assert.ok(!game.includes("LEADERBOARD_MODE==='wallet_plus_vault'"));
 assert.ok(!holders.includes('Math.random()'));
});
