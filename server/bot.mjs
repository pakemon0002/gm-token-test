import {telegramWelcomeCard,telegramWelcomeInfo} from './telegram-welcome.mjs';
// Optional Telegram bot worker for GM TOKEN test Mini App.
// Required: BOT_TOKEN, PUBLIC_APP_URL=https://... ; never commit actual secrets.
const token=process.env.BOT_TOKEN,url=process.env.PUBLIC_APP_URL,user=process.env.BOT_USERNAME||'GmTokenApp';
const officialChannelUrl=process.env.GM_OFFICIAL_CHANNEL_URL||process.env.GM_NEWS_CHANNEL_URL||null;
const communityChatUrl=process.env.GM_COMMUNITY_CHAT_URL||null;
if(!token||!url||!url.startsWith('https://'))throw Error('BOT_TOKEN and HTTPS PUBLIC_APP_URL required');
const endpoint=`https://api.telegram.org/bot${token}/`;
const pause=(ms)=>new Promise(r=>setTimeout(r,ms));
async function api(method,body){const r=await fetch(endpoint+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const x=await r.json();if(!x.ok)throw Error(method+': '+(x.description||r.status));return x.result}
async function startBot(){
 await api('setChatMenuButton',{menu_button:{type:'web_app',text:'Открыть GM TOKEN',web_app:{url}}});
 await api('setMyCommands',{commands:[{command:'start',description:'Открыть GM TOKEN'},{command:'help',description:'Помощь и правила'}]});
 console.log('GM TOKEN @'+user+' is accepting Telegram updates');let offset=0;
 while(true){try{const updates=await api('getUpdates',{offset,timeout:25,allowed_updates:['message','callback_query']});
  for(const update of updates){offset=Math.max(offset,update.update_id+1);
   const callback=update.callback_query;
   if(callback) {
    const info=telegramWelcomeInfo(callback.data);
    if(info && typeof callback.id==='string' && Number.isSafeInteger(callback.message?.chat?.id)) {
      await api('answerCallbackQuery',{callback_query_id:callback.id});
      await api('sendMessage',{chat_id:callback.message.chat.id,...info});
    }
    continue;
   }
   const m=update.message;if(!m?.chat?.id||typeof m.text!=='string')continue;
   const start=m.text.match(/^\/start(?:\s+ref_(\d{5,20}))?(?:\s|$)/);
   if(start){
    await api('sendMessage',{chat_id:m.chat.id,...telegramWelcomeCard({appUrl:url,botUsername:user,referralId:start[1],officialChannelUrl,communityChatUrl})});
   }else if(/^\/help/.test(m.text)){await api('sendMessage',{chat_id:m.chat.id,text:'Открой Mini App, чтобы посмотреть награды, баланс и задания. Вопросы: Профиль → Поддержка. Никому не передавай пароли, seed-фразы и коды 2FA.'});}
  }
 }catch(e){console.error('Telegram polling:',e.message);await pause(3500)}}
}
startBot().catch(e=>{console.error(e);process.exitCode=1});
