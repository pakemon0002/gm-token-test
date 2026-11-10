declare var React: any;
declare var ReactDOM: any;
declare namespace JSX { interface IntrinsicElements { [elementName: string]: any; } interface ElementChildrenAttribute { children: any; } }

// GM TOKEN UI · original layouts + original 216 PNG pack. No third-party icon replacements.
const store = {getItem:(key:string)=>{try{return window.localStorage.getItem(key)}catch{return null}},setItem:(key:string,value:string)=>{try{window.localStorage.setItem(key,value)}catch{}}};
const A = './assets/icons/';
const BRAND = './assets/brand-original-reference/';
type Theme = 'light' | 'dark';
type Route = 'home'|'trade'|'earn'|'tasks'|'leaderboard'|'profile'|'reward'|'splash'|'intro'|'mining'|'vault'|'shop'|'referrals'|'history'|'settings'|'support'|'admin'|'achievements'|'more'|'streak'|'boxes';
type Wallet = { gm:number; cr:number; vault:number; xp:number; level:number; claims:number; lastClaim:string; lastMiningXpDay:string; lastVaultWithdrawDay:string; streak:number; storage:number; storageUpdated:number; tickets:any[]; orders:any[]; traded:number; rewardClaimed:boolean; };
const firstWallet:Wallet = {gm:0,cr:0,vault:0,xp:0,level:1,claims:0,lastClaim:'',lastMiningXpDay:'',lastVaultWithdrawDay:'',streak:0,storage:0,storageUpdated:0,tickets:[],orders:[],traded:0,rewardClaimed:false};
const xpThreshold=[0,100,250,450,750,1150,1700,2400,3300,4400];
const miningBase=[10,14,19,25,32,40,50,62,75,90];
const powerBonus=(lvl:number)=>lvl>=10?25:lvl>=8?20:lvl>=6?15:lvl>=4?10:lvl>=2?5:0;
const storageHours=(lvl:number)=>lvl>=9?24:lvl>=7?20:lvl>=5?16:lvl>=3?12:8;
const holdingBonus=(n:number)=>{let p=0;for(const [limit,b] of [[50,5],[100,10],[250,15],[500,20],[1000,25],[2000,30],[5000,35],[10000,40],[25000,45],[50000,50]])if(n>=limit)p=b;return p};
const gmRate=(v:Wallet)=>miningBase[Math.min(9,Math.max(0,v.level-1))]*(1+powerBonus(v.level)/100)*(1+holdingBonus(v.vault)/100);
const nf=(n:number,dec=2)=>Number(n).toLocaleString('ru-RU',{minimumFractionDigits:dec,maximumFractionDigits:dec});
const clean=(s:string)=>String(s).replace(/[<>]/g,'');
// No local sample accounts, fictional prices, charts, tasks, or podium entries.



const timeNow=()=>new Date().toISOString().slice(0,10);
const todayUTC=()=>new Date().toISOString().slice(0,10);

function Icon({name,theme,size=24,tile=false,alt='',className=''}:{name:string,theme:Theme,size?:number,tile?:boolean,alt?:string,className?:string}){
 return <img className={'gm-icon '+className} src={`${A}${theme}/${tile?'tiles':'transparent'}/${name}.png`} width={size} height={size} alt={alt} draggable="false" loading="lazy"/>;
}
function Brand({theme,size=50}:{theme:Theme,size?:number}){return <img className="brand-coin" src={BRAND+(theme==='light'?'gm-coin-light-original.png':'gm-coin-dark-original.png')} width={size} height={size} alt="Логотип GM TOKEN" draggable="false"/>;}
function GButton({children,onClick,light=false,disabled=false,icon,theme}:{children?:any,onClick?:any,light?:boolean,disabled?:boolean,icon?:string,theme:Theme}){return <button type="button" className={'capsule '+(light?'pale':'dark-cap')} onClick={onClick} disabled={disabled}>{icon&&<Icon name={icon} theme={theme} size={22}/>}<span>{children}</span></button>;}
function SparkLine({theme,compact=false}:{theme:Theme,compact?:boolean}){
 return <div className="real-data-empty" role="status">График баланса появится после накопления подтверждённой истории</div>;
}

function Candles({theme,candles=[],selected=null,onSelect=()=>{},interval='1h'}){
 const e=React.createElement;
 const valid=(Array.isArray(candles)?candles:[]).filter(c=>
  c&&Number.isFinite(c.time)&&Number.isFinite(c.open)&&Number.isFinite(c.high)&&
  Number.isFinite(c.low)&&Number.isFinite(c.close)&&Number.isFinite(c.volume_gm_cents)&&
  c.low<=Math.min(c.open,c.close)&&c.high>=Math.max(c.open,c.close)&&c.volume_gm_cents>=0
 ).slice(-48);
 if(!valid.length)return e('div',{className:'terminal-empty-chart',role:'status'},
   e('div',{className:'terminal-empty-chart-mark'},e(Icon,{theme,name:'candlesticks',size:34})),
   e('strong',null,'Пока нет исполненных сделок'),
   e('span',null,'График появится после первой сделки GM/CR. Пустые интервалы не заполняются искусственными свечами.'));
 const n=valid.length;
 const rawLow=Math.min(...valid.map(c=>c.low)),rawHigh=Math.max(...valid.map(c=>c.high));
 const middle=(rawHigh+rawLow)/2;
 const spread=Math.max(6,Math.ceil(Math.max(rawHigh-rawLow, middle*.07)));
 const boundLow=Math.max(0,Math.floor(middle-spread*.72));
 const boundHigh=Math.max(rawHigh+1,Math.ceil(middle+spread*.72));
 const top=20,bottom=160,volumeTop=191,volumeBottom=222;
 const mapPrice=p=>top+(boundHigh-p)/(boundHigh-boundLow)*(bottom-top);
 const startX=15,endX=283,width=endX-startX;
 const step=width/n;
 const centerAt=i=>startX+step*(i+.5);
 const candleWidth=Math.min(13,Math.max(3,step*.58));
 const volumeMax=Math.max(1,...valid.map(c=>c.volume_gm_cents));
 const fmt=t=>new Date(t*1000).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
 const fmtTime=t=>interval==='1d'||interval==='4h'?new Date(t*1000).toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'}):new Date(t*1000).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
 const picked=valid.find(c=>c.time===selected)||valid[n-1];
 const up=theme==='dark'?'#73D9BA':'#278E78';
 const down=theme==='dark'?'#FF98A3':'#C85A72';
 const flat=theme==='dark'?'#B2BAD0':'#717F9B';
 const brush=c=>c.close>c.open?up:c.close<c.open?down:flat;
 const captionIndices=[0,Math.floor((n-1)/2),n-1].filter((x,i,a)=>a.indexOf(x)===i);
 return e('div',{className:'terminal-candle-view'},
  e('div',{className:'terminal-candle-stage'},
   e('svg',{className:'terminal-candles',viewBox:'0 0 350 252',role:'img',
    'aria-label':n+' подтверждённых свечей GM/CR; график построен только по реальным сделкам',
    preserveAspectRatio:'xMidYMid meet'},
    [0,1,2,3,4].map(i=>{
     const price=boundHigh-(boundHigh-boundLow)*i/4;
     const y=top+(bottom-top)*i/4;
     return e('g',{key:'grid'+i},
      e('line',{x1:startX,x2:endX,y1:y,y2:y,className:'terminal-chart-grid'}),
      e('text',{x:292,y:y+3.5,className:'terminal-chart-price'},nf(price/100,2)));
    }),
    e('line',{x1:startX,x2:endX,y1:volumeTop-12,y2:volumeTop-12,className:'terminal-chart-separator'}),
    e('text',{x:startX,y:volumeTop-2,className:'terminal-chart-vol-title'},'VOLUME · GM'),
    valid.map((c,i)=>{
     const x=centerAt(i),high=mapPrice(c.high),low=mapPrice(c.low),
       y1=mapPrice(c.open),y2=mapPrice(c.close),bodyTop=Math.min(y1,y2),
       bodyHeight=Math.max(2.5,Math.abs(y2-y1));
     const col=brush(c);
     const volumeHeight=Math.max(2,c.volume_gm_cents/volumeMax*26);
     const active=c.time===picked.time;
     return e('g',{key:c.time,className:active?'terminal-active-candle':'',
       onClick:()=>onSelect(c.time),tabIndex:0,role:'button',
       'aria-label':fmt(c.time)+'; Open '+nf(c.open/100)+'; High '+nf(c.high/100)+'; Low '+nf(c.low/100)+'; Close '+nf(c.close/100),
       onKeyDown:ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();onSelect(c.time);}}},
      e('title',null,fmt(c.time)+' · O '+nf(c.open/100)+' H '+nf(c.high/100)+' L '+nf(c.low/100)+' C '+nf(c.close/100)),
      active?e('line',{x1:x,x2:x,y1:top-5,y2:volumeBottom+1,className:'terminal-chart-crosshair'}):null,
      c.high>c.low?e('line',{x1:x,x2:x,y1:high,y2:low,stroke:col,strokeWidth:1.45,strokeLinecap:'round'}):null,
      e('rect',{x:x-candleWidth/2,y:bodyTop-(y1===y2?1.25:0),width:candleWidth,height:bodyHeight,rx:1.3,fill:col}),
      e('rect',{x:x-candleWidth/2,y:volumeBottom-volumeHeight,width:candleWidth,height:volumeHeight,rx:1.1,fill:col,opacity:.5}),
      e('rect',{x:x-Math.max(11,step/2),y:top-7,width:Math.max(22,step),height:volumeBottom-top+13,
       fill:'transparent','aria-hidden':true})
     );
    }),
    captionIndices.map(i=>e('text',{key:'label'+i,x:centerAt(i),y:246,
     textAnchor:i===0&&n>1?'start':i===n-1&&n>1?'end':'middle',
     className:'terminal-chart-time'},fmtTime(valid[i].time)))
   )),
  e('div',{className:'terminal-candle-inspector',role:'status'},
   e('div',{className:'terminal-inspector-heading'},
    e('b',null,fmt(picked.time)),
    e('span',null,n===1?'1 свеча по реальным сделкам':n+' свечей с реальными сделками')),
   e('div',{className:'terminal-inspector-grid'},
    [['O',picked.open],['H',picked.high],['L',picked.low],['C',picked.close]].map(([name,value])=>
      e('span',{key:name},e('small',null,name),e('b',null,nf(value/100)))),
    e('span',null,e('small',null,'VOL'),e('b',null,nf(picked.volume_gm_cents/100))),
    e('span',null,e('small',null,'TRADES'),e('b',null,String(picked.trades||0))))
  ),
  e('div',{className:'terminal-candle-legend'},
   e('span',null,e('i',{className:'terminal-legend-up'}),' Рост'),
   e('span',null,e('i',{className:'terminal-legend-down'}),' Падение'),
   e('span',null,e('i',{className:'terminal-legend-flat'}),' Без изменения'),
   e('span',{className:'terminal-legend-note'},'Без искусственных свечей'))
 );
}

function BarButton({name,title,theme,selected=false,onClick}:{key?:string,name:string,title:string,theme:Theme,selected?:boolean,onClick:()=>void}){return <button className={'nav-entry '+(selected?'active':'')} onClick={onClick} aria-label={title} aria-current={selected?'page':undefined}><Icon theme={theme} name={name} size={23}/><span>{title}</span></button>}
async function gmFetchJson(path,opts={},retries=0){
 let lastError;
 for(let i=0;i<=retries;i++){
  const ctl=typeof AbortController==='function'?new AbortController():null;
  const timeout=ctl?setTimeout(()=>ctl.abort(),24000):null;
  try{
   const res=await fetch(path,{...opts,...(ctl?{signal:ctl.signal}:{})});
   const body=await res.json().catch(()=>({}));
   if(res.ok)return body;
   const error=Error(String(body?.error||'HTTP '+res.status));error.status=res.status;
   if(res.status<500)throw error;
   lastError=error;if(i===retries)throw error;
  }catch(err){
   lastError=err;if(err?.status&&err.status<500)throw err;
   if(i===retries)throw err?.status?err:Error('Нет связи с сервером. Проверь интернет и открой приложение ещё раз.');
  }finally{if(timeout)clearTimeout(timeout)}
  await new Promise(r=>setTimeout(r,500*(i+1)));
 }
 throw lastError||Error('Недоступно');
}

const gmLanguages=[['auto','🌐 Telegram · Auto'],['ru','🇷🇺 Русский'],['uk','🇺🇦 Українська'],['en','🇬🇧 English'],['es','🇪🇸 Español'],['de','🇩🇪 Deutsch'],['fr','🇫🇷 Français'],['tr','🇹🇷 Türkçe'],['pt','🇵🇹 Português'],['pl','🇵🇱 Polski'],['it','🇮🇹 Italiano'],['ar','🇸🇦 العربية'],['zh','🇨🇳 中文'],['ja','🇯🇵 日本語'],['ko','🇰🇷 한국어'],['hi','🇮🇳 हिन्दी'],['id','🇮🇩 Bahasa Indonesia'],['vi','🇻🇳 Tiếng Việt'],['th','🇹🇭 ไทย'],['nl','🇳🇱 Nederlands'],['ro','🇷🇴 Română'],['sv','🇸🇪 Svenska'],['cs','🇨🇿 Čeština'],['el','🇬🇷 Ελληνικά']];
const gmWords={
 ru:['Главная','Рынок','Майнинг','Боксы','Ещё','Язык','Настройки','Далее','Начать','Пропустить'],
 uk:['Головна','Ринок','Майнінг','Бокси','Ще','Мова','Налаштування','Далі','Почати','Пропустити'],
 en:['Home','Market','Mining','Boxes','More','Language','Settings','Next','Start','Skip'],
 es:['Inicio','Mercado','Minería','Cajas','Más','Idioma','Ajustes','Siguiente','Empezar','Saltar'],
 de:['Start','Markt','Mining','Boxen','Mehr','Sprache','Einstellungen','Weiter','Starten','Überspringen'],
 fr:['Accueil','Marché','Minage','Coffres','Plus','Langue','Paramètres','Suivant','Commencer','Passer'],
 tr:['Ana sayfa','Pazar','Madencilik','Kutular','Diğer','Dil','Ayarlar','Devam','Başla','Atla'],
 pt:['Início','Mercado','Mineração','Caixas','Mais','Idioma','Configurações','Próximo','Começar','Pular'],
 pl:['Start','Rynek','Wydobycie','Skrzynki','Więcej','Język','Ustawienia','Dalej','Zacznij','Pomiń'],
 it:['Home','Mercato','Mining','Box','Altro','Lingua','Impostazioni','Avanti','Inizia','Salta'],
 ar:['الرئيسية','السوق','التعدين','الصناديق','المزيد','اللغة','الإعدادات','التالي','ابدأ','تخطي'],
 zh:['主页','市场','挖矿','宝箱','更多','语言','设置','下一步','开始','跳过'],
 ja:['ホーム','マーケット','マイニング','ボックス','その他','言語','設定','次へ','開始','スキップ'],
 ko:['홈','시장','채굴','상자','더보기','언어','설정','다음','시작','건너뛰기'],
 hi:['होम','बाज़ार','माइनिंग','बॉक्स','और','भाषा','सेटिंग','आगे','शुरू','छोड़ें'],
 id:['Beranda','Pasar','Menambang','Kotak','Lainnya','Bahasa','Pengaturan','Lanjut','Mulai','Lewati'],
 vi:['Trang chủ','Thị trường','Đào','Hộp','Thêm','Ngôn ngữ','Cài đặt','Tiếp','Bắt đầu','Bỏ qua'],
 th:['หน้าแรก','ตลาด','ขุด','กล่อง','เพิ่มเติม','ภาษา','ตั้งค่า','ถัดไป','เริ่ม','ข้าม'],
 nl:['Home','Markt','Mining','Boxen','Meer','Taal','Instellingen','Volgende','Start','Overslaan'],
 ro:['Acasă','Piață','Minerit','Cutii','Mai mult','Limbă','Setări','Înainte','Start','Sari'],
 sv:['Hem','Marknad','Mining','Boxar','Mer','Språk','Inställningar','Nästa','Starta','Hoppa över'],
 cs:['Domů','Trh','Těžba','Boxy','Více','Jazyk','Nastavení','Dále','Začít','Přeskočit'],
 el:['Αρχική','Αγορά','Εξόρυξη','Κουτιά','Περισσότερα','Γλώσσα','Ρυθμίσεις','Επόμενο','Έναρξη','Παράλειψη']
};

