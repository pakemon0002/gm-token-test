declare var React: any;
declare var ReactDOM: any;
declare namespace JSX { interface IntrinsicElements { [elementName: string]: any; } interface ElementChildrenAttribute { children: any; } }

// GM TOKEN UI · original layouts + original 216 PNG pack. No third-party icon replacements.
const store = {getItem:(key:string)=>{try{return window.localStorage.getItem(key)}catch{return null}},setItem:(key:string,value:string)=>{try{window.localStorage.setItem(key,value)}catch{}}};
const A = './assets/icons/';
const BRAND = './assets/brand-original-reference/';
type Theme = 'light' | 'dark';
type Route = 'home'|'trade'|'earn'|'tasks'|'leaderboard'|'profile'|'reward'|'splash'|'intro'|'mining'|'vault'|'wallet'|'shop'|'referrals'|'history'|'settings'|'support'|'admin'|'achievements'|'more'|'streak'|'boxes';
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

function Candles({theme,candles=[],selected=null,onSelect=(_time:any)=>{},interval='1h'}){
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
   const error=Error(String(body?.error||'HTTP '+res.status)) as Error&{status?:number};error.status=res.status;
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

const gmLanguages=[['auto','🌐 Telegram · Auto'],['ru','🇷🇺 Русский'],['uk','🇺🇦 Українська'],['en','🇬🇧 English'],['es','🇪🇸 Español'],['de','🇩🇪 Deutsch'],['fr','🇫🇷 Français'],['tr','🇹🇷 Türkçe'],['pt','🇵🇹 Português'],['pl','🇵🇱 Polski'],['it','🇮🇹 Italiano']];
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
 it:['Home','Mercato','Mining','Box','Altro','Lingua','Impostazioni','Avanti','Inizia','Salta']
};
const gmKeys=['home','market','mining','boxes','more','language','settings','next','start','skip'];

const UI_TRANSLATIONS:Record<string,Record<string,string>> = {
 "profile":{ru:"Профиль",uk:"Профіль",en:"Profile",es:"Perfil",de:"Profil",fr:"Profil",tr:"Profil",pt:"Perfil",pl:"Profil",it:"Profilo"},
 "achievements":{ru:"Достижения",uk:"Досягнення",en:"Achievements",es:"Logros",de:"Erfolge",fr:"Succès",tr:"Başarılar",pt:"Conquistas",pl:"Osiągnięcia",it:"Obiettivi"},
 "history":{ru:"История операций",uk:"Історія операцій",en:"Transaction history",es:"Historial",de:"Verlauf",fr:"Historique",tr:"İşlem geçmişi",pt:"Histórico de transações",pl:"Historia",it:"Cronologia"},
 "friends":{ru:"Друзья",uk:"Друзі",en:"Friends",es:"Amigos",de:"Freunde",fr:"Amis",tr:"Arkadaşlar",pt:"Amigos",pl:"Znajomi",it:"Amici"},
 "balance":{ru:"Баланс",uk:"Баланс",en:"Balance",es:"Saldo",de:"Guthaben",fr:"Solde",tr:"Bakiye",pt:"Saldo",pl:"Saldo",it:"Saldo"},
 "streak":{ru:"Серия",uk:"Серія",en:"Streak",es:"Racha",de:"Serie",fr:"Série",tr:"Seri",pt:"Sequência",pl:"Seria",it:"Serie"},
 "referrals":{ru:"Реферальная программа",uk:"Реферальна програма",en:"Referral program",es:"Referidos",de:"Empfehlungen",fr:"Parrainage",tr:"Davet programı",pt:"Programa de indicações",pl:"Polecenia",it:"Inviti"},
 "support":{ru:"Поддержка",uk:"Підтримка",en:"Support",es:"Soporte",de:"Support",fr:"Assistance",tr:"Destek",pt:"Suporte",pl:"Wsparcie",it:"Supporto"},
 "logout":{ru:"Выйти",uk:"Вийти",en:"Log out",es:"Salir",de:"Abmelden",fr:"Déconnexion",tr:"Çıkış yap",pt:"Sair",pl:"Wyloguj",it:"Esci"},
 "theme":{ru:"Тема оформления",uk:"Тема оформлення",en:"Appearance",es:"Apariencia",de:"Design",fr:"Apparence",tr:"Görünüm",pt:"Aparência",pl:"Wygląd",it:"Aspetto"},
 "personalization":{ru:"Персонализация",uk:"Персоналізація",en:"Personalization",es:"Personalización",de:"Personalisierung",fr:"Personnalisation",tr:"Kişiselleştirme",pt:"Personalização",pl:"Personalizacja",it:"Personalizzazione"},
 "interfaceLanguage":{ru:"Язык интерфейса",uk:"Мова інтерфейсу",en:"Interface language",es:"Idioma de la interfaz",de:"Sprache",fr:"Langue de l’interface",tr:"Arayüz dili",pt:"Idioma da interface",pl:"Język interfejsu",it:"Lingua interfaccia"},
 "instruction":{ru:"Инструкция",uk:"Інструкція",en:"Guide",es:"Guía",de:"Anleitung",fr:"Guide",tr:"Kılavuz",pt:"Instruções",pl:"Instrukcja",it:"Guida"},
 "replay":{ru:"Пройти инструкцию",uk:"Пройти інструкцію",en:"Replay tutorial",es:"Repetir tutorial",de:"Tutorial wiederholen",fr:"Revoir le guide",tr:"Rehberi tekrar aç",pt:"Rever tutorial",pl:"Powtórz samouczek",it:"Rivedi tutorial"},
 "account":{ru:"Аккаунт",uk:"Акаунт",en:"Account",es:"Cuenta",de:"Konto",fr:"Compte",tr:"Hesap",pt:"Conta",pl:"Konto",it:"Account"},
 "game":{ru:"Игра",uk:"Гра",en:"Game",es:"Juego",de:"Spiel",fr:"Jeu",tr:"Oyun",pt:"Jogo",pl:"Gra",it:"Gioco"},
 "help":{ru:"Помощь",uk:"Допомога",en:"Help",es:"Ayuda",de:"Hilfe",fr:"Aide",tr:"Yardım",pt:"Ajuda",pl:"Pomoc",it:"Aiuto"},
 "tasks":{ru:"Задания",uk:"Завдання",en:"Tasks",es:"Tareas",de:"Aufgaben",fr:"Tâches",tr:"Görevler",pt:"Tarefas",pl:"Zadania",it:"Attività"},
 "leaderboard":{ru:"Рейтинг",uk:"Рейтинг",en:"Leaderboard",es:"Clasificación",de:"Rangliste",fr:"Classement",tr:"Liderlik tablosu",pt:"Classificação",pl:"Ranking",it:"Classifica"},
 "global":{ru:"Все",uk:"Усі",en:"Global",es:"Global",de:"Global",fr:"Global",tr:"Genel",pt:"Global",pl:"Globalny",it:"Globale"},
 "miningUpgrades":{ru:"Улучшения майнинга",uk:"Покращення майнінгу",en:"Mining upgrades",es:"Mejoras de minería",de:"Mining-Upgrades",fr:"Améliorations de minage",tr:"Madencilik yükseltmeleri",pt:"Melhorias de mineração",pl:"Ulepszenia kopania",it:"Potenziamenti mining"},
 "nextLevel":{ru:"Следующий уровень",uk:"Наступний рівень",en:"Next level",es:"Siguiente nivel",de:"Nächstes Level",fr:"Niveau suivant",tr:"Sonraki seviye",pt:"Próximo nível",pl:"Następny poziom",it:"Livello successivo"},
 "level":{ru:"Уровень",uk:"Рівень",en:"Level",es:"Nivel",de:"Level",fr:"Niveau",tr:"Seviye",pt:"Nível",pl:"Poziom",it:"Livello"},
 "speed":{ru:"Скорость",uk:"Швидкість",en:"Speed",es:"Velocidad",de:"Tempo",fr:"Vitesse",tr:"Hız",pt:"Velocidade",pl:"Prędkość",it:"Velocità"},
 "upgrade":{ru:"Улучшить майнинг",uk:"Покращити майнінг",en:"Upgrade mining",es:"Mejorar minería",de:"Mining verbessern",fr:"Améliorer le minage",tr:"Madenciliği geliştir",pt:"Melhorar mineração",pl:"Ulepsz kopanie",it:"Migliora mining"},
 "insufficient":{ru:"Недостаточно GM",uk:"Недостатньо GM",en:"Not enough GM",es:"GM insuficiente",de:"Zu wenig GM",fr:"GM insuffisants",tr:"Yetersiz GM",pt:"GM insuficiente",pl:"Za mało GM",it:"GM insufficienti"},
 "allLevels":{ru:"Все 200 уровней",uk:"Усі 200 рівнів",en:"All 200 levels",es:"Los 200 niveles",de:"Alle 200 Level",fr:"Les 200 niveaux",tr:"200 seviye",pt:"Todos os 200 níveis",pl:"200 poziomów",it:"Tutti i 200 livelli"},
 "collapse":{ru:"Свернуть список",uk:"Згорнути список",en:"Collapse list",es:"Cerrar lista",de:"Liste schließen",fr:"Réduire la liste",tr:"Listeyi daralt",pt:"Recolher lista",pl:"Zwiń listę",it:"Chiudi elenco"},
 "locked":{ru:"Закрыто",uk:"Закрито",en:"Locked",es:"Bloqueado",de:"Gesperrt",fr:"Verrouillé",tr:"Kilitli",pt:"Bloqueado",pl:"Zablokowane",it:"Bloccato"},
 "earned":{ru:"Получено",uk:"Отримано",en:"Claimed",es:"Obtenido",de:"Erhalten",fr:"Obtenu",tr:"Alındı",pt:"Obtido",pl:"Odebrane",it:"Ottenuto"},
 "claim":{ru:"Получить",uk:"Отримати",en:"Claim",es:"Reclamar",de:"Abholen",fr:"Réclamer",tr:"Al",pt:"Resgatar",pl:"Odbierz",it:"Riscatta"},
 "wallet":{ru:"Кошелёк",uk:"Гаманець",en:"Wallet",es:"Billetera",de:"Wallet",fr:"Portefeuille",tr:"Cüzdan",pt:"Carteira",pl:"Portfel",it:"Portafoglio"},
 "holdings":{ru:"Рейтинг держателей",uk:"Рейтинг власників",en:"Holders leaderboard",es:"Clasificación de tenedores",de:"Halter-Rangliste",fr:"Classement des détenteurs",tr:"Sahipler sıralaması",pt:"Ranking de detentores",pl:"Ranking posiadaczy",it:"Classifica detentori"},
 "welcome":{ru:"Добро пожаловать в GM TOKEN",uk:"Ласкаво просимо до GM TOKEN",en:"Welcome to GM TOKEN",es:"Bienvenido a GM TOKEN",de:"Willkommen bei GM TOKEN",fr:"Bienvenue sur GM TOKEN",tr:"GM TOKEN'a hoş geldiniz",pt:"Bem-vindo ao GM TOKEN",pl:"Witamy w GM TOKEN",it:"Benvenuto in GM TOKEN"},
 "open":{ru:"Открыть приложение",uk:"Відкрити застосунок",en:"Open app",es:"Abrir app",de:"App öffnen",fr:"Ouvrir l’app",tr:"Uygulamayı aç",pt:"Abrir aplicativo",pl:"Otwórz aplikację",it:"Apri app"},
 "loading":{ru:"Загрузка игры",uk:"Завантаження гри",en:"Loading game",es:"Cargando juego",de:"Spiel wird geladen",fr:"Chargement du jeu",tr:"Oyun yükleniyor",pt:"Carregando jogo",pl:"Ładowanie gry",it:"Caricamento gioco"},
 "later":{ru:"Скоро",uk:"Незабаром",en:"Coming soon",es:"Próximamente",de:"Bald",fr:"Bientôt",tr:"Yakında",pt:"Em breve",pl:"Wkrótce",it:"Presto"},
 "startTour":{ru:"Показать подсказки",uk:"Показати підказки",en:"Show guide",es:"Mostrar guía",de:"Anleitung zeigen",fr:"Afficher le guide",tr:"Rehberi göster",pt:"Mostrar guia",pl:"Pokaż poradnik",it:"Mostra guida"},
 "back":{ru:"Назад",uk:"Назад",en:"Back",es:"Atrás",de:"Zurück",fr:"Retour",tr:"Geri",pt:"Voltar",pl:"Wstecz",it:"Indietro"},
 "next":{ru:"Далее",uk:"Далі",en:"Next",es:"Siguiente",de:"Weiter",fr:"Suivant",tr:"İleri",pt:"Próximo",pl:"Dalej",it:"Avanti"},
 "finish":{ru:"Понятно",uk:"Зрозуміло",en:"Got it",es:"Entendido",de:"Verstanden",fr:"Compris",tr:"Anladım",pt:"Entendi",pl:"Rozumiem",it:"Capito"},
 "skip":{ru:"Пропустить",uk:"Пропустити",en:"Skip",es:"Omitir",de:"Überspringen",fr:"Passer",tr:"Atla",pt:"Pular",pl:"Pomiń",it:"Salta"},
 "tutorialStep":{ru:"Шаг",uk:"Крок",en:"Step",es:"Paso",de:"Schritt",fr:"Étape",tr:"Adım",pt:"Passo",pl:"Krok",it:"Passo"},
 "customize":{ru:"Оформление и язык",uk:"Оформлення і мова",en:"Appearance & language",es:"Apariencia e idioma",de:"Design & Sprache",fr:"Apparence et langue",tr:"Görünüm ve dil",pt:"Aparência e idioma",pl:"Wygląd i język",it:"Aspetto e lingua"},
 "frames":{ru:"Рамки профиля",uk:"Рамки профілю",en:"Profile frames",es:"Marcos de perfil",de:"Profilrahmen",fr:"Cadres de profil",tr:"Profil çerçeveleri",pt:"Molduras de perfil",pl:"Ramki profilu",it:"Cornici profilo"},
 "achievementsLocked":{ru:"Открой достижение, чтобы получить награду",uk:"Відкрий досягнення, щоб отримати нагороду",en:"Unlock achievements to earn rewards",es:"Desbloquea logros para ganar recompensas",de:"Schalte Erfolge für Belohnungen frei",fr:"Débloquez des succès pour des récompenses",tr:"Ödüller için başarıları aç",pt:"Desbloqueie conquistas para ganhar recompensas",pl:"Odblokuj osiągnięcia i nagrody",it:"Sblocca obiettivi e premi"},
 "mining":{ru:"Майнинг",uk:"Майнінг",en:"Mining",es:"Minería",de:"Mining",fr:"Minage",tr:"Madencilik",pt:"Mineração",pl:"Kopanie",it:"Mining"},
 "market":{ru:"Рынок",uk:"Ринок",en:"Market",es:"Mercado",de:"Markt",fr:"Marché",tr:"Pazar",pt:"Mercado",pl:"Rynek",it:"Mercato"},
 "boxes":{ru:"Боксы",uk:"Бокси",en:"Boxes",es:"Cajas",de:"Boxen",fr:"Coffres",tr:"Kutular",pt:"Caixas",pl:"Skrzynki",it:"Box"},
 "avatar":{ru:"Мой профиль",uk:"Мій профіль",en:"My profile",es:"Mi perfil",de:"Mein Profil",fr:"Mon profil",tr:"Profilim",pt:"Meu perfil",pl:"Mój profil",it:"Il mio profilo"},
};

