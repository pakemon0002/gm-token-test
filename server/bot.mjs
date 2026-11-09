// Optional Telegram bot worker for GM TOKEN test Mini App.
// Required: BOT_TOKEN, PUBLIC_APP_URL=https://... ; never commit actual secrets.
const token=process.env.BOT_TOKEN,url=process.env.PUBLIC_APP_URL,user=process.env.BOT_USERNAME||'gm_token_test_bot';
if(!token||!url||!url.startsWith('https://'))throw Error('BOT_TOKEN and HTTPS PUBLIC_APP_URL required');
const endpoint=`https://api.telegram.org/bot${token}/`;
const pause=(ms)=>new Promise(r=>setTimeout(r,ms));
async function api(method,body){const r=await fetch(endpoint+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const x=await r.json();if(!x.ok)throw Error(method+': '+(x.description||r.status));return x.result}
async function startBot(){
 await api('setChatMenuButton',{menu_button:{type:'web_app',text:'Открыть GM TOKEN',web_app:{url}}});
 await api('setMyCommands',{commands:[{command:'start',description:'Открыть GM TOKEN'},{command:'help',description:'Помощь и правила'}]});
 console.log('GM TOKEN @'+user+' is accepting Telegram updates');let offset=0;
 while(true){try{const updates=await api('getUpdates',{offset,timeout:25,allowed_updates:['message']});
  for(const update of updates){offset=Math.max(offset,update.update_id+1);const m=update.message;if(!m?.chat?.id||typeof m.text!=='string')continue;
   const start=m.text.match(/^\/start(?:\s+ref_(\d{5,20}))?/);
   if(start){const ref=start[1],link=ref?`https://t.me/${user}?startapp=ref_${ref}`:null;
    await api('sendMessage',{chat_id:m.chat.id,text:'GM TOKEN — игровая экосистема с виртуальными GM и CR. Никаких реальных денежных операций.',reply_markup:{inline_keyboard:[[{text:'🚀 Открыть Mini App',web_app:{url}}],...(link?[[{text:'Открыть по приглашению',url:link}]]:[])]}});
   }else if(/^\/help/.test(m.text)){await api('sendMessage',{chat_id:m.chat.id,text:'Правила и обращения доступны в Mini App → Profile → Support. Никому не передавайте секреты и коды 2FA.'});}
  }
 }catch(e){console.error('Telegram polling:',e.message);await pause(3500)}}
}
startBot().catch(e=>{console.error(e);process.exitCode=1});