// Shared route UI copy. Legacy screens are progressively migrated to these keys.
const gmText={
 ru:{profile:'Профиль',achievements:'Достижения',referrals:'Реферальная программа',history:'История операций',support:'Поддержка',friends:'Друзья',balance:'Баланс',streak:'Серия',level:'Уровень',nextLeague:'До следующей лиги',league:'Лига',mining:'Майнинг',upgrades:'Улучшения',mine:'Добыча',daily:'в сутки',collected:'Накоплено',collect:'Забрать GM',storage:'Хранилище',buyUpgrade:'Улучшить майнинг',upgradeCost:'Стоимость',bonus:'Ускорение',maxLevel:'Максимальный уровень',notEnough:'Недостаточно GM',comingSoon:'Пока недоступно',selectLanguage:'Выберите язык интерфейса',searchLanguage:'Поиск языка',firstLaunch:'Добро пожаловать',guideNext:'Далее',guideDone:'Понятно',guideSkip:'Пропустить',opening:'Подключаем GM TOKEN…'},
 uk:{profile:'Профіль',achievements:'Досягнення',referrals:'Реферальна програма',history:'Історія операцій',support:'Підтримка',friends:'Друзі',balance:'Баланс',streak:'Серія',level:'Рівень',nextLeague:'До наступної ліги',league:'Ліга',mining:'Майнінг',upgrades:'Покращення',mine:'Видобуток',daily:'на добу',collected:'Накопичено',collect:'Забрати GM',storage:'Сховище',buyUpgrade:'Покращити майнінг',upgradeCost:'Вартість',bonus:'Прискорення',maxLevel:'Максимальний рівень',notEnough:'Недостатньо GM',comingSoon:'Поки недоступно',selectLanguage:'Оберіть мову інтерфейсу',searchLanguage:'Пошук мови',firstLaunch:'Ласкаво просимо',guideNext:'Далі',guideDone:'Зрозуміло',guideSkip:'Пропустити',opening:'Підключаємо GM TOKEN…'},
 en:{profile:'Profile',achievements:'Achievements',referrals:'Referral program',history:'Transaction history',support:'Support',friends:'Friends',balance:'Balance',streak:'Streak',level:'Level',nextLeague:'To the next league',league:'League',mining:'Mining',upgrades:'Upgrades',mine:'Mining',daily:'per day',collected:'Collected',collect:'Claim GM',storage:'Storage',buyUpgrade:'Upgrade mining',upgradeCost:'Cost',bonus:'Boost',maxLevel:'Maximum level',notEnough:'Not enough GM',comingSoon:'Not available yet',selectLanguage:'Choose interface language',searchLanguage:'Search languages',firstLaunch:'Welcome',guideNext:'Next',guideDone:'Got it',guideSkip:'Skip',opening:'Connecting GM TOKEN…'}
};
const gmUpgradeCost=(level:number)=>level<2?0:level===2?150:Math.round(200*Math.pow(1.04,level-3)/10)*10;
const gmUpgradeBonus=(level:number)=>level===1?0:10+2*(level-2);
const gmGuides:any={
 mining:[['GM · Mining','Большая серебряная монета показывает добычу. Нажми её, когда накопишь минимум 1 GM.','.gm-mining-coin-wrap'],['Скорость и хранилище','Здесь показывается скорость добычи и вместимость хранилища.','.gm-mining-energy'],['200 улучшений','Открой вкладку «Улучшения» и покупай уровни за игровые GM. Каждая покупка проверяется сервером.','.gm-mining-tabs']],
 boxes:[['GM Boxes','Выбирай вид бокса и смотри точную стоимость в POINTS до открытия.','.gm-boxes-v8'],['Награды','Награды выдаются только после подтверждённого сервером открытия.','.gm-boxes-v8']],
 trade:[['Рынок GM/CR','Здесь показаны реальные сделки внутри игровой экономики. Это не торговля настоящими деньгами.','.terminal-candle-stage'],['Ордер','Сначала проверь сумму, цену и комиссию — затем подтверди игровую заявку.','.gm-trade-order']],
 profile:[['Твой профиль','Следи за XP, лигой, рамками и достижениями.','.xp-area'],['Коллекция','За достижения открываются косметические награды.','.profile-menu']],
 tasks:[['Задания','Выполняй задачи, получай XP и следи за прогрессом.','.tasks-list']]
};

const gmKeys=['home','market','mining','boxes','more','language','settings','next','start','skip'];

