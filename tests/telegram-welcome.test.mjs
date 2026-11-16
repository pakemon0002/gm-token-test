import test from 'node:test';
import assert from 'node:assert/strict';
import {telegramWelcomeCard,telegramWelcomeInfo,GM_WELCOME_TEXT} from '../server/telegram-welcome.mjs';

test('GM bot welcome follows 3-row Telegram card design with safe working buttons',()=>{
 const card=telegramWelcomeCard({appUrl:'https://gm-token-test-iprj.onrender.com/',botUsername:'GmTokenApp'});
 assert.equal(card.parse_mode,'HTML');
 assert.match(card.text,/Добро пожаловать в GM TOKEN/);
 assert.match(card.text,/200 уровней/);
 assert.match(card.text,/игровые единицы/);
 assert.match(card.text,/пока не запущен/);
 assert.equal(card.text,GM_WELCOME_TEXT);
 assert.deepEqual(card.reply_markup.inline_keyboard.map(row=>row.length),[1,2,1]);
 assert.equal(card.reply_markup.inline_keyboard[0][0].web_app.url,'https://gm-token-test-iprj.onrender.com/');
 assert.deepEqual(card.reply_markup.inline_keyboard[1].map(b=>b.callback_data),['gm:rules','gm:economy']);
 assert.equal(card.reply_markup.inline_keyboard[2][0].callback_data,'gm:support');
 assert.ok(!JSON.stringify(card).includes('Реестр выплат'));
 assert.ok(!JSON.stringify(card).includes('Новостной канал'),'do not offer made-up news link');
});
test('the welcome preserves Telegram referral links and exposes approved optional channel only',()=>{
 const card=telegramWelcomeCard({appUrl:'https://example.com',botUsername:'GmTokenApp',referralId:'1234567',newsChannelUrl:'https://t.me/GmTokenNews'});
 const rows=card.reply_markup.inline_keyboard;
 assert.equal(rows[3][0].url,'https://t.me/GmTokenNews');
 assert.equal(rows[4][0].url,'https://t.me/GmTokenApp?startapp=ref_1234567');
 const bad=telegramWelcomeCard({appUrl:'https://example.com',newsChannelUrl:'https://evil.example/advert'});
 assert.equal(bad.reply_markup.inline_keyboard.length,3);
 const spoof=telegramWelcomeCard({appUrl:'https://example.com',newsChannelUrl:'https://t.me.evil.example/GmTokenNews'});
 assert.equal(spoof.reply_markup.inline_keyboard.length,3);
 assert.throws(()=>telegramWelcomeCard({appUrl:'http://example.com'}),/HTTPS/);
});
test('Telegram inline callbacks resolve to safe informational messages and reject arbitrary payloads',()=>{
 for(const action of ['gm:rules','gm:economy','gm:support']){
  const response=telegramWelcomeInfo(action);
  assert.equal(response.parse_mode,'HTML');
  assert.ok(response.text.length>70);
 }
 assert.match(telegramWelcomeInfo('gm:rules').text,/вывод Jetton/);
 assert.match(telegramWelcomeInfo('gm:support').text,/Поддержка/);
 assert.equal(telegramWelcomeInfo('gm:unknown'),null);
 assert.equal(telegramWelcomeInfo(undefined),null);
});