const EXTRA_LANGUAGE:Record<string,Record<string,string>> = {
 "Пока нет исполненных сделок":{pt:"Ainda não há negociações",uk:"Поки немає виконаних угод",en:"No completed trades yet"},
 "График появится после первой сделки GM/CR. Пустые интервалы не заполняются искусственными свечами.":{pt:"O gráfico aparece após a primeira negociação GM/CR.",uk:"Графік з’явиться після першої угоди GM/CR.",en:"The chart appears after the first GM/CR trade."},
 "Нет связи с сервером. Проверь интернет и открой приложение ещё раз.":{pt:"Sem conexão com o servidor. Verifique a internet.",uk:"Немає зв'язку із сервером. Перевір інтернет.",en:"No server connection. Check the internet."},
 "Недоступно":{pt:"Indisponível",uk:"Недоступно",en:"Unavailable"},
 "Проверяем вход через Telegram…":{pt:"Verificando acesso pelo Telegram…",uk:"Перевіряємо вхід через Telegram…",en:"Checking Telegram login…"},
 "Открой GM TOKEN внутри Telegram":{pt:"Abra GM TOKEN dentro do Telegram",uk:"Відкрий GM TOKEN у Telegram",en:"Open GM TOKEN inside Telegram"},
 "Ошибка: ":{pt:"Erro: ",uk:"Помилка: ",en:"Error: "},
 "Операция выполнена":{pt:"Operação concluída",uk:"Операцію виконано",en:"Operation completed"},
 "Задания":{pt:"Tarefas",uk:"Завдання",en:"Tasks"},
 "Друзья":{pt:"Amigos",uk:"Друзі",en:"Friends"},
 "Твой прогресс":{pt:"Seu progresso",uk:"Твій прогрес",en:"Your progress"},
 "МОЙ БАЛАНС":{pt:"MEU SALDO",uk:"МІЙ БАЛАНС",en:"MY BALANCE"},
 "Перейти в Mining":{pt:"Abrir mineração",uk:"Перейти до майнінгу",en:"Go to mining"},
 "Перейти на рынок":{pt:"Abrir mercado",uk:"Перейти на ринок",en:"Go to market"},
 "РЫНОК · ТЕСТОВЫЙ GM/CR":{pt:"MERCADO · TESTE GM/CR",uk:"РИНОК · ТЕСТОВИЙ GM/CR",en:"MARKET · TEST GM/CR"},
 "Нет цены":{pt:"Preço indisponível",uk:"Немає ціни",en:"No price"},
 "Только реальные игровые сделки · без искусственного графика":{pt:"Somente negociações reais do jogo",uk:"Лише справжні ігрові угоди",en:"Only real in-game trades"},
 "График появится после нескольких сделок":{pt:"Gráfico disponível após algumas negociações",uk:"Графік з'явиться після кількох угод",en:"Chart appears after some trades"},
 "Твои POINTS: ":{pt:"Seus POINTS: ",uk:"Твої POINTS: ",en:"Your POINTS: "},
 " · гарантированные награды":{pt:" · recompensas garantidas",uk:" · гарантовані нагороди",en:" · guaranteed rewards"},
 " Как играть":{pt:" Como jogar",uk:" Як грати",en:" How to play"},
 "Стакан":{pt:"Livro de ofertas",uk:"Стакан",en:"Order book"},
 "Сделки":{pt:"Negociações",uk:"Угоди",en:"Trades"},
 "Мои ордера":{pt:"Minhas ordens",uk:"Мої ордери",en:"My orders"},
 "Пока нет заявок":{pt:"Ainda não há ordens",uk:"Поки немає заявок",en:"No orders yet"},
 "Цена":{pt:"Preço",uk:"Ціна",en:"Price"},
 "Объём":{pt:"Volume",uk:"Обсяг",en:"Volume"},
 "Здесь появятся исполненные, подтверждённые сервером сделки.":{pt:"As negociações executadas aparecerão aqui.",uk:"Тут з'являться виконані угоди.",en:"Completed trades will appear here."},
 "Покупка GM":{pt:"Comprar GM",uk:"Купівля GM",en:"Buy GM"},
 "Продажа GM":{pt:"Vender GM",uk:"Продаж GM",en:"Sell GM"},
 "Отменить":{pt:"Cancelar",uk:"Скасувати",en:"Cancel"},
 "Индикативная цена":{pt:"Preço indicativo",uk:"Орієнтовна ціна",en:"Indicative price"},
 "Последняя цена сделки":{pt:"Último preço",uk:"Остання ціна угоди",en:"Last trade price"},
 "Обновить котировки":{pt:"Atualizar cotações",uk:"Оновити котирування",en:"Refresh quotes"},
 "ОБЪЁМ · 24 Ч":{pt:"VOLUME · 24 H",uk:"ОБСЯГ · 24 Г",en:"VOLUME · 24 H"},
 "СДЕЛОК · 24 Ч":{pt:"NEGOCIAÇÕES · 24 H",uk:"УГОД · 24 Г",en:"TRADES · 24 H"},
 "РЕЖИМ":{pt:"MODO",uk:"РЕЖИМ",en:"MODE"},
 "Реальные сделки":{pt:"Negociações reais",uk:"Реальні угоди",en:"Real trades"},
 "Интервал свечей":{pt:"Intervalo do gráfico",uk:"Інтервал свічок",en:"Candle interval"},
 "Доступно для торговли":{pt:"Disponível para negociar",uk:"Доступно для торгів",en:"Available to trade"},
 "Данные рынка":{pt:"Dados do mercado",uk:"Дані ринку",en:"Market data"},
 "Купить GM":{pt:"Comprar GM",uk:"Купити GM",en:"Buy GM"},
 "Продать GM":{pt:"Vender GM",uk:"Продати GM",en:"Sell GM"},
 "Подтверждение ордера":{pt:"Confirmação da ordem",uk:"Підтвердження ордера",en:"Confirm order"},
 "Проверь заявку":{pt:"Revise a ordem",uk:"Перевір заявку",en:"Review order"},
 "Закрыть":{pt:"Fechar",uk:"Закрити",en:"Close"},
 "Тип заявки":{pt:"Tipo de ordem",uk:"Тип заявки",en:"Order type"},
 "Количество GM":{pt:"Quantidade de GM",uk:"Кількість GM",en:"GM amount"},
 "Цена · CR за 1 GM":{pt:"Preço · CR por 1 GM",uk:"Ціна · CR за 1 GM",en:"Price · CR per GM"},
 "Срок действия заявки":{pt:"Validade da ordem",uk:"Термін заявки",en:"Order duration"},
 "Резерв по заявке":{pt:"Reserva da ordem",uk:"Резерв заявки",en:"Order reserve"},
 "Заблокируется GM":{pt:"GM reservado",uk:"GM буде заблоковано",en:"GM to reserve"},
 "Проверить заявку":{pt:"Revisar ordem",uk:"Перевірити заявку",en:"Review order"},
 "ПОДТВЕРЖДЕНИЕ":{pt:"CONFIRMAÇÃO",uk:"ПІДТВЕРДЖЕННЯ",en:"CONFIRMATION"},
 "Доступно сейчас":{pt:"Disponível agora",uk:"Доступно зараз",en:"Available now"},
 "Отправить ордер":{pt:"Enviar ordem",uk:"Надіслати ордер",en:"Place order"},
 "Отмена":{pt:"Cancelar",uk:"Скасувати",en:"Cancel"},
 "Назад к форме":{pt:"Voltar ao formulário",uk:"Назад до форми",en:"Back to form"},
 "Все":{pt:"Todos",uk:"Усі",en:"All"},
 "Социальные":{pt:"Sociais",uk:"Соціальні",en:"Social"},
 "Игровые":{pt:"Do jogo",uk:"Ігрові",en:"Game"},
 "Подтверди выполнение условия":{pt:"Confirme a conclusão do requisito",uk:"Підтвердь виконання умови",en:"Confirm requirement"},
 "Достижение":{pt:"Conquista",uk:"Досягнення",en:"Achievement"},
 "Забрать":{pt:"Resgatar",uk:"Забрати",en:"Claim"},
 "Игрок":{pt:"Jogador",uk:"Гравець",en:"Player"},
 "Ежедневная награда":{pt:"Recompensa diária",uk:"Щоденна нагорода",en:"Daily reward"},
 "НАГРАДА ЗА СЕГОДНЯ":{pt:"RECOMPENSA DE HOJE",uk:"НАГОРОДА ЗА СЬОГОДНІ",en:"TODAY'S REWARD"},
 "Награда получена":{pt:"Recompensa recebida",uk:"Нагороду отримано",en:"Reward claimed"},
 "Награды не включены":{pt:"Recompensas indisponíveis",uk:"Нагороди не ввімкнено",en:"Rewards unavailable"},
 "Перейти в Майнинг":{pt:"Ir para mineração",uk:"Перейти до майнінгу",en:"Go to mining"},
 "Добывай GM":{pt:"Minere GM",uk:"Видобувай GM",en:"Mine GM"},
 "GM накоплено":{pt:"GM acumulado",uk:"GM накопичено",en:"GM accumulated"},
 "Забрать GM":{pt:"Resgatar GM",uk:"Забрати GM",en:"Claim GM"},
 "Хранилище":{pt:"Armazenamento",uk:"Сховище",en:"Storage"},
 "Мощность":{pt:"Potência",uk:"Потужність",en:"Power"},
 "Резерв":{pt:"Reserva",uk:"Резерв",en:"Reserve"},
 "Уровень и ускорения":{pt:"Nível e melhorias",uk:"Рівень та прискорення",en:"Level and boosts"},
 "Проверяем покупку…":{pt:"Verificando compra…",uk:"Перевіряємо купівлю…",en:"Checking purchase…"},
 "Максимальный уровень открыт":{pt:"Nível máximo alcançado",uk:"Максимальний рівень відкрито",en:"Maximum level reached"},
 "Начальный":{pt:"Inicial",uk:"Початковий",en:"Starter"},
 "Пока недоступно":{pt:"Indisponível",uk:"Поки недоступно",en:"Unavailable"},
 "Не хватает POINTS":{pt:"POINTS insuficientes",uk:"Недостатньо POINTS",en:"Not enough POINTS"},
 "Открыть бокс":{pt:"Abrir caixa",uk:"Відкрити бокс",en:"Open box"},
 "Как заработать ":{pt:"Como ganhar ",uk:"Як заробити ",en:"How to earn "},
 "Твои POINTS":{pt:"Seus POINTS",uk:"Твої POINTS",en:"Your POINTS"},
 "СТАНДАРТ":{pt:"PADRÃO",uk:"СТАНДАРТ",en:"STANDARD"},
 "ПРЕМИУМ":{pt:"PREMIUM",uk:"ПРЕМІУМ",en:"PREMIUM"},
 "ЭЛИТНЫЙ":{pt:"ELITE",uk:"ЕЛІТНИЙ",en:"ELITE"},
 "Приглашай друзей":{pt:"Convide amigos",uk:"Запрошуй друзів",en:"Invite friends"},
 "Приглашено игроков":{pt:"Jogadores convidados",uk:"Запрошено гравців",en:"Invited players"},
 "Получено GM":{pt:"GM recebido",uk:"GM отримано",en:"GM received"},
 "ТВОЯ ПЕРСОНАЛЬНАЯ ССЫЛКА":{pt:"SEU LINK PESSOAL",uk:"ТВОЄ ОСОБИСТЕ ПОСИЛАННЯ",en:"YOUR PERSONAL LINK"},
 "Доступна после входа в Telegram":{pt:"Disponível após entrar no Telegram",uk:"Доступно після входу в Telegram",en:"Available after Telegram login"},
 "Скопировать":{pt:"Copiar",uk:"Скопіювати",en:"Copy"},
 " Поделиться в Telegram ":{pt:" Compartilhar no Telegram ",uk:" Поділитися в Telegram ",en:" Share on Telegram "},
 "Не выполнено":{pt:"Não concluído",uk:"Не виконано",en:"Not completed"},
 "Тема оформления":{pt:"Aparência",uk:"Тема оформлення",en:"Appearance"},
 "Персонализация":{pt:"Personalização",uk:"Персоналізація",en:"Personalization"},
 "Язык интерфейса":{pt:"Idioma da interface",uk:"Мова інтерфейсу",en:"Interface language"},
 "Пройти инструкцию":{pt:"Rever tutorial",uk:"Пройти інструкцію",en:"Replay tutorial"},
 "Виртуальные GM и CR":{pt:"GM e CR virtuais",uk:"Віртуальні GM і CR",en:"Virtual GM and CR"},
 "Добро пожаловать в GM TOKEN":{pt:"Bem-vindo ao GM TOKEN",uk:"Ласкаво просимо до GM TOKEN",en:"Welcome to GM TOKEN"},
 "Поддержка":{pt:"Suporte",uk:"Підтримка",en:"Support"},
 "История операций пока пуста":{pt:"Nenhuma transação registrada",uk:"Історія операцій порожня",en:"No transactions yet"},
 "Загрузить с сервера":{pt:"Carregar do servidor",uk:"Завантажити із сервера",en:"Load from server"},
 "Инструкция":{pt:"Instruções",uk:"Інструкція",en:"Guide"},
 "Профиль":{pt:"Perfil",uk:"Профіль",en:"Profile"},
 "Рейтинг":{pt:"Classificação",uk:"Рейтинг",en:"Leaderboard"},
 "Вывести":{pt:"Retirar",uk:"Вивести",en:"Withdraw"},
 "Пополнить":{pt:"Depositar",uk:"Поповнити",en:"Deposit"},
 "Доступно в кошельке: ":{pt:"Disponível na carteira: ",uk:"Доступно в гаманці: ",en:"Available in wallet: "},
 "Награды к получению":{pt:"Recompensas para resgatar",uk:"Нагороди до отримання",en:"Pending rewards"},
 "Поддержка GM TOKEN":{pt:"Suporte GM TOKEN",uk:"Підтримка GM TOKEN",en:"GM TOKEN support"},
 "Новости":{pt:"Notícias",uk:"Новини",en:"News"},
 "Настройки":{pt:"Configurações",uk:"Налаштування",en:"Settings"},
 "Уровень ":{pt:"Nível ",uk:"Рівень ",en:"Level "},
};


