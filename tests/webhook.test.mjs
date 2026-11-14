import test from 'node:test';
import assert from 'node:assert/strict';
import {makeTelegramWebhook} from '../server/webhook.mjs';
const secret='gm_token_webhook_test_key_123456';
test('Telegram webhook setup uses HTTPS and secret header, no token in public URL',async()=>{
 const calls=[];
 const webhook=makeTelegramWebhook({token:'EXAMPLE_TEST_TOKEN',publicUrl:'https://gm-token-test.onrender.com/',webhookSecret:secret,fetchImpl:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({ok:true,result:url.endsWith('getMe')?{username:'GM_TOKEN_BOT'}:{}})}}});
 assert.equal(webhook.validateSecret(secret),true);
 assert.equal(webhook.validateSecret('wrong'),false);
 await webhook.configure();
 assert.equal(calls[0].url.endsWith('getMe'),true);
 assert.equal(calls[1].url.endsWith('setWebhook'),true);
 const request=JSON.parse(calls[1].options.body);
 assert.equal(request.url,'https://gm-token-test.onrender.com/api/telegram/webhook');
 assert.equal(request.secret_token,secret);
 assert.equal(calls[2].url.endsWith('setChatMenuButton'),true);
 assert.equal(JSON.parse(calls[2].options.body).menu_button.web_app.url,'https://gm-token-test.onrender.com/');
});
test('Telegram /start sends Mini App button; unrelated messages are ignored',async()=>{
 const calls=[];
 const webhook=makeTelegramWebhook({token:'EXAMPLE_TEST_TOKEN',publicUrl:'https://gm-token-test.onrender.com/',webhookSecret:secret,fetchImpl:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>({ok:true,result:{}})}}});
 await webhook.handleUpdate({message:{chat:{id:123456},text:'/start'}});
 assert.equal(calls.length,1);
 assert.equal(calls[0].body.chat_id,123456);
 assert.equal(calls[0].body.reply_markup.inline_keyboard[0][0].web_app.url,'https://gm-token-test.onrender.com/');
 await webhook.handleUpdate({message:{chat:{id:123456},text:'hello'}});
 assert.equal(calls.length,1);
});
test('webhook rejects weak secret, HTTP URLs and malformed public URLs',()=>{
 assert.throws(()=>makeTelegramWebhook({token:'t',publicUrl:'http://example.com',webhookSecret:secret}),/requires/);
 assert.throws(()=>makeTelegramWebhook({token:'t',publicUrl:'https://example.com',webhookSecret:'weak'}),/requires/);
 assert.throws(()=>makeTelegramWebhook({token:'t',publicUrl:'https://example.com?token=a',webhookSecret:secret}),/clean HTTPS/);
});

test('wrong bot token is rejected before Telegram webhook registration',async()=>{
 const calls=[];
 const hook=makeTelegramWebhook({token:'wrong-test-token',publicUrl:'https://gm-token-test.onrender.com',webhookSecret:secret,fetchImpl:async(url)=>{
  calls.push(url);return {ok:true,json:async()=>({ok:true,result:{username:'other_example_bot'}})};
 }});
 await assert.rejects(()=>hook.configure(),/BOT_TOKEN belongs to @other_example_bot/);
 assert.equal(calls.length,1);
 assert.ok(calls[0].endsWith('getMe'));
});
