// Telegram HTTPS webhook for a sleeping/free test web service.
// Requires BOT_TOKEN, PUBLIC_APP_URL and BOT_WEBHOOK_SECRET in the private host environment.
// Does not handle real-money transactions; only opens the GM TOKEN virtual-game mini app.
const isSafeSecret = x => typeof x === 'string' && /^[a-zA-Z0-9_-]{16,256}$/.test(x);

export function makeTelegramWebhook({token, publicUrl, webhookSecret, botUsername='gm_token_test_bot', fetchImpl=fetch, logger=console}) {
  if (!token || !/^https:\/\//.test(publicUrl || '') || !isSafeSecret(webhookSecret)) {
    throw new Error('Telegram webhook requires BOT_TOKEN, HTTPS PUBLIC_APP_URL, and BOT_WEBHOOK_SECRET (16+ characters)');
  }
  const url = new URL(publicUrl);
  if (url.username || url.password || url.search || url.hash) throw new Error('PUBLIC_APP_URL must be a clean HTTPS URL');
  const baseUrl = url.origin + '/';
  const endpoint = `https://api.telegram.org/bot${token}/`;
  const api = async (method, body) => {
    const response = await fetchImpl(endpoint + method, {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)
    });
    const answer = await response.json();
    if (!response.ok || !answer?.ok) throw new Error(`Telegram ${method} failed: ${String(answer?.description || response.status).slice(0,140)}`);
    return answer.result;
  };
  const configure = async () => {
    const bot = await api('getMe',{});
    const actual=String(bot?.username||'').replace(/^@/,'').toLowerCase();
    const expected=String(botUsername).replace(/^@/,'').toLowerCase();
    if(!actual || actual!==expected) {
      throw new Error('BOT_TOKEN belongs to @'+(actual||'unknown')+' but GM TOKEN expects @'+expected+'. Please check Render BOT_TOKEN without sharing it.');
    }
    logger.log('Telegram bot identity verified: @'+actual);
    await api('setWebhook',{url:new URL('/api/telegram/webhook',baseUrl).toString(),secret_token:webhookSecret,allowed_updates:['message'],drop_pending_updates:false});
    await api('setChatMenuButton',{menu_button:{type:'web_app',text:'Открыть GM TOKEN',web_app:{url:baseUrl}}});
    await api('setMyCommands',{commands:[{command:'start',description:'Открыть GM TOKEN'},{command:'help',description:'Помощь и правила'}]});
    logger.log('Telegram webhook configured.');
  };
  const validateSecret = received => typeof received === 'string' && received === webhookSecret;
  const handleUpdate = async update => {
    const message = update?.message;
    if (!message || !Number.isSafeInteger(message.chat?.id) || typeof message.text !== 'string') return;
    const chatId=message.chat.id;
    if (/^\/start(?:\s|$)/.test(message.text)) {
      const match=message.text.match(/^\/start\s+ref_(\d{5,20})(?:\s|$)/);
      const buttons=[[{text:'Открыть GM TOKEN',web_app:{url:baseUrl}}]];
      if(match)buttons.push([{text:'Открыть по приглашению',url:`https://t.me/${botUsername}?startapp=ref_${match[1]}`}]);
      await api('sendMessage',{chat_id:chatId,text:'GM TOKEN — игровая Mini App с виртуальными GM и CR. Никаких реальных денежных операций.',reply_markup:{inline_keyboard:buttons}});
    } else if(/^\/help(?:\s|$)/.test(message.text)) {
      await api('sendMessage',{chat_id:chatId,text:'Правила и обращения: Mini App → Profile → Support. Никому не передавайте коды 2FA и токен бота.'});
    }
  };
  return {configure,validateSecret,handleUpdate,baseUrl};
}