// Translate all literal labels in React.createElement/JSX, not just the bottom navigation.
// Unknown strings remain unchanged rather than being invented by a translation provider.
let gmActiveLocale='ru';
const gmNativeCreateElement=React.createElement.bind(React);
const gmTranslate=(value:string)=>{
 if(gmActiveLocale==='ru')return value;
 const t=gmActiveLocale;
 const direct=EXTRA_LANGUAGE[value];
 if(direct)return direct[t]||direct.en||value;
 for(const row of Object.values(UI_TRANSLATIONS)){
  if(row.ru===value||row.en===value)return row[t]||row.en||value;
 }
 // Preserve numerals/amounts while translating commonly concatenated prefixes.
 for(const [key,translations] of Object.entries(EXTRA_LANGUAGE)){
  if(!key.trim()||key.length<5||!value.startsWith(key))continue;
  const remainder=value.slice(key.length);
  if(remainder&&(/^\d|^\s\d/.test(remainder)))return (translations[t]||translations.en||key)+remainder;
 }
 return value;
};
React.createElement=(type:any,props:any,...children:any[])=>{
 const mapped=children.map(x=>typeof x==='string'?gmTranslate(x):x);
 if(props&&typeof type==='string'){
  const p={...props};
  for(const key of ['title','placeholder','aria-label','alt']){
   if(typeof p[key]==='string')p[key]=gmTranslate(p[key]);
  }
  return gmNativeCreateElement(type,p,...mapped);
 }
 return gmNativeCreateElement(type,props,...mapped);
};

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
 const [screen,setScreen]=React.useState('splash');
 const [locale,setLocale]=React.useState(store.getItem('gm_lang')||'auto');
 const [introStep,setIntroStep]=React.useState(0);
 const telegramLanguage=String(webapp?.initDataUnsafe?.user?.language_code||navigator.language||'en').toLowerCase().split(/[-_]/)[0];
 const actualLang=locale==='auto'?telegramLanguage:locale;
 gmActiveLocale=actualLang;
 const lang=key=>{
  const index=gmKeys.indexOf(key);
  return index<0?key:(gmWords[actualLang]||gmWords.en)[index]||gmWords.en[index];
 };
 const L=(key:string)=>UI_TRANSLATIONS[key]?.[actualLang]||UI_TRANSLATIONS[key]?.en||key;
 const [guideScreen,setGuideScreen]=React.useState('');
 const [guideStep,setGuideStep]=React.useState(0);
 const [guideSpot,setGuideSpot]=React.useState(null as null|{top:number;left:number;width:number;height:number;cardTop:number});
 const [languageOpen,setLanguageOpen]=React.useState(false);
 const [languageSearch,setLanguageSearch]=React.useState('');
 // Each tutorial entry points at a real, visible control rather than a generic icon.
 const guideCatalog:any={
  home:[['wallet','balance','.gm-home-wallet','home.balance'],['lightning','mining','.gm-home-shortcuts button','home.shortcuts'],['gift','boxes','.gm-home-offer','home.reward']],
  mining:[['gm-coin-orbit','mining','.gm-mining-coin-wrap','mining.coin'],['diamond','claim','.gm-mining-claim','mining.claim'],['lightning','miningUpgrades','.gm-mining-upgrades','mining.upgrades'],['clock','speed','.gm-mining-energy','mining.storage']],
  trade:[['candlesticks','market','.terminal-quote','trade.price'],['candlesticks','market','.terminal-periods','trade.chart'],['wallet','balance','.terminal-wallet-line','trade.balance'],['coins','market','.terminal-buy-sell','trade.actions'],['shield-check','next','.gm-trade-quick-card','trade.quantity']],
  boxes:[['gift','boxes','.gm-box-card','boxes.choose'],['trophy','achievements','.gm-box-open','boxes.claim']],
  tasks:[['tasks','tasks','.gm-task-filters','tasks.filter'],['trophy','achievements','.gm-task-list','tasks.claim']],
  profile:[['profile','profile','.gm-league-card','profile.league'],['trophy','frames','.gm-frames-section','profile.frames']],
  more:[['settings','customize','.gm-more-list','more.menu']],
  achievements:[['trophy','achievements','.gm-achievement-planned','achievements.locked']],
  settings:[['settings','theme','.gm-theme-list','settings.theme'],['globe','interfaceLanguage','.gm-language-grid','settings.language']],
  support:[['shield-check','support','.gm-support-v8','support.ticket']]
 };
 const guideText:Record<string,Record<string,string>>={
  'home.balance':{ru:'Здесь отображаются твои игровые GM и CR. Нажми на соответствующую кнопку, чтобы перейти к основным возможностям; это не криптовалютный кошелёк.',uk:'Тут показано твої ігрові GM і CR. Натисни потрібну кнопку, щоб перейти до функцій — це не криптогаманець.',pt:'Veja seus GM e CR do jogo. Os saldos aqui não são uma carteira cripto.',en:'Your in-game GM and CR balances live here. These are not on-chain wallet balances.'},
  'home.shortcuts':{ru:'Эти кнопки ведут прямо в Майнинг, Боксы, Задания и Друзья. Начни с майнинга: монета показывает накопление, а собирать GM можно с установленного минимума.',uk:'Ці кнопки відкривають Майнінг, Бокси, Завдання та Друзів. Почни з майнінгу.',pt:'Estes atalhos abrem Mineração, Caixas, Tarefas e Amigos. Comece pela mineração.',en:'These shortcuts open Mining, Boxes, Tasks, and Friends. Start by exploring Mining.'},
  'home.reward':{ru:'В карточке наград находятся игровые задания и бонусы. Начисления всегда подтверждаются сервером; обещаний случайных призов здесь нет.',uk:'У картці нагород є завдання та бонуси. Нарахування перевіряє сервер.',pt:'Aqui ficam tarefas e recompensas. Os prêmios são verificados pelo servidor.',en:'Tasks and rewards are here. The server confirms any earned rewards.'},
  'mining.coin':{ru:'Это главная GM-монета. Майнинг идёт автоматически по действующей скорости. Нажимая на монету, ты собираешь накопленные игровые GM — если накопилось не меньше 1 GM.',uk:'Це головна монета GM. Майнінг відбувається автоматично. Натисни монету, коли накопичиш щонайменше 1 GM.',pt:'Esta é a moeda GM. A mineração é automática. Toque na moeda para coletar após acumular pelo menos 1 GM.',en:'This is the main GM coin. Mining accrues automatically. Tap to claim after at least 1 GM is stored.'},
  'mining.claim':{ru:'Эта отдельная кнопка выполняет тот же сбор. Пока на счёте меньше 1 GM, она неактивна. Сбор не требует оплаты или подключения кошелька.',uk:'Ця кнопка збирає накопичені GM. До 1 GM вона неактивна.',pt:'Este botão coleta os GM acumulados. Ele fica desativado até 1 GM.',en:'This button claims stored GM. It stays disabled below the 1 GM minimum.'},
  'mining.upgrades':{ru:'Здесь показаны 200 уровней, цена каждого и бонус к скорости. По договорённости уровни будут связаны с подтверждённым внешним кошельком. Пока контракт GM не проверен, оплата и покупка отключены, игровые GM не списываются.',uk:'Тут 200 рівнів, ціни та бонуси. Оплата через зовнішній гаманець поки недоступна — контракт GM ще не підтверджений.',pt:'Aqui estão 200 níveis e seus bônus. Compras com carteira externa estão desativadas até verificar o contrato GM.',en:'Explore all 200 levels and bonuses. Wallet-based purchases remain disabled until the GM contract is verified.'},
  'mining.storage':{ru:'Полоса показывает, сколько GM накоплено относительно вместимости. Когда хранилище заполнено, новые начисления останавливаются до сбора. Ниже указана текущая скорость за час.',uk:'Смуга показує наповнення сховища. Коли воно повне, зберіть GM, щоб звільнити місце.',pt:'A barra mostra o armazenamento atual. Colete GM para liberar espaço quando estiver cheio.',en:'The bar shows storage capacity. Claim stored GM when the container is full.'},
  'trade.price':{ru:'Здесь указана рыночная цена GM/CR. Для тестового рынка она берётся из реально исполненных игровых заявок; мы не рисуем вымышленные сделки.',uk:'Тут ціна GM/CR за виконаними ігровими угодами, без штучних свічок.',pt:'O preço GM/CR vem de negociações reais dentro do jogo, sem dados inventados.',en:'The GM/CR price reflects executed in-game trades; no synthetic market data.'},
  'trade.chart':{ru:'Выбирай интервал свечей — от минуты до дня. График показывает историю исполненных игровых сделок, а пустые интервалы остаются пустыми.',uk:'Обери інтервал від хвилини до дня. Порожні періоди не домальовуються.',pt:'Escolha o intervalo do gráfico. Períodos sem negociações permanecem vazios.',en:'Choose a candle interval. Periods without executed in-game trades stay empty.'},
  'trade.balance':{ru:'Тут доступны твои игровые GM и CR. Открытые заявки могут резервировать часть средств; перед отправкой заявки проверь остаток.',uk:'Тут доступні ігрові GM і CR. Відкриті ордери можуть резервувати кошти.',pt:'Aqui estão seus GM e CR do jogo. Ordens abertas podem reservar saldo.',en:'Your in-game GM and CR balances are shown here. Open orders reserve funds.'},
  'trade.actions':{ru:'Выбери «Купить GM» или «Продать GM». Кнопки переключают форму ниже, не отправляя заявку. Это тренировочный игровой рынок, не биржа настоящих денег.',uk:'Обери «Купити» або «Продати». Перемикач змінює форму, але нічого не надсилає.',pt:'Escolha Comprar ou Vender. Os botões apenas alternam o formulário, sem enviar ordem.',en:'Select Buy or Sell. These buttons only switch the form; they do not place an order.'},
  'trade.quantity':{ru:'Укажи количество GM. Ниже сразу появится приблизительный итог в CR. Нажми «Продолжить», проверь цену и срок заявки в следующем окне, затем отдельно подтверди отправку.',uk:'Вкажи кількість GM, переглянь приблизну суму в CR і відкрий перевірку заявки.',pt:'Digite o valor em GM para ver a estimativa em CR e abrir a revisão da ordem.',en:'Enter a GM amount, review the CR estimate, and continue to the separate confirmation step.'},
  'boxes.choose':{ru:'Здесь выбирают тип бокса. В каждом — заранее утверждённые игровые награды; их состав и доступность показывает сервер.',uk:'Тут обирають тип боксу. Нагороди визначає сервер.',pt:'Escolha o tipo de caixa. As recompensas são aprovadas pelo servidor.',en:'Choose a box type. Rewards and availability come from the server.'},
  'boxes.claim':{ru:'Кнопка открытия активируется только при достаточном количестве POINTS. Содержимое показывается после подтверждения операции сервером.',uk:'Бокс відкривається за POINTS; результат підтверджує сервер.',pt:'Abra caixas com POINTS; o resultado é confirmado pelo servidor.',en:'Use POINTS to open a box; the reveal follows server confirmation.'},
  'tasks.filter':{ru:'Фильтры разделяют задания на общие, социальные и игровые. Выполняй условия; неподтверждённые задания не начисляют наград.',uk:'Фільтри розділяють завдання за типами. Нагороду дають лише за виконану умову.',pt:'Filtre tarefas por tipo. Recompensas exigem conclusão verificada.',en:'Filter tasks by type. Rewards require verified completion.'},
  'tasks.claim':{ru:'Каждая карточка содержит условие и награду. После выполнения появится кнопка получения; выдача проверяется сервером.',uk:'Кожна картка містить умову й нагороду. Видачу перевіряє сервер.',pt:'Cada cartão mostra o objetivo e a recompensa verificada.',en:'Each task shows an objective and a server-verified reward.'},
  'profile.league':{ru:'Это твоя лига и опыт XP. Полоса показывает прогресс, а под ней указано, сколько XP осталось до следующего ранга.',uk:'Це твоя ліга та XP. Смуга показує шлях до наступного рангу.',pt:'Sua liga e XP. A barra mostra o progresso até o próximo nível.',en:'Your league and XP are here. The progress bar shows how close the next rank is.'},
  'profile.frames':{ru:'Рамки профиля открываются за игровые достижения. Серые пока закрыты. У первых 20 участников есть особые уникальные рамки.',uk:'Рамки відкриваються за досягнення. Сірі ще заблоковані.',pt:'Molduras são liberadas por conquistas. As cinzas estão bloqueadas.',en:'Earn frames from achievements. Grey frames are locked; the earliest 20 players have exclusive ones.'},
  'more.menu':{ru:'Здесь находятся профиль, достижения, история, поддержка и настройки. Нужный раздел откроется по нажатию на карточку.',uk:'Тут профіль, досягнення, історія та підтримка.',pt:'Aqui ficam Perfil, Conquistas, Histórico e Suporte.',en:'Find Profile, Achievements, History, Support, and Settings here.'},
  'achievements.locked':{ru:'Цветные карточки — открытые награды, серые — ещё недоступные. Уникальные ранние награды закрепляются за конкретными игроками.',uk:'Кольорові нагороди відкриті, сірі — ще заблоковані.',pt:'Conquistas coloridas estão abertas; as cinzas continuam bloqueadas.',en:'Unlocked achievements are colored; locked achievements are grey.'},
  'settings.theme':{ru:'Выбирай Premium Silver или Premium Graphite — оба варианта используют один GM-дизайн и одинаковые функции.',uk:'Обери Premium Silver або Premium Graphite — функції ті самі.',pt:'Escolha Premium Silver ou Premium Graphite. As funções são iguais.',en:'Choose Premium Silver or Premium Graphite; both themes have the same features.'},
  'settings.language':{ru:'Выбери язык здесь. Настройка сохраняется на устройстве и применяется к переводимым элементам приложения. Кнопка «Auto» использует язык Telegram.',uk:'Обери мову тут; Auto використовує мову Telegram.',pt:'Escolha o idioma aqui. Auto usa o idioma do Telegram.',en:'Pick your preferred language. Auto follows your Telegram language.'},
  'support.ticket':{ru:'Выбери категорию и опиши проблему минимум десятью символами. Обращение создаётся на сервере и появляется в списке; можно просматривать ответы.',uk:'Оберіть категорію й опишіть проблему. Звернення збережеться на сервері.',pt:'Escolha a categoria e descreva o problema. O chamado será salvo no servidor.',en:'Choose a category and describe the issue. Your ticket is saved on the server.'}
 };
 const closeGuide=()=>{if(guideScreen)store.setItem('gm_guide_'+guideScreen,'1');setGuideScreen('');setGuideStep(0);setGuideSpot(null)};
 const openGuide=(name:string)=>{if(guideCatalog[name]){setGuideScreen(name);setGuideStep(0);setGuideSpot(null)}};
 React.useEffect(()=>{
  if(!guideScreen)return;
  const step=guideCatalog[guideScreen]?.[guideStep];
  if(!step)return;
  const selector=String(step[2]||'');
  let handle:any;
  const align=()=>{
   const element=document.querySelector(selector) as HTMLElement|null;
   if(!element){setGuideSpot(null);return}
   const rect=element.getBoundingClientRect();
   const height=window.visualViewport?.height||window.innerHeight;
   const top=Math.max(8,rect.top-5),bottom=Math.min(height-8,rect.bottom+5);
   const x=Math.max(8,rect.left-6),right=Math.min(window.innerWidth-8,rect.right+6);
   const spotHeight=Math.max(36,bottom-top);
   const cardHeight=260;
   const above=top-cardHeight-15;
   const below=bottom+14;
   const cardTop=(above>=12?above:below+cardHeight<=height-10?below:Math.max(12,height-cardHeight-12));
   setGuideSpot({top,left:x,width:right-x,height:spotHeight,cardTop});
  };
  const element=document.querySelector(selector) as HTMLElement|null;
  element?.scrollIntoView?.({behavior:'smooth',block:'center',inline:'nearest'});
  const timer=window.setTimeout(align,320);
  window.addEventListener('resize',align);
  window.addEventListener('scroll',align,true);
  return()=>{window.clearTimeout(timer);window.removeEventListener('resize',align);window.removeEventListener('scroll',align,true)};
 },[guideScreen,guideStep]);


 
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
 React.useEffect(()=>{if(screen!=='splash'||demo)return;const timeout=setTimeout(()=>{setScreen(store.getItem('gm_onboarding_complete')?'home':'intro')},1350);return()=>clearTimeout(timeout)},[screen,demo]);
 React.useEffect(()=>{if(demo||['splash','intro','reward'].includes(screen)||!guideCatalog[screen]||guideScreen)return;
 if(!store.getItem('gm_guide_'+screen)){const timeout=setTimeout(()=>openGuide(screen),550);return()=>clearTimeout(timeout)}
 },[screen,demo,guideScreen]);

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
 const [selectedFrame,setSelectedFrame]=React.useState(store.getItem('gm_profile_frame')||'standard');
 const [tonAccount,setTonAccount]=React.useState('' as string);
 const [tonError,setTonError]=React.useState('' as string);
 const tonUi=React.useRef(null as any);
 const [testAmount,setTestAmount]=React.useState('1000');
 const [testReason,setTestReason]=React.useState('Начисление виртуальных GM/CR для проверки торговой системы');
 const [testCode,setTestCode]=React.useState('');
 const [testBusy,setTestBusy]=React.useState(false);
 React.useEffect(()=>{
  if(demo||!webapp?.initData)return;
  const sdk=(window as any).TON_CONNECT_UI;
  if(!sdk?.TonConnectUI){setTonError('TON Connect SDK unavailable');return}
  try{
   const instance=new sdk.TonConnectUI({manifestUrl:window.location.origin+'/tonconnect-manifest.json'});
   tonUi.current=instance;
   const unsubscribe=instance.onStatusChange((connected:any)=>{setTonAccount(connected?.account?.address||'');setTonError('')},(error:any)=>setTonError(String(error?.message||error)));
   return()=>{if(typeof unsubscribe==='function')unsubscribe();tonUi.current=null};
  }catch(error:any){setTonError(String(error?.message||error))}
 },[demo]);
 const walletLanguage=(pt:string,uk:string,en:string,ru:string)=>actualLang==='pt'?pt:actualLang==='uk'?uk:actualLang==='ru'?ru:en;
 const connectTonWallet=async()=>{try{if(!tonUi.current)throw Error('TON Connect is not ready');await tonUi.current.openModal()}catch(err:any){setTonError(String(err?.message||err))}};
 const disconnectTonWallet=async()=>{try{await tonUi.current?.disconnect();setTonAccount('')}catch(err:any){setTonError(String(err?.message||err))}};
 const [backendStatus,setBackendStatus]=React.useState('Проверяем вход через Telegram…');
 const [modal,setModal]=React.useState('');
 const [boxReveal,setBoxReveal]=React.useState({kind:'bronze',gm:0});
 const [boxBusy,setBoxBusy]=React.useState(false);
 const [upgradeData,setUpgradeData]=React.useState(null as any);
 const [upgradeBusy,setUpgradeBusy]=React.useState(false);
 const [showAllUpgrades,setShowAllUpgrades]=React.useState(false);
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
  closeGuide();setScreen(route);setModal('');
  try{history.pushState({gmScreen:route},'','#'+route)}catch{}
  document.querySelector('.phone-scroll')?.scrollTo(0,0);
 };
 React.useEffect(()=>{
  const onPop=()=>{const prev=navStack.current.pop()||'home',route=location.hash.slice(1);
   const allowed=['home','trade','earn','tasks','leaderboard','profile','reward','splash','intro','mining','vault','wallet','shop','referrals','history','settings','support','admin','achievements','more','streak','boxes'];
   setScreen(allowed.includes(route)?route:prev);setModal('');
   document.querySelector('.phone-scroll')?.scrollTo(0,0);
  };
  window.addEventListener('popstate',onPop);
  return()=>window.removeEventListener('popstate',onPop);
 },[]);

 React.useEffect(()=>{try{store.setItem('gm_theme',theme)}catch{};webapp?.setBackgroundColor?.(theme==='dark'?'#030406':'#E8EAF4')},[theme]);
 React.useEffect(()=>{try{window.localStorage.removeItem('gm_demo_wallet')}catch{}},[]);
 React.useEffect(()=>{const timer=setInterval(()=>setClock(Math.floor(Date.now()/1000)),1000);return ()=>clearInterval(timer)},[]);
 React.useEffect(()=>{
  webapp?.ready?.();webapp?.expand?.();
  const init=webapp?.initData;
  if(!init){setBackendStatus('Открой приложение через @gm_token_test_bot в Telegram');return;}
  let valid=true;
  gmFetchJson('/api/bootstrap',{headers:{Authorization:'tma '+init}},2)
   .then(d=>{if(!valid)return;
    setDemo(false);setScreen('splash');setLiveRole(d.user?.role||'player');
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

 const api=async(path,payload=undefined,silent=false)=>{
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
  try{const out=await adminRequest(testCurrency==='POINTS'?'/api/admin/points-grant':'/api/admin/test-grant',{recipient:testRecipient,userId:testRecipient==='id'?testUserId:undefined,currency:testCurrency,amount:testAmount,reason:testReason,code:testCode,operationId:cryptoId()});
   if(out?.ok){setTestCode('');flash('Начислено '+testAmount+' '+testCurrency+' игроку '+out.userId);await refreshLive();}
  }finally{setTestBusy(false)}
 };
 function cryptoId(){return (window.crypto&&window.crypto.randomUUID)?window.crypto.randomUUID():'manual-'+Date.now()+'-'+Math.floor(Math.random()*999999)}
 const todayClaim=async()=>{const x=await gameAction('/api/daily/claim');if(x)goto('reward')};
 const miningClaim=async()=>{const result=await gameAction('/api/mining/claim');if(result?.gm_cents)flash('Собрано '+nf(result.gm_cents/100)+' GM')};
 React.useEffect(()=>{if(screen!=='mining'||demo)return;let valid=true;
  api('/api/mining/upgrades',undefined,true).then(data=>{if(valid&&data?.levels)setUpgradeData(data)});
  return()=>{valid=false};
 },[screen,demo]);
 const buyMiningUpgrade=async()=>{
  if(upgradeBusy||demo)return;
  if(!upgradeData?.upgrade?.purchasable){goto('wallet');return;}
  const next=upgradeData?.upgrade?.next_level ?? liveState?.mining?.upgrade?.next_level;
  if(!next)return;
  setUpgradeBusy(true);
  try{const result=await gameAction('/api/mining/upgrade',{level:next});
   if(result?.upgrade){setUpgradeData((old:any)=>old?{...old,upgrade:result.upgrade}:old);flash('Майнинг улучшен до уровня '+result.upgrade.level);}
  }finally{setUpgradeBusy(false)}
 };
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
 const top=(title:string,back=true,right='more')=><header className={'screen-header '+(!isLight?'dark-head':'')}><button className="header-icon" aria-label="Назад" onClick={()=>back?goBack():goto('more')} >{back?icon('chevron-left',24):<Brand theme={theme} size={35}/>}</button><strong>{title}</strong><button className="header-icon" onClick={()=>right==='settings'?goto('settings'):right==='info'?openGuide(screen):goto('more')} aria-label={right==='info'?L('instruction'):"Дополнительные действия"}>{icon(right,23)}</button></header>;
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
   top(L('market'),true,'info'),
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
  top(L('tasks'),true,'info'),
  e('div',{className:'gm-task-header gm-premium-card'},icon('tasks',44,true),
   e('div',null,e('b',null,'Выполняй цели'),e('small',null,'Игровые задания с проверяемыми условиями. Награды начисляет только сервер.'))),
  e('div',{className:'gm-task-filters'},tabs.map(([value,label])=>e('button',{type:'button',key:value,
   className:taskFilter===value?'active':'',onClick:()=>setTaskFilter(value)},label))),
  e('div',{className:'gm-task-list'},rows),
  e('p',{className:'gm-task-note'},'Задания за подписки появятся после настройки безопасной проверки членства через Telegram. Сейчас доступны только проверяемые игровые действия.')
 );
}

 function Leaderboard(){const users=(liveRanks?.users||[]).filter((u:any)=>rankFilter==='Global'||(liveReferrals?.referred||[]).some((r:any)=>r.user_id===u.id));return <>{top(L('leaderboard'),true,'trophy')}<div className="rank-tabs"><button onClick={()=>setRankFilter('Global')} className={rankFilter==='Global'?'on':''}>Global</button><button onClick={()=>setRankFilter('Friends')} className={rankFilter==='Friends'?'on':''}>Friends</button></div><div className="leader-rows">{users.map((u:any,i:number)=><div className="leader-row" key={u.id}><b>{i+1}</b>{icon('profile',27)}<span>{clean(u.username||'Игрок')}</span><small>{nf(u.score_cents/100)} GM</small></div>)}</div>{users.length===0&&<p className="disclaimer">{liveRanks?.pending_rule?'Рейтинг ещё не включён: формула не утверждена. Фальшивых участников нет.':'Пока нет игроков в выбранном списке.'}</p>}</>}
 function Profile(){
  const e=React.createElement;
  const cosmetics=liveState?.cosmetics||{founder_slot:null,frames:[]};
  const frames=[{id:'standard',title:'GM Classic',claimed:true},...(cosmetics.frames||[])];
  const chosen=frames.find((f:any)=>f.id===selectedFrame&&f.claimed)?selectedFrame:'standard';
  const league=liveState?.league||{name:'Bronze',min_xp:0};
  const leagues=liveState?.leagues||[];
  const nextLeague=leagues.find((x:any)=>wallet.xp<x.min_xp);
  const previousXp=Number(league.min_xp)||0;
  const nextXp=nextLeague?.min_xp??previousXp;
  const progress=nextLeague?Math.min(100,Math.max(0,(wallet.xp-previousXp)/Math.max(1,nextXp-previousXp)*100)):100;
  const user=webapp?.initDataUnsafe?.user;
  return e(React.Fragment,null,
   top(L('profile'),false,'settings'),
   e('div',{className:'profile-hero gm-profile-v2'},
    e('div',{className:'gm-profile-avatar '+(chosen==='standard'?'': 'gm-profile-avatar-special')},
     e(Brand,{theme,size:100})),
    e('h2',null,user?.username||user?.first_name||'GM PLAYER'),
    e('p',null,'#'+String(user?.id||'')),
    cosmetics.founder_slot?e('span',{className:'gm-founders-medal'},icon('crown',18),' FOUNDERS #'+cosmetics.founder_slot):null),
   e('div',{className:'gm-league-card gm-premium-card'},e('div',{className:'gm-league-head'},
    e('div',null,e('small',null,'GM LEAGUE'),e('h3',null,league.name)),
    e('b',null,nf(wallet.xp,0)+' XP')),
    e('div',{className:'gm-upgrades-progress'},e('span',{style:{width:progress+'%'}})),
    e('small',null,nextLeague?'→ '+nextLeague.name+' · '+nf(Math.max(0,nextXp-wallet.xp),0)+' XP': 'GM IMMORTAL · MAX')),
   e('div',{className:'stats-grid'},
    [['friends',String(liveReferrals?.referred?.length||0),L('friends')],['wallet',nf(wallet.gm,0),L('balance')],['lightning',String(wallet.streak),L('streak')]].map(([i,n,label])=>e('div',{className:'stat-card',key:label},icon(i,23),e('b',null,n),e('small',null,label)))),
   e('section',{className:'gm-frames-section gm-premium-card'},
    e('h3',null,L('frames')),
    e('p',null,L('achievementsLocked')),
    e('div',{className:'gm-frame-grid'},
     frames.map((f:any)=>e('button',{key:f.id,type:'button',
      className:'gm-frame-card '+(f.claimed?'unlocked':'locked')+(chosen===f.id?' active':''),
      disabled:!f.claimed,'aria-pressed':chosen===f.id,
      onClick:()=>{setSelectedFrame(f.id);store.setItem('gm_profile_frame',f.id)}},
      icon(f.category==='founder'?'crown':f.category==='milestone'?'diamond':'profile',27,true),
      e('span',null,f.title),f.claimed?icon('check',16):icon('minus',16))))),
   e('div',{className:'profile-menu'},
    [['trophy',L('achievements'),'achievements'],['friends',L('referrals'),'referrals'],['clock',L('history'),'history'],['wallet',L('wallet'),'wallet'],['settings',L('customize'),'settings'],['info',L('support'),'support']].map(([i,t,route])=>
     e('button',{key:route,onClick:()=>goto(route)},icon(i,21),e('span',null,t),icon('chevron-right',18)))),
   e('button',{type:'button',className:'gm-settings-onboard gm-premium-card',onClick:()=>openGuide('profile')},icon('info',22),L('startTour'),icon('chevron-right',18))
  );
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

 function Splash(){return <div className="splash-view gm-splash-v2" role="status" aria-live="polite"><div className="splash-glow"></div><div className="splash-logo"><img src={BRAND+'gm-lettermark-metallic-transparent.png'} alt="GM TOKEN"/></div><h1>GM TOKEN</h1><p>PREMIUM SILVER · PREMIUM GRAPHITE</p><div className="gm-splash-progress"><span></span></div><small>{L('loading')}</small></div>}
 
 function Mining(){
  const e=React.createElement;
  const rate=liveState?.mining?.rate_cents_day!=null?liveState.mining.rate_cents_day/100:gmRate(wallet);
  const upgrade=upgradeData?.upgrade||liveState?.mining?.upgrade||{level:1,max_level:200,bonus_pct:0,next_level:2,next_cost_gm:150,next_bonus_pct:10};
  const upgradeList=upgradeData?.levels||Array.from({length:200},(_,i)=>{const level=i+1;return {level,cost_gm:level===1?0:level===2?150:Math.round(200*Math.pow(1.04,level-3)/10)*10,bonus_pct:level===1?0:(10+2*(level-2))/100}});
  const visibleUpgrades=showAllUpgrades?upgradeList:upgradeList.filter((row:any)=>row.level>=Math.max(1,upgrade.level-1)&&row.level<=Math.min(200,upgrade.level+5));
  const stored=wallet.storage;
  const hours=storageHours(wallet.level);
  const cap=Math.max(1,rate*hours/24);
  const pct=Math.max(0,Math.min(100,stored/cap*100));
  const mineClick=()=>{if(demo)return flash('Войди через Telegram для добычи GM');
   if(stored<1)return flash('Монета активна: GM добываются автоматически. Сбор доступен от 1 GM.');
   miningClaim();
  };
  return e('div',{className:'gm-mining-v8'},
   top(L('mining'),true,'info'),
   e('div',{className:'gm-mining-title'},e('span',null,'Добывай GM'),e('small',null,'Майнинг '+upgrade.level+'/200 · '+nf(rate,0)+' GM / сутки')),
   e('button',{type:'button',className:'gm-mining-coin-wrap',onClick:mineClick,'aria-label':'Собрать накопленные GM'},
    e('span',{className:'gm-mining-coin-rim'},e(Brand,{theme,size:198})),
    e('span',{className:'gm-mining-coin-glint'})),
   e('div',{className:'gm-mining-total'},icon('lightning',28),e('strong',null,nf(stored)),e('span',null,'GM накоплено')),
   e('p',{className:'gm-mining-tap-guide'},'Нажми на монету, чтобы забрать накопленные GM (от 1 GM). Добыча идёт автоматически.'),
   e('div',{className:'gm-mining-energy gm-premium-card'},
    e('div',{className:'gm-mining-energy-head'},e('b',null,'Хранилище'),e('span',null,nf(stored)+' / '+nf(cap)+' GM')),
    e('div',{className:'gm-mining-energy-track'},e('span',{style:{width:pct+'%'}})),
    e('div',{className:'gm-mining-energy-foot'},e('small',null,'Вместимость: '+hours+' ч'),
     e('small',null,nf(rate/24,2)+' GM/час'))),
   e('button',{type:'button',className:'gm-mining-claim',disabled:demo||stored<1,onClick:miningClaim},
    icon('diamond',23),e('span',null,'Забрать GM'),icon('chevron-right',19)),
   e('section',{className:'gm-mining-benefits gm-premium-card'},
    e('b',null,'Уровень и ускорения'),
    e('div',null,e('span',null,icon('lightning',21),' Мощность'),e('strong',null,'+'+powerBonus(wallet.level)+'%')),
    e('div',null,e('span',null,icon('clock',21),' Хранилище'),e('strong',null,hours+' часов')),
    e('div',null,e('span',null,icon('database',21),' Резерв'),e('strong',null,'45 млн GM'))),
   e('section',{className:'gm-mining-upgrades gm-premium-card'},
    e('div',{className:'gm-upgrades-head'},e('div',null,e('small',null,'MINING UPGRADES'),e('h3',null,L('miningUpgrades'))),icon('lightning',28)),
    e('div',{className:'gm-upgrades-summary'},
     e('div',null,e('small',null,L('level')),e('strong',null,upgrade.level+' / 200')),
     e('div',null,e('small',null,L('speed')),e('strong',null,'+'+nf(Number(upgrade.bonus_pct),2)+'%'))),
    e('div',{className:'gm-upgrades-progress'},e('span',{style:{width:upgrade.level/200*100+'%'}})),
    upgrade.next_level?
     e('div',{className:'gm-upgrade-next'},
      e('span',null,L('nextLevel')+' '+upgrade.next_level),
      e('strong',null,nf(upgrade.next_cost_gm,0)+' GM · +'+nf(Number(upgrade.next_bonus_pct),2)+'%'),
      e('button',{type:'button',className:'gm-upgrades-purchase',disabled:demo||upgradeBusy||(!upgrade.purchasable&&upgrade.purchasable!==undefined)||(upgrade.purchasable&&wallet.gm<upgrade.next_cost_gm)||!upgradeData?.upgrade,onClick:buyMiningUpgrade},
       upgradeBusy?'Проверяем покупку…':!upgrade.purchasable?'Привязка GM к кошельку ещё не настроена':wallet.gm<upgrade.next_cost_gm?L('insufficient'):L('upgrade'),icon('chevron-right',17)))
     :e('div',{className:'gm-upgrades-max'},icon('crown',21),'Максимальный уровень открыт'),
    e('div',{className:'gm-upgrade-preview'},
     ...visibleUpgrades.map((row:any)=>
      e('div',{key:row.level,className:'gm-upgrade-row '+(row.level<=upgrade.level?'gm-upgrade-unlocked':row.level===upgrade.next_level?'gm-upgrade-available':'gm-upgrade-locked')},
       e('span',{className:'gm-upgrade-number'},row.level),
       e('span',{className:'gm-upgrade-row-copy'},e('b',null,row.level===200?'GM Immortal':'Уровень '+row.level),
        e('small',null,row.level===1?'Начальный':nf(row.cost_gm,0)+' GM')),
       e('strong',null,'+'+nf(Number(row.bonus_pct),2)+'%'),
       row.level<=upgrade.level?icon('check',17):icon('minus',17)))),
    e('button',{type:'button',className:'gm-upgrades-toggle',onClick:()=>setShowAllUpgrades(!showAllUpgrades)},
     showAllUpgrades?L('collapse'):L('allLevels'),icon(showAllUpgrades?'chevron-up':'chevron-down',16))),
   e('p',{className:'gm-mining-footnote'},'GM — виртуальная валюта игры. Улучшения покупаются по порядку. Цена списывается сервером, бонус заменяет предыдущий. Mining Pool ограничен — фактические начисления могут отличаться от расчётных.'));
 }

 function WalletConnection(){
  const e=React.createElement;
  const display=tonAccount?(tonAccount.length>24?tonAccount.slice(0,12)+'…'+tonAccount.slice(-8):tonAccount):'—';
  return e('div',{className:'gm-wallet-screen'},
   top(L('wallet'),true,'shield-check'),
   e('div',{className:'gm-wallet-hero gm-premium-card'},
    e('div',{className:'gm-wallet-hero-icon'},icon('wallet',72,true)),
    e('small',null,'TON CONNECT · READ-ONLY'),
    e('h2',null,L('wallet')),
    e('p',null,walletLanguage('Conecte sua carteira TON para exibir o endereço. Nenhuma transferência será solicitada.','Підключіть TON-гаманець, щоб переглянути адресу. Перекази не запитуються.','Connect a TON wallet to display its address. No transfers are requested.','Подключи TON-кошелёк, чтобы увидеть адрес. Переводы и оплаты не запрашиваются.')),
    e('div',{className:'gm-wallet-address'},e('small',null,walletLanguage('Endereço da carteira','Адреса гаманця','Wallet address','Адрес кошелька')),e('strong',null,display)),
    e('button',{type:'button',className:'gm-wallet-connect',onClick:tonAccount?disconnectTonWallet:connectTonWallet},
     icon(tonAccount?'close':'link',22),tonAccount?walletLanguage('Desconectar','Від’єднати','Disconnect','Отключить'):walletLanguage('Conectar carteira TON','Підключити TON-гаманець','Connect TON wallet','Подключить TON-кошелёк'))),
   tonError?e('div',{className:'gm-wallet-error',role:'status'},tonError):null,
   e('section',{className:'gm-wallet-facts gm-premium-card'},e('h3',null,L('holdings')),
    e('p',null,walletLanguage('O saldo de GM na blockchain ainda não é verificado. Até definir o contrato, nenhuma vantagem de mineração será concedida.','GM на блокчейні ще не перевіряються. До визначення контракту бонуси майнінгу не нараховуються.','On-chain GM holdings are not verified yet. No mining bonus is granted until the token contract is confirmed.','Количество GM в блокчейне пока не проверяется. Пока не подтверждён контракт токена, бонусы к майнингу не выдаются.')),
    e('div',{className:'gm-wallet-total'},icon('shield-check',24),walletLanguage('Saldo pendente de verificação','Баланс очікує перевірки','Holdings pending verification','Холдинг ожидает проверки'))),
   wallet.vault>0?e('button',{type:'button',className:'gm-wallet-legacy',onClick:()=>goto('vault')},
     icon('database',20),walletLanguage('Saldo legado no jogo: ','Старий ігровий баланс: ','Legacy in-game Vault: ','Старый игровой Vault: ')+nf(wallet.vault)+' GM',icon('chevron-right',18)):null,
   e('p',{className:'gm-mining-footnote'},walletLanguage('Nunca compartilhe sua frase-semente ou chave privada.','Ніколи не повідомляйте seed-фразу чи приватний ключ.','Never share your seed phrase or private key.','Никогда не передавай сид-фразу или приватный ключ.'))
  );
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
      e('small',null,nf(Number(cost),0)+' POINTS')),
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

 function History(){return <>{top(L('history'),true,'clock')}{!serverHistory.length&&<div className="empty-state">{icon('clock',62,true)}<h3>История операций пока пуста</h3><button onClick={loadHistory}>Загрузить с сервера</button></div>}{serverHistory.map((x:any)=><div key={x.id} className="pearl-card form-surface"><b>{x.kind}</b><small>{new Date(x.at*1000).toLocaleString('ru-RU')}</small><p>{x.info}</p></div>)}</>}
 function Achievements(){const items=liveAchievements;
 const planned=[['origin','trophy','Первопроходец','Один из первых 20 игроков — уникальная рамка'],['first_claim','lightning','Искра GM','Первый сбор майнинга'],['mining_25','gm-coin-orbit','Стальной майнер','25 улучшений майнинга'],['mining_50','diamond','Серебряная легенда','50 улучшений майнинга'],['collector','gift','Хранитель артефактов','Собери серию игровых наград'],['community','friends','Сила сообщества','Пригласи друзей'],['immortal','crown','GM Immortal','Достигни максимальной лиги']];
 return <>{top(L('achievements'),true,'info')}<div className="achievement-list">{items.map((t:any)=><div className="earn-item pearl-card" key={t.id}>{icon(t.icon||'trophy',45,true)}<span><b>{t.title||t.id}</b><small>{t.description||''}{!demo?` · ${t.xp||0} XP`:''}</small></span>{!demo&&<button disabled={t.claimed||!t.available} onClick={async()=>{const x=await gameAction('/api/achievements/claim',{id:t.id});if(x)await refreshLive()}}>{t.claimed?'Получено':t.available?'Получить':'Не выполнено'}</button>}</div>)}</div><div className="gm-achievement-planned"><h3>{L('achievements')} · {L('locked')}</h3>
  {(liveState?.cosmetics?.frames||[]).map((f:any)=><div className={'gm-achievement-locked '+(f.claimed?'claimed':'')} key={f.id}>{icon(f.category==='founder'?'crown':'diamond',35,true)}<span><b>{f.title}</b><small>{f.limited?'LIMITED · 1 / 20':'MINING MILESTONE'}</small></span>{icon(f.claimed?'check':'minus',17)}</div>)}<p>{L('achievementsLocked')}. {L('later')}.</p>{planned.map(([id,ic,title,desc])=><div className="gm-achievement-locked" key={id}>{icon(ic,35,true)}<span><b>{title}</b><small>{desc}</small></span>{icon('minus',16)}</div>)}</div></>}
 
function Settings(){
 const e=React.createElement;
 const themes=[['light','Premium Silver'],['dark','Premium Graphite']];
 const themeButtons=themes.map(([value,label])=>e('button',{type:'button',key:value,
  className:theme===value?'active':'',onClick:()=>setTheme(value)},
  e('i',{className:'gm-theme-swatch '+value}),e('b',null,label),theme===value?icon('check',18):null));
 return e(React.Fragment,null,
  top(lang('settings'),true,'settings'),
  e('div',{className:'gm-settings-summary gm-premium-card'},icon('settings',39,true),
   e('span',null,e('b',null,L('personalization')),e('small',null,'GM TOKEN · PREMIUM UI'))),
  e('section',{className:'gm-settings-block gm-premium-card'},
   e('h3',null,L('theme')),
   e('p',null,'Платиновый светлый вариант и графитовый тёмный вариант с тем же логотипом GM.'),
   e('div',{className:'gm-theme-list'},themeButtons)),
  e('section',{className:'gm-settings-block gm-premium-card'},
   e('label',{htmlFor:'gm-lang-select'},L('interfaceLanguage')),
   e('p',null,'Telegram · '+L('interfaceLanguage')),
   e('div',{className:'gm-language-grid',role:'group','aria-label':L('interfaceLanguage')},gmLanguages.map(([code,label])=>e('button',{type:'button',key:code,className:'gm-lang-choice '+(locale===code?'selected':''),onClick:()=>{setLocale(code);store.setItem('gm_lang',code)},'aria-pressed':locale===code},e('span',null,label),locale===code?icon('check',17):null)))),
  e('button',{type:'button',className:'gm-settings-onboard gm-premium-card',onClick:()=>goto('intro')},
   icon('info',26),e('span',null,L('replay')),icon('chevron-right',20)),
  e('button',{type:'button',className:'gm-settings-onboard gm-premium-card',onClick:()=>openGuide('settings')},icon('info',26),e('span',null,L('startTour')),icon('chevron-right',20)),
  e('p',{className:'gm-settings-note'},'GM TOKEN Premium · светлая и тёмная темы без цветного неона')
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
    e('div',null,e('strong',null,'Тестовые начисления'),e('small',null,'GM / CR / POINTS · только Owner / Co-Owner'))),
   e('p',{className:'test-grants-note'},testCurrency==='POINTS'?'POINTS — игровые очки, не токен. Выдача ограничена, требует 2FA и фиксируется в журнале.':'GM/CR берутся из существующих резервов. Все начисления проходят 2FA и фиксируются в журнале.'),
   e('label',null,'Кому начислить'),
   e('div',{className:'test-grants-options',role:'group','aria-label':'Получатель'},
    [['self','Себе'],['other-owner','Совладельцу'],['id','Игроку']].map(([id,title])=>
     e('button',{type:'button',className:testRecipient===id?'selected':'',key:id,onClick:()=>setTestRecipient(id),'aria-pressed':testRecipient===id},title))),
   testRecipient==='id'?e('input',{value:testUserId,placeholder:'Telegram ID зарегистрированного игрока',inputMode:'numeric',onChange:event=>setTestUserId(event.target.value),'aria-label':'Telegram ID игрока'}):null,
   e('label',null,'Игровая валюта'),
   e('div',{className:'test-grants-options',role:'group','aria-label':'Валюта'},
    ['GM','CR','POINTS'].map(currency=>e('button',{key:currency,type:'button',className:testCurrency===currency?'selected':'',onClick:()=>{setTestCurrency(currency);setTestAmount(currency==='POINTS'?'300':currency==='GM'?'1000':'10000')},'aria-pressed':testCurrency===currency},
      icon(currency==='GM'?'gm-coin-orbit':currency==='POINTS'?'trophy':'coins',23),currency))),
   e('label',null,'Сумма '+testCurrency),
   e('input',{value:testAmount,inputMode:'decimal',placeholder:'Например, 1000',onChange:event=>setTestAmount(event.target.value),'aria-label':'Сумма тестового начисления'}),
   e('div',{className:'test-grants-presets'},
    (testCurrency==='POINTS'?['100','300','1000']:testCurrency==='GM'?['1000','5000','10000']:['10000','50000','100000']).map(n=>
     e('button',{key:n,type:'button',onClick:()=>setTestAmount(n)},n))),
   e('small',{className:'test-grants-limit'},testCurrency==='POINTS'?'До 1 000 POINTS за операцию и 5 000 POINTS в UTC-день на игрока.':testCurrency==='GM'?'До 10 000 GM за операцию и 50 000 GM в UTC-день на игрока.':'До 100 000 CR за операцию и 500 000 CR в UTC-день на игрока.'),
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
 const groups:[string,string[][]][]=[
  [L('account'),[['profile','profile',L('profile'),L('balance')],['achievements','trophy',L('achievements'),L('earned')],['history','clock',L('history'),L('history')]]],
  [L('game'),[['reward','gift','Daily Reward',L('claim')],['tasks','tasks',L('tasks'),L('earned')],['referrals','friends',L('friends'),L('referrals')],['leaderboard','trophy',L('leaderboard'),L('holdings')],['wallet','wallet',L('wallet'),L('wallet')]]],
  [L('help'),[['support','shield-check',L('support'),L('help')],['settings','settings',L('customize'),L('interfaceLanguage')],['intro','info',L('instruction'),L('replay')]]]
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
  top(lang('more'),true,'more'),
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
 const displayedLanguages=gmLanguages.filter(([code,label])=>(label.toLowerCase().includes(languageSearch.toLowerCase())||code.includes(languageSearch.toLowerCase())));
 const chosenLanguage=gmLanguages.find(([code])=>code===locale)?.[1]||gmLanguages[0][1];
 const chooseLanguage=(code:string)=>{setLocale(code);store.setItem('gm_lang',code);setLanguageOpen(false);setLanguageSearch('')};
 const languagePicker=introStep===0?e('div',{className:'gm-intro-language gm-premium-card'},
  e('label',{className:'gm-intro-language-label'},L('interfaceLanguage')),
  e('button',{type:'button',className:'gm-intro-lang-trigger',onClick:()=>setLanguageOpen(!languageOpen),'aria-expanded':languageOpen},
   e('span',null,chosenLanguage),icon(languageOpen?'chevron-up':'chevron-down',18)),
  languageOpen?e('div',{className:'gm-intro-lang-panel',role:'group','aria-label':L('interfaceLanguage')},
   e('input',{type:'search',placeholder:'Search / Поиск / Pesquisar',value:languageSearch,onChange:(ev:any)=>setLanguageSearch(ev.target.value),'aria-label':'Search languages'}),
   e('div',{className:'gm-intro-lang-results'},displayedLanguages.map(([code,label])=>
     e('button',{key:code,type:'button',className:'gm-intro-lang-option '+(locale===code?'selected':''),onClick:()=>chooseLanguage(code)},
      e('span',null,label),locale===code?icon('check',18):null)))):null):null;
 const back=introStep>0?e('button',{type:'button',className:'gm-intro-prev',onClick:()=>setIntroStep(introStep-1)},L('back')):null;
 return e('div',{className:'gm-intro-v8'},
  e('header',{className:'gm-intro-header'},e(Brand,{theme,size:34}),e('b',null,'GM TOKEN'),
   e('button',{type:'button',onClick:complete},lang('skip'))),
  e('div',{className:'gm-intro-progress'},ticks),
  e('div',{className:'gm-intro-art'},e('div',{className:'gm-intro-art-ring'},icon(step[0],114,true))),
  e('div',{className:'gm-intro-copy'},
   e('small',null,L('tutorialStep')+' '+(introStep+1)+' / 4'),
   e('h1',null,introStep===0?L('welcome'):step[1]),
   e('p',null,step[2])),
  languagePicker,
  e('div',{className:'gm-intro-actions'},
   e('button',{type:'button',className:'gm-intro-next',
    onClick:()=>introStep===steps.length-1?complete():setIntroStep(introStep+1)},
    introStep===steps.length-1?lang('start'):lang('next'),icon('chevron-right',20)),
   back)
 );
}

function GuideOverlay(){
 if(!guideScreen||!guideCatalog[guideScreen])return null;
 const steps=guideCatalog[guideScreen];
 const step=steps[Math.min(guideStep,steps.length-1)];
 const copy=guideText[step[3]];
 const description=copy?.[actualLang]||copy?.en||L(step[3]);
 const next=()=>{setGuideSpot(null);if(guideStep+1>=steps.length)closeGuide();else setGuideStep(guideStep+1)};
 const dimensions=guideSpot;
 const viewportWidth=window.innerWidth,viewportHeight=window.visualViewport?.height||window.innerHeight;
 return <div className="gm-tour-backdrop" role="dialog" aria-modal="true" aria-label={L('instruction')}>
  {dimensions?<React.Fragment>
    <div className="gm-tour-shade" style={{left:0,top:0,width:'100%',height:dimensions.top}}/>
    <div className="gm-tour-shade" style={{left:0,top:dimensions.top,width:dimensions.left,height:dimensions.height}}/>
    <div className="gm-tour-shade" style={{left:dimensions.left+dimensions.width,top:dimensions.top,width:Math.max(0,viewportWidth-dimensions.left-dimensions.width),height:dimensions.height}}/>
    <div className="gm-tour-shade" style={{left:0,top:dimensions.top+dimensions.height,width:'100%',height:Math.max(0,viewportHeight-dimensions.top-dimensions.height)}}/>
    <div className="gm-tour-spotlight" style={{left:dimensions.left,top:dimensions.top,width:dimensions.width,height:dimensions.height}} onClick={next}>
      <span className="gm-tour-pointer">↓</span>
    </div>
   </React.Fragment>:<div className="gm-tour-shade gm-tour-shade-full"/>}
  <div className="gm-tour-card" style={dimensions?{top:dimensions.cardTop}:undefined}>
   <div className="gm-tour-head">
    <Brand theme={theme} size={37}/>
    <span className="gm-tour-step-counter">{L('tutorialStep')} {guideStep+1} / {steps.length}</span>
    <button type="button" onClick={closeGuide} aria-label={L('skip')}>{icon('close',19)}</button>
   </div>
   <div className="gm-tour-guide-name">{L('instruction')} · GM TOKEN</div>
   <h2>{L(step[1])}</h2>
   <p>{description}</p>
   <div className="gm-tour-hint">{icon('info',16)} {actualLang==='ru'?'Выделена нужная кнопка или область экрана.':actualLang==='uk'?'Підсвічено потрібну кнопку або ділянку.':actualLang==='pt'?'O botão ou a área relevante está destacado.':'The relevant button or area is highlighted.'}</div>
   <div className="gm-tour-track">{steps.map((_:any,i:number)=><i className={i<=guideStep?'active':''} key={i}/>)}</div>
   <div className="gm-tour-actions">
    <button type="button" onClick={closeGuide}>{L('skip')}</button>
    <button type="button" className="gm-tour-primary" onClick={next}>{guideStep+1>=steps.length?L('finish'):L('next')}{icon('chevron-right',18)}</button>
   </div>
  </div>
 </div>;
}
function Streak(){return <>{top('Daily Streak',true,'flame')}<div className="referral-hero pearl-card">{icon('flame',90,true)}<h1>{wallet.streak} дней</h1><p>Серия ежедневных посещений. Повторное получение награды в один день запрещено.</p></div><GButton theme={theme} onClick={()=>goto('reward')}>Ежедневная награда</GButton></>}
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
 switch(screen){case 'home':view=Home();break;case 'trade':view=Trading();break;case 'earn':view=Earn();break;case 'tasks':view=Tasks();break;case 'leaderboard':view=Leaderboard();break;case 'profile':view=Profile();break;case 'reward':view=Reward();break;case 'splash':view=Splash();break;case 'intro':view=Intro();break;case 'mining':view=Mining();break;case 'vault':view=Vault();break;case 'wallet':view=WalletConnection();break;case 'shop':view=Shop();break;case 'boxes':view=Boxes();break;case 'referrals':view=Referrals();break;case 'history':view=History();break;case 'settings':view=Settings();break;case 'support':view=Support();break;case 'admin':view=['owner','coowner'].includes(liveRole)?Admin():Home();break;case 'achievements':view=Achievements();break;case 'more':view=More();break;case 'streak':view=Streak();break;default:view=Home();}
 return <div className={'application theme-'+theme+(webapp?.initData?' is-telegram':'')}>
 <aside className="desktop-toolbar"><div className="toolbar-logo"><Brand theme={theme} size={42}/><span><b>GM TOKEN</b><small>Оригинальные эскизы · интерактивная сборка</small></span></div><div className="toolbar-tabs"><button onClick={()=>setTheme('light')} className={isLight?'chosen':''}>Light</button><button onClick={()=>setTheme('dark')} className={!isLight?'chosen':''}>Dark</button></div><div className="toolbar-links">{(['home','trade','earn','tasks','leaderboard','profile','mining','wallet','vault','shop','support','admin'] as Route[]).map(s=><button key={s} className={screen===s?'chosen':''} onClick={()=>goto(s)}>{s}</button>)}</div><p>Оригинальные PNG · 54 иконки × 4 варианта · без подмены сторонними пиктограммами</p></aside>
 <div className="device-stage"><div className="phone-frame"><div className={'phone-scroll '+((screen==='splash')?'no-scroll':'')}>{view}</div>{!['reward','splash','intro'].includes(screen)&&bottom()}<div className="home-indicator"/></div><div className="underphone"><span className="demo-pill">{'Серверная авторизация · виртуальные GM/CR'}</span><button onClick={()=>goto('splash')}>Заставка</button><button onClick={()=>goto('home')}>Home</button><button onClick={()=>setTheme(isLight?'dark':'light')}>Сменить тему</button></div><small className="status-note">{backendStatus}</small></div>
 {toast&&<div className="toast-message" role="status" onClick={()=>setToast('')}>{toast}<button onClick={()=>setToast('')}>×</button></div>}
 {modal==='boxReveal'?BoxRevealModal():modal&&TradeOrderModal()}
 {guideScreen&&GuideOverlay()}
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