function App(){
 const webapp=(window as any).Telegram?.WebApp;
 const openBot=(ev:any)=>{
   ev?.preventDefault?.();
   const url='https://t.me/gm_token_test_bot';
   if(webapp?.openTelegramLink){
     try {webapp.openTelegramLink(url);
       if(typeof webapp.close==='function')window.setTimeout(()=>{try{webapp.close()}catch{}},700);
       return;
     }catch{}
   }
   window.location.assign(url);
 };
 const [theme,setTheme]=React.useState((store.getItem('gm_theme')||webapp?.colorScheme||'light')==='dark'?'dark':'light');
 const [screen,setScreen]=React.useState('home');
 const [locale,setLocale]=React.useState(store.getItem('gm_lang')||'auto');
 const [introStep,setIntroStep]=React.useState(0);
 const [booting,setBooting]=React.useState(true);
 const [guideScreen,setGuideScreen]=React.useState('');
 const [guideStep,setGuideStep]=React.useState(0);
 const [langSearch,setLangSearch]=React.useState('');
 const [miningTab,setMiningTab]=React.useState('mine');
 const [upgradePreview,setUpgradePreview]=React.useState(2);
 const telegramLanguage=String(webapp?.initDataUnsafe?.user?.language_code||navigator.language||'en').toLowerCase().split(/[-_]/)[0];
 const actualLang=locale==='auto'?telegramLanguage:locale;
 const lang=key=>{
  const index=gmKeys.indexOf(key);
  return index<0?key:(gmWords[actualLang]||gmWords.en)[index]||gmWords.en[index];
 };
 
 const t=(key:string)=>((gmText as any)[actualLang]||gmText.en)[key]||(gmText.en as any)[key]||key;
 const [wallet,setWallet]=React.useState(firstWallet);
 const [toast,setToast]=React.useState('');
 const [period,setPeriod]=React.useState('1h');
 const [selectedCandle,setSelectedCandle]=React.useState(null as number|null);
 const [tradeTab,setTradeTab]=React.useState('book');
 const [side,setSide]=React.useState('buy');
 const [amount,setAmount]=React.useState('');
 const [taskFilter,setTaskFilter]=React.useState('All');
 const [rankFilter,setRankFilter]=React.useState('Global');
 const [shopAmount,setShopAmount]=React.useState('');
 const [vaultAmount,setVaultAmount]=React.useState('');
 const [supportText,setSupportText]=React.useState('');
 const [supportTickets,setSupportTickets]=React.useState([]);
 const [staffReply,setStaffReply]=React.useState('');
 const [supportCategory,setSupportCategory]=React.useState('Общий вопрос');
 const [liveState,setLiveState]=React.useState(null as any);
 const [liveOrders,setLiveOrders]=React.useState([] as any[]);
 const [liveBook,setLiveBook]=React.useState(null as any);
 const [liveTicker,setLiveTicker]=React.useState(null as any);
 const [liveCandles,setLiveCandles]=React.useState([] as any[]);
 const [recentTrades,setRecentTrades]=React.useState([] as any[]);
 const [clock,setClock]=React.useState(Math.floor(Date.now()/1000));
 const [adminStats,setAdminStats]=React.useState(null as any);
 const [liveTasks,setLiveTasks]=React.useState([] as any[]);
 const [liveAchievements,setLiveAchievements]=React.useState([] as any[]);
 const [liveReferrals,setLiveReferrals]=React.useState(null as any);
 const [liveRanks,setLiveRanks]=React.useState(null as any);
 const [shopQuote,setShopQuote]=React.useState(null as any);
 const [orderType,setOrderType]=React.useState('limit');
 const [orderPrice,setOrderPrice]=React.useState('');
 const [orderDuration,setOrderDuration]=React.useState('24h');
 const [tradeReady,setTradeReady]=React.useState(false);
 const [serverHistory,setServerHistory]=React.useState([] as any[]);
 const [demo,setDemo]=React.useState(true);
 const [liveRole,setLiveRole]=React.useState('player');
 const [adminId,setAdminId]=React.useState('');
 const [adminCode,setAdminCode]=React.useState('');
 const [adminAction,setAdminAction]=React.useState('grant');
 const [adminTeam,setAdminTeam]=React.useState([]);
 const [adminFunds,setAdminFunds]=React.useState([]);
 const [adminAmount,setAdminAmount]=React.useState('1000');
 const [adminFrom,setAdminFrom]=React.useState('TREASURY');
 const [adminTo,setAdminTo]=React.useState('MINING');
 const [adminReason,setAdminReason]=React.useState('Пополнение игрового фонда по решению владельца');
 const [adminCorrectionCurrency,setAdminCorrectionCurrency]=React.useState('GM');
 const [adminCorrectionPool,setAdminCorrectionPool]=React.useState('MINING');
 const [adminTicket,setAdminTicket]=React.useState('');
 const [testRecipient,setTestRecipient]=React.useState('self');
 const [testUserId,setTestUserId]=React.useState('');
 const [testCurrency,setTestCurrency]=React.useState('GM');
 const [testAmount,setTestAmount]=React.useState('1000');
 const [testReason,setTestReason]=React.useState('Начисление виртуальных GM/CR для проверки торговой системы');
 const [testCode,setTestCode]=React.useState('');
 const [testBusy,setTestBusy]=React.useState(false);
 const [backendStatus,setBackendStatus]=React.useState('Проверяем вход через Telegram…');
 const [modal,setModal]=React.useState('');
 const [boxReveal,setBoxReveal]=React.useState({kind:'bronze',gm:0});
 const [boxBusy,setBoxBusy]=React.useState(false);
 const [modalText,setModalText]=React.useState('');
 const toastRef=React.useRef(0);
 const flash=(msg:string)=>{setToast(msg);toastRef.current++;};
 const setW=(patch:any)=>setWallet((w:Wallet)=>({...w,...(typeof patch==='function'?patch(w):patch)}));
 const navStack=React.useRef([]);
 const goBack=()=>{
  const prev=navStack.current.pop()||'home';setScreen(prev);setModal('');
  try{history.replaceState({gmScreen:prev},'','#'+prev)}catch{}
  document.querySelector('.phone-scroll')?.scrollTo(0,0);
 };
 const goto=s=>{
  const route=String(s||'home');
  if(route!==screen){navStack.current.push(screen);if(navStack.current.length>30)navStack.current.shift();}
  setScreen(route);setModal('');
  try{history.pushState({gmScreen:route},'','#'+route)}catch{}
  document.querySelector('.phone-scroll')?.scrollTo(0,0);
 };
 React.useEffect(()=>{
  const onPop=()=>{const prev=navStack.current.pop()||'home',route=location.hash.slice(1);
   const allowed=['home','trade','earn','tasks','leaderboard','profile','reward','splash','intro','mining','vault','shop','referrals','history','settings','support','admin','achievements','more','streak','boxes'];
   setScreen(allowed.includes(route)?route:prev);setModal('');
   document.querySelector('.phone-scroll')?.scrollTo(0,0);
  };
  window.addEventListener('popstate',onPop);
  return()=>window.removeEventListener('popstate',onPop);
 },[]);

 React.useEffect(()=>{try{store.setItem('gm_theme',theme)}catch{};webapp?.setBackgroundColor?.(theme==='dark'?'#030406':'#E8EAF4')},[theme]);
 React.useEffect(()=>{document.documentElement.lang=actualLang||'en'},[actualLang]);
 React.useEffect(()=>{const timer=window.setTimeout(()=>setBooting(false),1100);return()=>window.clearTimeout(timer)},[]);
 React.useEffect(()=>{if(demo||!gmGuides[screen]||store.getItem('gm_guide_'+screen)==='done'){setGuideScreen('');return;}setGuideScreen(screen);setGuideStep(0);},[screen,demo]);
 React.useEffect(()=>{if(!guideScreen)return;const steps=gmGuides[guideScreen]||[];const selector=steps[guideStep]?.[2];const target=selector?document.querySelector(selector):null;if(target){target.classList.add('gm-guide-target');target.scrollIntoView({behavior:'smooth',block:'center'});}return()=>target?.classList.remove('gm-guide-target')},[guideScreen,guideStep,screen]);
 React.useEffect(()=>{try{window.localStorage.removeItem('gm_demo_wallet')}catch{}},[]);
 React.useEffect(()=>{const timer=setInterval(()=>setClock(Math.floor(Date.now()/1000)),1000);return ()=>clearInterval(timer)},[]);
 React.useEffect(()=>{
  webapp?.ready?.();webapp?.expand?.();
  const init=webapp?.initData;
  if(!init){setBackendStatus('Открой приложение через @gm_token_test_bot в Telegram');return;}
  let valid=true;
  gmFetchJson('/api/bootstrap',{headers:{Authorization:'tma '+init}},2)
   .then(d=>{if(!valid)return;
    setDemo(false);if(!store.getItem('gm_onboarding_complete'))setScreen('intro');setLiveRole(d.user?.role||'player');
    setBackendStatus('Telegram аккаунт: '+(d.user?.id||'подтверждён'));
    if(d.wallet)setW(w=>({...w,gm:d.wallet.gm/100,cr:d.wallet.cr/100,vault:d.wallet.vault/100,level:d.user?.level||w.level,xp:d.user?.xp??w.xp}));
   })
   .catch(err=>{if(!valid)return;setDemo(true);
    const msg=String(err?.message||'');
    setBackendStatus(/signature mismatch/i.test(msg)?'Ошибка подписи Telegram. Проверь настройки токена бота.':
      /expired|invalid initData/i.test(msg)?'Срок авторизации истёк — открой GM TOKEN заново из чата бота.':
      'Ошибка соединения или авторизации. '+msg);
   });
  return()=>{valid=false};
 },[]);

 const api=async(path,payload,silent=false)=>{
  const init=webapp?.initData;
  if(!init){if(!silent)flash('Открой GM TOKEN внутри Telegram');return null}
  try{return await gmFetchJson(path,{method:payload?'POST':'GET',
   headers:{Authorization:'tma '+init,'Content-Type':'application/json'},
   body:payload?JSON.stringify(payload):undefined},payload?0:2)}
  catch(error){if(!silent)flash('Ошибка: '+String(error?.message||error));return null}
 };

 const refreshLive=async()=>{if(!webapp?.initData)return;const d=await api('/api/game/status',undefined,true);if(!d)return;setLiveState(d);setW((w:Wallet)=>({...w,gm:d.wallet.gm/100,cr:d.wallet.cr/100,vault:d.wallet.vault/100,storage:d.mining.pending_cents/100,level:d.user?.level||w.level,xp:d.user?.xp??w.xp}));const [orders,book,tasks,achievements,refs,ranks,ticker,chart,trades]=await Promise.all([api('/api/exchange/orders',undefined,true),api('/api/exchange/book',undefined,true),api('/api/tasks',undefined,true),api('/api/achievements',undefined,true),api('/api/referrals/me',undefined,true),api('/api/leaderboard',undefined,true),api('/api/market/ticker',undefined,true),api('/api/market/ohlcv?interval='+period,undefined,true),api('/api/exchange/trades',undefined,true)]);if(orders)setLiveOrders(orders.orders||[]);if(book)setLiveBook(book);if(tasks)setLiveTasks(tasks.tasks||[]);if(achievements)setLiveAchievements(achievements.achievements||[]);if(refs)setLiveReferrals(refs);if(ranks)setLiveRanks(ranks);if(ticker)setLiveTicker(ticker);if(chart)setLiveCandles(chart.candles||[]);if(trades)setRecentTrades((trades.trades||[]).filter((t:any)=>!t.suspect).slice(0,10));setW((w:Wallet)=>({...w,streak:d.daily?.streak||0,lastClaim:d.daily?.last_claim_day||''}))};
 const gameAction=async(path:string,payload:any={})=>{const result=await api(path,{operationId:cryptoId(),...payload});if(result){if(result.wallet)setW((w:Wallet)=>({...w,gm:result.wallet.gm/100,cr:result.wallet.cr/100,vault:result.wallet.vault/100}));await refreshLive()}return result};
 React.useEffect(()=>{if(demo)return;refreshLive();const timer=setInterval(()=>{refreshLive()},12000);return()=>clearInterval(timer)},[demo,period]);
 const nav=(s:any)=>goto(s);
 const adminRequest=async(path:string,payload?:any)=>{
   if(demo||!webapp?.initData){flash('Только после Telegram-авторизации владельца');return;}
   try{const response=await fetch(path,{method:payload?'POST':'GET',headers:{Authorization:'tma '+webapp.initData,'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined});const x=await response.json();if(!response.ok)throw Error(x.error||'Сервер отказал');flash('Операция выполнена');return x}catch(e:any){flash('Ошибка: '+String(e.message||e));return null}
 };
 const adminChangeRole=()=>adminRequest('/api/admin/moderators',{telegramId:adminId,code:adminCode,action:adminAction}).then(()=>adminRequest('/api/admin/team').then(x=>x&&setAdminTeam(x.team||[])));
 const adminTransfer=()=>adminRequest('/api/admin/transfer',{source:adminFrom,target:adminTo,amount:adminAmount,code:adminCode,reason:adminReason,operationId:cryptoId()}).then(()=>adminRequest('/api/admin/pools').then(x=>x&&setAdminFunds(x.pools||[])));
 const adminCorrection=()=>adminRequest('/api/admin/correction',{userId:adminId,sourcePool:adminCorrectionPool,currency:adminCorrectionCurrency,amount:adminAmount,direction:'credit',ticket:adminTicket,code:adminCode,reason:adminReason,operationId:cryptoId()});
 const testGrant=async()=>{if(testBusy)return;setTestBusy(true);
  try{const out=await adminRequest('/api/admin/test-grant',{recipient:testRecipient,userId:testRecipient==='id'?testUserId:undefined,currency:testCurrency,amount:testAmount,reason:testReason,code:testCode,operationId:cryptoId()});
   if(out?.ok){setTestCode('');flash('Начислено '+testAmount+' '+testCurrency+' игроку '+out.userId);await refreshLive();}
  }finally{setTestBusy(false)}
 };
 function cryptoId(){return (window.crypto&&window.crypto.randomUUID)?window.crypto.randomUUID():'manual-'+Date.now()+'-'+Math.floor(Math.random()*999999)}
 const todayClaim=async()=>{const x=await gameAction('/api/daily/claim');if(x)goto('reward')};
 const miningClaim=async()=>{const result=await gameAction('/api/mining/claim');if(result?.gm_cents)flash(t('collected')+': '+nf(result.gm_cents/100)+' GM')};
 const upgradeMining=async()=>{const next=(liveState?.mining?.upgrade_level||1)+1;const result=await gameAction('/api/mining/upgrade',{toLevel:next});if(result?.upgrade_level){setUpgradePreview(Math.min(200,result.upgrade_level+1));flash(t('level')+' '+result.upgrade_level+' · +'+result.bonus_pct+'%')}};
 const openBox=async(kind)=>{
  if(boxBusy)return;
  setBoxBusy(true);
  try{
   const result=await api('/api/boxes/open',{kind,operationId:cryptoId()});
   if(result?.gm_cents!=null){
    setBoxReveal({kind,gm:result.gm_cents/100});await refreshLive();setModal('boxReveal');
   }
  }finally{setBoxBusy(false)}
 };
 const depositVault=async()=>{await gameAction('/api/vault/deposit',{amount:vaultAmount.replace(',','.')})};
 const withdrawVault=async()=>{await gameAction('/api/vault/withdraw',{amount:vaultAmount.replace(',','.')})};
 const tradeIssue=()=>{
  const v=String(amount||'').trim().replace(',','.');
  if(!/^\d{1,13}(\.\d{1,2})?$/.test(v))return 'Введи количество GM с точностью до двух знаков.';
  const n=Number(v);
  if(!Number.isFinite(n)||n<10)return 'Минимальная заявка — 10 GM.';
  if(side==='sell'){
   if(n>wallet.gm+0.000001)return 'Недостаточно GM: доступно '+nf(wallet.gm)+' GM. Пополни баланс через Admin или Mining.';
   if(orderType==='market'&&!liveTicker?.best_bid)return 'В стакане нет покупателей для Market-продажи. Используй Limit.';
  } else if(orderType==='market'&&!liveTicker?.best_ask)return 'В стакане нет продавцов для Market-покупки. Используй Limit.';
  if(liveTicker?.premarket&&orderType==='market')return 'До завершения Premarket допускаются только Limit-заявки.';
  const p=String(orderPrice||'').trim().replace(',','.');
  if(orderType==='limit'&&(!/^\d{1,13}(\.\d{1,2})?$/.test(p)||Number(p)<0.01))return 'Укажи цену Limit не меньше 0,01 CR за 1 GM.';
  if(side==='buy'){
   const rate=orderType==='limit'?Number(p):Math.floor(Number(liveTicker?.best_ask||0)*1.03)/100;
   const locked=Math.ceil(n*rate*100)/100;
   if(locked>wallet.cr+0.000001)return 'Недостаточно CR: потребуется около '+nf(locked)+' CR, доступно '+nf(wallet.cr)+' CR.';
  }
  return '';
 };
 const submitOrder=async()=>{
  const issue=tradeIssue();if(issue){flash(issue);setModal('tradeForm');return;}
  const request={type:orderType,side,amount:amount.replace(',','.'),price:orderPrice.replace(',','.'),duration:orderDuration};
  const x=await gameAction('/api/exchange/order',request);
  if(x){setModal('');setTradeReady(false);flash(x.auction?'Заявка Limit принята на аукцион':'Заявка GM/CR принята сервером');}
 };
 const cancelLiveOrder=async(id:string)=>{await gameAction('/api/exchange/cancel',{orderId:id})};
 const loadHistory=async()=>{const x=await api('/api/history');if(x)setServerHistory(x.events||[])};
 const tradePreview=()=>{
  const issue=tradeIssue();if(issue){flash(issue);return;}
  const n=Number(amount.replace(',','.'));
  const price=Number(orderPrice.replace(',','.'));
  setModalText((side==='buy'?'Покупка ':'Продажа ')+nf(n)+' GM. '+(orderType==='limit'?'Лимит '+nf(price)+' CR/GM.':'Market с защитой 3% от проскальзывания.')+' Комиссия при исполнении: 0,5% для каждой стороны. Подтверждение отправляет заявку на сервер.');
  setTradeReady(true);setModal('order');
 };
 const loadTickets=async()=>{
  try{const r=await fetch('/api/tickets',{headers:{Authorization:'tma '+webapp?.initData}});const x=await r.json();if(!r.ok)throw Error(x.error);setSupportTickets(x.tickets||[])}catch(e:any){flash('Ошибка получения тикетов: '+e.message)}
 };
 const ticketAction=async(id:string,action:string,payload:any={})=>{
  const x=await adminRequest(`/api/tickets/${id}/${action}`,payload);if(x)loadTickets();
 };
 const createTicket=async()=>{
  if(supportText.trim().length<10){flash('Опиши проблему минимум в 10 символах');return;}
  const x=await adminRequest('/api/tickets',{category:supportCategory,body:supportText});if(x){setSupportText('');await loadTickets()}
 };
 const icon=(n:string,size=23,tile=false)=> <Icon name={n} theme={theme} size={size} tile={tile}/>;
 const isLight=theme==='light';
 const top=(title:string,back=true,right='more')=><header className={'screen-header '+(!isLight?'dark-head':'')}><button className="header-icon" aria-label="Назад" onClick={()=>back?goBack():goto('more')} >{back?icon('chevron-left',24):<Brand theme={theme} size={35}/>}</button><strong>{title}</strong><button className="header-icon" onClick={()=>right==='settings'?goto('settings'):goto('more')} aria-label="Дополнительные действия">{icon(right,23)}</button></header>;
 const menuItems=[['home','home',lang('home')],['trade','candlesticks',lang('market')],['mining','lightning',lang('mining')],['boxes','gift',lang('boxes')],['more','more',lang('more')]];
 const bottom=()=> <nav className="bottom-nav" aria-label="Основные разделы">{menuItems.map(([s,i,t]:any)=><BarButton key={s} name={i} theme={theme} title={t} selected={screen===s||(isLight&&s==='earn'&&screen==='tasks')||(!isLight&&s==='earn'&&screen==='tasks')} onClick={()=>goto(s==='earn'&&isLight?'tasks':s)}/>)}</nav>;
 
 
 function Home(){
  const e=React.createElement;
  const points=liveState?.points?.points??0;
  const miningRate=(liveState?.mining?.rate_cents_day!=null?liveState.mining.rate_cents_day/100:gmRate(wallet));
  const level=wallet.level||1;
  const nextLevel=xpThreshold[Math.min(9,level)]||xpThreshold[9];
  const previous=xpThreshold[Math.max(0,level-1)]||0;
  const progress=Math.max(0,Math.min(100,(wallet.xp-previous)/Math.max(1,nextLevel-previous)*100));
  const data=(liveCandles||[]).filter(c=>Number.isFinite(c.close)).slice(-18);
  const closes=data.map(c=>c.close);
  const min=Math.min(...closes),max=Math.max(...closes),delta=Math.max(1,max-min);
  const spark=data.length>=2?e('svg',{viewBox:'0 0 320 90',preserveAspectRatio:'none',role:'img','aria-label':'Подтверждённые цены GM/CR'},
   e('defs',null,e('linearGradient',{id:'gm-spark-grad',x1:0,y1:0,x2:0,y2:1},
    e('stop',{offset:'0%',stopColor:theme==='light'?'#6b788e':'#cfd5e1',stopOpacity:.23}),
    e('stop',{offset:'100%',stopColor:theme==='light'?'#6b788e':'#cfd5e1',stopOpacity:0}))),
   e('polyline',{points:closes.map((v,i)=>(12+i*296/(closes.length-1))+','+(78-(v-min)/delta*61)).join(' '),
    fill:'none',stroke:theme==='light'?'#485465':'#c3cedc',strokeWidth:2.5,strokeLinecap:'round',strokeLinejoin:'round'}))
  :e('div',{className:'gm-home-market-empty'},icon('candlesticks',21),e('span',null,'График появится после нескольких сделок'));
  const quick=[['lightning','Майнинг','mining'],['gift','Боксы','boxes'],['tasks','Задания','tasks'],['friends','Друзья','referrals']];
  return e('div',{className:'gm-home-v8'},
   e('header',{className:'gm-home-topline'},
    e('div',{className:'gm-home-brand'},e(Brand,{theme,size:37}),e('div',null,e('b',null,'GM TOKEN'),e('small',null,'PREMIUM EDITION'))),
    e('button',{className:'gm-home-settings',type:'button',onClick:()=>goto('settings'),'aria-label':'Настройки'},icon('settings',23))),
   e('div',{className:'gm-home-level'},
    e('div',null,e('span',null,'Твой прогресс'),e('b',null,'Уровень '+level)),
    e('div',{className:'gm-home-level-right'},nf(wallet.xp,0)+' / '+nf(nextLevel,0)+' XP'),
    e('div',{className:'gm-home-level-track'},e('span',{style:{width:progress+'%'}}))),
   e('section',{className:'gm-home-wallet gm-premium-card'},
    e('div',{className:'gm-home-wallet-head'},e('span',null,'МОЙ БАЛАНС'),e('span',null,icon('shield-check',16),' Подтверждён')),
    e('div',{className:'gm-home-balance-row'},
     e('span',{className:'gm-home-balance-icon'},e(Brand,{theme,size:33})),
     e('div',null,e('small',null,'GM'),e('strong',null,nf(wallet.gm))),
     e('button',{type:'button',onClick:()=>goto('mining'),'aria-label':'Перейти в Mining'},icon('plus',21))),
    e('div',{className:'gm-home-balance-row'},
     e('span',{className:'gm-home-balance-icon'},icon('coins',31)),
     e('div',null,e('small',null,'CR'),e('strong',null,nf(wallet.cr))),
     e('button',{type:'button',onClick:()=>goto('trade'),'aria-label':'Перейти на рынок'},icon('chevron-right',21)))),
   e('button',{type:'button',className:'gm-home-chart gm-premium-card',onClick:()=>goto('trade')},
    e('div',{className:'gm-home-chart-top'},
     e('div',null,e('small',null,'РЫНОК · ТЕСТОВЫЙ GM/CR'),
      e('b',null,liveTicker?.last_price?nf(liveTicker.last_price/100)+' CR':'Нет цены')),
     icon('chevron-right',21)),
    spark,
    e('small',{className:'gm-home-chart-note'},'Только реальные игровые сделки · без искусственного графика')),
   e('div',{className:'gm-home-shortcuts'},quick.map(([img,label,route])=>
    e('button',{type:'button',key:route,onClick:()=>goto(route),className:'gm-home-shortcut'},
      e('span',null,icon(img,30,true)),e('b',null,label)))),
   e('button',{type:'button',className:'gm-home-offer gm-premium-card',onClick:()=>goto('mining')},
    e('span',{className:'gm-home-offer-coin'},e(Brand,{theme,size:51})),
    e('span',null,e('b',null,'Майнинг работает'),
      e('small',null,nf(miningRate,0)+' GM/сутки · накоплено '+nf(wallet.storage)+' GM')),
    icon('chevron-right',21)),
   e('button',{type:'button',className:'gm-home-offer gm-premium-card',onClick:()=>goto('boxes')},
    e('span',{className:'gm-home-offer-coin'},icon('gift',45,true)),
    e('span',null,e('b',null,'Открывай боксы за POINTS'),
      e('small',null,'Твои POINTS: '+nf(points,0)+' · гарантированные награды')),
    icon('chevron-right',21)),
   e('div',{className:'gm-home-lower'},
    e('button',{type:'button',onClick:()=>goto('reward')},icon('flame',19),' Daily Reward',icon('chevron-right',15)),
    e('button',{type:'button',onClick:()=>goto('more')},icon('info',19),' Как играть',icon('chevron-right',15)))
  );
 }

 function Trading(){
  const e=React.createElement;
  const pre=liveTicker?.premarket??!liveBook?.auction_done;
  const remain=Math.max(0,(liveTicker?.auction_end_at||liveBook?.auction_end_at||0)-clock);
  const countdown=[Math.floor(remain/3600),Math.floor(remain%3600/60),remain%60].map(x=>String(x).padStart(2,'0')).join(':');
  const quote=pre?liveTicker?.indicative?.price:liveTicker?.last_price;
  const bids=liveBook?.bids||[],asks=liveBook?.asks||[];
  const activeOrders=liveOrders.filter(o=>o.status==='open');
  const isOwner=['owner','coowner'].includes(liveRole);
  const topDepth=Math.max(1,...[...bids,...asks].map(o=>o.gm_cents));
  const openTrade=kind=>{setSide(kind);setOrderType('limit');setModal('tradeForm');};
  const tradeName=pre?'PREMARKET':liveTicker?.trade_test_mode?'TEST SPOT':'SPOT';
  const timeframe=['1m','5m','15m','1h','4h','1d'];
  const tabNames=[['book','Стакан'],['recent','Сделки'],['orders','Мои ордера']];
  const depthRows=(orders,kind)=>orders.length?
   orders.slice(0,10).map(o=>e('div',{className:'terminal-depth-row '+kind,key:kind+o.limit_price},
     e('div',{className:'terminal-depth-bar',style:{width:Math.max(3,Math.min(100,100*o.gm_cents/topDepth))+'%'}}),
     e('span',null,nf(o.limit_price/100)),
     e('b',null,nf(o.gm_cents/100,2))))
   :e('p',{className:'terminal-table-empty'},'Пока нет заявок');
  const bookPanel=e('div',{className:'terminal-depth'},
   e('div',{className:'terminal-depth-head'},
    e('span',null,'Цена',e('small',null,'CR / GM')),
    e('span',null,'Объём',e('small',null,'GM'))),
   e('div',{className:'terminal-depth-columns'},
    e('div',{className:'terminal-depth-column'},
     e('div',{className:'terminal-depth-label bid'},e('i'),e('b',null,'ПОКУПКА')),depthRows(bids,'bid')),
    e('div',{className:'terminal-depth-column'},
     e('div',{className:'terminal-depth-label ask'},e('i'),e('b',null,'ПРОДАЖА')),depthRows(asks,'ask'))),
   e('div',{className:'terminal-depth-bottom'},e('span',null,'Bid ',e('b',null,liveTicker?.best_bid?nf(liveTicker.best_bid/100):'—')),
     e('span',null,'Ask ',e('b',null,liveTicker?.best_ask?nf(liveTicker.best_ask/100):'—'))));
  const tradesPanel=e('div',{className:'terminal-trade-history'},
   recentTrades.length?recentTrades.map((t,i)=>e('div',{className:'terminal-history-row',key:String(t.at||i)+'-'+i},
    e('span',null,new Date((t.at||0)*1000).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})),
    e('b',null,nf(t.price/100)+' CR'),
    e('span',null,nf(t.amount_cents/100)+' GM')))
   :e('div',{className:'terminal-tab-empty'},icon('clock',30),e('b',null,'Сделок пока нет'),
    e('small',null,'Здесь появятся исполненные, подтверждённые сервером сделки.')));
  const ordersPanel=e('div',{className:'terminal-my-orders'},
   activeOrders.length?activeOrders.slice(0,25).map(o=>e('div',{className:'trade-open-row terminal-own-row',key:o.id},
    e('div',null,
     e('b',{className:o.side==='buy'?'terminal-order-buy':'terminal-order-sell'},o.side==='buy'?'Покупка GM':'Продажа GM'),
     e('small',null,nf(o.remaining_cents/100)+' GM · '+nf(o.limit_price/100)+' CR/GM')),
    e('button',{type:'button',onClick:()=>cancelLiveOrder(o.id)},'Отменить')))
   :e('div',{className:'terminal-tab-empty'},icon('layers',30),
    e('b',null,'Активных ордеров нет'),e('small',null,'Выбери «Купить» или «Продать», чтобы создать Limit-заявку.')));
  return e(React.Fragment,null,
   top('Trade',true,'more'),
   e('section',{className:'terminal-shell'},
    e('div',{className:'terminal-pair-top'},
     e('div',{className:'terminal-pair-logo'},icon('gm-coin-orbit',39)),
     e('div',{className:'terminal-pair-text'},e('b',null,'GM / CR'),e('small',null,'GM TOKEN · торговая пара')),
     e('div',{className:'terminal-live-tag'},e('i',{className:'terminal-live-dot'}),tradeName)),
    e('div',{className:'terminal-quote'},
     e('div',{className:'terminal-quote-label'},e('span',null,pre?'Индикативная цена':'Последняя цена сделки'),
      e('button',{type:'button',onClick:refreshLive,'aria-label':'Обновить котировки'},icon('refresh',17))),
     e('div',{className:'terminal-quote-value'},quote?nf(quote/100):'—',e('small',null,'CR')),
     e('p',null,quote?pre?'Ориентировочная цена не означает исполненную сделку.':'Подтверждено исполненной сделкой GM/CR.':'Цена появится после первой исполненной сделки между разными игроками')),
    e('div',{className:'terminal-metrics'},
     e('div',null,e('small',null,'ОБЪЁМ · 24 Ч'),e('b',null,nf((liveTicker?.volume_24h_gm_cents||0)/100)+' GM')),
     e('div',null,e('small',null,'СДЕЛОК · 24 Ч'),e('b',null,String(liveTicker?.trades_24h||0))),
     e('div',null,e('small',null,'РЕЖИМ'),e('b',null,pre?countdown:'Активен'))),
    e('div',{className:'terminal-chart-toolbar'},
     e('div',null,e('b',null,'ГРАФИК'),e('small',null,'Свечи OHLCV')),
     e('div',{className:'terminal-chart-truth'},icon('shield-check',15),'Реальные сделки')),
    e('div',{className:'terminal-periods','aria-label':'Интервал свечей'},
     timeframe.map(t=>e('button',{type:'button',key:t,className:period===t?'active':'',
       'aria-pressed':period===t,onClick:()=>{setSelectedCandle(null);setPeriod(t);}},t))),
    e(Candles,{theme,candles:liveCandles,selected:selectedCandle,onSelect:setSelectedCandle,interval:period})
   ),
   e('section',{className:'terminal-controls'},
    e('div',{className:'trade-wallet-balances terminal-wallet-line'},
     e('div',null,e('small',null,'Доступно для торговли'),e('span',null,icon('wallet',17),' Твой баланс')),
     e('div',{className:'terminal-wallet-amounts'},
      e('span',null,e('b',null,nf(wallet.gm)),' GM'),
      e('span',null,e('b',null,nf(wallet.cr)),' CR'))),
    e('div',{className:'trade-cta-row terminal-buy-sell'},
     e('button',{type:'button',className:'trade-cta buy',onClick:()=>openTrade('buy')},
      icon('plus',19),e('span',null,e('b',null,'КУПИТЬ GM'),e('small',null,'За игровые CR'))),
     e('button',{type:'button',className:'trade-cta sell',onClick:()=>openTrade('sell')},
      icon('minus',19),e('span',null,e('b',null,'ПРОДАТЬ GM'),e('small',null,'Получить CR')))),
    (isOwner||wallet.gm<10)?e('div',{className:'terminal-funding'},
     e('span',null,'Доступно для торговли: GM и CR; открытые заявки резервируют средства.'),
     e('button',{type:'button',onClick:()=>goto(isOwner?'admin':'mining')},
      isOwner?'Пополнить тестовый баланс':'Mining',icon('chevron-right',16))):null),
   e('section',{className:'terminal-data-panel'},
    e('div',{className:'terminal-data-tabs',role:'tablist','aria-label':'Данные рынка'},
     tabNames.map(([value,label])=>e('button',{type:'button',key:value,role:'tab',
      className:tradeTab===value?'active':'','aria-selected':tradeTab===value,
      onClick:()=>setTradeTab(value)},label))),
    e('div',{className:'terminal-tab-content'},tradeTab==='book'?bookPanel:tradeTab==='recent'?tradesPanel:ordersPanel)),
   e('p',{className:'terminal-fine-print'},'GM и CR — виртуальные игровые единицы. Свечи и объём рассчитываются только по исполненным сделкам. Комиссия 0,5% для каждой стороны при исполнении.')
  );
 }

 function TradeOrderModal(){
  const e=React.createElement;
  const pre=!!liveTicker?.premarket;
  const isForm=modal==='tradeForm';
  const qty=Number(String(amount).replace(',','.'));
  const px=Number(String(orderPrice).replace(',','.'));
  const quotePrice=orderType==='limit'?px:(Number(liveTicker?.best_ask||0)/100)*1.03;
  const estimate=Number.isFinite(qty)&&qty>0&&Number.isFinite(quotePrice)&&quotePrice>0?Math.ceil(qty*quotePrice*100)/100:0;
  const available=side==='buy'?wallet.cr:wallet.gm;
  const required=side==='buy'?estimate:qty;
  const issue=tradeIssue();
  const label=side==='buy'?'Купить GM':'Продать GM';
  return e('div',{className:'overlay trade-overlay',onClick:()=>setModal('')},
   e('div',{className:'modal-box trade-sheet',role:'dialog','aria-modal':'true','aria-label':isForm?label:'Подтверждение ордера',onClick:ev=>ev.stopPropagation()},
    e('div',{className:'trade-sheet-head'},
     e('div',{className:'trade-sheet-title'},
      e('div',{className:'trade-sheet-icon'},icon(side==='buy'?'deposit':'withdraw',30)),
      e('span',null,e('strong',null,isForm?label:'Проверь заявку'),e('small',null,'GM / CR · '+(pre?'Premarket':'Test Spot')))),
     e('button',{type:'button',className:'trade-sheet-x',onClick:()=>setModal(''),'aria-label':'Закрыть'},icon('close',21))),
    e('div',{className:'trade-sheet-balance'},
     e('span',null,'Доступно '+(side==='buy'?'CR':'GM')),
     e('strong',null,nf(available)+' '+(side==='buy'?'CR':'GM'))),
    isForm?e(React.Fragment,null,
     e('div',{className:'trade-field'},
      e('label',{htmlFor:'trade-order-type'},'Тип заявки'),
      e('select',{id:'trade-order-type',value:orderType,onChange:ev=>setOrderType(ev.target.value)},
       e('option',{value:'limit'},'Limit · своя цена'),
       e('option',{value:'market',disabled:pre},'Market · до 3% проскальзывания'))),
     e('div',{className:'trade-field'},
      e('label',{htmlFor:'trade-qty'},'Количество GM'),
      e('input',{id:'trade-qty',type:'text',inputMode:'decimal',placeholder:'Например, 5000',value:amount,onChange:ev=>setAmount(ev.target.value)})),
     e('div',{className:'trade-sheet-presets'},['10','100','1000','5000'].map(v=>e('button',{type:'button',key:v,className:amount===v?'active':'',onClick:()=>setAmount(v)},v))),
     orderType==='limit'?e('div',{className:'trade-field'},
      e('label',{htmlFor:'trade-price'},'Цена · CR за 1 GM'),
      e('input',{id:'trade-price',type:'text',inputMode:'decimal',value:orderPrice,placeholder:'Например, 0.50',onChange:ev=>setOrderPrice(ev.target.value)})):null,
     orderType==='limit'?e('div',{className:'trade-field'},
      e('label',{htmlFor:'trade-expiry'},'Срок действия заявки'),
      e('select',{id:'trade-expiry',value:orderDuration,onChange:ev=>setOrderDuration(ev.target.value)},
       ['1h','6h','12h','24h','3d','7d','GTC'].map(x=>e('option',{key:x},x)))):null,
     e('div',{className:'trade-sheet-estimate'},
      e('span',null,side==='buy'?'Резерв по заявке':'Заблокируется GM'),
      e('strong',null,(required>0?nf(required):'—')+' '+(side==='buy'?'CR':'GM'))),
     issue?e('p',{className:'trade-form-alert',role:'alert'},icon('shield-check',17),issue):e('p',{className:'trade-form-help'},'Комиссия 0,5% при исполнении с обеих сторон. Без фиктивных сделок.'),
     e('button',{type:'button',className:'trade-sheet-primary',disabled:!!issue,onClick:tradePreview},'Проверить заявку',icon('chevron-right',20))):
    e(React.Fragment,null,
     e('div',{className:'trade-review'},e('span',null,'ПОДТВЕРЖДЕНИЕ'),e('p',null,modalText)),
     e('div',{className:'trade-sheet-estimate'},e('span',null,'Доступно сейчас'),e('strong',null,nf(available)+' '+(side==='buy'?'CR':'GM'))),
     issue?e('p',{className:'trade-form-alert',role:'alert'},issue):null,
     e('button',{type:'button',className:'trade-sheet-primary',disabled:!!issue,onClick:submitOrder},'Отправить ордер',icon('shield-check',20))),
    e('button',{type:'button',className:'trade-sheet-secondary',onClick:()=>{setModal(isForm?'':'tradeForm')}},isForm?'Отмена':'Назад к форме')
   )
  );
 }
 function Earn(){return <>{!isLight?<header className="dark-top"><b>GM TOKEN</b><button onClick={()=>goto('settings')}>{icon('more',22)} {icon('close',17)}</button></header>:top('Earn',true,'gift')}<div className={'earn-total '+(isLight?'pearl-card':'metallic-card')}><div><small>Текущий баланс GM</small><div className="earned-number">{nf(wallet.gm,0)} <span>GM</span></div></div>{icon('trending-up',48)}</div><h3 className="section-title">Earn Methods</h3><div className="earn-methods">{[['gift','Daily Reward','Get free GM tokens every day','reward'],['coins','Hold & Earn','Earn game rewards for holding','vault'],['tasks','Tasks','Complete tasks and earn more','tasks'],['friends','Invite Friends','Get bonuses for referrals','referrals'],['lightning','Mining','Play to earn virtual GM','mining'],['swap','GM Shop','Exchange virtual GM into CR','shop']].map(([i,title,description,s])=><button key={title} className={'earn-item '+(isLight?'pearl-card':'metallic-card')} onClick={()=>goto(s as Route)}>{icon(i,48,true)}<span><b>{title}</b><small>{description}</small></span>{icon('chevron-right',19)}</button>)}</div></>}
 
function Tasks(){
 const e=React.createElement;
 const tabs=[['All','Все'],['Social','Социальные'],['Other','Игровые']];
 const shown=(liveTasks||[]).filter(t=>taskFilter==='All'||t.category===taskFilter);
 const rows=shown.length?shown.map(t=>{
  const completed=!!t.claimed,ready=!!t.available;
  const caption=(t.xp>0?'+'+t.xp+' XP':'')+(t.gm>0?' · +'+t.gm+' GM':'');
  const action=async()=>{const result=await gameAction('/api/tasks/claim',{id:t.id});if(result)await refreshLive()};
  return e('div',{className:'gm-task-item gm-premium-card',key:t.id},
   e('span',{className:'gm-task-icon'},icon(t.icon||'tasks',29,true)),
   e('div',{className:'gm-task-details'},
    e('b',null,t.title||'Задание'),
    e('small',null,t.description||'Подтверди выполнение условия'),
    e('strong',null,caption||'Достижение')),
   e('button',{type:'button',disabled:demo||completed||!ready,onClick:action,
    className:completed?'done':ready?'ready':''},
    completed?icon('check',18):ready?'Забрать':icon('clock',18)));
 }):e('div',{className:'gm-task-empty gm-premium-card'},icon('tasks',44,true),
   e('b',null,'Задания готовятся'),e('small',null,'Проверь список после подключения Telegram.'));
 return e(React.Fragment,null,
  top('Задания',true,'tasks'),
  e('div',{className:'gm-task-header gm-premium-card'},icon('tasks',44,true),
   e('div',null,e('b',null,'Выполняй цели'),e('small',null,'Игровые задания с проверяемыми условиями. Награды начисляет только сервер.'))),
  e('div',{className:'gm-task-filters'},tabs.map(([value,label])=>e('button',{type:'button',key:value,
   className:taskFilter===value?'active':'',onClick:()=>setTaskFilter(value)},label))),
  e('div',{className:'gm-task-list'},rows),
  e('p',{className:'gm-task-note'},'Задания за подписки появятся после настройки безопасной проверки членства через Telegram. Сейчас доступны только проверяемые игровые действия.')
 );
}

 function Leaderboard(){
  const e=React.createElement;
  const leagues=(liveState?.league?.all||[{id:'bronze',name:'Bronze',xp:0},{id:'silver',name:'Silver',xp:1000},{id:'gold',name:'Gold',xp:3000},{id:'platinum',name:'Platinum',xp:7500},{id:'diamond',name:'Diamond',xp:15000},{id:'master',name:'Master',xp:30000},{id:'grandmaster',name:'Grandmaster',xp:50000},{id:'elite',name:'Elite',xp:75000},{id:'legend',name:'Legend',xp:110000},{id:'immortal',name:'GM Immortal',xp:160000}]);
  const current=liveState?.league?.current?.id||'bronze';
  const users=(liveRanks?.users||[]).filter((u:any)=>rankFilter==='Global'||(liveReferrals?.referred||[]).some((r:any)=>r.user_id===u.id));
  return e(React.Fragment,null,
   top(t('league')+' · GM',true,'trophy'),
   e('section',{className:'gm-league-hero gm-premium-card'},
    icon('trophy',50,true),
    e('div',null,e('small',null,t('league')+' · '+(liveState?.league?.current?.name||'Bronze')),
     e('strong',null,nf(wallet.xp,0)+' XP'),
     e('span',null,(liveState?.league?.next? t('nextLeague')+': '+nf(liveState.league.remaining_xp,0)+' XP':'GM Immortal')))),
   e('div',{className:'gm-league-list'},leagues.map((item:any,i:number)=>e('div',{
    key:item.id,className:'gm-league-row gm-premium-card '+(item.id===current?'active':'')},
     e('span',{className:'gm-league-number'},String(i+1).padStart(2,'0')),
     icon(i>=8?'crown':i>=3?'diamond':'shield-check',27,true),
     e('div',null,e('b',null,item.name),e('small',null,nf(item.xp,0)+' XP')),
     item.id===current?icon('check',18):null))),
   e('div',{className:'rank-tabs'},e('button',{type:'button',onClick:()=>setRankFilter('Global'),className:rankFilter==='Global'?'on':''},'Global'),
    e('button',{type:'button',onClick:()=>setRankFilter('Friends'),className:rankFilter==='Friends'?'on':''},t('friends'))),
   e('div',{className:'leader-rows'},users.map((u:any,i:number)=>e('div',{className:'leader-row',key:u.id},
    e('b',null,i+1),icon('profile',27),e('span',null,clean(u.username||'Player')),
    e('small',null,nf(u.score_cents/100)+' GM')))),
   !users.length&&e('p',{className:'disclaimer'},liveRanks?.pending_rule?'Таблица лидеров будет доступна после проверки критериев рейтинга.':'В выбранном рейтинге пока нет игроков.'));
 }
 function Profile(){
  const e=React.createElement;
  const league=liveState?.league;
  const xpNext=wallet.level<10?xpThreshold[wallet.level]:null;
  const xpPrev=xpThreshold[Math.max(0,wallet.level-1)]||0;
  const xpPct=xpNext==null?100:Math.max(0,Math.min(100,(wallet.xp-xpPrev)*100/(xpNext-xpPrev)));
  const menu=[['trophy',t('achievements'),'achievements'],['friends',t('referrals'),'referrals'],
   ['clock',t('history'),'history'],['settings',lang('settings'),'settings'],['info',t('support'),'support']];
  const milestones=[25,50,75,100,125,150,175,200];
  const unlockLevel=Number(liveState?.mining?.upgrade_level||1);
  return e(React.Fragment,null,
   top(t('profile'),true,'settings'),
   e('div',{className:'profile-hero gm-profile-hero'},e('div',{className:'gm-profile-avatar'},
    e(Brand,{theme,size:94})),
    e('h2',null,clean(webapp?.initDataUnsafe?.user?.first_name||webapp?.initDataUnsafe?.user?.username||'Player')),
    e('p',null,'#'+String(webapp?.initDataUnsafe?.user?.id||''))),
   e('div',{className:'xp-area gm-premium-card gm-profile-level'},
    e('div',{className:'xp-line'},e('b',null,t('level')+' '+wallet.level),
     e('small',null,nf(wallet.xp,0)+' / '+(xpNext==null?'MAX':nf(xpNext,0))+' XP')),
    e('div',{className:'progress'},e('div',{style:{width:xpPct+'%'}})),
    e('div',{className:'gm-profile-next'},xpNext==null?'MAX XP':t('nextLeague')+': '+nf(league?.remaining_xp??0,0)+' XP')),
   e('button',{type:'button',className:'gm-profile-league gm-premium-card',onClick:()=>goto('leaderboard')},
    icon('trophy',32,true),
    e('span',null,e('b',null,t('league')+': '+(league?.current?.name||'Bronze')),
     e('small',null,(league?.next?.name||'GM Immortal')+' · '+Math.floor(league?.progress_pct||0)+'%')),
    icon('chevron-right',20)),
   e('div',{className:'stats-grid'},[
     ['friends',String(liveReferrals?.referred?.length||0),t('friends')],
     ['wallet',nf(wallet.gm,0),t('balance')],
     ['lightning',String(wallet.streak),t('streak')]].map(([i,n,label])=>e('div',{className:'stat-card',key:label},
      icon(i,23),e('b',null,n),e('small',null,label)))),
   e('div',{className:'profile-menu'},menu.map(([i,title,route])=>e('button',{type:'button',key:route,
    onClick:()=>goto(route)},icon(i,22),e('span',null,title),icon('chevron-right',19))),
    e('button',{type:'button',onClick:()=>document.getElementById('gm-profile-frames')?.scrollIntoView({behavior:'smooth',block:'start'})},
     icon('diamond',22),e('span',null,actualLang==='uk'?'Рамки профілю':'Profile Frames'),icon('chevron-right',19))),
   e('section',{id:'gm-profile-frames',className:'gm-profile-frames'},
    e('h3',null,actualLang==='uk'?'Колекція рамок':'Коллекция рамок'),
    e('p',null,actualLang==='uk'?'За досягнення та рівні майнінгу. Нагороди поки не активовані.':'За достижения и уровни майнинга. Выдача наград пока не активирована.'),
    e('div',{className:'gm-frame-grid'},milestones.map((m:number)=>e('div',{
     className:'gm-frame-item gm-premium-card '+(unlockLevel>=m?'unlocked':'locked'),key:m},
      e('div',{className:'gm-frame-preview'},e(Brand,{theme,size:42})),
      e('b',null,m===200?'GM Immortal':'LV. '+m),
      e('small',null,'🔒 '+(actualLang==='uk'?'Незабаром':'Скоро'))))),
   e('p',{className:'gm-profile-footnote'},'GM/CR — виртуальные игровые единицы, не реальные средства.'));
 }

 
function Reward(){
 const e=React.createElement;
 const enabled=!!liveState?.config?.daily_enabled;
 const claimed=wallet.lastClaim===todayUTC();
 const streak=Math.max(0,wallet.streak||0);
 const reward=Number(liveState?.config?.daily_reward_gm||0);
 const days=[1,2,3,4,5,6,7].map(n=>e('div',{key:n,className:'gm-daily-day '+(n<=Math.min(streak,7)?'done':'')},
  n<=Math.min(streak,7)?icon('check',16):e('b',null,String(n)),e('small',null,'ДЕНЬ '+n)));
 return e('div',{className:'gm-daily-v8'},
  e('button',{type:'button',className:'gm-daily-close',onClick:goBack,'aria-label':'Назад'},icon('chevron-left',23)),
  e('div',{className:'gm-daily-intro'},e('div',{className:'gm-daily-medal'},icon('gift',80,true)),
   e('span',null,'DAILY REWARD'),e('h1',null,'Ежедневная награда'),
   e('p',null,claimed?'Ты уже получил награду сегодня. Заходи завтра!':'Заходи каждый день и получай виртуальные GM.')),
  e('div',{className:'gm-daily-amount gm-premium-card'},
   e('small',null,'НАГРАДА ЗА СЕГОДНЯ'),
   e('strong',null,(reward>0?nf(reward,0):'—')+' GM'),
   e('span',null,'Серия: '+streak+' дн.')),
  e('div',{className:'gm-daily-week gm-premium-card'},
   e('b',null,'Недельная серия'),e('div',{className:'gm-daily-days'},days)),
  e('button',{type:'button',className:'gm-daily-action',disabled:demo||!enabled||claimed,onClick:todayClaim},
   icon(claimed?'check':'gift',23),claimed?'Награда получена':enabled?'Получить '+nf(reward,0)+' GM':'Награды не включены'),
  e('button',{type:'button',className:'gm-daily-secondary',onClick:()=>goto('mining')},
   icon('lightning',21),'Перейти в Майнинг',icon('chevron-right',17)),
  e('p',{className:'gm-daily-foot'},'Награды подтверждаются на сервере. Серия считается по UTC-дням; повторное получение за день невозможно.')
 );
}

 function Splash(){return <div className="splash-view"><div className="splash-glow"></div><div className="splash-logo"><img src={BRAND+'gm-lettermark-metallic-transparent.png'} alt="GM TOKEN"/></div><h1>GM TOKEN</h1><p>Earn · Hold · Grow</p><button className="splash-start" onClick={()=>goto('home')}>Открыть приложение</button></div>}
 
 function Mining(){
  const e=React.createElement;
  const status=liveState?.mining||{};
  const enabled=!!status.upgrade_enabled;
  const level=Math.max(1,Math.min(200,Number(status.upgrade_level)||1));
  const next=level<200?level+1:null;
  const cost=Number(status.next_cost_gm??(next?gmUpgradeCost(next):0));
  const rate=status.rate_cents_day!=null?status.rate_cents_day/100:gmRate(wallet);
  const stored=wallet.storage;
  const hours=Number(status.storage_hours)||(enabled?8:storageHours(wallet.level));
  const cap=Math.max(1,rate*hours/24);
  const pct=Math.max(0,Math.min(100,stored/cap*100));
  const preview=Math.max(1,Math.min(200,Number(upgradePreview)||1));
  const mineClick=()=>{
   if(demo)return flash('Открой GM TOKEN через Telegram');
   if(stored<1)return flash('GM накапливаются автоматически. Минимум для сбора — 1 GM');
   miningClaim();
  };
  const milestones=[25,50,75,100,125,150,175,200];
  const isUpgrade=miningTab==='upgrades';
  const tabButton=(kind:string,label:string)=>e('button',{type:'button',key:kind,
   onClick:()=>setMiningTab(kind),className:miningTab===kind?'active':'',
   'aria-pressed':miningTab===kind},label);
  const intro=e('div',{className:'gm-mining-topline'},e('span',null,'GM TOKEN · MINING'),
   e('span',null,'LV. '+level+' / 200'));
  const mineView=e(React.Fragment,null,
   e('div',{className:'gm-mining-coin-stage'},
    e('button',{type:'button',className:'gm-mining-coin-wrap',onClick:mineClick,
     'aria-label':t('collect')},
     e('span',{className:'gm-mining-orbit gm-mining-orbit-first','aria-hidden':true}),
     e('span',{className:'gm-mining-orbit gm-mining-orbit-second','aria-hidden':true}),
     e('span',{className:'gm-mining-coin-rim'},e(Brand,{theme,size:206})),
     e('span',{className:'gm-mining-coin-glint','aria-hidden':true}))),
   e('div',{className:'gm-mining-total'},icon('lightning',27),
    e('strong',null,nf(stored)),e('span',null,' GM')),
   e('p',{className:'gm-mining-tap-guide'},t('collected')+' · '+nf(rate/24,2)+' GM/час'),
   e('section',{className:'gm-mining-energy gm-premium-card'},
    e('div',{className:'gm-mining-energy-head'},e('b',null,t('storage')),e('span',null,nf(stored)+' / '+nf(cap)+' GM')),
    e('div',{className:'gm-mining-energy-track'},e('span',{style:{width:pct+'%'}})),
    e('div',{className:'gm-mining-energy-foot'},e('small',null,hours+' ч'),
     e('small',null,nf(rate,2)+' GM / '+t('daily')))),
   e('button',{type:'button',className:'gm-mining-claim',disabled:demo||stored<1,onClick:miningClaim},
    icon('diamond',22),e('span',null,t('collect')),icon('chevron-right',18)),
   e('div',{className:'gm-mining-hint'},'Добыча начисляется сервером из ограниченного игрового фонда.'),
   e('button',{type:'button',className:'gm-mining-open-upgrades gm-premium-card',
    onClick:()=>setMiningTab('upgrades')},icon('lightning',29,true),
    e('span',null,e('b',null,t('upgrades')+' · 200'),
     e('small',null,t('bonus')+' +'+gmUpgradeBonus(level)+'%')),
    icon('chevron-right',20)));
  const upgradeView=e('section',{className:'gm-upgrade-panel'},
   e('header',{className:'gm-upgrade-heading'},e('div',null,
    e('small',null,'MINING UPGRADES'),e('h2',null,t('level')+' '+level+'/200')),
    e('span',{className:'gm-upgrade-bonus'},'+'+gmUpgradeBonus(level)+'%')),
   e('div',{className:'gm-upgrade-progress','role':'progressbar','aria-valuenow':level,'aria-valuemin':1,'aria-valuemax':200},
    e('span',{style:{width:(level/200*100)+'%'}})),
   e('div',{className:'gm-upgrade-stats'},
    e('div',{className:'gm-premium-card'},e('small',null,'GM / '+t('daily')),e('strong',null,nf(rate))),
    e('div',{className:'gm-premium-card'},e('small',null,t('storage')),e('strong',null,hours+' ч'))),
   e('div',{className:'gm-upgrade-next gm-premium-card'},
    e('small',null,next?t('level')+' '+next:'GM Immortal'),
    e('strong',null,next?nf(cost,0)+' GM':t('maxLevel')),
    e('span',null,next?'+'+gmUpgradeBonus(next)+'% '+t('bonus'):'200 / 200'),
    e('button',{type:'button',className:'gm-upgrade-buy',onClick:upgradeMining,
     disabled:!enabled||demo||!next||wallet.gm<cost},
     !enabled?t('comingSoon'):!next?t('maxLevel'):wallet.gm<cost?t('notEnough'):t('buyUpgrade'))),
   e('div',{className:'gm-upgrade-catalog gm-premium-card'},
    e('label',{htmlFor:'gm-upgrade-preview'},'Все уровни — 1–200'),
    e('select',{id:'gm-upgrade-preview',value:preview,onChange:(ev:any)=>setUpgradePreview(Number(ev.target.value))},
     Array.from({length:200},(_,i)=>e('option',{key:i+1,value:i+1},
      'LV. '+(i+1)+(i+1===level?' · ✓':'')))),
    e('div',{className:'gm-upgrade-catalog-info'},
     e('span',null,t('upgradeCost')),
     e('b',null,nf(gmUpgradeCost(preview),0)+' GM')),
    e('div',{className:'gm-upgrade-catalog-info'},
     e('span',null,t('bonus')),
     e('b',null,'+'+gmUpgradeBonus(preview)+'%'))),
   e('div',{className:'gm-upgrade-milestones'},
    e('h3',null,'GM · MILESTONES'),
    milestones.map((milestone:number)=>e('div',{className:'gm-milestone gm-premium-card '+(level>=milestone?'complete':'locked'),key:milestone},
      icon(milestone===200?'crown':'trophy',25,true),
      e('span',null,e('b',null,'LV. '+milestone),
       e('small',null,milestone===200?'GM Immortal · скин монеты':'Косметическая награда · эскиз')),
      icon(level>=milestone?'check':'lock',17)))),
   e('p',{className:'gm-mining-footnote'},enabled?
    'Каждый уровень покупается отдельно. Цена и списание подтверждаются сервером, бонусы не суммируются. Косметические награды пока в разработке.':
    'Экономика из 200 уровней подготовлена; покупки включатся после проверки новой серверной версии.'));
  return e('div',{className:'gm-mining-v8 gm-mining-premium'},
   top(t('mining'),true,'info'),intro,
   e('div',{className:'gm-mining-tabs','role':'tablist'},
    tabButton('mine',t('mine')),tabButton('upgrades',t('upgrades'))),
   isUpgrade?upgradeView:mineView);
 }
 function Vault(){
  const e=React.createElement;
  return e(React.Fragment,null,
    top('Holding (Vault)',true,'database'),
    e('div',{className:'vault-hero pearl-card'},
       e('div',{className:'vault-orb'},icon('database',100,true)),
       e('small',null,'GM в Holding'),e('h1',null,nf(wallet.vault),' GM'),
       e('p',null,'Награда зависит от утверждённых правил и остатка фонда')),
    e('div',{className:'vault-stats'},
       e('div',{className:'pearl-card'},e('small',null,'Mining Boost'),e('b',null,'+',holdingBonus(wallet.vault),'%')),
       e('div',{className:'pearl-card'},e('small',null,'Комиссия вывода'),e('b',null,'5% GM'))),
    e('div',{className:'form-surface pearl-card vault-form'},
       e('label',{htmlFor:'vault-amount'},'Сумма для операции, GM'),
       e('input',{id:'vault-amount',inputMode:'decimal',placeholder:'0.00',value:vaultAmount,onChange:event=>setVaultAmount(event.target.value)}),
       e('div',{className:'vault-available'},e('span',null,'Доступно в кошельке: ',nf(wallet.gm),' GM'),
         e('span',null,'В Holding: ',nf(wallet.vault),' GM')),
       e('div',{className:'twin-buttons vault-actions'},
         e('button',{type:'button',className:'vault-action vault-deposit',onClick:depositVault},
           icon('deposit',24),e('span',null,'Пополнить')),
         e('button',{type:'button',className:'vault-action vault-withdraw',onClick:withdrawVault},
           icon('withdraw',24),e('span',null,'Вывести')))),
    e('p',{className:'disclaimer'},'Вывод — один раз в UTC-сутки, комиссия 5%. Награды зависят от состояния фонда и включённых правил. Это виртуальная игровая валюта.'),
    e('div',{className:'vault-pending pearl-card'},
       e('div',{className:'split-line'},e('span',null,'Награды к получению'),e('b',null,nf((liveState?.holding?.pending_cents||0)/100),' GM')),
       e(GButton,{theme,disabled:!(liveState?.holding?.pending_cents),onClick:()=>gameAction('/api/vault/claim'),icon:'gift'},'Claim Rewards')));
 }
 function Shop(){return <>{top('GM Shop',true,'swap')}<div className="shop-banner pearl-card">{icon('swap',54,true)}<div><h2>GM → CR</h2><p>Виртуальный обмен, без реальных денег</p></div></div><div className="form-surface pearl-card"><label>Отдаёте GM</label><input inputMode="decimal" value={shopAmount} onChange={(e:any)=>{setShopAmount(e.target.value);setShopQuote(null)}}/><div className="split-line"><span>Комиссия GM Shop</span><b>1%</b></div><div className="split-line"><span>После комиссии</span><b>{nf(Math.max(0,Number(shopAmount.replace(',','.')||0)*.99))} GM</b></div><div className="split-line"><span>Получите CR</span><b>{shopQuote?nf(shopQuote.cr_cents/100)+' CR':'Нужна котировка'}</b></div>{!demo&&<GButton theme={theme} disabled={!liveState?.config?.shop_enabled} onClick={async()=>{const x=await api('/api/shop/quote?amount='+encodeURIComponent(shopAmount.replace(',','.')));if(x)setShopQuote(x)}}>Проверить рыночный курс</GButton>}<GButton theme={theme} disabled={demo||!shopQuote||!liveState?.config?.shop_enabled} onClick={async()=>{const x=await gameAction('/api/shop/exchange',{amount:shopAmount.replace(',','.'),minCrCents:shopQuote.cr_cents,quoteExpiresAt:shopQuote.quote_expires_at});if(x)setShopQuote(null)}}>Подтвердить обмен GM → CR</GButton></div><p className="disclaimer">Лимит: 50 000 CR в сутки. Все потраченные GM поступают в Treasury, включая 1% комиссии. До утверждения формулы курса обмен заблокирован.</p></>}
 
 function Boxes(){
  const e=React.createElement;
  const points=liveState?.points?.points||0;
  const enabled=!!liveState?.config?.boxes_enabled;
  const payouts=liveState?.config?.box_rewards||{};
  const catalog=[['bronze','СТАНДАРТ',300,'silver'],['silver','ПРЕМИУМ',750,'platinum'],['gold','ЭЛИТНЫЙ',1500,'chrome']];
  return e('div',{className:'gm-boxes-v8'},
   top('Боксы',true,'info'),
   e('div',{className:'gm-boxes-intro'},
    e('span',null,'GM BOXES'),e('h2',null,'Твоя награда внутри'),
    e('p',null,'Накапливай POINTS за подтверждённую игровую активность и обменивай их на гарантированные GM.')),
   e('div',{className:'gm-boxes-points gm-premium-card'},
    e('div',null,e('small',null,'Твои POINTS'),e('strong',null,nf(points,0))),
    e('button',{type:'button',onClick:()=>goto('trade')},'Как заработать ',icon('chevron-right',17))),
   e('div',{className:'gm-boxes-gallery'},catalog.map(([kind,name,cost,finish])=>
    e('section',{key:kind,className:'gm-box-card gm-premium-card '+kind},
     e('div',{className:'gm-box-visual'},
      e('div',{className:'gm-crate'},e('div',{className:'gm-crate-lid'}),
       e('div',{className:'gm-crate-lock'},e(Brand,{theme,size:38})),e('div',{className:'gm-crate-body'}))),
     e('div',{className:'gm-box-copy'},
      e('b',null,name),e('span',null,nf(Number(payouts[kind]||0),0)+' GM · гарантированно'),
      e('small',null,nf(cost,0)+' POINTS')),
     e('button',{type:'button',disabled:demo||!enabled||points<cost||boxBusy,onClick:()=>openBox(kind),
      className:'gm-box-open'},!enabled?'Пока недоступно':points<cost?'Не хватает POINTS':'Открыть бокс',icon('chevron-right',18))))),
   e('p',{className:'gm-boxes-honest'},'Анимация открытия — только оформление. Награда фиксирована и выдаётся сервером из фонда BOXES. Случайных призов и платных ставок нет.')
  );
 }

 
 function BoxRevealModal(){
  const e=React.createElement;
  return e('div',{className:'gm-box-overlay',role:'presentation',onClick:()=>setModal('')},
   e('div',{className:'gm-box-result gm-premium-card',role:'dialog','aria-modal':true,'aria-label':'Получена награда за бокс',onClick:event=>event.stopPropagation()},
    e('div',{className:'gm-box-result-aura'},e('div',{className:'gm-crate opening'},
      e('div',{className:'gm-crate-lid'}),e('div',{className:'gm-crate-lock'},e(Brand,{theme,size:46})),e('div',{className:'gm-crate-body'}))),
    e('div',{className:'gm-box-result-stars'},'✦ · ✦ · ✦'),
    e('h2',null,'Бокс открыт!'),
    e('p',null,'Начислено на твой игровой баланс'),
    e('strong',null,'+'+nf(boxReveal.gm||0,2)+' GM'),
    e('button',{type:'button',onClick:()=>setModal('')},'Забрать награду',icon('check',22))));
 }

 
function Referrals(){
 const e=React.createElement;
 const id=String(webapp?.initDataUnsafe?.user?.id||'');
 const link=id?'https://t.me/gm_token_test_bot?startapp=ref_'+id:'';
 const copy=async()=>{
  if(!link){flash('Открой через Telegram, чтобы получить ссылку');return}
  try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(link);
   else{const el=document.createElement('textarea');el.value=link;el.style.position='fixed';el.style.opacity='0';document.body.appendChild(el);el.select();const ok=document.execCommand('copy');el.remove();if(!ok)throw Error('copy');}
   flash('Ссылка скопирована');}catch{flash('Используй кнопку «Поделиться»');}
 };
 const share=()=>{
  if(!link){flash('Открой GM TOKEN в Telegram');return}
  const url='https://t.me/share/url?url='+encodeURIComponent(link)+'&text='+encodeURIComponent('Присоединяйся ко мне в GM TOKEN!');
  if(webapp?.openTelegramLink){try{webapp.openTelegramLink(url);return}catch{}}
  if(navigator.share){navigator.share({title:'GM TOKEN',url:link}).catch(()=>{});return}
  window.location.assign(url);
 };
 const stats=e('div',{className:'gm-referral-stats'},
  e('div',{className:'gm-premium-card'},e('strong',null,String(liveReferrals?.referred?.length||0)),e('small',null,'Приглашено игроков')),
  e('div',{className:'gm-premium-card'},e('strong',null,nf((liveReferrals?.received_gm_cents||0)/100)),e('small',null,'Получено GM')));
 return e(React.Fragment,null,
  top('Приглашай друзей',true,'friends'),
  e('div',{className:'gm-referral-hero'},icon('friends',110,true),
   e('h2',null,'Играйте вместе'),e('p',null,'Отправь другу свою ссылку, чтобы он присоединился к GM TOKEN.')),
  e('div',{className:'gm-referral-link gm-premium-card'},
   e('small',null,'ТВОЯ ПЕРСОНАЛЬНАЯ ССЫЛКА'),
   e('div',null,e('span',null,link||'Доступна после входа в Telegram'),
    e('button',{type:'button',onClick:copy,'aria-label':'Скопировать'},icon('copy',23)))),
  e('button',{type:'button',className:'gm-referral-share',onClick:share},
   icon('friends',23),' Поделиться в Telegram ',icon('chevron-right',18)),
  stats,
  e('div',{className:'gm-referral-rule gm-premium-card'},
   icon('shield-check',29),
   e('div',null,e('b',null,'Как начисляется бонус'),
    e('p',null,'25% от подтверждённых Holding Rewards приглашённого друга. За простую отправку ссылки GM не начисляются.')))
 );
}

 function History(){return <>{top('Transaction History',true,'clock')}{!serverHistory.length&&<div className="empty-state">{icon('clock',62,true)}<h3>История операций пока пуста</h3><button onClick={loadHistory}>Загрузить с сервера</button></div>}{serverHistory.map((x:any)=><div key={x.id} className="pearl-card form-surface"><b>{x.kind}</b><small>{new Date(x.at*1000).toLocaleString('ru-RU')}</small><p>{x.info}</p></div>)}</>}
 function Achievements(){
  const e=React.createElement;
  const future=[
   ['Пробуждение GM','Первый подтверждённый Claim','lightning'],
   ['Серебряный старт','Пять сборов GM','gm-coin-orbit'],
   ['Ритм майнера','30 сборов GM','clock'],
   ['Сила привычки','Серия в 7 дней','flame'],
   ['Без остановки','Серия в 30 дней','flame'],
   ['Первый шаг','Открыть первое улучшение','lightning'],
   ['Металлическая воля','Уровень майнинга 25','shield-check'],
   ['Серебряный мастер','Уровень майнинга 50','diamond'],
   ['Легенда улучшений','Уровень майнинга 100','crown'],
   ['GM Immortal','Уровень майнинга 200 · скин','crown'],
   ['Исследователь','Открыть все разделы','info'],
   ['Коллекционер','Открыть пять боксов','gift'],
   ['Первое знакомство','Первый подтверждённый друг','friends'],
   ['Народ GM','Пригласить 25 друзей','community'],
   ['Наследие','Пригласить 100 друзей','trophy'],
   ['Первые свечи','Первая игровая сделка','candlesticks'],
   ['Серебряная лига','Достичь Silver','shield'],
   ['Золотое сердце','Достичь Gold','trophy'],
   ['Алмазный путь','Достичь Diamond','diamond'],
   ['Великое имя','Достичь GM Immortal League','crown']
  ];
  return e(React.Fragment,null,
   top(t('achievements'),true,'trophy'),
   e('div',{className:'gm-achieve-intro gm-premium-card'},
    icon('trophy',43,true),e('span',null,e('b',null,'GM · ACHIEVEMENTS'),
     e('small',null,'20 достижений и 20 уникальных наград первопроходцев — коллекции в разработке'))),
   e('div',{className:'achievement-list'},(liveAchievements||[]).map((a:any)=>e('div',{
    className:'earn-item pearl-card '+(!a.claimed?'gm-achievement-locked':''),key:a.id},
    icon(a.icon||'trophy',43,true),e('span',null,e('b',null,a.title||a.id),e('small',null,a.description||'')),
    !demo&&e('button',{disabled:a.claimed||!a.available,
     onClick:async()=>{await gameAction('/api/achievements/claim',{id:a.id})}},
     a.claimed?'✓':a.available?'Получить':'🔒')))),
   e('h3',{className:'gm-achieve-subhead'},'GM · FUTURE BADGES'),
   e('div',{className:'achievement-list'},future.map(([title,desc,ico],i)=>e('div',{
    className:'earn-item pearl-card gm-achievement-locked',key:'future-'+i},
    icon(ico,39,true),e('span',null,e('b',null,title),e('small',null,desc)),
    e('span',{className:'gm-locked-tag'},icon('verified-user',17)))),
   e('p',{className:'disclaimer'},'Серые значки — ещё не заработанные достижения. Предпросмотр не начисляет XP, GM или скины.'));
 }

function Settings(){
 const e=React.createElement;
 const isUk=actualLang==='uk';
 const isEn=actualLang!=='ru'&&!isUk;
 const themes=[['light','Premium Silver'],['dark','Premium Graphite']];
 const themeButtons=themes.map(([value,label])=>e('button',{type:'button',key:value,
  className:theme===value?'active':'',onClick:()=>setTheme(value),'aria-pressed':theme===value},
  e('i',{className:'gm-theme-swatch '+value}),e('b',null,label),theme===value?icon('check',18):null));
 const available=gmLanguages.filter(([code,name])=>
  !langSearch.trim()||(code+' '+name).toLocaleLowerCase().includes(langSearch.toLocaleLowerCase().trim()));
 return e(React.Fragment,null,
  top(lang('settings'),true,'settings'),
  e('div',{className:'gm-settings-summary gm-premium-card'},icon('settings',39,true),
   e('span',null,e('b',null,isUk?'Персоналізація':isEn?'Personalization':'Персонализация'),
    e('small',null,'GM TOKEN · Premium Silver / Graphite'))),
  e('section',{className:'gm-settings-block gm-premium-card'},
   e('h3',null,isUk?'Тема оформлення':isEn?'Appearance':'Тема оформления'),
   e('p',null,isUk?'Світла й темна версії відповідно до ескізу.':isEn?'Two official themes inspired by the approved layouts.':'Светлая и тёмная версии по утверждённому эскизу.'),
   e('div',{className:'gm-theme-list'},themeButtons)),
  e('section',{className:'gm-settings-block gm-premium-card gm-language-section'},
   e('h3',null,t('selectLanguage')),
   e('p',null,isUk?'Мова меню змінюється відразу. Повний переклад окремих екранів ще допрацьовується.':isEn?'The navigation language changes instantly; remaining screens are being localized.':'Язык меню меняется сразу. Перевод остальных экранов ещё дорабатывается.'),
   e('label',{className:'gm-language-search'},icon('info',19),
    e('input',{type:'search',value:langSearch,placeholder:t('searchLanguage'),
     onChange:(event:any)=>setLangSearch(event.target.value),'aria-label':t('searchLanguage')})),
   e('div',{className:'gm-language-list','role':'listbox','aria-label':t('selectLanguage')},
    available.map(([code,name])=>e('button',{type:'button',key:code,'role':'option','aria-selected':locale===code,
     className:'gm-language-option '+(locale===code?'active':''),
     onClick:()=>{setLocale(code);store.setItem('gm_lang',code)}},
     e('span',null,name),
     locale===code?icon('check',18):null))),
   !available.length&&e('p',{className:'gm-language-empty'},isUk?'Не знайдено':isEn?'No languages found':'Язык не найден')),
  e('button',{type:'button',className:'gm-settings-onboard gm-premium-card',onClick:()=>{setIntroStep(0);goto('intro')}},
   icon('info',26),e('span',null,isUk?'Пройти інструкцію':isEn?'Replay onboarding':'Пройти инструкцию'),icon('chevron-right',20)),
  e('button',{type:'button',className:'gm-settings-onboard gm-premium-card',onClick:()=>{
   for(const key of Object.keys(gmGuides))try{window.localStorage.removeItem('gm_guide_'+key)}catch{}
   flash(isUk?'Підказки оновлено':isEn?'Guides reset':'Подсказки сброшены');
  }},icon('info',24),e('span',null,isUk?'Повторити навчання за розділами':'Повторить обучение по разделам'),icon('chevron-right',20)),
  e('p',{className:'gm-settings-note'},'GM TOKEN · Premium Silver / Graphite')
 );
}

function Support(){
 const e=React.createElement;
 const categories=['Общий вопрос','Mining','Holding','Биржа GM/CR','Баланс GM/CR','Апелляция','Рефералы'];
 const rows=(supportTickets||[]).map(t=>{
  const isOwn=t.user_id===String(webapp?.initDataUnsafe?.user?.id||'');
  const isStaff=['owner','coowner','moderator'].includes(liveRole);
  const actions=[];
  if(!demo&&isOwn&&t.status!=='closed')actions.push(e('button',{type:'button',key:'auto',
   onClick:()=>ticketAction(t.id,'auto')},'Автопроверка ('+(t.auto_attempts||0)+'/2)'));
  if(!demo&&isStaff&&t.status==='open')actions.push(e('button',{type:'button',key:'claim',
   onClick:()=>ticketAction(t.id,'claim')},'Взять в работу'));
  if(!demo&&isStaff&&t.status==='in_review'){
   actions.push(e('input',{key:'reply',placeholder:'Ответ пользователю',value:staffReply,onChange:event=>setStaffReply(event.target.value)}));
   actions.push(e('button',{type:'button',key:'send',onClick:()=>ticketAction(t.id,'reply',{body:staffReply})},'Ответить'));
   actions.push(e('button',{type:'button',key:'resolve',onClick:()=>ticketAction(t.id,'resolve')},'Решено'));
  }
  if(!demo&&isOwn&&['resolved','closed'].includes(t.status))actions.push(e('button',{type:'button',key:'reopen',
   onClick:()=>ticketAction(t.id,'reopen')},'Открыть повторно'));
  return e('section',{className:'gm-support-ticket gm-premium-card',key:t.id},
   e('div',null,e('b',null,'#'+String(t.id).slice(0,8)),e('span',null,t.category)),
   e('p',null,clean(t.body||t.text||'')),
   e('small',null,'Статус: '+t.status+' · '+(t.priority||'P3')),
   e('div',{className:'gm-support-actions'},actions));
 });
 return e(React.Fragment,null,
  top('Поддержка',true,'shield-check'),
  e('div',{className:'gm-support-hero gm-premium-card'},icon('shield-check',43,true),
   e('div',null,e('b',null,'Центр поддержки GM TOKEN'),
    e('p',null,'Поможем разобраться с Mining, бокcами, сделками, балансом и входом в Telegram.'))),
  e('section',{className:'gm-support-form gm-premium-card'},
   e('label',{htmlFor:'gm-support-topic'},'Тема обращения'),
   e('select',{id:'gm-support-topic',value:supportCategory,onChange:event=>setSupportCategory(event.target.value)},
    categories.map(x=>e('option',{key:x},x))),
   e('label',{htmlFor:'gm-support-message'},'Опиши проблему'),
   e('textarea',{id:'gm-support-message',rows:5,value:supportText,
    placeholder:'Например: после открытия Mini App пропал баланс…',
    onChange:event=>setSupportText(event.target.value)}),
   e('button',{type:'button',className:'gm-support-submit',disabled:demo||supportText.trim().length<10,onClick:createTicket},
    icon('send',20),' Создать обращение')),
  e('div',{className:'gm-support-section-label'},e('b',null,'Мои обращения'),
   e('button',{type:'button',onClick:loadTickets},icon('refresh',17),' Обновить')),
  rows.length?rows:e('p',{className:'gm-support-empty'},'Пока нет обращений. Создай обращение через форму выше.'),
  e('p',{className:'gm-support-foot'},'При серьёзной ошибке баланса выбери «Баланс GM/CR». Не сообщай коды 2FA и секреты бота.')
 );
}

 function AdminTestGrants(){
  const e=React.createElement;
  return e('section',{className:'test-grants form-surface pearl-card','aria-label':'Тестовые начисления GM и CR'},
   e('div',{className:'test-grants-heading'},icon('coins',40,true),
    e('div',null,e('strong',null,'Тестовые начисления'),e('small',null,'GM/CR для проверки Trading · только Owner / Co-Owner'))),
   e('p',{className:'test-grants-note'},'Средства переводятся из Treasury (GM) или Shop Reserve (CR), а не создаются заново. Каждое начисление проверяется 2FA и записывается в журнал.'),
   e('label',null,'Кому начислить'),
   e('div',{className:'test-grants-options',role:'group','aria-label':'Получатель'},
    [['self','Себе'],['other-owner','Совладельцу'],['id','Игроку']].map(([id,title])=>
     e('button',{type:'button',className:testRecipient===id?'selected':'',key:id,onClick:()=>setTestRecipient(id),'aria-pressed':testRecipient===id},title))),
   testRecipient==='id'?e('input',{value:testUserId,placeholder:'Telegram ID зарегистрированного игрока',inputMode:'numeric',onChange:event=>setTestUserId(event.target.value),'aria-label':'Telegram ID игрока'}):null,
   e('label',null,'Игровая валюта'),
   e('div',{className:'test-grants-options',role:'group','aria-label':'Валюта'},
    ['GM','CR'].map(currency=>e('button',{key:currency,type:'button',className:testCurrency===currency?'selected':'',onClick:()=>{setTestCurrency(currency);setTestAmount(currency==='GM'?'1000':'10000')},'aria-pressed':testCurrency===currency},
      icon(currency==='GM'?'gm-coin-orbit':'coins',23),currency))),
   e('label',null,'Сумма '+testCurrency),
   e('input',{value:testAmount,inputMode:'decimal',placeholder:'Например, 1000',onChange:event=>setTestAmount(event.target.value),'aria-label':'Сумма тестового начисления'}),
   e('div',{className:'test-grants-presets'},
    (testCurrency==='GM'?['1000','5000','10000']:['10000','50000','100000']).map(n=>
     e('button',{key:n,type:'button',onClick:()=>setTestAmount(n)},n))),
   e('small',{className:'test-grants-limit'},testCurrency==='GM'?'До 10 000 GM за операцию и 50 000 GM в UTC-день на игрока.':'До 100 000 CR за операцию и 500 000 CR в UTC-день на игрока.'),
   e('label',null,'Зачем выдаём'),
   e('textarea',{rows:2,value:testReason,onChange:event=>setTestReason(event.target.value),'aria-label':'Причина начисления'}),
   e('label',null,'Код 2FA владельца'),
   e('input',{value:testCode,inputMode:'numeric',type:'text',autoComplete:'one-time-code',maxLength:6,placeholder:'6 цифр из приложения 2FA',onChange:event=>setTestCode(event.target.value),'aria-label':'Код TOTP'}),
   e(GButton,{theme,disabled:demo||testBusy||!testAmount||testCode.length!==6,onClick:testGrant,icon:'shield-check'},
     testBusy?'Проверяем начисление...':'Выдать тестовые '+testCurrency),
   e('p',{className:'test-grants-footer'},'Другой совладелец или игрок должен хотя бы один раз открыть GM TOKEN. При необходимости между начислениями дождись нового кода 2FA.')
  );
 }
 function Admin(){
 const isOwner=['owner','coowner'].includes(liveRole);
 if(!demo&&!isOwner) return <>{top('Admin Panel',true,'shield-check')}<div className="empty-state">{icon('shield-check',70,true)}<h2>Доступ ограничен</h2><p>Только Owner и Co-Owner могут использовать административную панель. Роли проверяются сервером.</p></div></>;
 return <>{top('Admin Panel',true,'settings')}<div className="admin-banner pearl-card">{icon('crown',49,true)}<div><b>{liveRole.toUpperCase()}</b><small>Вход подтверждён Telegram; критические операции требуют TOTP</small></div></div>
 <div className="admin-numbers">{[['Users',adminStats?.users??'—'],['Orders',adminStats?.orders??'—'],['Trades (24h)',adminStats?.trades_24h??'—'],['Open tickets',adminStats?.open_tickets??'—']].map(([a,b])=><div className="pearl-card" key={a}><small>{a}</small><b>{b}</b><small>Серверные данные</small></div>)}</div>
 {AdminTestGrants()}
 <h3 className="section-title">Управление</h3>
 <div className="admin-actions pearl-card"><button onClick={async()=>{const x=await adminRequest('/api/admin/team');if(x)setAdminTeam(x.team||[])}}>{icon('friends',21)} Обновить список ролей</button><button onClick={async()=>{const x=await adminRequest('/api/admin/pools');if(x)setAdminFunds(x.pools||[]);const st=await adminRequest('/api/admin/stats');if(st)setAdminStats(st)}}>{icon('database',21)} Остатки фондов</button></div>
 {adminTeam.length>0&&<div className="admin-records pearl-card">{adminTeam.map((x:any)=><div key={x.id}><span>{x.username||x.id}</span><b>{x.role}</b></div>)}</div>}
 {adminFunds.length>0&&<div className="admin-records pearl-card">{adminFunds.map((x:any)=><div key={x.name}><span>{x.name}</span><b>{nf((x.gm||x.cr)/100)} {x.gm?'GM':'CR'}</b></div>)}</div>}
 <div className="form-surface pearl-card"><b>Модераторы</b><label>Telegram ID сотрудника</label><input value={adminId} onChange={(e:any)=>setAdminId(e.target.value)} placeholder="Только зарегистрированный ID"/><label>Действие</label><select value={adminAction} onChange={(e:any)=>setAdminAction(e.target.value)}><option value="grant">Выдать Moderator</option><option value="revoke">Отозвать Moderator</option></select><label>Код 2FA владельца</label><input value={adminCode} onChange={(e:any)=>setAdminCode(e.target.value)} inputMode="numeric" placeholder="6-значный TOTP"/><GButton theme={theme} onClick={adminChangeRole} disabled={demo}>Сохранить роль</GButton></div>
 <div className="form-surface pearl-card"><b>Перевод между игровыми фондами</b><label>Источник</label><select value={adminFrom} onChange={(e:any)=>setAdminFrom(e.target.value)}><option value="TREASURY">Treasury</option><option value="FUTURE">Future Ecosystem</option></select><label>Получатель</label><select value={adminTo} onChange={(e:any)=>setAdminTo(e.target.value)}>{['MINING','HOLDING','BOXES','DAILY','COMMUNITY','DEVELOPMENT'].map(x=><option key={x}>{x}</option>)}</select><label>Количество GM</label><input value={adminAmount} onChange={(e:any)=>setAdminAmount(e.target.value)} inputMode="decimal"/><label>Причина (15+ символов)</label><textarea rows={3} value={adminReason} onChange={(e:any)=>setAdminReason(e.target.value)}/><GButton theme={theme} onClick={adminTransfer} disabled={demo}>Подтвердить перевод + 2FA</GButton></div>
 <div className="form-surface pearl-card"><b>Коррекция ошибочного баланса</b><small>Только по тикету и с проверкой доступного резерва.</small><label>ID игрока (выше)</label><input value={adminId} onChange={(e:any)=>setAdminId(e.target.value)}/><label>Валюта</label><select value={adminCorrectionCurrency} onChange={(e:any)=>{setAdminCorrectionCurrency(e.target.value);setAdminCorrectionPool(e.target.value==='GM'?'MINING':'WELCOME')}}><option>GM</option><option>CR</option></select><label>Фонд-источник корректировки</label><select value={adminCorrectionPool} onChange={(e:any)=>setAdminCorrectionPool(e.target.value)}>{(adminCorrectionCurrency==='GM'?['MINING','BOXES','DAILY','COMMUNITY','DEVELOPMENT','FUTURE','TREASURY']:['WELCOME','SHOP']).map(x=><option key={x}>{x}</option>)}</select><label>Номер тикета</label><input value={adminTicket} onChange={(e:any)=>setAdminTicket(e.target.value)} placeholder="GM-..."/><label>Сумма (выше)</label><input value={adminAmount} onChange={(e:any)=>setAdminAmount(e.target.value)}/><GButton theme={theme} onClick={adminCorrection} disabled={demo}>Исправить через резерв + 2FA</GButton></div>
 <p className="disclaimer">В демо все административные действия отключены. У двух владельцев одинаковые защищённые права; владелец не может удалить другого владельца через UI.</p></>;
 }
 
function More(){
 const e=React.createElement;
 const groups=[
  ['АККАУНТ',[['profile','profile','Профиль','Баланс и уровень'],['achievements','trophy','Достижения','Награды и прогресс'],['history','clock','История','Подтверждённые операции']]],
  ['ИГРА',[['reward','gift','Daily Reward','Ежедневный бонус'],['tasks','tasks','Задания','Выполняй игровые цели'],['referrals','friends','Пригласить друзей','Реферальная программа'],['vault','coins','Holding Vault','Внутриигровой кошелёк']]],
  ['ПОМОЩЬ',[['support','shield-check','Поддержка','Обращения и ответы'],['settings','settings','Настройки','Оформление и язык'],['intro','info','Инструкция','Как играть в GM TOKEN']]]
 ];
 if(['owner','coowner'].includes(liveRole))groups.push(['АДМИНИСТРИРОВАНИЕ',[['admin','crown','Admin Panel','Только Owner и Co-Owner']]]);
 const sections=groups.map(([title,rows])=>{
  const buttons=rows.map(([route,img,label,subtitle])=>e('button',{type:'button',key:route,className:'gm-more-item',onClick:()=>goto(route)},
   e('span',{className:'gm-more-icon'},icon(img,26)),
   e('span',{className:'gm-more-label'},e('b',null,label),e('small',null,subtitle)),
   icon('chevron-right',18)));
  return e('section',{className:'gm-more-section',key:title},
   e('h3',null,title),e('div',{className:'gm-more-list gm-premium-card'},buttons));
 });
 return e(React.Fragment,null,
  top('Ещё',true,'more'),
  e('div',{className:'gm-more-logo gm-premium-card'},e(Brand,{theme,size:54}),
   e('div',null,e('b',null,'GM TOKEN'),e('small',null,'PREMIUM SILVER · PREMIUM GRAPHITE'))),
  sections,e('p',{className:'gm-more-footer'},'Виртуальные GM и CR · GM TOKEN Premium')
 );
}

 
function Intro(){
 const e=React.createElement;
 const steps=[
  ['gm-coin-orbit','Добывай GM','Зайди в Майнинг и нажми на большую GM-монету, чтобы забрать накопленные виртуальные монеты.'],
  ['gift','Открывай боксы','Зарабатывай POINTS и обменивай их на боксы. Призы фиксированы и выдаются из игрового фонда.'],
  ['candlesticks','Знакомься с рынком','Следи за подтверждёнными игровыми сделками. POINTS зависят от исполненного объёма и антифрод-проверок.'],
  ['friends','Приглашай друзей','Поделись персональной ссылкой. Награды появляются только после подтверждённых действий друзей.']
 ];
 const step=steps[Math.max(0,Math.min(steps.length-1,introStep))];
 const complete=()=>{store.setItem('gm_onboarding_complete','1');navStack.current=[];setScreen('home')};
 const ticks=steps.map((_,i)=>e('i',{key:i,className:i<=introStep?'current':''}));
 const languages=gmLanguages.map(([value,name])=>e('option',{key:value,value},name));
 const languagePicker=introStep===0?e('div',{className:'gm-intro-language'},e('label',null,lang('language')),
  e('select',{value:locale,onChange:event=>{setLocale(event.target.value);store.setItem('gm_lang',event.target.value)}},languages)):null;
 const back=introStep>0?e('button',{type:'button',className:'gm-intro-prev',onClick:()=>setIntroStep(introStep-1)},'Назад'):null;
 return e('div',{className:'gm-intro-v8'},
  e('header',{className:'gm-intro-header'},e(Brand,{theme,size:34}),e('b',null,'GM TOKEN'),
   e('button',{type:'button',onClick:complete},lang('skip'))),
  e('div',{className:'gm-intro-progress'},ticks),
  e('div',{className:'gm-intro-art'},e('div',{className:'gm-intro-art-ring'},icon(step[0],114,true))),
  e('div',{className:'gm-intro-copy'},
   e('small',null,'ШАГ '+(introStep+1)+' / 4'),
   e('h1',null,introStep===0?'Добро пожаловать в GM TOKEN':step[1]),
   e('p',null,step[2])),
  languagePicker,
  e('div',{className:'gm-intro-actions'},
   e('button',{type:'button',className:'gm-intro-next',
    onClick:()=>introStep===steps.length-1?complete():setIntroStep(introStep+1)},
    introStep===steps.length-1?lang('start'):lang('next'),icon('chevron-right',20)),
   back)
 );
}

function Streak(){return <>{top('Daily Streak',true,'flame')}<div className="referral-hero pearl-card">{icon('flame',90,true)}<h1>{wallet.streak} дней</h1><p>Серия ежедневных посещений. Повторное получение награды в один день запрещено.</p></div><GButton theme={theme} onClick={()=>goto('reward')}>Ежедневная награда</GButton></>}
 if(booting){return <main className={'application theme-'+theme+' gm-boot-app'} aria-live="polite">
  <section className="gm-boot-screen"><div className="gm-boot-metal-line" aria-hidden="true"/>
   <img src={BRAND+'gm-lettermark-metallic-transparent.png'} alt="GM TOKEN"/>
   <h1>GM TOKEN</h1><p>{t('opening')}</p>
   <div className="gm-boot-progress"><span/></div>
  </section>
 </main>}
 if(demo){return <main className={'application auth-page theme-'+theme}>
  <div className="auth-ambient" aria-hidden="true"/>
  <section className="auth-gate pearl-card" aria-labelledby="auth-title">
   <div className="auth-brand"><Brand theme={theme} size={78}/><div className="auth-brand-copy"><span>TELEGRAM MINI APP</span><h1 id="auth-title">GM TOKEN</h1></div></div>
   <div className="auth-divider"/>
   <div className="auth-status" role="status"><span className="auth-status-dot" aria-hidden="true"/><div><strong>Требуется вход через Telegram</strong><p>{backendStatus}</p></div></div>
   <a className="auth-cta" href="https://t.me/gm_token_test_bot" onClick={openBot}>
    <span className="auth-cta-icon"><Icon name="telegram" theme={theme} size={29}/></span>
    <span className="auth-cta-copy"><strong>Открыть чат бота</strong><small>@gm_token_test_bot</small></span>
    <Icon name="chevron-right" theme={theme} size={22}/>
   </a>
   <div className="auth-theme-row"><span>Оформление</span><div className="auth-theme-toggle" role="group" aria-label="Выбор темы">
    <button type="button" className={theme==='light'?'active':''} aria-pressed={theme==='light'} onClick={()=>setTheme('light')}><Icon name="diamond" theme={theme} size={17}/>Светлая</button>
    <button type="button" className={theme==='dark'?'active':''} aria-pressed={theme==='dark'} onClick={()=>setTheme('dark')}><Icon name="gm-coin-orbit" theme={theme} size={17}/>Тёмная</button>
   </div></div>
   <div className="auth-privacy"><Icon name="shield-check" theme={theme} size={22}/><span>Игровые данные появятся только после защищённого входа. Демобалансов здесь нет.</span></div>
  </section>
 </main>}
 let view:any;
 switch(screen){case 'home':view=Home();break;case 'trade':view=Trading();break;case 'earn':view=Earn();break;case 'tasks':view=Tasks();break;case 'leaderboard':view=Leaderboard();break;case 'profile':view=Profile();break;case 'reward':view=Reward();break;case 'splash':view=Splash();break;case 'intro':view=Intro();break;case 'mining':view=Mining();break;case 'vault':view=Vault();break;case 'shop':view=Shop();break;case 'boxes':view=Boxes();break;case 'referrals':view=Referrals();break;case 'history':view=History();break;case 'settings':view=Settings();break;case 'support':view=Support();break;case 'admin':view=['owner','coowner'].includes(liveRole)?Admin():Home();break;case 'achievements':view=Achievements();break;case 'more':view=More();break;case 'streak':view=Streak();break;default:view=Home();}
 return <div className={'application theme-'+theme+(webapp?.initData?' is-telegram':'')}>
 <aside className="desktop-toolbar"><div className="toolbar-logo"><Brand theme={theme} size={42}/><span><b>GM TOKEN</b><small>Оригинальные эскизы · интерактивная сборка</small></span></div><div className="toolbar-tabs"><button onClick={()=>setTheme('light')} className={isLight?'chosen':''}>Light</button><button onClick={()=>setTheme('dark')} className={!isLight?'chosen':''}>Dark</button></div><div className="toolbar-links">{(['home','trade','earn','tasks','leaderboard','profile','mining','vault','shop','support','admin'] as Route[]).map(s=><button key={s} className={screen===s?'chosen':''} onClick={()=>goto(s)}>{s}</button>)}</div><p>Оригинальные PNG · 54 иконки × 4 варианта · без подмены сторонними пиктограммами</p></aside>
 <div className="device-stage"><div className="phone-frame"><div className={'phone-scroll '+((screen==='splash')?'no-scroll':'')}>{view}</div>{!['reward','splash','intro'].includes(screen)&&bottom()}
 {guideScreen&&gmGuides[guideScreen]&&<div className="gm-guide-layer" role="dialog" aria-modal="true" aria-label={gmGuides[guideScreen][guideStep]?.[0]}>
  <div className="gm-guide-dim"/>
  <div className="gm-guide-card">
   <div className="gm-guide-top"><span>GM GUIDE · {guideStep+1}/{gmGuides[guideScreen].length}</span><button type="button" onClick={()=>{store.setItem('gm_guide_'+guideScreen,'done');setGuideScreen('')}} aria-label={t('guideSkip')}>×</button></div>
   <h2>{gmGuides[guideScreen][guideStep]?.[0]}</h2><p>{gmGuides[guideScreen][guideStep]?.[1]}</p>
   <div className="gm-guide-actions">
    <button type="button" className="gm-guide-skip" onClick={()=>{store.setItem('gm_guide_'+guideScreen,'done');setGuideScreen('')}}>{t('guideSkip')}</button>
    <button type="button" className="gm-guide-next" onClick={()=>{if(guideStep+1>=gmGuides[guideScreen].length){store.setItem('gm_guide_'+guideScreen,'done');setGuideScreen('')}else{setGuideStep(guideStep+1);if(guideScreen==='mining'&&guideStep===1)setMiningTab('upgrades')}}}>{guideStep+1===gmGuides[guideScreen].length?t('guideDone'):t('guideNext')} →</button>
   </div>
  </div>
 </div>}
 <div className="home-indicator"/></div><div className="underphone"><span className="demo-pill">{'Серверная авторизация · виртуальные GM/CR'}</span><button onClick={()=>goto('splash')}>Заставка</button><button onClick={()=>goto('home')}>Home</button><button onClick={()=>setTheme(isLight?'dark':'light')}>Сменить тему</button></div><small className="status-note">{backendStatus}</small></div>
 {toast&&<div className="toast-message" role="status" onClick={()=>setToast('')}>{toast}<button onClick={()=>setToast('')}>×</button></div>}
 {modal==='boxReveal'?BoxRevealModal():modal&&TradeOrderModal()}
 </div>;
}
// Offline renderer uses the bundled React 16.0 UMD (no built-in Hooks). A tiny
// isolated adapter keeps the same React/TSX source working in preview.html.
// When loaded with modern React (Vite production), native hooks are used.
if(typeof React.Fragment === 'undefined') { React.Fragment=function OfflineFragment(props:any){ return React.createElement('div',{style:{display:'contents'}},props.children); }; }
if(typeof React.useState !== 'function') {
 let active:any = null;
 React.useState=(initial:any)=>{
  const owner=active, idx=owner.cursor++;
  if(!(idx in owner.slot)) owner.slot[idx]=typeof initial==='function'?initial():initial;
  return [owner.slot[idx],(next:any)=>{
   owner.slot[idx]=typeof next==='function'?next(owner.slot[idx]):next;
   owner.setState((old:any)=>({tick:old.tick+1}));
  }];
 };
 React.useRef=(initial:any)=>{const owner=active,idx=owner.cursor++;if(!(idx in owner.slot))owner.slot[idx]={current:initial};return owner.slot[idx];};
 React.useEffect=(fn:any,deps:any[])=>{
  const owner=active,idx=owner.cursor++;let prev=owner.dependencies[idx];
  if(!prev||!deps||deps.some((x:any,i:number)=>x!==prev[i])){
   owner.dependencies[idx]=deps?deps.slice():undefined; owner.pending.push(fn);
  }
 };
 class OfflineHooks extends React.Component<any,any>{
  slot:any[]=[];dependencies:any[]=[];pending:any[]=[];cursor=0;
  constructor(props:any){super(props);this.state={tick:0}}
  render(){active=this;this.cursor=0;const el=App();active=null;return el}
  componentDidMount(){this.run()}
  componentDidUpdate(){this.run()}
  run(){const a=this.pending.splice(0);for(const f of a)f()}
 }
 ReactDOM.render(<OfflineHooks/>,document.getElementById('root'));
} else {
 ReactDOM.render(<App/>, document.getElementById('root'));
}
