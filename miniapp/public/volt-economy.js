'use strict';
(function(root){
const UNIT=100000000,DAY=86400000,MAX=1000000000000;
const catalog=[
 ['rx570','RX 570',0,10000000,'4060','AMD','4 ГБ'],['rx580','RX 580',0.5,14000000,'4060','AMD','8 ГБ'],['gtx1050','GTX 1050 Ti',0.75,16500000,'4070','NVIDIA','4 ГБ'],['gtx1060','GTX 1060',1.2,19000000,'4070','NVIDIA','6 ГБ'],['gtx1660','GTX 1660 Super',1.8,25000000,'4060','NVIDIA','6 ГБ'],['rx6600','RX 6600',2.5,32000000,'4070','AMD','8 ГБ'],['rtx2060','RTX 2060',3.2,38000000,'4070','NVIDIA','6 ГБ'],['rtx3060','RTX 3060',4.5,50000000,'4080','NVIDIA','12 ГБ'],['rtx4060','RTX 4060',6,65000000,'4060','NVIDIA','8 ГБ'],['rx7800','RX 7800 XT',8.5,85000000,'4080','AMD','16 ГБ'],['rtx4070','RTX 4070',12,110000000,'4070','NVIDIA','12 ГБ'],['rtx4080','RTX 4080',18,155000000,'4080','NVIDIA','16 ГБ'],['rtx4090','RTX 4090',25,220000000,'4090','NVIDIA','24 ГБ']
].map(([id,name,price,rate,art,brand,ram])=>({id,name,price:Math.round(price*UNIT),rate,art,brand,ram}));
const mods=[{id:'cool',name:'Охлаждение',art:'liquid-cooling',icon:'fan',price:25000000},{id:'power',name:'Блок питания',art:'power-supply',icon:'power',price:40000000},{id:'slots',name:'Расширение',art:'rig-empty',icon:'box',price:60000000},{id:'chip',name:'Контроллер',art:'processor',icon:'chip',price:80000000}];
const find=id=>catalog.find(c=>c.id===id), valid=n=>Number.isSafeInteger(n)&&n>=0&&n<=MAX, clamp=n=>Math.min(MAX,n);
const fmt=n=>((BigInt(Math.max(0,Math.floor(n)))/100000000n).toString()+'.'+(BigInt(Math.max(0,Math.floor(n)))%100000000n).toString().padStart(8,'0'));
const fresh=now=>({balance:0,pending:0,total:0,carry:0,last:now,running:false,owned:['rx570'],active:['rx570'],levels:[0,0,0,0],avatar:'cyborg',done:false,history:[]});
function load(p,now){const s=fresh(now);if(!p||!valid(p.balance)||!valid(p.pending)||!valid(p.total)||!Array.isArray(p.owned)||!Array.isArray(p.active)||!Array.isArray(p.levels)||p.levels.length!==4)return s;const owned=[...new Set(['rx570',...p.owned.filter(find)])];const levels=p.levels.map(n=>Number.isInteger(n)&&n>=0&&n<=3?n:0);const active=[...new Set(p.active.filter(id=>owned.includes(id)))].slice(0,3+levels[2]);return {...s,balance:p.balance,pending:p.pending,total:p.total,carry:Number.isSafeInteger(p.carry)&&p.carry>=0&&p.carry<DAY?p.carry:0,last:Number.isSafeInteger(p.last)&&p.last>=0?Math.min(p.last,now):now,running:p.running===true,owned,active,levels,avatar:['cyborg','hood','robot','pilot'].includes(p.avatar)?p.avatar:s.avatar,done:p.done===true,history:Array.isArray(p.history)?p.history.filter(x=>typeof x==='string'&&x.length<=150&&!/[<>&]/.test(x)).slice(0,30):[]};}
const capacity=s=>3+s.levels[2];
const rate=s=>Math.floor(s.active.reduce((n,id)=>n+(find(id)?.rate||0),0)*(100+10*(s.levels[0]+s.levels[1]+s.levels[3]))/100);
function settle(s,now){if(!Number.isSafeInteger(now)||now<=s.last)return 0;const elapsed=Math.min(now-s.last,30*DAY);s.last=now;if(!s.running||!s.active.length)return 0;const raw=BigInt(rate(s))*BigInt(elapsed)+BigInt(s.carry);const gained=Number(raw/BigInt(DAY));s.carry=Number(raw%BigInt(DAY));s.pending=clamp(s.pending+gained);s.total=clamp(s.total+gained);return gained;}
function claim(s,now){settle(s,now);const n=Math.min(s.pending,MAX-s.balance);s.balance+=n;s.pending-=n;return n;}
function buy(s,id,now){settle(s,now);const c=find(id);if(!c||s.owned.includes(id)||s.balance<c.price)return false;s.balance-=c.price;s.owned.push(id);if(s.active.length<capacity(s))s.active.push(id);return true;}
function equip(s,id,now){settle(s,now);if(!s.owned.includes(id))return false;if(s.active.includes(id)){s.active=s.active.filter(x=>x!==id);return true}if(s.active.length>=capacity(s))return false;s.active.push(id);return true;}
const upgradePrice=(s,i)=>mods[i].price*(s.levels[i]+1);
function upgrade(s,i,now){settle(s,now);if(!mods[i]||s.levels[i]>=3||s.balance<upgradePrice(s,i))return false;s.balance-=upgradePrice(s,i);s.levels[i]++;return true;}
function starterTask(s){if(s.done)return false;s.done=true;return true;}
const priceText=n=>(n/UNIT).toFixed(3);
const api={priceText,starterTask,UNIT,DAY,catalog,mods,find,fmt,fresh,load,capacity,rate,settle,claim,buy,equip,upgradePrice,upgrade};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.VoltGame=api;
})(globalThis);