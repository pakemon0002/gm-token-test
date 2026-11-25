'use strict';
(()=>{
try{const w=window.Telegram?.WebApp;w?.ready?.();w?.expand?.();w?.setHeaderColor?.('#071120');w?.setBackgroundColor?.('#071120')}catch{}
const G=window.VoltGame,base='/assets/gpu-v3/',app=document.getElementById('volt'),top=document.getElementById('top'),screen=document.getElementById('screen'),dock=document.getElementById('dock'),key='volt-gram-game-v2',avatars=['cyborg','hood','robot','pilot'];
let stored;try{stored=JSON.parse(localStorage.getItem(key)||'null')}catch{}
const s=G.load(stored,Date.now());G.settle(s,Date.now());
let route='farm',selected='rx570',tab='all',moduleIndex=0,picker=false,noticeTimer;
const fmt=G.fmt,price=G.priceText,card=id=>G.find(id);
const icon=(n,active=true)=>'<img class="icon" alt="" src="'+base+'04-icons/'+n+'-'+(active?'active':'default')+'.svg">';
const art=(folder,name,cls='',alt='')=>'<img class="'+cls+'" alt="'+alt+'" src="'+base+folder+'/'+name+'.png" draggable="false">';
const gpuArt=(c,cls='')=>art('01-gpu','gpu-'+c.art,cls+' gpu-'+c.brand.toLowerCase(),c.name+' — условный рендер');
// Keep the same GPU scene for both stopped and running states.
let gpuSlot=null,gpuController=null,gpuGeneration=0;
function gpuVisual(c,running){
 return '<div class="gpu-visual" data-model="'+c.art+'" data-running="'+running+'" data-card="'+c.id+'">'+gpuArt(c,'hero-gpu')+'<canvas class="gpu-live-canvas" aria-label="Объёмная игровая видеокарта"></canvas><div class="gpu-led"></div></div>';
}
function syncGpu(){
 const next=screen.querySelector('.gpu-visual');
 if(next&&gpuSlot&&next.dataset.model===gpuSlot.dataset.model){
  gpuSlot.dataset.running=next.dataset.running;gpuSlot.dataset.card=next.dataset.card;next.replaceWith(gpuSlot);
  gpuController?.setActive(gpuSlot.dataset.running==='true');return;
 }
 ++gpuGeneration;gpuController?.dispose();gpuController=null;gpuSlot=next;if(!next)return;
 const generation=gpuGeneration,canvas=next.querySelector('canvas');
 if(!window.VoltGpu3D)return;
 Promise.resolve(window.VoltGpu3D.mount(canvas,next.dataset.model,{active:next.dataset.running==='true'})).then(controller=>{
  if(generation!==gpuGeneration||gpuSlot!==next){controller.dispose();return}
  gpuController=controller;controller.setActive(next.dataset.running==='true');next.dataset.ready='true';
 }).catch(()=>{if(generation===gpuGeneration&&gpuSlot===next)next.dataset.ready='false'});
}
const btn=(action,label,i,cls='secondary',disabled=false)=>'<button class="'+cls+'" data-action="'+action+'" '+(disabled?'disabled':'')+'>'+ (i?icon(i):'')+'<span>'+label+'</span></button>';
const stat=(i,t,v)=>'<div class="statline">'+icon(i)+'<span>'+t+'</span><b>'+v+'</b></div>';
const brand='<span class="brand"><svg class="mark" viewBox="0 0 40 40" aria-hidden="true"><path fill="#5ebdff" d="M20 2 4 24h15l-2 14 19-24H21z"/></svg>VOLT <b>FARM</b></span>';
function save(){try{localStorage.setItem(key,JSON.stringify(s))}catch{}}
function notice(msg){const t=document.getElementById('toast');t.textContent=msg;t.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>t.hidden=true,3000)}
function log(msg){s.history.unshift(msg);s.history=s.history.slice(0,30)}
function go(r){route=r;picker=false;render();window.scrollTo(0,0)}
const level=()=>1+Math.floor(s.total/G.UNIT);
const value=(n,v)=>'<span data-value="'+n+'">'+v+'</span>';
const caption='<p class="note">GRAM — виртуальные игровые единицы VOLT FARM, не криптовалюта. Нет денежной стоимости, пополнений, обмена и вывода. Все цены и скорости условные.</p>';
function render(){
 const names={farm:'Ферма',shop:'Магазин',upgrades:'Улучшения',tasks:'Задания',ranking:'Рейтинг',profile:'Профиль',balance:'Баланс',history:'История',achievements:'Достижения'};
 top.innerHTML=route==='farm'?brand+'<button class="badge balance-link" data-action="go:balance" aria-label="Открыть игровой баланс">'+icon('coins')+' '+value('balance',fmt(s.balance))+' GRAM</button>':'<button class="icon-button" data-action="back" aria-label="Назад">'+icon('back')+'</button><h1 class="top-title">'+names[route]+'</h1><span class="badge">'+value('balance',fmt(s.balance))+' GRAM</span>';
 const nav=[['farm','home','Ферма'],['shop','shop','Магазин'],['balance','wallet','Баланс'],['ranking','leaderboard','Рейтинг'],['profile','profile','Профиль']];
 dock.innerHTML=nav.map(([r,i,n])=>'<button data-action="go:'+r+'" '+((route===r||r==='farm'&&route==='upgrades')?'aria-current="page"':'')+'>'+icon(i,route===r)+'<span>'+n+'</span></button>').join('');
 const label='<div class="game-label"><i></i> ИГРОВЫЕ GRAM · СИМУЛЯЦИЯ</div>';
 if(route==='farm'){
 const c=card(selected)||card('rx570'),daily=G.rate(s),working=s.running&&s.active.length>0;
 screen.innerHTML='<div class="dash"><section class="dash-balance"><div><small>Игровой баланс</small><strong>'+value('balance',fmt(s.balance))+' <em>GRAM</em></strong><span>Виртуальные единицы</span></div><div class="dash-token" aria-hidden="true"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="#142d47" stroke="#5ab9ef" stroke-width="1.5"/><circle cx="32" cy="32" r="22" fill="none" stroke="#81d7ff" opacity=".45"/><path d="M35 12 18 35h13l-3 17 18-24H33z" fill="#8cddff"/></svg></div></section><div class="dash-actions">'+btn('claim','Собрать GRAM','coins','primary',!s.pending)+btn('go:history','История','history')+'</div><div class="dash-metrics"><div>'+icon('clock')+'<small>Накоплено</small><b>'+value('pending',fmt(s.pending))+'</b><span>GRAM</span></div><div>'+icon('bolt')+'<small>Скорость фермы</small><b>'+fmt(daily)+'</b><span>GRAM / сутки</span></div></div><div class="dash-status"><span class="dash-dot '+(working?'working':'')+'"></span><div><b>'+(working?'Ферма работает':'Ферма остановлена')+'</b><small>'+s.active.length+' / '+G.capacity(s)+' слотов · уровень '+value('level',level())+'</small></div>'+btn('toggle',s.running?'Остановить':'Запустить','power')+'</div><div class="dash-section"><h2>Мои видеокарты</h2><span>'+s.owned.length+' шт.</span></div><div class="dash-cards">'+s.owned.map(id=>{const gpu=card(id),live=s.running&&s.active.includes(id),chosen=id===c.id;return '<article class="dash-gpu '+(chosen?'chosen':'')+'"><div class="dash-gpu-art '+(chosen?'hero':'')+'">'+(chosen?gpuVisual(gpu,live):gpuArt(gpu))+'</div><div class="dash-gpu-info"><b>'+gpu.name+'</b><small>'+fmt(gpu.rate)+' GRAM / сутки</small><span class="dash-gpu-status '+(live?'working':'')+'"><i></i>'+(live?'Работает':s.active.includes(id)?'Ожидание':'Не установлена')+'</span></div><button data-action="select:'+id+'" class="dash-select" aria-label="Выбрать '+gpu.name+'">···</button></article>'}).join('')+'</div><div class="mode dash-selection"><span>'+c.name+' · '+c.ram+'</span><span>'+ (s.active.includes(c.id)?'Установлена':'Не установлена')+'</span></div><div class="shortcuts">'+btn('equip:'+c.id,s.active.includes(c.id)?'Снять':'Установить','gpu')+btn('go:upgrades','Улучшения','upgrades')+'</div>'+btn('go:shop','Каталог видеокарт','shop')+'</div>'+caption;
 }else if(route==='shop'){
 const cards=G.catalog.filter(c=>tab==='all'||tab===c.brand.toLowerCase());
 screen.innerHTML=label+'<div class="tabs">'+[['all','Все'],['amd','AMD'],['nvidia','NVIDIA']].map(([v,n])=>'<button data-action="tab:'+v+'" aria-pressed="'+(v===tab)+'">'+n+'</button>').join('')+'</div>'+cards.map(c=>'<article class="product"><div class="product-art">'+gpuArt(c)+'</div><div class="product-info"><h2>'+c.name+'</h2><small>'+c.brand+' · '+c.ram+'</small><small class="rate">+'+fmt(c.rate)+' GRAM / сутки</small><b class="price">'+(c.price?price(c.price)+' GRAM':'Бесплатно')+'</b>'+btn('buy:'+c.id,s.owned.includes(c.id)?'В инвентаре':s.balance<c.price?'Недостаточно GRAM':'Получить','chevron','secondary',s.owned.includes(c.id)||s.balance<c.price)+'</div></article>').join('')+caption;
 }else if(route==='upgrades'){const m=G.mods[moduleIndex],n=s.levels[moduleIndex];screen.innerHTML=label+'<div class="module-art">'+art('02-hardware',m.art)+'</div><h2 class="module-name">'+m.name+'</h2><p class="module-sub">Уровень '+n+' / 3</p><div class="panel spec">'+stat('chip','Эффект',moduleIndex===2?'+1 слот':'+10% игровых очков')+stat('coins','Цена',n===3?'MAX':price(G.upgradePrice(s,moduleIndex)))+stat('bolt','Активных карт',String(s.active.length))+'</div>'+btn('upgrade',n===3?'MAX':'Улучшить за '+price(G.upgradePrice(s,moduleIndex))+' GRAM','upgrades','primary',n===3||s.balance<G.upgradePrice(s,moduleIndex))+'<div class="module-tabs">'+G.mods.map((x,i)=>'<button data-action="module:'+i+'" aria-pressed="'+(i===moduleIndex)+'">'+icon(x.icon)+'<small>'+x.name+'</small></button>').join('')+'</div>'+caption;
 }else if(route==='balance'){
 screen.innerHTML=window.VoltBalance.render(s,fmt,value,btn,icon)+caption;
 }else if(route==='profile'){screen.innerHTML=label+'<div class="profile-head"><div class="avatar">'+art('03-avatars','avatar-'+s.avatar,'portrait')+art('05-frames','frame-ice','frame')+'</div><h2>VOLT PLAYER</h2><small>Локальный игровой профиль</small><br><button class="edit" data-action="picker">Сменить аватар</button>'+(picker?'<div class="avatar-picker">'+avatars.map(a=>'<button data-action="avatar:'+a+'" aria-label="Аватар '+a+'" aria-pressed="'+(a===s.avatar)+'">'+art('03-avatars','avatar-'+a)+'</button>').join('')+'</div>':'')+'</div><div class="profile-level"><b>Уровень '+value('level',level())+'</b><div class="progress"><i data-value="progress" style="width:'+(s.total%G.UNIT)/G.UNIT*100+'%"></i></div></div><div class="profile-stats">'+[['coins','Баланс',value('balance',fmt(s.balance))],['gpu','Видеокарты',String(s.owned.length)],['bolt','Уровень',value('level',level())],['trophy','Всего добыто',value('total',fmt(s.total))]].map(([i,t,v])=>'<div class="panel">'+icon(i)+'<small>'+t+'</small><b>'+v+'</b></div>').join('')+'</div><div class="profile-actions">'+btn('go:balance','Игровой баланс','coins')+btn('go:tasks','Задания','checklist')+btn('go:achievements','Достижения','trophy')+btn('go:history','История','history')+'</div>'+caption;
 }else if(route==='tasks'){screen.innerHTML=label+'<div class="panel listrow">'+icon('checklist')+'<div><b>Познакомиться с фермой</b><small>Однократное игровое задание</small></div>'+btn('task',s.done?'Выполнено':'Готово','check','secondary',s.done)+'</div>'+caption;
 }else if(route==='ranking'){screen.innerHTML='<div class="panel empty"><h2>Рейтинг</h2>В локальной версии нет общего рейтинга игроков.</div>';
 }else if(route==='history'){screen.innerHTML=s.history.length?s.history.map(x=>'<div class="panel listrow">'+icon('history')+'<div>'+x+'</div></div>').join(''):'<div class="panel empty">Событий в этой сессии пока нет.</div>';
 }else screen.innerHTML='<div class="panel listrow">'+icon('trophy')+'<div><b>Первая видеокарта</b><small>RX 570 получена бесплатно</small></div><b>Открыто</b></div>';
 syncGpu();
}
app.addEventListener('click',ev=>{const b=ev.target.closest('button[data-action]');if(!b||b.disabled)return;const [act,v]=b.dataset.action.split(':');const now=Date.now();G.settle(s,now);switch(act){
case'go':go(v);return;case'back':go(['history','achievements','tasks'].includes(route)?'profile':'farm');return;
case'toggle':s.running=!s.running;log(s.running?'Ферма запущена':'Ферма остановлена');break;
case'claim':{const n=G.claim(s,now);if(n){log('Собрано '+fmt(n)+' игровых GRAM');notice('Собрано '+fmt(n)+' GRAM')}break}
case'tab':tab=v;break;case'select':if(s.owned.includes(v))selected=v;break;
case'buy':if(G.buy(s,v,now)){selected=v;log('Получена '+card(v).name);notice('Видеокарта добавлена')}break;
case'equip':if(!G.equip(s,v,now))notice('Нет свободного слота');break;
case'module':moduleIndex=Math.max(0,Math.min(3,Number(v)||0));break;
case'upgrade':if(G.upgrade(s,moduleIndex,now)){log('Улучшение: '+G.mods[moduleIndex].name);notice('Модуль улучшен')}break;
case'picker':picker=!picker;break;case'avatar':if(avatars.includes(v)){s.avatar=v;picker=false}break;
case'task':if(G.starterTask(s)){log('Задание выполнено');notice('Задание выполнено')}break;
}save();render()});
setInterval(()=>{G.settle(s,Date.now());const values={pending:fmt(s.pending),balance:fmt(s.balance),total:fmt(s.total),level:level()};for(const [k,v] of Object.entries(values))document.querySelectorAll('[data-value="'+k+'"]').forEach(e=>e.textContent=v);document.querySelectorAll('[data-value=progress]').forEach(e=>e.style.width=(s.total%G.UNIT)/G.UNIT*100+'%');const claim=document.querySelector('[data-action=claim]');if(claim)claim.disabled=!s.pending;save()},1000);
window.addEventListener('pagehide',()=>{G.settle(s,Date.now());save();gpuController?.dispose();gpuController=null;gpuSlot=null;++gpuGeneration});window.addEventListener('pageshow',e=>{if(e.persisted)render()});render();save();
})();