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
 React.useEffect(()=>{webapp?.ready?.();webapp?.expand?.();const init=webapp?.initData;if(!init){setBackendStatus('Открой Mini App через @gm_token_test_bot: вход в браузере без Telegram отключён');return;}fetch('/api/bootstrap',{headers:{'Authorization':`tma ${init}`}}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(String(d?.error||('HTTP '+r.status)));setDemo(false);setLiveRole(d.user?.role||'player');setBackendStatus(`Telegram аккаунт: ${d.user?.id||'подтверждён'}`);if(d.wallet) setW((w:Wallet)=>({...w,gm:d.wallet.gm/100,cr:d.wallet.cr/100,vault:d.wallet.vault/100,level:d.user.level,xp:d.user.xp}));}).catch((e:any)=>{setDemo(true);setBackendStatus('Ошибка авторизации Telegram. Попробуй открыть бот заново. '+String(e.message||''))})},[]);
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
 function cryptoId(){return (window.crypto&&window.crypto.randomUUID)?window.crypto.randomUUID():'manual-'+Date.now()+'-'+Math.floor(Math.random()*999999)}
 const todayClaim=async()=>{const x=await gameAction('/api/daily/claim');if(x)goto('reward')};
 const miningClaim=async()=>{await gameAction('/api/mining/claim')};
 const depositVault=async()=>{await gameAction('/api/vault/deposit',{amount:vaultAmount.replace(',','.')})};
 const withdrawVault=async()=>{await gameAction('/api/vault/withdraw',{amount:vaultAmount.replace(',','.')})};
 const submitOrder=async()=>{const request={type:orderType,side,amount:amount.replace(',','.'),price:orderPrice.replace(',','.'),duration:orderDuration};const x=await gameAction('/api/exchange/order',request);if(x){setModal('');setTradeReady(false);flash(x.auction?'Предварительная заявка принята на аукцион':'Подтверждённый сервером ордер')}};
 const cancelLiveOrder=async(id:string)=>{await gameAction('/api/exchange/cancel',{orderId:id})};
 const loadHistory=async()=>{const x=await api('/api/history');if(x)setServerHistory(x.events||[])};
 const tradePreview=()=>{const n=Number(amount.replace(',','.'));if(orderType==='limit'&&(!(Number(orderPrice)>0)||!Number.isFinite(Number(orderPrice)))){flash('Укажи цену Limit-заявки в CR за 1 GM');return;}if(!(n>=10)){flash('Минимум нового ордера — 10 GM');return;}setModalText(`${side==='buy'?'Покупка':'Продажа'} ${nf(n)} GM, ${orderType==='limit'?'лимит '+orderPrice+' CR/GM':'рыночная цена ±3%'}. Комиссия: 0,5% с обеих сторон. Подтверди отправку на сервер.`);setTradeReady(true);setModal('order')};
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
 function Home(){return isLight?<><header className="home-header"><span className="hbrand"><Brand theme={theme} size={38}/><b>GM TOKEN</b></span><button className="header-icon" onClick={()=>goto('settings')} aria-label="Уведомления">{icon('notifications',24)}</button></header><div className="balance-glass pearl-card"><div className="balance-top"><div><small>Your Balance</small><div className="balance-numeral">{nf(wallet.gm,0)}<span> GM</span></div><span className="neutral-change">Без фиктивной статистики</span></div><div className="balance-graph-icon">{icon('bar-chart',41)}</div></div><SparkLine theme={theme}/></div><button className="collect-claim" onClick={()=>goto('reward')}><div className="claim-electric">{icon('lightning',32)}</div><span><strong>Claim Reward</strong><small>Get your daily GM</small></span>{icon('chevron-right',24)}</button><button className="streak-card pearl-card" onClick={()=>goto('streak')}>{icon('flame',48)}<span><b>Daily Streak</b><span className="streak-count">{wallet.streak} дней</span></span>{icon('chevron-right',22)}</button><div className="quick-grid">{[['candlesticks','Trade','trade'],['gift','Earn','earn'],['friends','Invite','referrals'],['more','More','more']].map(([i,t,s])=><button className="quick-card pearl-card" key={t} onClick={()=>goto(s as Route)}>{icon(i,27)}<span>{t}</span></button>)}</div></>:<><header className="dark-top"><b>GM TOKEN</b><button onClick={()=>goto('settings')}>{icon('more',21)} {icon('close',18)}</button></header><div className="orbit-hero"><Brand theme="dark" size={93}/><span className="planet-ring"></span></div><div className="dark-balance"><div>{nf(wallet.gm,0)}<span className="currency-mark"> GM</span></div><p className="neutral-change">Подтверждённый баланс GM</p></div><div className="dark-spark"><SparkLine theme="dark"/><button onClick={()=>goto('trade')}>GM/CR {icon('chevron-down',13)}</button></div><button className="dark-reward metallic-card" onClick={()=>goto('reward')}>{icon('lightning',30)}<span><b>Collect Reward</b><small>{wallet.lastClaim===todayUTC()?'Claimed today':'Get daily GM'}</small></span></button><button className="dark-streak metallic-card" onClick={()=>goto('streak')}>{icon('flame',48)}<span><b>Daily Streak</b><strong>{wallet.streak} days</strong></span>{icon('chevron-right',18)}</button></>}
 function Trading(){
  const pre=liveTicker?.premarket??!liveBook?.auction_done;
  const remain=Math.max(0,(liveTicker?.auction_end_at||liveBook?.auction_end_at||0)-clock);
  const countdown=[Math.floor(remain/3600),Math.floor(remain%3600/60),remain%60].map(x=>String(x).padStart(2,'0')).join(':');
  const p=liveTicker?.last_price;
  const bid=liveTicker?.best_bid,ask=liveTicker?.best_ask;
  const book=liveBook||{bids:[],asks:[]};
  return <>{top('GM/CR · Биржа',true,'bar-chart')}
   <div className="trade-meta"><b>{pre?'PREMARKET · предварительные заявки':'SPOT · игровой GM/CR'}</b><span>{pre?`До открытия ${countdown}`:'Торговля активна'}</span></div>
   <div className="market-price-panel pearl-card">
    <small>{pre?'Предварительная цена (не сделка)':'Последняя подтверждённая цена'}</small>
    <div className="price-big">{pre?(liveTicker?.indicative?.price?nf(liveTicker.indicative.price/100):'—'):(p?nf(p/100):'—')} <small>CR / GM</small></div>
    <div className="market-metrics"><span>Объём 24 ч: <b>{nf((liveTicker?.volume_24h_gm_cents||0)/100)} GM</b></span><span>Сделок: <b>{liveTicker?.trades_24h||0}</b></span></div>
    <small>{pre?'Примерный объём на аукционе: '+nf((liveTicker?.indicative?.volume_gm_cents||0)/100)+' GM · не исполнен':'Цена и объём только по реально исполненным проверенным ордерам'}</small>
   </div>
   <div className="intervals">{['1m','5m','15m','1h','4h','1d'].map(i=><button className={period===i?'on':''} key={i} onClick={()=>setPeriod(i)}>{i}</button>)}</div>
   <Candles theme={theme} candles={liveCandles} selected={selectedCandle} onSelect={setSelectedCandle}/>
   <p className="disclaimer">{pre?'Первые 24 часа — только предварительные Limit-заявки. Фактический объём равен нулю, пока сделки не исполняются.':'OHLCV получен из реальных сделок. Подозрительные сделки исключаются из доверенных свечей; это не биржа реальных денег.'}</p>
   <div className="market-book pearl-card"><b>Стакан заявок · GM / CR</b><div className="book-columns"><div><strong>Покупки</strong>{book.bids.length?book.bids.slice(0,8).map((o:any)=><div className="book-level buy" key={'b'+o.limit_price}><span>{nf(o.limit_price/100)}</span><span>{nf(o.gm_cents/100)} GM</span></div>):<small>Пока нет заявок</small>}</div><div><strong>Продажи</strong>{book.asks.length?book.asks.slice(0,8).map((o:any)=><div className="book-level sell" key={'a'+o.limit_price}><span>{nf(o.limit_price/100)}</span><span>{nf(o.gm_cents/100)} GM</span></div>):<small>Пока нет заявок</small>}</div></div><small>Лучшая покупка: {bid?nf(bid/100):'—'} CR · продажа: {ask?nf(ask/100):'—'} CR</small></div>
   <div className="pair-trade-buttons"><button onClick={()=>{setSide('buy');setOrderType('limit');setModal('tradeForm')}}>Buy GM</button><button onClick={()=>{setSide('sell');setOrderType('limit');setModal('tradeForm')}}>Sell GM</button></div>
   <div className="form-surface pearl-card"><b>Мои заявки</b>{liveOrders.filter((o:any)=>o.status==='open').slice(0,20).map((o:any)=><div key={o.id} className="split-line"><span>{o.side==='buy'?'Buy':'Sell'} · {nf(o.remaining_cents/100)} GM · {nf(o.limit_price/100)} CR</span><button onClick={()=>cancelLiveOrder(o.id)}>Отменить</button></div>)}{!liveOrders.some((o:any)=>o.status==='open')&&<small>Активных заявок нет</small>}<button className="small-button" onClick={refreshLive}>Обновить стакан</button></div>
   {!pre&&<div className="form-surface pearl-card"><b>Последние сделки</b>{recentTrades.map((t:any,i:number)=><div key={i} className="split-line"><span>{nf(t.price/100)} CR</span><span>{nf(t.amount_cents/100)} GM</span></div>)}{!recentTrades.length&&<small>Сделок пока нет</small>}</div>}
  </>;
 }
 function Earn(){return <>{!isLight?<header className="dark-top"><b>GM TOKEN</b><button onClick={()=>goto('settings')}>{icon('more',22)} {icon('close',17)}</button></header>:top('Earn',true,'gift')}<div className={'earn-total '+(isLight?'pearl-card':'metallic-card')}><div><small>Текущий баланс GM</small><div className="earned-number">{nf(wallet.gm,0)} <span>GM</span></div></div>{icon('trending-up',48)}</div><h3 className="section-title">Earn Methods</h3><div className="earn-methods">{[['gift','Daily Reward','Get free GM tokens every day','reward'],['coins','Hold & Earn','Earn game rewards for holding','vault'],['tasks','Tasks','Complete tasks and earn more','tasks'],['friends','Invite Friends','Get bonuses for referrals','referrals'],['lightning','Mining','Play to earn virtual GM','mining'],['swap','GM Shop','Exchange virtual GM into CR','shop']].map(([i,title,description,s])=><button key={title} className={'earn-item '+(isLight?'pearl-card':'metallic-card')} onClick={()=>goto(s as Route)}>{icon(i,48,true)}<span><b>{title}</b><small>{description}</small></span>{icon('chevron-right',19)}</button>)}</div></>}
 function Tasks(){return <>{isLight?top('Tasks',true,'tasks'):<header className="dark-top"><b>GM TOKEN</b><button onClick={()=>goto('settings')}>{icon('more',23)} {icon('close',17)}</button></header>}{!isLight&&<button className="task-promo metallic-card" onClick={()=>flash('Бонусы доступны только после проверки условий')}>{icon('tasks',55)}<b>Complete tasks<br/>and earn GM</b></button>}<div className="task-tabs">{['All','Social','Crypto','Other'].map(x=><button className={taskFilter===x?'on':''} key={x} onClick={()=>setTaskFilter(x)}>{x}</button>)}</div>{isLight&&<button className="task-promo pearl-card" onClick={()=>flash('Задания появятся после подтверждения условий на сервере')}>{icon('gift',54)}<b>Complete tasks<br/>and earn GM</b>{icon('chevron-right',20)}</button>}<div className="tasks-list">{(liveTasks.map((t:any)=>({key:t.id,icon:t.icon||'tasks',title:t.title||t.id,reward:`${t.gm||0} GM · ${t.xp||0} XP`,category:t.category||'Other',desc:t.description||'',available:t.available,claimed:t.claimed}))).filter((t:any)=>taskFilter==='All'||taskFilter===t.category).map(t=><div className={'task-row '+(isLight?'pearl-card':'metallic-card')} key={t.key}>{icon(t.icon,40,true)}<span><b>{t.title}</b><small className="green">{t.reward}</small></span><button disabled={!demo&&(t.claimed||!t.available)} onClick={async()=>{if(demo){if(t.key==='vault')goto('vault');else flash(t.desc);return;}const x=await gameAction('/api/tasks/claim',{id:t.key});if(x)await refreshLive()}}>{demo?'Start':t.claimed?'Получено':t.available?'Получить':'Не выполнено'}</button></div>)}</div>{isLight&&<button className="premium-box pearl-card" onClick={()=>flash('Premium Tasks: функция не утверждена для запуска')}>{icon('diamond',40)}<span><b>Premium Tasks</b><small>Пока не утверждено</small></span>{icon('chevron-right',21)}</button>}</>}
 function Leaderboard(){const users=(liveRanks?.users||[]).filter((u:any)=>rankFilter==='Global'||(liveReferrals?.referred||[]).some((r:any)=>r.user_id===u.id));return <>{top('Leaderboard',true,'trophy')}<div className="rank-tabs"><button onClick={()=>setRankFilter('Global')} className={rankFilter==='Global'?'on':''}>Global</button><button onClick={()=>setRankFilter('Friends')} className={rankFilter==='Friends'?'on':''}>Friends</button></div><div className="leader-rows">{users.map((u:any,i:number)=><div className="leader-row" key={u.id}><b>{i+1}</b>{icon('profile',27)}<span>{clean(u.username||'Игрок')}</span><small>{nf(u.score_cents/100)} GM</small></div>)}</div>{users.length===0&&<p className="disclaimer">{liveRanks?.pending_rule?'Рейтинг ещё не включён: формула не утверждена. Фальшивых участников нет.':'Пока нет игроков в выбранном списке.'}</p>}</>}
 function Profile(){return <>{isLight?<header className="profile-top"><span></span><button className="header-icon" onClick={()=>goto('settings')}>{icon('settings',25)}</button></header>:<header className="dark-top"><b>GM TOKEN</b><button onClick={()=>goto('settings')}>{icon('more',20)} {icon('close',17)}</button></header>}<div className="profile-hero"><Brand theme={theme} size={isLight?103:98}/><h2>{webapp?.initDataUnsafe?.user?.username||webapp?.initDataUnsafe?.user?.first_name||'Игрок'}</h2><p>#{String(webapp?.initDataUnsafe?.user?.id||'')} <button className="inline-icon" onClick={()=>{navigator.clipboard?.writeText(String(webapp?.initDataUnsafe?.user?.id||''));flash('ID скопирован')}}>{icon('copy',15)}</button></p></div><div className="xp-area"><div className="xp-line"><b>Lv. {wallet.level}</b><small>{nf(wallet.xp,0)} / {nf(xpThreshold[Math.min(wallet.level,9)]||4400,0)} XP</small></div><div className="progress"><div style={{width:(Math.min(100,100*wallet.xp/(xpThreshold[Math.min(wallet.level,9)]||4400)))+'%'}}/></div></div><div className="stats-grid">{[['friends',String(liveReferrals?.referred?.length||0),'Friends'],['wallet',nf(wallet.gm,0),'Balance'],['lightning',String(wallet.streak),'Streak']].map(([i,n,label])=><div className="stat-card" key={label}>{icon(i,23)}<b>{n}</b><small>{label}</small></div>)}</div><div className="profile-menu">{[['trophy','Achievements','achievements'],['friends','Referral Program','referrals'],['clock','Transaction History','history'],['settings','Settings','settings'],['info','Support','support']].map(([i,t,s])=><button key={t} onClick={()=>goto(s as Route)}>{icon(i,21)}<span>{t}</span>{icon('chevron-right',18)}</button>)}</div>{isLight&&<button className="logout" onClick={()=>flash('Закрой Mini App в Telegram для выхода')}>{icon('logout',20)} Log Out</button>}</>}
 function Reward(){return <div className="reward-view"><button className="reward-close" onClick={()=>goto('home')}>{icon('close',23)}</button><div className="reward-shine"><Brand theme={theme} size={220}/><div className="reward-star">{icon('star',32)}</div></div><h1>{liveState?.config?.daily_enabled?'Daily GM':'Daily Reward'}</h1><p>{liveState?.config?.daily_enabled?'Получение подтверждается сервером':'Размер ежедневной награды ещё не утверждён'}</p><GButton theme={theme} disabled={!liveState?.config?.daily_enabled} onClick={()=>{if(wallet.lastClaim!==todayUTC()) todayClaim();else goto('home')}}>{wallet.lastClaim===todayUTC()?'Отлично!':'Забрать награду'}</GButton></div>}
 function Splash(){return <div className="splash-view"><div className="splash-glow"></div><div className="splash-logo"><img src={BRAND+'gm-lettermark-metallic-transparent.png'} alt="GM TOKEN"/></div><h1>GM TOKEN</h1><p>Earn · Hold · Grow</p><button className="splash-start" onClick={()=>goto('home')}>Открыть приложение</button></div>}
 function Mining(){const rate=!demo&&liveState?liveState.mining.rate_cents_day/100:gmRate(wallet);return <>{top('Mining',true,'info')}<div className="inferred-label">Игровой раздел · композиция дополнена к эскизам</div><div className="mining-hero pearl-card"><div className="mining-orb">{icon('lightning',100,true)}</div><small>Добыча GM</small><h1>{nf(rate)} <span>GM / сутки</span></h1><p>Lv.{wallet.level} · Power +{powerBonus(wallet.level)}% · Boost +{holdingBonus(wallet.vault)}%</p></div><div className="mining-store pearl-card"><div className="flex-between"><b>Storage</b><span>{nf(wallet.storage)} GM</span></div><div className="progress"><div style={{width:(Math.min(100,wallet.storage/(rate*storageHours(wallet.level)/24)*100))+'%'}}/></div><small>Вместимость: {storageHours(wallet.level)} часов добычи. В рабочем режиме начисления резервируются на сервере.</small></div><GButton theme={theme} onClick={miningClaim} icon="lightning">Claim GM</GButton><div className="feature-grid">{[['lightning','Power','+'+powerBonus(wallet.level)+'%'],['clock','Storage',storageHours(wallet.level)+' ч'],['trending-up','Efficiency',wallet.level>=9?'50%':wallet.level>=7?'40%':wallet.level>=5?'30%':wallet.level>=3?'20%':'0%']].map(([i,t,v])=><div className="feature-card pearl-card" key={t}>{icon(i,28)}<small>{t}</small><b>{v}</b></div>)}</div><p className="disclaimer">Mining Pool ограничен 45 млн GM и утверждённым бюджетом. Подтверждённые начисления рассчитываются сервером.</p></>}
 function Vault(){const amountN=Number(vaultAmount.replace(',','.'));return <>{top('Holding (Vault)',true,'info')}<div className="inferred-label">Игровой раздел · адаптация общего стиля</div><div className="vault-hero pearl-card"><div className="vault-orb">{icon('database',100,true)}</div><small>В хранилище</small><h1>{nf(wallet.vault)} GM</h1><p>Максимум 0,5%/сутки · не гарантируется</p></div><div className="vault-stats"><div className="pearl-card"><small>Holding Boost</small><b>+{holdingBonus(wallet.vault)}%</b></div><div className="pearl-card"><small>Вывод</small><b>5% комиссия</b></div></div><div className="form-surface pearl-card"><label htmlFor="vault-amount">Сумма GM</label><input id="vault-amount" inputMode="decimal" value={vaultAmount} onChange={(e:any)=>setVaultAmount(e.target.value)}/><div className="twin-buttons"><button onClick={depositVault}>Пополнить</button><button onClick={withdrawVault}>Вывести</button></div></div><p className="disclaimer">Один вывод в UTC-сутки. Вознаграждения начисляются каждый час только при наличии фонда. Никаких реальных денег.</p>{!demo&&<><div className="split-line"><span>Награды к получению</span><b>{nf((liveState?.holding?.pending_cents||0)/100)} GM</b></div><GButton theme={theme} disabled={!liveState?.holding?.pending_cents} onClick={()=>gameAction('/api/vault/claim')}>Забрать Holding Rewards</GButton></>}</>}
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
 function Admin(){
 const isOwner=['owner','coowner'].includes(liveRole);
 if(!demo&&!isOwner) return <>{top('Admin Panel',true,'shield-check')}<div className="empty-state">{icon('shield-check',70,true)}<h2>Доступ ограничен</h2><p>Только Owner и Co-Owner могут использовать административную панель. Роли проверяются сервером.</p></div></>;
 return <>{top('Admin Panel',true,'settings')}<div className="admin-banner pearl-card">{icon('crown',49,true)}<div><b>{liveRole.toUpperCase()}</b><small>Вход подтверждён Telegram; критические операции требуют TOTP</small></div></div>
 <div className="admin-numbers">{[['Users',adminStats?.users??'—'],['Orders',adminStats?.orders??'—'],['Trades (24h)',adminStats?.trades_24h??'—'],['Open tickets',adminStats?.open_tickets??'—']].map(([a,b])=><div className="pearl-card" key={a}><small>{a}</small><b>{b}</b><small>Серверные данные</small></div>)}</div>
 <h3 className="section-title">Управление</h3>
 <div className="admin-actions pearl-card"><button onClick={async()=>{const x=await adminRequest('/api/admin/team');if(x)setAdminTeam(x.team||[])}}>{icon('friends',21)} Обновить список ролей</button><button onClick={async()=>{const x=await adminRequest('/api/admin/pools');if(x)setAdminFunds(x.pools||[]);const st=await adminRequest('/api/admin/stats');if(st)setAdminStats(st)}}>{icon('database',21)} Остатки фондов</button></div>
 {adminTeam.length>0&&<div className="admin-records pearl-card">{adminTeam.map((x:any)=><div key={x.id}><span>{x.username||x.id}</span><b>{x.role}</b></div>)}</div>}
 {adminFunds.length>0&&<div className="admin-records pearl-card">{adminFunds.map((x:any)=><div key={x.name}><span>{x.name}</span><b>{nf((x.gm||x.cr)/100)} {x.gm?'GM':'CR'}</b></div>)}</div>}
 <div className="form-surface pearl-card"><b>Модераторы</b><label>Telegram ID сотрудника</label><input value={adminId} onChange={(e:any)=>setAdminId(e.target.value)} placeholder="Только зарегистрированный ID"/><label>Действие</label><select value={adminAction} onChange={(e:any)=>setAdminAction(e.target.value)}><option value="grant">Выдать Moderator</option><option value="revoke">Отозвать Moderator</option></select><label>Код 2FA владельца</label><input value={adminCode} onChange={(e:any)=>setAdminCode(e.target.value)} inputMode="numeric" placeholder="6-значный TOTP"/><GButton theme={theme} onClick={adminChangeRole} disabled={demo}>Сохранить роль</GButton></div>
 <div className="form-surface pearl-card"><b>Перевод между игровыми фондами</b><label>Источник</label><select value={adminFrom} onChange={(e:any)=>setAdminFrom(e.target.value)}><option value="TREASURY">Treasury</option><option value="FUTURE">Future Ecosystem</option></select><label>Получатель</label><select value={adminTo} onChange={(e:any)=>setAdminTo(e.target.value)}>{['MINING','HOLDING','BOXES','DAILY','COMMUNITY','DEVELOPMENT'].map(x=><option key={x}>{x}</option>)}</select><label>Количество GM</label><input value={adminAmount} onChange={(e:any)=>setAdminAmount(e.target.value)} inputMode="decimal"/><label>Причина (15+ символов)</label><textarea rows={3} value={adminReason} onChange={(e:any)=>setAdminReason(e.target.value)}/><GButton theme={theme} onClick={adminTransfer} disabled={demo}>Подтвердить перевод + 2FA</GButton></div>
 <div className="form-surface pearl-card"><b>Коррекция ошибочного баланса</b><small>Только по тикету и с проверкой доступного резерва.</small><label>ID игрока (выше)</label><input value={adminId} onChange={(e:any)=>setAdminId(e.target.value)}/><label>Валюта</label><select value={adminCorrectionCurrency} onChange={(e:any)=>{setAdminCorrectionCurrency(e.target.value);setAdminCorrectionPool(e.target.value==='GM'?'MINING':'WELCOME')}}><option>GM</option><option>CR</option></select><label>Фонд-источник корректировки</label><select value={adminCorrectionPool} onChange={(e:any)=>setAdminCorrectionPool(e.target.value)}>{(adminCorrectionCurrency==='GM'?['MINING','BOXES','DAILY','COMMUNITY','DEVELOPMENT','FUTURE','TREASURY']:['WELCOME','SHOP']).map(x=><option key={x}>{x}</option>)}</select><label>Номер тикета</label><input value={adminTicket} onChange={(e:any)=>setAdminTicket(e.target.value)} placeholder="GM-..."/><label>Сумма (выше)</label><input value={adminAmount} onChange={(e:any)=>setAdminAmount(e.target.value)}/><GButton theme={theme} onClick={adminCorrection} disabled={demo}>Исправить через резерв + 2FA</GButton></div>
 <p className="disclaimer">В демо все административные действия отключены. У двух владельцев одинаковые защищённые права; владелец не может удалить другого владельца через UI.</p></>;
 }
 function More(){return <>{top('Все разделы',true,'more')}<div className="more-grid">{[['lightning','Mining','mining'],['coins','Holding Vault','vault'],['swap','GM Shop','shop'],['gift','GM Boxes','boxes'],['candlesticks','Биржа GM/CR','trade'],['gift','Daily Reward','reward'],['tasks','Задания','tasks'],['trophy','Рейтинг','leaderboard'],['friends','Рефералы','referrals'],['clock','История','history'],['shield-check','Support','support'],['settings','Settings','settings'],['crown','Admin','admin']].map(([i,t,s])=><button className="earn-item pearl-card" key={t} onClick={()=>goto(s as Route)}>{icon(i,37,true)}<span><b>{t}</b></span>{icon('chevron-right',18)}</button>)}</div></>}
 function Streak(){return <>{top('Daily Streak',true,'flame')}<div className="referral-hero pearl-card">{icon('flame',90,true)}<h1>{wallet.streak} дней</h1><p>Серия ежедневных посещений. Повторное получение награды в один день запрещено.</p></div><GButton theme={theme} onClick={()=>goto('reward')}>Ежедневная награда</GButton></>}
 if(demo){return <main className={'application auth-page theme-'+theme}>
  <div className="auth-ambient" aria-hidden="true"/>
  <section className="auth-gate pearl-card" aria-labelledby="auth-title">
   <div className="auth-brand"><Brand theme={theme} size={78}/><div className="auth-brand-copy"><span>TELEGRAM MINI APP</span><h1 id="auth-title">GM TOKEN</h1></div></div>
   <div className="auth-divider"/>
   <div className="auth-status" role="status"><span className="auth-status-dot" aria-hidden="true"/><div><strong>Требуется вход через Telegram</strong><p>{backendStatus}</p></div></div>
   <a className="auth-cta" href="https://t.me/gm_token_test_bot" target="_blank" rel="noreferrer">
    <span className="auth-cta-icon"><Icon name="telegram" theme={theme} size={29}/></span>
    <span className="auth-cta-copy"><strong>Открыть в Telegram</strong><small>@gm_token_test_bot</small></span>
    <Icon name="chevron-right" theme={theme} size={22}/>
   </a>
   <div className="auth-theme-row"><span>Оформление</span><div className="auth-theme-toggle" role="group" aria-label="Выбор темы">
    <button type="button" className={theme==='light'?'active':''} aria-pressed={theme==='light'} onClick={()=>setTheme('light')}><span className="auth-theme-mark auth-theme-light"/>Светлая</button>
    <button type="button" className={theme==='dark'?'active':''} aria-pressed={theme==='dark'} onClick={()=>setTheme('dark')}><span className="auth-theme-mark auth-theme-dark"/>Тёмная</button>
   </div></div>
   <div className="auth-privacy"><Icon name="shield-check" theme={theme} size={22}/><span>Игровые данные появятся только после защищённого входа. Демобалансов здесь нет.</span></div>
  </section>
 </main>}
 let view:any;
 switch(screen){case 'home':view=Home();break;case 'trade':view=Trading();break;case 'earn':view=Earn();break;case 'tasks':view=Tasks();break;case 'leaderboard':view=Leaderboard();break;case 'profile':view=Profile();break;case 'reward':view=Reward();break;case 'splash':view=Splash();break;case 'mining':view=Mining();break;case 'vault':view=Vault();break;case 'shop':view=Shop();break;case 'boxes':view=Boxes();break;case 'referrals':view=Referrals();break;case 'history':view=History();break;case 'settings':view=Settings();break;case 'support':view=Support();break;case 'admin':view=Admin();break;case 'achievements':view=Achievements();break;case 'more':view=More();break;case 'streak':view=Streak();break;default:view=Home();}
 return <div className={'application theme-'+theme+(webapp?.initData?' is-telegram':'')}>
 <aside className="desktop-toolbar"><div className="toolbar-logo"><Brand theme={theme} size={42}/><span><b>GM TOKEN</b><small>Оригинальные эскизы · интерактивная сборка</small></span></div><div className="toolbar-tabs"><button onClick={()=>setTheme('light')} className={isLight?'chosen':''}>Light</button><button onClick={()=>setTheme('dark')} className={!isLight?'chosen':''}>Dark</button></div><div className="toolbar-links">{(['home','trade','earn','tasks','leaderboard','profile','mining','vault','shop','support','admin'] as Route[]).map(s=><button key={s} className={screen===s?'chosen':''} onClick={()=>goto(s)}>{s}</button>)}</div><p>Оригинальные PNG · 54 иконки × 4 варианта · без подмены сторонними пиктограммами</p></aside>
 <div className="device-stage"><div className="phone-frame"><div className={'phone-scroll '+((screen==='reward'||screen==='splash')?'no-scroll':'')}>{view}</div>{!['reward','splash'].includes(screen)&&bottom()}<div className="home-indicator"/></div><div className="underphone"><span className="demo-pill">{'Серверная авторизация · виртуальные GM/CR'}</span><button onClick={()=>goto('splash')}>Заставка</button><button onClick={()=>goto('home')}>Home</button><button onClick={()=>setTheme(isLight?'dark':'light')}>Сменить тему</button></div><small className="status-note">{backendStatus}</small></div>
 {toast&&<div className="toast-message" role="status" onClick={()=>setToast('')}>{toast}<button onClick={()=>setToast('')}>×</button></div>}
 {modal&&<div className="overlay" onClick={()=>setModal('')}><div className="modal-box" onClick={(e:any)=>e.stopPropagation()}><b>{modal==='tradeForm'?(side==='buy'?'Buy GM':'Sell GM'):'Подтверждение ордера'}</b>{modal==='tradeForm'?<><p>Виртуальные GM/CR · {liveTicker?.premarket?'PREMARKET · только Limit':'торговля открыта'}</p><label>Тип ордера</label><select value={orderType} onChange={(e:any)=>setOrderType(e.target.value)}><option value="limit">Limit</option><option value="market" disabled={liveTicker?.premarket}>Market (3% защита; после аукциона)</option></select><label>Количество GM</label><input inputMode="decimal" value={amount} onChange={(e:any)=>setAmount(e.target.value)}/>{orderType==='limit'&&<><label>Цена CR за 1 GM</label><input inputMode="decimal" placeholder="Введи свою цену CR/GM" value={orderPrice} onChange={(e:any)=>setOrderPrice(e.target.value)}/><label>Срок ордера</label><select value={orderDuration} onChange={(e:any)=>setOrderDuration(e.target.value)}>{['1h','6h','12h','24h','3d','7d','GTC'].map(x=><option key={x}>{x}</option>)}</select></>}<div className="amount-presets">{['25','50','75','100'].map(x=><button key={x} onClick={()=>setAmount(x)}>{x}</button>)}</div><button className="modal-action" onClick={tradePreview}>Показать расчёт</button></>:<><p>{modalText}</p><button className="modal-action" onClick={submitOrder}>{'Подтвердить и отправить заявку'}</button></>}<button className="modal-close" onClick={()=>setModal('')}>Закрыть</button></div></div>}
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
