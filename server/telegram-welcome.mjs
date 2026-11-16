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

function validNewsChannelUrl(value) {
  if(!value)return null;
  try {
    const url=new URL(value);
    if(url.protocol!=='https:' || url.hostname!=='t.me' || url.port || url.username || url.password || url.search || url.hash)return null;
    if(!/^\/[A-Za-z][A-Za-z0-9_]{4,31}\/?$/.test(url.pathname))return null;
    return url.toString();
  }catch{return null}
}

export function telegramWelcomeCard({appUrl,botUsername='GmTokenApp',referralId=null,newsChannelUrl=null}) {
  const parsed=new URL(appUrl);
  if(parsed.protocol!=='https:' || parsed.username || parsed.password)throw Error('Mini App HTTPS URL required');
  const buttons=[
    [{text:'⛏ Открыть GM TOKEN',web_app:{url:appUrl}}],
    [
      {text:'📜 Правила и ресурсы',callback_data:'gm:rules'},
      {text:'💠 Экономика',callback_data:'gm:economy'}
    ]
  ];
  const support=[{text:'🛡 Поддержка',callback_data:'gm:support'}];
  buttons.push(support);
  const channel=validNewsChannelUrl(newsChannelUrl);
  if(channel)buttons.push([{text:'📣 Новостной канал',url:channel}]);
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
