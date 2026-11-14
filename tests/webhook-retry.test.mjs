import test from 'node:test';
import assert from 'node:assert/strict';
import {makeTelegramWebhook} from '../server/webhook.mjs';

test('Telegram webhook initialization retries temporary network failure',async()=>{
 const invoked=[];
 let failures=0;
 const hook=makeTelegramWebhook({
  token:'test-token',
  publicUrl:'https://example.com',
  webhookSecret:'a_Strong_Test_Webhook_Secret_987654321',
  botUsername:'GM_TOKEN_BOT',
  fetchImpl:async url=>{
   const method=url.split('/').pop();
   invoked.push(method);
   if(method==='setWebhook' && failures++===0)throw Error('fetch failed');
   return {ok:true,json:async()=>({ok:true,result:method==='getMe'?{username:'GM_TOKEN_BOT'}:{}})};
  },
  logger:{log:()=>{}}
 });
 await hook.configure();
 assert.deepEqual(invoked,['getMe','setWebhook','setWebhook','setChatMenuButton','setMyCommands']);
});
