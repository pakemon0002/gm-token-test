// Telegram GM TOKEN introduction card. No trading or on-chain functionality.
export const GM_WELCOME_TEXT = [
  '⛏ <b>Добро пожаловать в GM TOKEN!</b>',
  '',
  '◆ Майни игровые GM и развивай свой майнинг',
  '◆ Улучшай оборудование — 200 уровней',
  '◆ Получай ежедневные награды и открывай боксы',
  '◆ Участвуй во внутриигровом рынке GM/CR',
  '',
  'Нажми кнопку ниже, чтобы начать 👇',
  '',
  '<i>GM и CR — игровые единицы. Реальный TON-токен пока не запущен.</i>'
].join('\n');

// A Telegram community URL must be supplied by the project owner, never guessed.
function validTelegramCommunityUrl(value) {
  if(!value)return null;
  try {
    const url=new URL(value);
    if(url.protocol!=='https:' || url.hostname!=='t.me' || url.port ||
       url.username || url.password || url.search || url.hash)return null;
    // Public usernames and Telegram invite links; no redirects or arbitrary hosts.
    if(!(/^\/[A-Za-z][A-Za-z0-9_]{4,31}\/?$/.test(url.pathname) ||
         /^\/\+[A-Za-z0-9_-]{8,}\/?$/.test(url.pathname)))return null;
    return url.toString();
  }catch{return null}
}

export function telegramWelcomeCard({
 appUrl,botUsername='GmTokenApp',referralId=null,
 officialChannelUrl=null,communityChatUrl=null,newsChannelUrl=null
}) {
  const parsed=new URL(appUrl);
  if(parsed.protocol!=='https:' || parsed.username || parsed.password || parsed.search || parsed.hash)
    throw Error('Mini App HTTPS URL required');
  const channel=validTelegramCommunityUrl(officialChannelUrl || newsChannelUrl);
  const chat=validTelegramCommunityUrl(communityChatUrl);
  // The links are optional until the owner provides the REAL channel/chat URLs.
  // No placeholder links, fake community addresses, or dead buttons.
  const communityRow=[];
  if(channel)communityRow.push({text:'Официальный канал',url:channel});
  if(chat)communityRow.push({text:'Чат сообщества',url:chat});
  const buttons=[
    [{text:'Открыть фармилку',web_app:{url:appUrl}}],
    ...(communityRow.length?[communityRow]:[]),
    [
      {text:'Правила',callback_data:'gm:rules'},
      {text:'Экономика',callback_data:'gm:economy'}
    ]
  ];
  const username=String(botUsername).replace(/^@/,'');
  if(/^\d{5,20}$/.test(String(referralId??'')) && /^[A-Za-z0-9_]{5,32}$/.test(username))
    buttons.push([{text:'Открыть по приглашению',url:`https://t.me/${username}?startapp=ref_${referralId}`}]);
  return {text:GM_WELCOME_TEXT,parse_mode:'HTML',reply_markup:{inline_keyboard:buttons}};
}

const info=Object.freeze({
  'gm:rules':[
    '<b>Правила и ресурсы GM TOKEN</b>',
    '',
    '• GM, CR и POINTS внутри Mini App — игровые единицы.',
    '• Майнинг, награды и обмен GM/CR относятся к внутриигровым механикам.',
    '• Реальные выплаты, ввод и вывод Jetton в TON пока недоступны.',
    '• Текущие функции и история операций доступны внутри Mini App.'
  ].join('\n'),
  'gm:economy':[
    '<b>Экономика GM TOKEN</b>',
    '',
    '• GM — игровой баланс и майнинг.',
    '• CR — внутриигровая валюта расчётов на рынке GM/CR.',
    '• POINTS — внутриигровые очки для предусмотренных наград и боксов.',
    '• Улучшения майнинга: 200 уровней.',
    '',
    'Никакая из этих единиц сейчас не является свободно выводимым TON Jetton.'
  ].join('\n'),
  'gm:support':[
    '<b>Поддержка GM TOKEN</b>',
    '',
    'Открой Mini App → Профиль → Поддержка, чтобы отправить обращение.',
    'Не передавай пароли, seed-фразы и коды 2FA.'
  ].join('\n')
});
export function telegramWelcomeInfo(callbackData) {
  const message=info[callbackData];
  return typeof message==='string'?{text:message,parse_mode:'HTML'}:null;
}
