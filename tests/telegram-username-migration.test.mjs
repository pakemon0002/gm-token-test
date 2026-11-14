import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('new Telegram username appears in all Mini App entry points and referral deep links',()=>{
 const source=read('miniapp/src/main.tsx');
 assert.ok(!source.includes('gm_token_test_bot'), 'No outdated public links in Mini App source');
 assert.match(source,/https:\/\/t\.me\/GmTokenApp\?startapp=ref_/);
 assert.match(source,/https:\/\/t\.me\/GmTokenApp'/);
 assert.match(source,/@GmTokenApp/);
});
test('server defaults use new username but verify BotFather getMe identity before webhook setup',()=>{
 const index=read('server/index.mjs');
 const webhook=read('server/webhook.mjs');
 const standalone=read('server/bot.mjs');
 for(const source of [index,webhook,standalone]){
  assert.ok(!source.includes('gm_token_test_bot'));
  assert.match(source,/GmTokenApp/);
 }
 assert.match(index,/botUsername:process\.env\.BOT_USERNAME\|\|'GmTokenApp'/);
 assert.match(webhook,/const actual=String\(bot\?\.username/);
 assert.match(webhook,/actual!==expected/);
 assert.match(webhook,/setWebhook/);
 assert.match(webhook,/setChatMenuButton/);
});
test('migration does not change existing Mini App address or TON Connect domain',()=>{
 const manifest=JSON.parse(read('miniapp/public/tonconnect-manifest.json'));
 assert.equal(manifest.url,'https://gm-token-test-iprj.onrender.com');
 assert.match(read('docs/BOT_USERNAME_MIGRATION_RU.md'),/GmTokenApp/);
});
