declare var React: any;
declare var ReactDOM: any;
declare namespace JSX { interface IntrinsicElements { [elementName: string]: any; } interface ElementChildrenAttribute { children: any; } }

// GM TOKEN UI · original layouts + original 216 PNG pack. No third-party icon replacements.
const store = {getItem:(key:string)=>{try{return window.localStorage.getItem(key)}catch{return null}},setItem:(key:string,value:string)=>{try{window.localStorage.setItem(key,value)}catch{}}};
const A = './assets/icons/';
const BRAND = './assets/brand-original-reference/';
type Theme = 'light' | 'dark';
type Route = 'home'|'trade'|'earn'|'tasks'|'leaderboard'|'profile'|'reward'|'splash'|'mining'|'vault'|'shop'|'referrals'|'history'|'settings'|'support'|'admin'|'achievements'|'more'|'streak'|'boxes';
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
function Candles({theme,candles=[],selected=null,onSelect=()=>{}}:{theme:Theme,candles?:any[],selected?:number|null,onSelect?:(time:number)=>void}){
 if(!candles.length)return <div className="candles-empty"><Icon theme={theme} name="candlesticks" size={42}/><b>Сделок ещё не было</b><small>Свечи и объём появятся только после реальных исполненных ордеров GM/CR. Никаких нарисованных цен.</small></div>;
 const recent=candles.slice(-32);const all=recent.flatMap((c:any)=>[c.low,c.high]);const min=Math.min(...all),max=Math.max(...all),span=Math.max(1,max-min);
 const vol=Math.max(1,...recent.map((x:any)=>x.volume_gm_cents));const xWidth=320/recent.length;
 const current=recent.find((c:any)=>c.time===selected)||recent[recent.length-1];
 const stamp=(sec:number)=>new Date(sec*1000).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
 const y=(price:number)=>16+(max-price)/span*165;
 return <><div className="candle-inspector" role="status">
  <b>{stamp(current.time)}</b><span>O {nf(current.open/100)}</span><span>H {nf(current.high/100)}</span><span>L {nf(current.low/100)}</span><span>C {nf(current.close/100)}</span><small>Объём: {nf(current.volume_gm_cents/100)} GM · {current.trades} сделок</small>
 </div><svg className="candles" role="img" aria-label="Выбираемые свечи OHLCV, полученные из исполненных виртуальных ордеров" viewBox="0 0 360 265" preserveAspectRatio="none">
  {[0,1,2,3,4].map(i=><g key={i}><line x1="5" x2="325" y1={16+i*42} y2={16+i*42} className="chart-grid"/><text x="330" y={18+i*42} className="price-label">{nf((max-span*i/4)/100,2)}</text></g>)}
  {recent.map((c:any,i:number)=>{const x=5+i*xWidth+2,w=Math.max(2,xWidth-3),positive=c.close>=c.open,col=positive?'#54B39C':'#CF7F91';return <g key={c.time} onClick={()=>onSelect(c.time)} style={{cursor:'pointer',opacity:selected!==null&&selected!==c.time?0.72:1}}><title>{stamp(c.time)+' · O '+nf(c.open/100)+' H '+nf(c.high/100)+' L '+nf(c.low/100)+' C '+nf(c.close/100)+' · '+nf(c.volume_gm_cents/100)+' GM'}</title>
   <line x1={x+w/2} x2={x+w/2} y1={y(c.high)} y2={y(c.low)} stroke={col} strokeWidth="1.5"/>
   <rect x={x} y={Math.min(y(c.open),y(c.close))} width={w} height={Math.max(2,Math.abs(y(c.open)-y(c.close)))} fill={col}/>
   <rect x={x} y={258-(c.volume_gm_cents/vol)*54} width={w} height={(c.volume_gm_cents/vol)*54} fill={col} opacity=".66"/>
  </g>})}
  {[0,Math.floor((recent.length-1)/2),recent.length-1].filter((x,i,a)=>a.indexOf(x)===i).map(i=><text key={'time-'+i} x={5+i*xWidth} y="197" className="time-label">{new Date(recent[i].time*1000).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</text>)}
 </svg></>;
}
function BarButton({name,title,theme,selected=false,onClick}:{key?:string,name:string,title:string,theme:Theme,selected?:boolean,onClick:()=>void}){return <button className={'nav-entry '+(selected?'active':'')} onClick={onClick} aria-label={title} aria-current={selected?'page':undefined}><Icon theme={theme} name={name} size={23}/><span>{title}</span></button>}
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
 const [wallet,setWallet]=React.useState(firstWallet);
 const [toast,setToast]=React.useState('');
 const [period,setPeriod]=React.useState('1h');
 const [selectedCandle,setSelectedCandle]=React.useState(null as number|null);
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
 const [modalText,setModalText]=React.useState('');
 const toastRef=React.useRef(0);
 const flash=(msg:string)=>{setToast(msg);toastRef.current++;};
 const setW=(patch:any)=>setWallet((w:Wallet)=>({...w,...(typeof patch==='function'?patch(w):patch)}));
 const goto=(s:any)=>{setScreen(s);try{history.pushState(null,'','#'+s)}catch{};document.querySelector('.phone-scroll')?.scrollTo(0,0)};
 React.useEffect(()=>{try{store.setItem('gm_theme',theme)}catch{};webapp?.setBackgroundColor?.(theme==='dark'?'#030406':'#E8EAF4')},[theme]);
 React.useEffect(()=>{try{window.localStorage.removeItem('gm_demo_wallet')}catch{}},[]);
 React.useEffect(()=>{const timer=setInterval(()=>setClock(Math.floor(Date.now()/1000)),1000);return ()=>clearInterval(timer)},[]);
 React.useEffect(()=>{webapp?.ready?.();webapp?.expand?.();const init=webapp?.initData;if(!init){setBackendStatus('Открой Mini App через @gm_token_test_bot: вход в браузере без Telegram отключён');return;}fetch('/api/bootstrap',{headers:{'Authorization':`tma ${init}`}}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok){const reason=String(d?.error||'');
    if(/signature mismatch/i.test(reason))throw Error('Подпись Telegram не совпадает с токеном бота на сервере. Проверь BOT_TOKEN для @gm_token_test_bot в Render.');
    if(/expired|invalid initData/i.test(reason))throw Error('Данные Telegram устарели. Закрой Mini App и открой её кнопкой бота.');
    throw Error('Сервер отклонил вход (HTTP '+r.status+'). '+(reason||'Повтори вход через Telegram.'));}setDemo(false);setLiveRole(d.user?.role||'player');setBackendStatus(`Telegram аккаунт: ${d.user?.id||'подтверждён'}`);if(d.wallet) setW((w:Wallet)=>({...w,gm:d.wallet.gm/100,cr:d.wallet.cr/100,vault:d.wallet.vault/100,level:d.user.level,xp:d.user.xp}));}).catch((e:any)=>{setDemo(true);setBackendStatus('Ошибка авторизации Telegram. Попробуй открыть бот заново. '+String(e.message||''))})},[]);
 const api=async(path:string,payload?:any)=>{
   const init=webapp?.initData;if(!init){flash('Открой приложение внутри Telegram через @gm_token_test_bot');return null;}
   try{const r=await fetch(path,{method:payload?'POST':'GET',headers:{Authorization:'tma '+init,'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined});const d=await r.json();if(!r.ok)throw Error(d.error||'Ошибка сервера');return d}
   catch(e:any){flash('Ошибка: '+(e.message||e));return null}
 };
 const refreshLive=async()=>{if(!webapp?.initData)return;const d=await api('/api/game/status');if(!d)return;setLiveState(d);setW((w:Wallet)=>({...w,gm:d.wallet.gm/100,cr:d.wallet.cr/100,vault:d.wallet.vault/100,storage:d.mining.pending_cents/100,level:d.user?.level||w.level,xp:d.user?.xp??w.xp}));const [orders,book,tasks,achievements,refs,ranks,ticker,chart,trades]=await Promise.all([api('/api/exchange/orders'),api('/api/exchange/book'),api('/api/tasks'),api('/api/achievements'),api('/api/referrals/me'),api('/api/leaderboard'),api('/api/market/ticker'),api('/api/market/ohlcv?interval='+period),api('/api/exchange/trades')]);if(orders)setLiveOrders(orders.orders||[]);if(book)setLiveBook(book);if(tasks)setLiveTasks(tasks.tasks||[]);if(achievements)setLiveAchievements(achievements.achievements||[]);if(refs)setLiveReferrals(refs);if(ranks)setLiveRanks(ranks);if(ticker)setLiveTicker(ticker);if(chart)setLiveCandles(chart.candles||[]);if(trades)setRecentTrades((trades.trades||[]).filter((t:any)=>!t.suspect).slice(0,10));setW((w:Wallet)=>({...w,streak:d.daily?.streak||0,lastClaim:d.daily?.last_claim_day||''}))};
 const gameAction=async(path:string,payload:any={})=>{const result=await api(path,{operationId:cryptoId(),...payload});if(result){if(result.wallet)setW((w:Wallet)=>({...w,gm:result.wallet.gm/100,cr:result.wallet.cr/100,vault:result.wallet.vault/100}));await refreshLive();flash('Операция подтверждена сервером')}return result};
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
 const miningClaim=async()=>{await gameAction('/api/mining/claim')};
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
 const top=(title:string,back=true,right='more')=><header className={'screen-header '+(!isLight?'dark-head':'')}><button className="header-icon" aria-label="Назад" onClick={()=>back?goto('home'):flash('Меню')} >{back?icon('chevron-left',24):<Brand theme={theme} size={35}/>}</button><strong>{title}</strong><button className="header-icon" onClick={()=>right==='settings'?goto('settings'):goto('more')} aria-label="Дополнительные действия">{icon(right,23)}</button></header>;
 const menuItems=[['home','home','Home'],['trade','candlesticks','Trade'],['earn',isLight?'gift':'settings',isLight?'Tasks':'Earn'],['profile','profile','Profile']];
 const bottom=()=> <nav className="bottom-nav" aria-label="Основные разделы">{menuItems.map(([s,i,t]:any)=><BarButton key={s} name={i} theme={theme} title={t} selected={screen===s||(isLight&&s==='earn'&&screen==='tasks')||(!isLight&&s==='earn'&&screen==='tasks')} onClick={()=>goto(s==='earn'&&isLight?'tasks':s)}/>)}</nav>;
 
 function Home(){
  const e=React.createElement;
  const isPremarket=!!liveTicker?.premarket;
  const dailyEnabled=!!liveState?.config?.daily_enabled;
  const pointBalance=liveState?.points?.points??0;
  const rate=liveState?.mining?.rate_cents_day!=null?liveState.mining.rate_cents_day/100:gmRate(wallet);
  const shortcuts=e('div',{className:'quick-grid home-quick-grid','aria-label':'Быстрые действия'},
   [['candlesticks','Trade','trade'],['gift','Earn','earn'],['friends','Invite','referrals'],['more','More','more']].map(([i,t,s])=>
    e('button',{type:'button',className:'quick-card '+(isLight?'pearl-card':'metallic-card'),key:t,onClick:()=>goto(s)},
      icon(i,28),e('span',null,t))));
  const mining=e('button',{type:'button',className:'home-mining-card '+(isLight?'pearl-card':'metallic-card'),onClick:()=>goto('mining')},
    e('span',{className:'home-mining-icon'},icon('lightning',36,true)),
    e('span',{className:'home-mining-text'},e('strong',null,'Mining · добыча GM'),e('small',null,'Уровень '+wallet.level+' · '+nf(rate,2)+' GM/сутки'),e('small',{className:'home-mining-sub'},'Накоплено: '+nf(wallet.storage,2)+' GM · открой и забери')),
    icon('chevron-right',21));
  const pointGuide=e('section',{className:'home-guide '+(isLight?'pearl-card':'metallic-card'),'aria-label':'Как заработать GM и POINTS'},
    e('div',{className:'home-guide-title'},icon('diamond',30),
      e('div',null,e('strong',null,'Как получать GM и POINTS'),e('small',null,'Игровые награды без придуманных начислений'))),
    e('div',{className:'home-guide-steps'},
      e('div',null,e('b',null,'01'),e('span',null,'Добывай GM через Mining и нажимай Claim.')),
      e('div',null,e('b',null,'02'),e('span',null,'Торгуй GM/CR: POINTS начисляются только после исполнения ордера.')),
      e('div',null,e('b',null,'03'),e('span',null,'Обменивай POINTS на коробки GM Boxes после утверждения наград.'))),
    e('p',{className:'home-guide-rule'},'10 POINTS за каждые 10 000 GM исполненного объёма · максимум 1 000 POINTS/сутки. Подозрительные сделки не засчитываются.'),
    isPremarket?e('p',{className:'home-guide-market-note'},'Сейчас Premarket: сделки ещё не исполняются, POINTS не начисляются.'):null,
    e('div',{className:'home-guide-footer'},
       e('span',null,'Твои POINTS: ',e('b',null,String(pointBalance))),
       e('button',{type:'button',onClick:()=>goto('boxes')},'GM Boxes ',icon('chevron-right',16))));
  const lightHome=e(React.Fragment,null,
    e('header',{className:'home-header'},e('span',{className:'hbrand'},e(Brand,{theme,size:38}),e('b',null,'GM TOKEN')),
       e('button',{type:'button',className:'header-icon',onClick:()=>goto('settings'),'aria-label':'Настройки'},icon('settings',24))),
    e('div',{className:'balance-glass pearl-card'},
       e('div',{className:'balance-top'},e('div',null,e('small',null,'Your Balance'),
         e('div',{className:'balance-numeral'},nf(wallet.gm,0),e('span',null,' GM')),
         e('span',{className:'neutral-change'},'Подтверждённый баланс GM')),
         e('div',{className:'balance-graph-icon'},icon('bar-chart',41))),
       e('button',{className:'home-graph-link',type:'button',onClick:()=>goto('trade')},'Открыть график GM/CR ',icon('chevron-right',16))),
    mining,
    e('button',{type:'button',className:'collect-claim',onClick:()=>goto('reward')},
       e('div',{className:'claim-electric'},icon('gift',31)),
       e('span',null,e('strong',null,'Daily Reward'),e('small',null,dailyEnabled?'Ежедневная награда GM':'Награды пока не включены')),
       icon('chevron-right',23)),
    e('button',{type:'button',className:'streak-card pearl-card',onClick:()=>goto('streak')},icon('flame',46),
       e('span',null,e('b',null,'Daily Streak'),e('span',{className:'streak-count'},wallet.streak,' дней')),icon('chevron-right',22)),
    shortcuts,pointGuide);
  const darkHome=e(React.Fragment,null,
    e('header',{className:'dark-top'},e('b',null,'GM TOKEN'),e('button',{type:'button',onClick:()=>goto('settings')},icon('settings',23))),
    e('div',{className:'orbit-hero'},e(Brand,{theme:'dark',size:93}),e('span',{className:'planet-ring'})),
    e('div',{className:'dark-balance'},e('div',null,nf(wallet.gm,0),e('span',{className:'currency-mark'},' GM')),
      e('p',{className:'neutral-change'},'Подтверждённый баланс GM')),
    e('div',{className:'dark-spark'},
       e(SparkLine,{theme:'dark'}),
       e('button',{type:'button',onClick:()=>goto('trade')},'График GM/CR ',icon('chevron-right',15))),
    mining,
    e('button',{type:'button',className:'dark-reward metallic-card',onClick:()=>goto('reward')},
       icon('gift',30),e('span',null,e('b',null,'Daily Reward'),
       e('small',null,dailyEnabled?'Ежедневная награда GM':'Награды пока не включены')),icon('chevron-right',19)),
    e('button',{type:'button',className:'dark-streak metallic-card',onClick:()=>goto('streak')},
       icon('flame',44),e('span',null,e('b',null,'Daily Streak'),e('strong',null,wallet.streak,' дней')),icon('chevron-right',20)),
    shortcuts,pointGuide);
  return isLight?lightHome:darkHome;
 }
 
 function Trading(){
  const e=React.createElement;
  const pre=liveTicker?.premarket??!liveBook?.auction_done;
  const remain=Math.max(0,(liveTicker?.auction_end_at||liveBook?.auction_end_at||0)-clock);
  const countdown=[Math.floor(remain/3600),Math.floor(remain%3600/60),remain%60].map(x=>String(x).padStart(2,'0')).join(':');
  const price=liveTicker?.last_price;
  const book=liveBook||{bids:[],asks:[]};
  const bids=book.bids||[],asks=book.asks||[];
  const orders=liveOrders.filter(o=>o.status==='open');
  const isOwner=['owner','coowner'].includes(liveRole);
  const openTrade=kind=>{setSide(kind);setOrderType('limit');setModal('tradeForm')};
  return e(React.Fragment,null,
   top('GM / CR · Trade',true,'candlesticks'),
   e('section',{className:'trade-hub '+(isLight?'pearl-card':'metallic-card')},
    e('div',{className:'trade-heading'},
     e('div',{className:'trade-pair-icon'},icon('gm-coin-orbit',36)),
     e('div',{className:'trade-pair-name'},e('strong',null,'GM / CR'),e('small',null,'Виртуальная игровая биржа')),
     e('span',{className:'trade-status'},e('i',{className:'trade-status-dot'}),pre?'PREMARKET':liveTicker?.trade_test_mode?'TEST SPOT':'SPOT')),
    e('div',{className:'trade-spot-info'},e('span',null,pre?'До открытия '+countdown:'Торговля доступна'),e('button',{type:'button',className:'trade-refresh',onClick:refreshLive},icon('refresh',16),' Обновить')),
    e('div',{className:'trade-price-hero'},
     e('span',null,pre?'Индикативная цена':'Последняя цена сделки'),
     e('div',null,pre?(liveTicker?.indicative?.price?nf(liveTicker.indicative.price/100):'—'):(price?nf(price/100):'—'),e('small',null,'CR / GM')),
     e('p',null,price&&!pre?'Цена по последней исполненной сделке':'Цена появится после первой исполненной сделки между разными игроками')),
    e('div',{className:'trade-metric-row'},
     e('span',null,'Объём 24 ч',e('b',null,nf((liveTicker?.volume_24h_gm_cents||0)/100)+' GM')),
     e('span',null,'Сделок 24 ч',e('b',null,String(liveTicker?.trades_24h||0))),
     e('span',null,'Стакан',e('b',null,(bids.length+asks.length)+' уровней')))),
   e('section',{className:'trade-wallet '+(isLight?'pearl-card':'metallic-card')},
    e('div',{className:'trade-wallet-title'},icon('wallet',22),e('b',null,'Доступно для торговли')),
    e('div',{className:'trade-wallet-balances'},
     e('span',null,e('small',null,'GM'),e('strong',null,nf(wallet.gm))),
     e('span',null,e('small',null,'CR'),e('strong',null,nf(wallet.cr)))),
    (isOwner||wallet.gm<10||wallet.cr<10)?e('div',{className:'trade-wallet-tip'},
     e('span',null,wallet.gm<10||wallet.cr<10?'Для продажи нужны GM, для покупки — CR. Открытые заявки резервируют средства.':'Хочешь проверить больше ордеров? Пополни виртуальный баланс через Admin.'),
     e('button',{type:'button',onClick:()=>goto(isOwner?'admin':'mining')},isOwner?'Тестовые начисления':'Добывать GM',icon('chevron-right',16))):null),
   e('div',{className:'trade-cta-row'},
    e('button',{type:'button',className:'trade-cta buy',onClick:()=>openTrade('buy')},icon('deposit',23),e('span',null,e('b',null,'Купить GM'),e('small',null,'Оплата в CR'))),
    e('button',{type:'button',className:'trade-cta sell',onClick:()=>openTrade('sell')},icon('withdraw',23),e('span',null,e('b',null,'Продать GM'),e('small',null,'Получить CR')))),
   e('section',{className:'trade-chart-section '+(isLight?'pearl-card':'metallic-card')},
    e('div',{className:'trade-section-head'},e('div',null,icon('candlesticks',22),e('b',null,'График сделок')),e('span',null,'OHLCV · без выдуманных цен')),
    e('div',{className:'intervals trade-intervals'},['1m','5m','15m','1h','4h','1d'].map(i=>e('button',{type:'button',key:i,className:period===i?'on':'',onClick:()=>setPeriod(i)},i))),
    e(Candles,{theme,candles:liveCandles,selected:selectedCandle,onSelect:setSelectedCandle})),
   e('section',{className:'trade-orderbook '+(isLight?'pearl-card':'metallic-card')},
    e('div',{className:'trade-section-head'},e('div',null,icon('database',22),e('b',null,'Стакан заявок')),e('span',null,'CR за 1 GM')),
    e('div',{className:'trade-book-grid'},
     e('div',null,e('strong',{className:'trade-buy-heading'},'Покупки'),
      bids.length?bids.slice(0,8).map((o,i)=>e('div',{className:'trade-book-level',key:'b'+o.limit_price},
       e('b',null,nf(o.limit_price/100)),e('span',null,nf(o.gm_cents/100)+' GM'))):e('small',{className:'trade-book-empty'},'Нет ордеров')),
     e('div',null,e('strong',{className:'trade-sell-heading'},'Продажи'),
      asks.length?asks.slice(0,8).map((o,i)=>e('div',{className:'trade-book-level',key:'a'+o.limit_price},
       e('b',null,nf(o.limit_price/100)),e('span',null,nf(o.gm_cents/100)+' GM'))):e('small',{className:'trade-book-empty'},'Нет ордеров'))),
    e('p',{className:'trade-book-footer'},'Лучший bid: '+(liveTicker?.best_bid?nf(liveTicker.best_bid/100):'—')+' CR · ask: '+(liveTicker?.best_ask?nf(liveTicker.best_ask/100):'—')+' CR')),
   e('section',{className:'trade-open-orders '+(isLight?'pearl-card':'metallic-card')},
    e('div',{className:'trade-section-head'},e('div',null,icon('clock',22),e('b',null,'Мои заявки')),e('span',null,orders.length+' активных')),
    orders.length?orders.slice(0,20).map(o=>e('div',{className:'trade-open-row',key:o.id},
     e('div',null,e('b',null,o.side==='buy'?'Покупка':'Продажа'),e('small',null,nf(o.remaining_cents/100)+' GM · '+nf(o.limit_price/100)+' CR/GM')),
     e('button',{type:'button',onClick:()=>cancelLiveOrder(o.id)},'Отменить'))):
     e('p',{className:'trade-book-empty'},'Пока нет активных заявок. Создай ордер через кнопки выше.')),
   !pre?e('section',{className:'trade-recent '+(isLight?'pearl-card':'metallic-card')},
    e('div',{className:'trade-section-head'},e('div',null,icon('trending-up',22),e('b',null,'Последние сделки')),e('span',null,'Подтверждены сервером')),
    recentTrades.length?recentTrades.map((t,i)=>e('div',{className:'trade-fill-row',key:i},
     e('b',null,nf(t.price/100)+' CR'),e('span',null,nf(t.amount_cents/100)+' GM'))):
     e('p',{className:'trade-book-empty'},'Сделок ещё не было. Для исполнения нужны встречные заявки от разных игроков.')):null,
   e('p',{className:'trade-disclaimer'},'Виртуальные GM/CR — не реальные деньги. Ордера проверяются сервером; график и объём строятся только по исполненным сделкам.')
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
 function Tasks(){return <>{isLight?top('Tasks',true,'tasks'):<header className="dark-top"><b>GM TOKEN</b><button onClick={()=>goto('settings')}>{icon('more',23)} {icon('close',17)}</button></header>}{!isLight&&<button className="task-promo metallic-card" onClick={()=>flash('Бонусы доступны только после проверки условий')}>{icon('tasks',55)}<b>Complete tasks<br/>and earn GM</b></button>}<div className="task-tabs">{['All','Social','Crypto','Other'].map(x=><button className={taskFilter===x?'on':''} key={x} onClick={()=>setTaskFilter(x)}>{x}</button>)}</div>{isLight&&<button className="task-promo pearl-card" onClick={()=>flash('Задания появятся после подтверждения условий на сервере')}>{icon('gift',54)}<b>Complete tasks<br/>and earn GM</b>{icon('chevron-right',20)}</button>}<div className="tasks-list">{(liveTasks.map((t:any)=>({key:t.id,icon:t.icon||'tasks',title:t.title||t.id,reward:`${t.gm||0} GM · ${t.xp||0} XP`,category:t.category||'Other',desc:t.description||'',available:t.available,claimed:t.claimed}))).filter((t:any)=>taskFilter==='All'||taskFilter===t.category).map(t=><div className={'task-row '+(isLight?'pearl-card':'metallic-card')} key={t.key}>{icon(t.icon,40,true)}<span><b>{t.title}</b><small className="green">{t.reward}</small></span><button disabled={!demo&&(t.claimed||!t.available)} onClick={async()=>{if(demo){if(t.key==='vault')goto('vault');else flash(t.desc);return;}const x=await gameAction('/api/tasks/claim',{id:t.key});if(x)await refreshLive()}}>{demo?'Start':t.claimed?'Получено':t.available?'Получить':'Не выполнено'}</button></div>)}</div>{isLight&&<button className="premium-box pearl-card" onClick={()=>flash('Premium Tasks: функция не утверждена для запуска')}>{icon('diamond',40)}<span><b>Premium Tasks</b><small>Пока не утверждено</small></span>{icon('chevron-right',21)}</button>}</>}
 function Leaderboard(){const users=(liveRanks?.users||[]).filter((u:any)=>rankFilter==='Global'||(liveReferrals?.referred||[]).some((r:any)=>r.user_id===u.id));return <>{top('Leaderboard',true,'trophy')}<div className="rank-tabs"><button onClick={()=>setRankFilter('Global')} className={rankFilter==='Global'?'on':''}>Global</button><button onClick={()=>setRankFilter('Friends')} className={rankFilter==='Friends'?'on':''}>Friends</button></div><div className="leader-rows">{users.map((u:any,i:number)=><div className="leader-row" key={u.id}><b>{i+1}</b>{icon('profile',27)}<span>{clean(u.username||'Игрок')}</span><small>{nf(u.score_cents/100)} GM</small></div>)}</div>{users.length===0&&<p className="disclaimer">{liveRanks?.pending_rule?'Рейтинг ещё не включён: формула не утверждена. Фальшивых участников нет.':'Пока нет игроков в выбранном списке.'}</p>}</>}
 function Profile(){return <>{isLight?<header className="profile-top"><span></span><button className="header-icon" onClick={()=>goto('settings')}>{icon('settings',25)}</button></header>:<header className="dark-top"><b>GM TOKEN</b><button onClick={()=>goto('settings')}>{icon('more',20)} {icon('close',17)}</button></header>}<div className="profile-hero"><Brand theme={theme} size={isLight?103:98}/><h2>{webapp?.initDataUnsafe?.user?.username||webapp?.initDataUnsafe?.user?.first_name||'Игрок'}</h2><p>#{String(webapp?.initDataUnsafe?.user?.id||'')} <button className="inline-icon" onClick={()=>{navigator.clipboard?.writeText(String(webapp?.initDataUnsafe?.user?.id||''));flash('ID скопирован')}}>{icon('copy',15)}</button></p></div><div className="xp-area"><div className="xp-line"><b>Lv. {wallet.level}</b><small>{nf(wallet.xp,0)} / {nf(xpThreshold[Math.min(wallet.level,9)]||4400,0)} XP</small></div><div className="progress"><div style={{width:(Math.min(100,100*wallet.xp/(xpThreshold[Math.min(wallet.level,9)]||4400)))+'%'}}/></div></div><div className="stats-grid">{[['friends',String(liveReferrals?.referred?.length||0),'Friends'],['wallet',nf(wallet.gm,0),'Balance'],['lightning',String(wallet.streak),'Streak']].map(([i,n,label])=><div className="stat-card" key={label}>{icon(i,23)}<b>{n}</b><small>{label}</small></div>)}</div><div className="profile-menu">{[['trophy','Achievements','achievements'],['friends','Referral Program','referrals'],['clock','Transaction History','history'],['settings','Settings','settings'],['info','Support','support']].map(([i,t,s])=><button key={t} onClick={()=>goto(s as Route)}>{icon(i,21)}<span>{t}</span>{icon('chevron-right',18)}</button>)}</div>{isLight&&<button className="logout" onClick={()=>flash('Закрой Mini App в Telegram для выхода')}>{icon('logout',20)} Log Out</button>}</>}
 
 function Reward(){
  const e=React.createElement;
  const enabled=!!liveState?.config?.daily_enabled;
  const claimed=wallet.lastClaim===todayUTC();
  const streak=Math.max(0,wallet.streak||0);
  return e('div',{className:'reward-view reward-v2'},
    e('button',{type:'button',className:'reward-close',onClick:()=>goto('home'),'aria-label':'Закрыть Daily Reward'},icon('close',23)),
    e('div',{className:'reward-kicker'},icon('gift',20),e('span',null,'GM TOKEN · DAILY')),
    e('div',{className:'reward-hero-v2'},
      e('div',{className:'reward-coin-v2'},e(Brand,{theme,size:116})),
      e('h1',null,'Daily Reward'),
      e('p',null,claimed?'Награда за сегодня уже получена.':enabled?'Возвращайся каждый день за подтверждённой игровой наградой.':'Награды пока отключены: размер ежедневной выдачи GM ещё не утверждён.')),
    e('section',{className:'reward-streak-panel '+(isLight?'pearl-card':'metallic-card')},
       e('div',{className:'reward-streak-head'},e('div',null,e('small',null,'DAILY STREAK'),e('strong',null,streak,' дней')),icon('flame',29)),
       e('div',{className:'reward-week','aria-label':'Семидневная серия посещений'},
          [1,2,3,4,5,6,7].map(n=>e('div',{key:n,className:'reward-day '+(n<=Math.min(streak,7)?'complete':'')},
             e('span',null,'Д',n),n<=Math.min(streak,7)?icon('check',17):e('b',null,n)))),
       e('p',null,'Серия отображает подтверждённую активность. Суммы наград не показываем, пока их правила не утверждены.')),
    e('div',{className:'reward-actions'},
      e('button',{type:'button',className:'reward-main-action',disabled:!enabled||claimed,onClick:todayClaim},
        icon(claimed?'check':'gift',23),claimed?'Получено сегодня':enabled?'Забрать награду':'Награда пока недоступна'),
      e('button',{type:'button',className:'reward-secondary-action',onClick:()=>goto('mining')},
        icon('lightning',21),'Перейти к Mining',icon('chevron-right',18))),
    e('p',{className:'reward-explainer'},'GM можно добывать через Mining уже сейчас. Daily Reward заработает после согласования размера награды и правил серии.'));
 }
 function Splash(){return <div className="splash-view"><div className="splash-glow"></div><div className="splash-logo"><img src={BRAND+'gm-lettermark-metallic-transparent.png'} alt="GM TOKEN"/></div><h1>GM TOKEN</h1><p>Earn · Hold · Grow</p><button className="splash-start" onClick={()=>goto('home')}>Открыть приложение</button></div>}
 function Mining(){const rate=!demo&&liveState?liveState.mining.rate_cents_day/100:gmRate(wallet);return <>{top('Mining',true,'info')}<div className="inferred-label">Игровой раздел · композиция дополнена к эскизам</div><div className="mining-hero pearl-card"><div className="mining-orb">{icon('lightning',100,true)}</div><small>Добыча GM</small><h1>{nf(rate)} <span>GM / сутки</span></h1><p>Lv.{wallet.level} · Power +{powerBonus(wallet.level)}% · Boost +{holdingBonus(wallet.vault)}%</p></div><div className="mining-store pearl-card"><div className="flex-between"><b>Storage</b><span>{nf(wallet.storage)} GM</span></div><div className="progress"><div style={{width:(Math.min(100,wallet.storage/(rate*storageHours(wallet.level)/24)*100))+'%'}}/></div><small>Вместимость: {storageHours(wallet.level)} часов добычи. В рабочем режиме начисления резервируются на сервере.</small></div><GButton theme={theme} onClick={miningClaim} icon="lightning">Claim GM</GButton><div className="feature-grid">{[['lightning','Power','+'+powerBonus(wallet.level)+'%'],['clock','Storage',storageHours(wallet.level)+' ч'],['trending-up','Efficiency',wallet.level>=9?'50%':wallet.level>=7?'40%':wallet.level>=5?'30%':wallet.level>=3?'20%':'0%']].map(([i,t,v])=><div className="feature-card pearl-card" key={t}>{icon(i,28)}<small>{t}</small><b>{v}</b></div>)}</div><p className="disclaimer">Mining Pool ограничен 45 млн GM и утверждённым бюджетом. Подтверждённые начисления рассчитываются сервером.</p></>}
 
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
 function Boxes(){return <>{top('GM Boxes',true,'gift')}<div className="shop-banner pearl-card">{icon('gift',65,true)}<div><h2>Коробки за POINTS</h2><p>POINTS выдаются только за исполненные сделки GM/CR</p></div></div><div className="vault-stats"><div className="pearl-card"><small>Доступно POINTS</small><b>{liveState?.points?.points||0}</b></div><div className="pearl-card"><small>Сегодня заработано</small><b>{liveState?.points?.daily_points||0}/1000</b></div></div>{[['bronze','Bronze',300],['silver','Silver',750],['gold','Gold',1500]].map(([k,n,c]:any)=><div className="form-surface pearl-card" key={k}><div className="split-line"><b>{n}</b><span>{c} POINTS</span></div><GButton theme={theme} disabled={demo||!liveState?.config?.boxes_enabled} onClick={()=>gameAction('/api/boxes/open',{kind:k})}>Открыть</GButton></div>)}<p className="disclaimer">Размер наград пока не утверждён двумя владельцами. Сервер не выдаёт неподтверждённые GM.</p></>}
 function Referrals(){return <>{top('Referral Program',true,'friends')}<div className="referral-hero pearl-card">{icon('friends',80,true)}<h2>Приглашай друзей</h2><p>25% от фактически полученных приглашёнными Holding Rewards</p></div><div className="invite-link pearl-card"><small>Персональная ссылка</small><div><code>{'t.me/gm_token_test_bot?startapp=ref_'+String(webapp?.initDataUnsafe?.user?.id||'')}</code><button onClick={()=>{navigator.clipboard?.writeText('https://t.me/gm_token_test_bot?startapp=ref_'+String(webapp?.initDataUnsafe?.user?.id||''));flash('Реферальная ссылка скопирована')}}>{icon('copy',21)}</button></div></div><div className="stats-grid"><div className="stat-card"><b>{liveReferrals?.referred?.length||0}</b><small>Друзей {''}</small></div><div className="stat-card"><b>{nf((liveReferrals?.received_gm_cents||0)/100)}</b><small>Получено GM {''}</small></div></div><p className="disclaimer">В рабочем режиме ссылка включает ваш подтверждённый Telegram ID. Вознаграждение — только за фактически полученный Holding Claim приглашённого.</p></>}
 function History(){return <>{top('Transaction History',true,'clock')}{!serverHistory.length&&<div className="empty-state">{icon('clock',62,true)}<h3>История операций пока пуста</h3><button onClick={loadHistory}>Загрузить с сервера</button></div>}{serverHistory.map((x:any)=><div key={x.id} className="pearl-card form-surface"><b>{x.kind}</b><small>{new Date(x.at*1000).toLocaleString('ru-RU')}</small><p>{x.info}</p></div>)}</>}
 function Achievements(){const items=liveAchievements;return <>{top('Achievements',true,'trophy')}<div className="achievement-list">{items.map((t:any)=><div className="earn-item pearl-card" key={t.id}>{icon(t.icon||'trophy',45,true)}<span><b>{t.title||t.id}</b><small>{t.description||''}{!demo?` · ${t.xp||0} XP`:''}</small></span>{!demo&&<button disabled={t.claimed||!t.available} onClick={async()=>{const x=await gameAction('/api/achievements/claim',{id:t.id});if(x)await refreshLive()}}>{t.claimed?'Получено':t.available?'Получить':'Не выполнено'}</button>}</div>)}</div>{!items.length&&<p className="disclaimer">Достижения ещё не утверждены владельцами. Скрытые награды не начисляются.</p>}</>}
 function Settings(){return <>{top('Settings',true,'settings')}<div className="settings-card pearl-card"><b>Тема оформления</b><p>Каждая тема использует оригинальные PNG-иконки и собственные фактуры.</p><div className="setting-theme"><button className={theme==='light'?'on':''} onClick={()=>setTheme('light')}>Light · светлая</button><button className={theme==='dark'?'on':''} onClick={()=>setTheme('dark')}>Dark · тёмная</button></div></div><button className="earn-item pearl-card" onClick={()=>flash('Уведомления управляются настройками Telegram')}>{icon('notifications',33)}<span><b>Уведомления</b><small>Telegram уведомляет о важных событиях</small></span>{icon('chevron-right',18)}</button><p className="disclaimer">Telegram Mini App: без дублирования статус-бара, с учётом safe-area.</p></>}
 function Support(){
 const arr=supportTickets;
 return <>{top('Support Center',true,'info')}<div className="support-heading pearl-card">{icon('shield-check',40,true)}<div><b>GM Auto Support</b><small>Приём обращений 24/7; две автоматические попытки до передачи модератору. Апелляции — человеку сразу.</small></div></div><div className="form-surface pearl-card"><label>Категория</label><select value={supportCategory} onChange={(e:any)=>setSupportCategory(e.target.value)}>{['Общий вопрос','Mining','Holding','Биржа GM/CR','Баланс GM/CR','Апелляция','Рефералы'].map(x=><option key={x}>{x}</option>)}</select><label>Описание проблемы</label><textarea rows={5} value={supportText} onChange={(e:any)=>setSupportText(e.target.value)} placeholder="Опиши ситуацию минимум в 10 символах"/><GButton theme={theme} onClick={createTicket}>Создать тикет {''}</GButton></div><div className="flex-between"><h3 className="section-title">Обращения</h3><button className="small-button" onClick={loadTickets}>Обновить</button></div>
 {arr.length?arr.map((t:any)=><div className="support-ticket pearl-card" key={t.id}><b>#{String(t.id).slice(0,8)} · {t.category}</b><span>{clean(t.body||t.text)}</span><small>{t.status} · серверный тикет · {t.priority||'P3'}</small>
 {!demo&&t.user_id===String(webapp?.initDataUnsafe?.user?.id||'')&&t.status!=='closed'&&<button className="small-button" onClick={()=>ticketAction(t.id,'auto')}>Автопроверка ({t.auto_attempts||0}/2)</button>}
 {!demo&&['owner','coowner','moderator'].includes(liveRole)&&t.status==='open'&&<button className="small-button" onClick={()=>ticketAction(t.id,'claim')}>Взять в работу</button>}
 {!demo&&['owner','coowner','moderator'].includes(liveRole)&&t.status==='in_review'&&<><input placeholder="Ответ игроку" value={staffReply} onChange={(e:any)=>setStaffReply(e.target.value)}/><button className="small-button" onClick={()=>ticketAction(t.id,'reply',{body:staffReply})}>Ответить</button><button className="small-button" onClick={()=>ticketAction(t.id,'resolve')}>Решено</button></>}
 {!demo&&t.user_id===String(webapp?.initDataUnsafe?.user?.id||'')&&['resolved','closed'].includes(t.status)&&<button className="small-button" onClick={()=>ticketAction(t.id,'reopen')}>Открыть повторно</button>}
 </div>):<p className="disclaimer">Пока нет обращений. В рабочей версии можно обновить очередь кнопкой выше.</p>}</>;
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
 function More(){return <>{top('Все разделы',true,'more')}<div className="more-grid">{[['lightning','Mining','mining'],['coins','Holding Vault','vault'],['swap','GM Shop','shop'],['gift','GM Boxes','boxes'],['candlesticks','Биржа GM/CR','trade'],['gift','Daily Reward','reward'],['tasks','Задания','tasks'],['trophy','Рейтинг','leaderboard'],['friends','Рефералы','referrals'],['clock','История','history'],['shield-check','Support','support'],['settings','Settings','settings'],['crown','Admin','admin']].filter(([i,t,s])=>s!=='admin'||['owner','coowner'].includes(liveRole)).map(([i,t,s])=><button className="earn-item pearl-card" key={t} onClick={()=>goto(s as Route)}>{icon(i,37,true)}<span><b>{t}</b></span>{icon('chevron-right',18)}</button>)}</div></>}
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
 switch(screen){case 'home':view=Home();break;case 'trade':view=Trading();break;case 'earn':view=Earn();break;case 'tasks':view=Tasks();break;case 'leaderboard':view=Leaderboard();break;case 'profile':view=Profile();break;case 'reward':view=Reward();break;case 'splash':view=Splash();break;case 'mining':view=Mining();break;case 'vault':view=Vault();break;case 'shop':view=Shop();break;case 'boxes':view=Boxes();break;case 'referrals':view=Referrals();break;case 'history':view=History();break;case 'settings':view=Settings();break;case 'support':view=Support();break;case 'admin':view=['owner','coowner'].includes(liveRole)?Admin():Home();break;case 'achievements':view=Achievements();break;case 'more':view=More();break;case 'streak':view=Streak();break;default:view=Home();}
 return <div className={'application theme-'+theme+(webapp?.initData?' is-telegram':'')}>
 <aside className="desktop-toolbar"><div className="toolbar-logo"><Brand theme={theme} size={42}/><span><b>GM TOKEN</b><small>Оригинальные эскизы · интерактивная сборка</small></span></div><div className="toolbar-tabs"><button onClick={()=>setTheme('light')} className={isLight?'chosen':''}>Light</button><button onClick={()=>setTheme('dark')} className={!isLight?'chosen':''}>Dark</button></div><div className="toolbar-links">{(['home','trade','earn','tasks','leaderboard','profile','mining','vault','shop','support','admin'] as Route[]).map(s=><button key={s} className={screen===s?'chosen':''} onClick={()=>goto(s)}>{s}</button>)}</div><p>Оригинальные PNG · 54 иконки × 4 варианта · без подмены сторонними пиктограммами</p></aside>
 <div className="device-stage"><div className="phone-frame"><div className={'phone-scroll '+((screen==='splash')?'no-scroll':'')}>{view}</div>{!['reward','splash'].includes(screen)&&bottom()}<div className="home-indicator"/></div><div className="underphone"><span className="demo-pill">{'Серверная авторизация · виртуальные GM/CR'}</span><button onClick={()=>goto('splash')}>Заставка</button><button onClick={()=>goto('home')}>Home</button><button onClick={()=>setTheme(isLight?'dark':'light')}>Сменить тему</button></div><small className="status-note">{backendStatus}</small></div>
 {toast&&<div className="toast-message" role="status" onClick={()=>setToast('')}>{toast}<button onClick={()=>setToast('')}>×</button></div>}
 {modal&&TradeOrderModal()}
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
