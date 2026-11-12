// GM TOKEN virtual-game engine. Fixed-point amounts in 0.01 GM/CR; no money or blockchain.
// ECONOMY_PENDING settings are intentionally disabled until both co-owners approve them.
import crypto from 'node:crypto';
import {toCents} from './lib.mjs';
import {MAX_MINING_UPGRADE_LEVEL,miningUpgradeCost,miningUpgradeBonusPct,miningUpgradeBonusBps,miningUpgradeTotalCost,miningUpgradeTable,leagueForXp,GM_LEAGUES} from './mining-progression.mjs';
import {makeCandles,tradingSnapshot,indicativeAuction,INTERVALS} from './market-data.mjs';
const DAY=86400, HOUR=3600, MICRO=1000000;
const xpLevels=[0,100,250,450,750,1150,1700,2400,3300,4400];
const bases=process.env.GM_MINING_FAST_TRACK==='1'?[500,575,665,770,890,1025,1180,1350,1540,1750]:[10,14,19,25,32,40,50,62,75,90];
const power=(l)=>l>=10?25:l>=8?20:l>=6?15:l>=4?10:l>=2?5:0;
const capacity=(l)=>process.env.GM_MINING_FAST_TRACK==='1'?(l>=9?36:l>=5?30:24):(l>=9?24:l>=7?20:l>=5?16:l>=3?12:8);
const eff=(l)=>l>=9?[50,4]:l>=7?[40,3]:l>=5?[30,2]:l>=3?[20,1]:[0,0];
const boost=(c)=>{let x=0;for(const [gm,b] of [[50,5],[100,10],[250,15],[500,20],[1000,25],[2000,30],[5000,35],[10000,40],[25000,45],[50000,50]])if(c>=gm*100)x=b;return x};
const day=(t)=>new Date(t*1000).toISOString().slice(0,10);
const safe=(value)=>{if(!Number.isSafeInteger(value)||value<0)throw Error('integer accounting limit');return value};
const mulDiv=(a,b,c)=>{if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||!Number.isSafeInteger(c)||c<=0)throw Error('invalid fixed-point arithmetic');return safe(Number(BigInt(a)*BigInt(b)/BigInt(c)))};
const ceilDiv=(a,b)=>{if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||b<=0)throw Error('invalid quote');return safe(Number((BigInt(a)+BigInt(b)-1n)/BigInt(b)))};
const quote=(amountGM,priceCR)=>safe(Number((BigInt(amountGM)*BigInt(priceCR)+99n)/100n));
const requestId=(x)=>{const v=String(x||'');if(!/^[A-Za-z0-9_.:-]{8,100}$/.test(v))throw Error('operationId required (8..100 characters)');return v};
const amount=(v)=>toCents(String(v??''));
const rate=(u,w)=>{const base=bases[Math.min(9,Math.max(0,u.level-1))]*100;const legacy=mulDiv(base,(100+power(u.level))*(100+boost(w.vault)),10000);const upgrade=Math.min(MAX_MINING_UPGRADE_LEVEL,Math.max(1,Number(u.upgrade_level)||1));return mulDiv(legacy,10000+miningUpgradeBonusBps(upgrade),10000)};
export function makeGame({db,stmt,tx,log,now,send,readBody,sendTelegram}){
 db.exec(`CREATE TABLE IF NOT EXISTS game_settings(k TEXT PRIMARY KEY,v TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS mining_state(user_id TEXT PRIMARY KEY REFERENCES users(id),last_at INTEGER NOT NULL,reg_micro INTEGER NOT NULL DEFAULT 0,overflow_micro INTEGER NOT NULL DEFAULT 0,processed_cents INTEGER NOT NULL DEFAULT 0,pending_cents INTEGER NOT NULL DEFAULT 0,last_xp_day TEXT NOT NULL DEFAULT '');
 CREATE TABLE IF NOT EXISTS mining_upgrades(user_id TEXT PRIMARY KEY REFERENCES users(id),level INTEGER NOT NULL DEFAULT 1 CHECK(level BETWEEN 1 AND 200),updated_at INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS early_player_awards(slot INTEGER PRIMARY KEY CHECK(slot BETWEEN 1 AND 20),user_id TEXT NOT NULL UNIQUE REFERENCES users(id),awarded_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS holding_state(user_id TEXT PRIMARY KEY REFERENCES users(id),pending_cents INTEGER NOT NULL DEFAULT 0,last_withdraw_day TEXT NOT NULL DEFAULT '',carry_micro INTEGER NOT NULL DEFAULT 0,partial_micro INTEGER NOT NULL DEFAULT 0,last_checkpoint INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS holding_peak(user_id TEXT PRIMARY KEY REFERENCES users(id),peak_cents INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS points_account(user_id TEXT PRIMARY KEY REFERENCES users(id),points INTEGER NOT NULL DEFAULT 0,day TEXT NOT NULL DEFAULT '',daily_volume_cents INTEGER NOT NULL DEFAULT 0,daily_points INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS referrals(user_id TEXT PRIMARY KEY REFERENCES users(id),referrer_id TEXT NOT NULL REFERENCES users(id),created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),side TEXT NOT NULL CHECK(side IN ('buy','sell')),limit_price INTEGER NOT NULL,amount_cents INTEGER NOT NULL,remaining_cents INTEGER NOT NULL,locked_cents INTEGER NOT NULL,fee_paid_cents INTEGER NOT NULL DEFAULT 0,gross_received_cents INTEGER NOT NULL DEFAULT 0,quote_remainder INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL,auction INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,priority INTEGER NOT NULL,expires_at INTEGER,duration_sec INTEGER NOT NULL DEFAULT 0);
 CREATE INDEX IF NOT EXISTS idx_orders_book ON orders(side,status,limit_price,priority);
 CREATE TABLE IF NOT EXISTS trades(id TEXT PRIMARY KEY,buy_order TEXT NOT NULL,sell_order TEXT NOT NULL,buyer TEXT NOT NULL,seller TEXT NOT NULL,price INTEGER NOT NULL,amount_cents INTEGER NOT NULL,quote_cents INTEGER NOT NULL,at INTEGER NOT NULL,auction INTEGER NOT NULL DEFAULT 0,suspect INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS points_pair_day(day TEXT NOT NULL,user_id TEXT NOT NULL,other_id TEXT NOT NULL,eligible_gm_cents INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(day,user_id,other_id));
 CREATE TABLE IF NOT EXISTS box_day(day TEXT NOT NULL,user_id TEXT NOT NULL,gm_cents INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(day,user_id));
 CREATE TABLE IF NOT EXISTS box_collection(user_id TEXT PRIMARY KEY REFERENCES users(id),
  bronze INTEGER NOT NULL DEFAULT 0 CHECK(bronze>=0),
  silver INTEGER NOT NULL DEFAULT 0 CHECK(silver>=0),
  gold INTEGER NOT NULL DEFAULT 0 CHECK(gold>=0));
 CREATE TABLE IF NOT EXISTS request_ids(id TEXT PRIMARY KEY,actor TEXT NOT NULL,kind TEXT NOT NULL,created_at INTEGER NOT NULL,response TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS order_activity(user_id TEXT NOT NULL,at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS idx_order_activity ON order_activity(user_id,at);
 CREATE INDEX IF NOT EXISTS idx_order_activity_time ON order_activity(at);
 CREATE TABLE IF NOT EXISTS shop_day(user_id TEXT NOT NULL,day TEXT NOT NULL,cr_cents INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user_id,day));
 CREATE TABLE IF NOT EXISTS daily_claim(user_id TEXT NOT NULL,day TEXT NOT NULL,PRIMARY KEY(user_id,day));
 CREATE TABLE IF NOT EXISTS tasks_claim(user_id TEXT NOT NULL,task_id TEXT NOT NULL,PRIMARY KEY(user_id,task_id));
 CREATE TABLE IF NOT EXISTS achievements(user_id TEXT NOT NULL,code TEXT NOT NULL,PRIMARY KEY(user_id,code));
 CREATE TABLE IF NOT EXISTS balance_ledger(id TEXT NOT NULL,account TEXT NOT NULL,currency TEXT NOT NULL,delta_cents INTEGER NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(id,account,currency));`);
 // Existing test databases created before this audit have no quote_remainder.
 if(!stmt('PRAGMA table_info(orders)').all().some(x=>x.name==='quote_remainder'))db.exec('ALTER TABLE orders ADD COLUMN quote_remainder INTEGER NOT NULL DEFAULT 0');
 const config=(k,value)=>stmt('INSERT OR IGNORE INTO game_settings(k,v) VALUES(?,?)').run(k,String(value));
 const v=(k)=>stmt('SELECT v FROM game_settings WHERE k=?').get(k)?.v;
 const testEconomy=process.env.GM_PRIVATE_TEST_ECONOMY==='1';
 // Additional in-game prizes require a server-only explicit opt-in, enabled on staging only.
 // No randomized rewards or real-world token promises.
 const boxBonusEnabled=process.env.GM_BOX_BONUS_REWARDS==='1';
 const boxXp=Object.freeze({bronze:20,silver:60,gold:150});
 const boxFrameCatalog=Object.freeze([
  {id:'box_bronze_5',title:'Бронзовый искатель',kind:'bronze',required:5},
  {id:'box_silver_5',title:'Серебряный коллекционер',kind:'silver',required:5},
  {id:'box_gold_5',title:'Золотой хранитель',kind:'gold',required:5},
  {id:'box_bronze_cosmetic_1',title:'Новичок',kind:'bronze',required:10,type:'frame'},
  {id:'box_bronze_cosmetic_2',title:'Шахтёр',kind:'bronze',required:15,type:'badge'},
  {id:'box_bronze_cosmetic_3',title:'Бронза',kind:'bronze',required:20,type:'background'},
  {id:'box_bronze_cosmetic_4',title:'Коллекционер',kind:'bronze',required:30,type:'title'},
  {id:'box_bronze_cosmetic_5',title:'Бронзовая медаль',kind:'bronze',required:50,type:'medal'},
  {id:'box_silver_cosmetic_1',title:'Кристалл',kind:'silver',required:10,type:'frame'},
  {id:'box_silver_cosmetic_2',title:'Инвестор',kind:'silver',required:15,type:'badge'},
  {id:'box_silver_cosmetic_3',title:'Лунный свет',kind:'silver',required:20,type:'background'},
  {id:'box_silver_cosmetic_4',title:'Мастер GM',kind:'silver',required:30,type:'title'},
  {id:'box_silver_cosmetic_5',title:'Серебряная медаль',kind:'silver',required:50,type:'medal'},
  {id:'box_gold_cosmetic_1',title:'Корона',kind:'gold',required:10,type:'frame'},
  {id:'box_gold_cosmetic_2',title:'Легенда',kind:'gold',required:15,type:'badge'},
  {id:'box_gold_cosmetic_3',title:'Золотая галактика',kind:'gold',required:20,type:'background'},
  {id:'box_gold_cosmetic_4',title:'GM Legend',kind:'gold',required:30,type:'title'},
  {id:'box_gold_cosmetic_5',title:'Золотая медаль',kind:'gold',required:50,type:'medal'},
  {id:'box_master_30',title:'Мастер сундуков',kind:'total',required:30}
 ]);
 const collection=(id)=>{
  const row=stmt('SELECT bronze,silver,gold FROM box_collection WHERE user_id=?').get(id)||{bronze:0,silver:0,gold:0};
  return {...row,total:row.bronze+row.silver+row.gold};
 };
 const boxFrames=(counts)=>boxFrameCatalog.map(f=>({...f,
  claimed:counts[f.kind]>=f.required,locked:counts[f.kind]<f.required,limited:false,category:'box'}));
 const testTasks=[
  {id:'first_mining',title:'Первый Mining Claim',description:'Получить первую подтверждённую награду Mining',category:'Other',icon:'lightning',xp:25,gm:0,condition:{type:'mining_claim_count',gte:1}},
  {id:'first_vault',title:'Первый вклад в Vault',description:'Положить минимум 1 GM в Holding',category:'Other',icon:'coins',xp:25,gm:0,condition:{type:'vault_balance_gm',gte:1}},
  {id:'first_trade',title:'Первая подтверждённая сделка',description:'Исполнить ордер с другим пользователем',category:'Other',icon:'candlesticks',xp:50,gm:0,condition:{type:'trade_count',gte:1}},
  {id:'first_friend',title:'Первый приглашённый игрок',description:'Пригласить друга, который зарегистрируется',category:'Social',icon:'friends',xp:30,gm:0,condition:{type:'referrals_count',gte:1}},
  {id:'daily_claim',title:'Ежедневная активность',description:'Получить ежедневную награду',category:'Other',icon:'gift',xp:10,gm:0,daily:true,condition:{type:'daily_claim',gte:1}},
  {id:'mining_3_claims',title:'Искра пробуждения',description:'Собрать виртуальные GM в майнинге 3 раза',category:'Other',icon:'lightning',xp:35,gm:0,condition:{type:'mining_claim_count',gte:3}},
  {id:'mining_10_claims',title:'Серебряный добытчик',description:'Подтвердить 10 успешных сборов майнинга',category:'Other',icon:'diamond',xp:90,gm:0,condition:{type:'mining_claim_count',gte:10}},
  {id:'mining_30_claims',title:'Ритм стали',description:'Собрать GM через майнинг 30 раз',category:'Other',icon:'lightning',xp:180,gm:0,condition:{type:'mining_claim_count',gte:30}},
  {id:'mining_100_claims',title:'Мастер орбиты',description:'Подтвердить 100 сборов накопленных GM',category:'Other',icon:'gm-coin-orbit',xp:450,gm:0,condition:{type:'mining_claim_count',gte:100}},
  {id:'trades_3_verified',title:'Первый график',description:'Совершить 3 подтверждённые виртуальные сделки GM/CR',category:'Other',icon:'candlesticks',xp:65,gm:0,condition:{type:'trade_count',gte:3}},
  {id:'trades_10_verified',title:'Мастер рынка',description:'Совершить 10 подтверждённых игровых сделок',category:'Other',icon:'candlesticks',xp:180,gm:0,condition:{type:'trade_count',gte:10}},
  {id:'trades_50_verified',title:'Графитовый аналитик',description:'Совершить 50 проверенных игровых сделок',category:'Other',icon:'trending-up',xp:550,gm:0,condition:{type:'trade_count',gte:50}},
  {id:'friends_3_active',title:'Первая команда',description:'Пригласить 3 участников с зарегистрированными аккаунтами',category:'Social',icon:'friends',xp:80,gm:0,condition:{type:'referrals_count',gte:3}},
  {id:'friends_10_active',title:'Посланник GM',description:'Пригласить 10 зарегистрированных игроков',category:'Social',icon:'community',xp:230,gm:0,condition:{type:'referrals_count',gte:10}},
  {id:'friends_50_active',title:'Лидер сообщества',description:'Пригласить 50 зарегистрированных игроков',category:'Social',icon:'crown',xp:800,gm:0,condition:{type:'referrals_count',gte:50}},
  {id:'profile_level_3',title:'Новый горизонт',description:'Достичь третьего уровня профиля GM TOKEN',category:'Other',icon:'trophy',xp:50,gm:0,condition:{type:'mining_level',gte:3}},
  {id:'profile_level_7',title:'Серебряная эра',description:'Достичь седьмого уровня профиля GM TOKEN',category:'Other',icon:'star',xp:250,gm:0,condition:{type:'mining_level',gte:7}},
  {id:'genesis_20',title:'GM GENESIS · Основатель',description:'Уникальное задание только для 20 первых игроков GM TOKEN',category:'Other',icon:'crown',xp:300,gm:0,condition:{type:'founder_slot',gte:1}}
 ];
 const testAchievements=[
  {id:'mine_1',title:'Первый Claim',description:'Один Mining Claim',icon:'lightning',xp:20,gm:0,condition:{type:'mining_claim_count',gte:1}},
  {id:'mine_10',title:'Майнер',description:'Десять Mining Claim',icon:'lightning',xp:70,gm:0,condition:{type:'mining_claim_count',gte:10}},
  {id:'vault_50',title:'Первый Vault',description:'Положить 50 GM в Vault',icon:'coins',xp:30,gm:0,condition:{type:'vault_balance_gm',gte:50}},
  {id:'vault_1000',title:'Держатель GM',description:'Достичь 1000 GM в Vault',icon:'coins',xp:100,gm:0,condition:{type:'vault_balance_gm',gte:1000}},
  {id:'trade_1',title:'Первая сделка',description:'Одна подтверждённая сделка',icon:'candlesticks',xp:25,gm:0,condition:{type:'trade_count',gte:1}},
  {id:'trade_10',title:'Трейдер',description:'Десять подтверждённых сделок',icon:'candlesticks',xp:75,gm:0,condition:{type:'trade_count',gte:10}},
  {id:'friend_1',title:'Первый друг',description:'Пригласить одного игрока',icon:'friends',xp:25,gm:0,condition:{type:'referrals_count',gte:1}},
  {id:'friend_5',title:'Сообщество',description:'Пригласить пять игроков',icon:'friends',xp:75,gm:0,condition:{type:'referrals_count',gte:5}},
  {id:'level_5',title:'Уровень 5',description:'Достичь уровня Mining 5',icon:'trophy',xp:50,gm:0,condition:{type:'mining_level',gte:5}},
  {id:'level_10',title:'Уровень 10',description:'Достичь уровня Mining 10',icon:'trophy',xp:100,gm:0,condition:{type:'mining_level',gte:10}}
 ];
  const init=now();config('start_at',Math.floor(init/DAY)*DAY);config('mining_spent',0);config('holding_last_hour',Math.floor(init/HOUR)*HOUR);config('auction_end',init+Math.max(1,Number(process.env.AUCTION_DURATION_SECONDS||86400)));config('auction_done',0);config('trade_test_mode',0);config('order_seq',0);config('last_trade_price',0);
 // These rules remain undecided; code paths are implemented, but disabled by default.
 config('holding_daily_bps',Math.min(50,Math.max(0,Number(process.env.HOLDING_DAILY_BPS??(testEconomy?10:0))))); // 50bp=0.5%/day max
 config('daily_gm_cents',Math.max(0,Number(process.env.DAILY_REWARD_GM??(testEconomy?10:0))*100));
 config('box_rewards_json',process.env.BOX_REWARDS_GM_JSON||(testEconomy?JSON.stringify({bronze:15,silver:45,gold:105}):'{}'));
 config('shop_rate_mode',process.env.SHOP_RATE_MODE||(testEconomy?'median95':'disabled'));
 config('shop_min_trades',Number(process.env.SHOP_MIN_TRADES??(testEconomy?5:20)));
 config('shop_min_volume_gm',Number(process.env.SHOP_MIN_VOLUME_GM??(testEconomy?1000:10000)));
 config('trade_price_guard_bps',Math.min(3000,Math.max(500,Number(process.env.TRADE_PRICE_GUARD_BPS||1500))));
 config('tasks_json',process.env.GAME_TASKS_JSON||((testEconomy||process.env.GM_TASKS_ENABLED==='1')?JSON.stringify(testTasks):'[]'));
 config('achievements_json',process.env.GAME_ACHIEVEMENTS_JSON||(testEconomy?JSON.stringify(testAchievements):'[]'));
 config('tasks_catalog_version','0');
 for(const name of ['HOLDING_FEES','TRADE_GM_REWARDS','TRADE_CR_REWARDS'])stmt('INSERT OR IGNORE INTO pools(name,gm,cr) VALUES(?,0,0)').run(name);
 function setting(k,n){stmt('UPDATE game_settings SET v=? WHERE k=?').run(String(n),k)}
 // Explicitly enabled virtual test rewards, preserving prior owner-defined values.
 if(process.env.GM_ENABLE_REWARDS==='1'){
  const dailyValue=Number(process.env.DAILY_REWARD_GM||10);
  if(Number(v('daily_gm_cents'))===0&&dailyValue>0&&dailyValue<=100)
   setting('daily_gm_cents',Math.round(dailyValue*100));
  const existing=JSON.parse(v('box_rewards_json')||'{}');
  if(!Object.keys(existing).length){
   const rewards=JSON.parse(process.env.BOX_REWARDS_GM_JSON||'{"bronze":15,"silver":45,"gold":105}');
   if(['bronze','silver','gold'].every(k=>Number.isSafeInteger(rewards[k])&&rewards[k]>0&&rewards[k]<=500))
    setting('box_rewards_json',JSON.stringify(rewards));
  }
 }
 if(process.env.GM_TASKS_ENABLED==='1'&&v('tasks_json')==='[]')setting('tasks_json',JSON.stringify(testTasks));
 if(process.env.GM_TASKS_ENABLED==='1'&&Number(v('tasks_catalog_version'))<2){
  const rows=JSON.parse(v('tasks_json')||'[]');
  if(Array.isArray(rows)){
   const existing=new Set(rows.map(r=>r.id));
   // Add only the new, server-verifiable goals. Keep all custom admin-made tasks.
   const additions=testTasks.slice(5).filter(r=>!existing.has(r.id));
   if(rows.length+additions.length<=100)setting('tasks_json',JSON.stringify([...rows,...additions]));
  }
  setting('tasks_catalog_version','2');
 }

 // Private testing only: deliberately advance the existing auction without
 // granting GM, fabricating orders, trades, price history or POINTS.
 // This is a one-way transition for this database. No effect without
 // GM_TEST_OPEN_TRADING=1 in the server process environment.
 if(process.env.GM_TEST_OPEN_TRADING==='1'){
  if(v('trade_test_mode')!=='1'){
   setting('trade_test_mode',1);
   log('system','private_test_trading_enabled',{at:now(),note:'no synthetic price, balances or liquidity'});
  }
  if(v('auction_done')!=='1' && Number(v('auction_end'))>=now()){
   setting('auction_end',now()-1);
   log('system','private_test_premarket_shortened',{at:now()});
  }
 }
 function ensure(id){const t=now();
  // Historical registration order is respected; no paid/repeatable claim can take a founder slot.
  const pioneers=stmt('SELECT id FROM users ORDER BY created_at,id LIMIT 20').all();
  for(let i=0;i<pioneers.length;i++)stmt('INSERT OR IGNORE INTO early_player_awards(slot,user_id,awarded_at) VALUES(?,?,?)').run(i+1,pioneers[i].id,t);
  stmt('INSERT OR IGNORE INTO mining_upgrades(user_id,level,updated_at) VALUES(?,1,?)').run(id,t);stmt('INSERT OR IGNORE INTO mining_state(user_id,last_at) VALUES(?,?)').run(id,t);stmt('INSERT OR IGNORE INTO holding_state(user_id,last_checkpoint) VALUES(?,?)').run(id,t);stmt('INSERT OR IGNORE INTO points_account(user_id) VALUES(?)').run(id);stmt('INSERT OR IGNORE INTO box_collection(user_id) VALUES(?)').run(id);stmt('INSERT OR IGNORE INTO holding_peak(user_id,peak_cents) SELECT user_id,vault FROM wallets WHERE user_id=?').run(id)}
 function once(id,actor,kind,callback){const existing=stmt('SELECT actor,kind,response FROM request_ids WHERE id=?').get(id);if(existing){if(existing.actor!==actor||existing.kind!==kind)throw Error('operationId already used for another operation');return JSON.parse(existing.response)}const response=callback();stmt('INSERT INTO request_ids(id,actor,kind,created_at,response) VALUES(?,?,?,?,?)').run(id,actor,kind,now(),JSON.stringify(response));return response}
 const wal=(id)=>stmt('SELECT * FROM wallets WHERE user_id=?').get(id);
 const upgradeLevel=(id)=>stmt('SELECT level FROM mining_upgrades WHERE user_id=?').get(id)?.level??1;
 const earlyNames=['Первый свет','Искра GM','Серебряный основатель','Алмазный исток','Первый хранитель','Полярная звезда','Стальной первопроходец','GM Genesis','Серебряное крыло','Код создателя','Рождение легенды','Северное сияние','Проводник GM','Первый импульс','Графитовая корона','Сердце токена','Хранитель эпохи','Лунный металл','Звёздный майнер','Вечный основатель'];
 const cosmetics=(id)=>{
  const slot=stmt('SELECT slot FROM early_player_awards WHERE user_id=?').get(id)?.slot||null;
  const upgrade=upgradeLevel(id);
  const frames=Array.from({length:20},(_,i)=>({id:'founder_'+(i+1),title:earlyNames[i],category:'founder',claimed:slot===i+1,locked:slot!==i+1,limited:true}));
  for(const level of [25,50,75,100,125,150,175,200])frames.push({id:'mining_'+level,title:'GM Mining · '+level,category:'milestone',claimed:upgrade>=level,locked:upgrade<level,limited:false});
  if(boxBonusEnabled)frames.push(...boxFrames(collection(id)));
  return {founder_slot:slot,frames};
 };

 const upgradeState=(id)=>{
  const level=upgradeLevel(id),next=level<MAX_MINING_UPGRADE_LEVEL?level+1:null;
  return {level,max_level:MAX_MINING_UPGRADE_LEVEL,bonus_pct:miningUpgradeBonusPct(level),payment_mode:process.env.GM_UPGRADE_PAYMENT_MODE==='virtual_test'?'virtual_test':'wallet_pending',purchasable:process.env.GM_UPGRADE_PAYMENT_MODE==='virtual_test',total_spent_gm:miningUpgradeTotalCost(level),
   next_level:next,next_cost_gm:next?miningUpgradeCost(next):null,next_bonus_pct:next?miningUpgradeBonusPct(next):null};
 };
 const pool=(name,col='gm')=>stmt(`SELECT ${col} as balance FROM pools WHERE name=?`).get(name)?.balance??0;
 function takePool(name,field,n){if(!stmt(`UPDATE pools SET ${field}=${field}-? WHERE name=? AND ${field}>=?`).run(n,name,n).changes)throw Error(`${name} reserve insufficient`)}
 function addPool(name,field,n){stmt(`UPDATE pools SET ${field}=${field}+? WHERE name=?`).run(n,name)}
 function walletChange(id,currency,n){if(!Number.isSafeInteger(n))throw Error('invalid balance delta');if(n<0){if(!stmt(`UPDATE wallets SET ${currency}=${currency}+? WHERE user_id=? AND ${currency}>=?`).run(n,id,-n).changes)throw Error(`insufficient ${currency.toUpperCase()}`)}else if(n>0)stmt(`UPDATE wallets SET ${currency}=${currency}+? WHERE user_id=?`).run(n,id)}
 function awardXp(id,value){const u=stmt('SELECT xp FROM users WHERE id=?').get(id);if(!u)return;const xp=u.xp+value;const lvl=Math.max(1,xpLevels.findLastIndex(th=>xp>=th)+1);stmt('UPDATE users SET xp=?,level=? WHERE id=?').run(xp,Math.min(10,lvl),id)}
 function settleMining(){const t=now();const miners=stmt('SELECT m.*,u.level,w.vault,COALESCE(mu.level,1) AS upgrade_level FROM mining_state m JOIN users u ON u.id=m.user_id JOIN wallets w ON w.user_id=m.user_id LEFT JOIN mining_upgrades mu ON mu.user_id=m.user_id').all();const due=[];
  for(const m of miners){let secs=Math.max(0,t-m.last_at);if(!secs)continue;const b=rate(m,{vault:m.vault});const capReg=mulDiv(b*MICRO,capacity(m.level),24);const [pct,hr]=eff(m.level);const capOver=mulDiv(b*MICRO,hr*pct,2400);let reg=m.reg_micro,extra=m.overflow_micro;
   const produced=mulDiv(b*MICRO,Math.min(secs,30*DAY),DAY);const toReg=Math.min(Math.max(0,capReg-reg),produced);reg+=toReg;
   // Overflow is produced only after standard Storage is full, and only at Efficiency rate.
   const after=produced-toReg;extra+=Math.min(Math.max(0,capOver-extra),mulDiv(after,pct,100));
   const total=Math.floor((reg+extra)/MICRO);const newDue=Math.max(0,total-m.processed_cents);
   stmt('UPDATE mining_state SET last_at=?,reg_micro=?,overflow_micro=?,processed_cents=? WHERE user_id=?').run(t,reg,extra,total,m.user_id);if(newDue)due.push({id:m.user_id,n:newDue});
  }
  const season=Number(v('start_at'));const days=Math.min(90,Math.max(1,Math.floor((t-season)/DAY)+1));const released=days*500000*100;const currentSpent=Number(v('mining_spent'));
  const allowance=days<90?Math.min(pool('MINING'),Math.max(0,released-currentSpent)):pool('MINING');const demand=due.reduce((s,x)=>s+x.n,0);if(!demand||!allowance)return;
  const assign=Math.min(allowance,demand);let allocated=0;
  for(const row of due){row.give=mulDiv(assign,row.n,demand);row.frac=(BigInt(assign)*BigInt(row.n))%BigInt(demand);allocated+=row.give}
  due.sort((a,b)=>a.frac===b.frac?a.id.localeCompare(b.id):a.frac>b.frac?-1:1);
  for(let i=0;i<assign-allocated;i++)due[i].give++;
  let spent=0;for(const x of due)if(x.give){stmt('UPDATE mining_state SET pending_cents=pending_cents+? WHERE user_id=?').run(x.give,x.id);spent+=x.give}
  if(spent){takePool('MINING','gm',spent);setting('mining_spent',currentSpent+spent);log('system','mining_settlement',{users:due.length,gm_cents:spent,requested_cents:demand})}
 }
 function accrueHoldingPosition(id,t=now()){
  const h=stmt('SELECT last_checkpoint,partial_micro FROM holding_state WHERE user_id=?').get(id);
  if(!h)return;const elapsed=Math.max(0,t-h.last_checkpoint),bps=Math.min(50,Math.max(0,Number(v('holding_daily_bps'))));
  const vault=wal(id).vault;const extra=bps&&vault?Number((BigInt(vault)*BigInt(bps)*BigInt(elapsed)*BigInt(MICRO))/BigInt(10000*DAY)):0;
  stmt('UPDATE holding_state SET partial_micro=?,last_checkpoint=? WHERE user_id=?').run(safe(h.partial_micro+extra),t,id);
 }
 function settleHolding(){
  const hour=Math.floor(now()/HOUR)*HOUR;const previous=Number(v('holding_last_hour'));
  if(hour<=previous)return;setting('holding_last_hour',hour);
  const bps=Math.min(50,Math.max(0,Number(v('holding_daily_bps'))));if(!bps)return;
  const due=[];const holders=stmt('SELECT h.user_id,h.last_checkpoint,h.partial_micro,h.carry_micro,w.vault FROM holding_state h JOIN wallets w ON h.user_id=w.user_id').all();
  for(const row of holders){
   if(row.last_checkpoint>hour)continue;
   const sec=hour-row.last_checkpoint;
   const micro=row.vault?Number((BigInt(row.vault)*BigInt(bps)*BigInt(sec)*BigInt(MICRO))/BigInt(10000*DAY)):0;
   const sum=safe(row.carry_micro+row.partial_micro+micro),cent=Math.floor(sum/MICRO);
   stmt('UPDATE holding_state SET carry_micro=?,partial_micro=0,last_checkpoint=? WHERE user_id=?').run(sum%MICRO,hour,row.user_id);
   if(cent)due.push({id:row.user_id,n:cent});
  }
  const availableHolder=Math.min(stmt('SELECT gm FROM holding_buckets WHERE name=?').get('HOLDER').gm,pool('HOLDING'));
  const available=availableHolder+pool('HOLDING_FEES');
  const demand=due.reduce((a,b)=>a+b.n,0);if(!demand||!available)return;
  const distribute=Math.min(demand,available);let assigned=0;
  for(const d of due){d.give=mulDiv(distribute,d.n,demand);assigned+=d.give;d.frac=(BigInt(distribute)*BigInt(d.n))%BigInt(demand)}
  due.sort((a,b)=>a.frac===b.frac?a.id.localeCompare(b.id):a.frac>b.frac?-1:1);
  for(let i=0;i<distribute-assigned;i++)due[i].give++;
  for(const d of due)if(d.give)stmt('UPDATE holding_state SET pending_cents=pending_cents+? WHERE user_id=?').run(d.give,d.id);
  const fromHolder=Math.min(distribute,availableHolder),fromFees=distribute-fromHolder;
  if(fromHolder){stmt('UPDATE holding_buckets SET gm=gm-? WHERE name=?').run(fromHolder,'HOLDER');takePool('HOLDING','gm',fromHolder)}
  if(fromFees)takePool('HOLDING_FEES','gm',fromFees);
  log('system','holding_settlement',{gm_cents:distribute,requested_cents:demand,hours:(hour-previous)/HOUR});
 }
 // Persistent UTC streak history comes from committed, unique daily_claim rows.
 // No client-provided timestamps or local-storage progress can affect payouts.
 const DAILY_MILESTONES=Object.freeze({5:25,10:50,15:75,20:100,25:150,30:200});
 const milestoneTestEnabled=testEconomy&&process.env.GM_DAILY_MILESTONE_TEST==='1';
 const dailyCycle=(streak)=>((streak-1)%30)+1;
 function dailyRewardCents(base,streak){
  if(!milestoneTestEnabled||base<=0)return base;
  const milestone=DAILY_MILESTONES[dailyCycle(streak)];
  // GM milestones are an opt-in test-only schedule, funded from the existing DAILY pool.
  return milestone?Math.max(base,milestone*100):base;
 }
 function dailyProfile(id){
  const rows=stmt('SELECT day FROM daily_claim WHERE user_id=? ORDER BY day ASC').all(id);
  let current=0,best=0,previous=null,last=null;
  for(const row of rows){
   const timestamp=Date.parse(row.day+'T00:00:00Z')/1000;
   if(!Number.isFinite(timestamp))throw Error('invalid stored daily claim date');
   current=previous!==null&&timestamp-previous===DAY?current+1:1;
   best=Math.max(best,current);previous=timestamp;last=row.day;
  }
  const today=day(now()),yesterday=day(now()-DAY);
  const claimed=last===today;
  const active=claimed||last===yesterday;
  const streak=active?current:0;
  const nextStreak=claimed?current+1:streak+1;
  const base=Number(v('daily_gm_cents'));
  const nextReward=dailyRewardCents(base,nextStreak);
  return {streak,best_streak:best,last_claim_day:last,total_claims:rows.length,
   claimed_today:claimed,next_streak:nextStreak,next_cycle_day:dailyCycle(nextStreak),
   next_reward_gm:nextReward/100,milestone_enabled:milestoneTestEnabled,
   milestone_rewards:milestoneTestEnabled?DAILY_MILESTONES:{}};
 }
 function catalog(kind){const s=v(kind==='tasks'?'tasks_json':'achievements_json');const rows=JSON.parse(s||'[]');if(!Array.isArray(rows)||rows.length>100)throw Error('invalid configured task catalog');return rows}
 function qualifies(userId,condition,kind='tasks'){if(!condition||typeof condition!=='object')return false;const target=Math.max(0,Number(condition.gte||1));if(!Number.isFinite(target)||target>1000000000)return false;let current=0;
  switch(condition.type){
   case 'mining_level':current=stmt('SELECT level FROM users WHERE id=?').get(userId)?.level||0;break;
   case 'vault_balance_gm':current=kind==='achievements'?(stmt('SELECT peak_cents FROM holding_peak WHERE user_id=?').get(userId)?.peak_cents||0)/100:(wal(userId)?.vault||0)/100;break;
   case 'trade_count':current=stmt('SELECT COUNT(*) n FROM trades WHERE suspect=0 AND (buyer=? OR seller=?)').get(userId,userId).n;break;
   case 'referrals_count':current=stmt('SELECT COUNT(*) n FROM referrals WHERE referrer_id=?').get(userId).n;break;
   case 'mining_claim_count':current=stmt("SELECT COUNT(*) n FROM journal WHERE kind='mining_claim' AND info LIKE ?").get(`%"user":"${userId}"%`).n;break;
   case 'holding_claim_count':current=stmt("SELECT COUNT(*) n FROM journal WHERE kind='holding_claim' AND info LIKE ?").get(`%"user":"${userId}"%`).n;break;
   case 'daily_claim':current=stmt('SELECT 1 n FROM daily_claim WHERE user_id=? AND day=?').get(userId,day(now()))?.n||0;break;
   case 'founder_slot':current=stmt('SELECT slot FROM early_player_awards WHERE user_id=?').get(userId)?.slot?1:0;break;
   default:return false;
  }
  return current>=target;
 }
 function catalogStatus(id,kind){return catalog(kind).filter(x=>typeof x.id==='string'&&/^[A-Za-z0-9_:-]{2,60}$/.test(x.id)).map(row=>{const key=(kind==='tasks'&&row.daily)?`${row.id}:${day(now())}`:row.id;const claimed=kind==='tasks'?!!stmt('SELECT 1 FROM tasks_claim WHERE user_id=? AND task_id=?').get(id,key):!!stmt('SELECT 1 FROM achievements WHERE user_id=? AND code=?').get(id,key);return {...row,claimed,available:!claimed&&qualifies(id,row.condition,kind)}})}
 function claimCatalog(id,kind,body){ensure(id);const ident=requestId(body.operationId);return tx(()=>once(ident,id,kind+'_claim',()=>{
   const row=catalog(kind).find(r=>r.id===body.id);if(!row)throw Error('task/achievement not found');
   const key=(kind==='tasks'&&row.daily)?`${row.id}:${day(now())}`:row.id;
   const table=kind==='tasks'?'tasks_claim':'achievements',col=kind==='tasks'?'task_id':'code';
   if(stmt(`SELECT 1 FROM ${table} WHERE user_id=? AND ${col}=?`).get(id,key))throw Error('reward already claimed');
   if(!qualifies(id,row.condition,kind))throw Error('requirements not fulfilled');
   const xp=Math.max(0,Math.trunc(Number(row.xp||0))),gm=Math.max(0,Number(row.gm||0));if(!Number.isSafeInteger(xp)||xp>10000||!Number.isSafeInteger(gm*100)||gm>100000)throw Error('invalid task reward configuration');
   const reward=Math.round(gm*100);if(reward){takePool('DAILY','gm',reward);walletChange(id,'gm',reward)}
   if(xp){settleMining();awardXp(id,xp)}stmt(`INSERT INTO ${table}(user_id,${col}) VALUES(?,?)`).run(id,key);log(id,kind+'_claimed',{user:id,code:key,xp,gm_cents:reward});return {xp,gm_cents:reward,wallet:wal(id),level:stmt('SELECT level FROM users WHERE id=?').get(id).level};
  }))}
 function activeUser(id){const restriction=stmt('SELECT end_at FROM restrictions WHERE user_id=?').get(id);if(restriction&&(restriction.end_at===null||restriction.end_at>now()))throw Error('trading temporarily restricted')}
 // POINTS are non-tradable, non-transferable and cannot move the GM/CR price.
 // Extra volume from one counterparty is excluded after the daily cap; this blocks
 // the simplest two-account loop but is not a complete Sybil/collusion defense.
 function pointsCredit(id,otherId,amountGM){
  const d=day(now()),pairCap=Number(process.env.POINTS_PAIR_DAILY_GM_CAP||10000)*100;
  const pair=stmt('SELECT eligible_gm_cents FROM points_pair_day WHERE day=? AND user_id=? AND other_id=?').get(d,id,otherId);
  const allowed=Math.max(0,Math.min(amountGM,pairCap-(pair?.eligible_gm_cents||0)));
  if(!allowed)return;
  stmt('INSERT INTO points_pair_day(day,user_id,other_id,eligible_gm_cents) VALUES(?,?,?,?) ON CONFLICT(day,user_id,other_id) DO UPDATE SET eligible_gm_cents=eligible_gm_cents+excluded.eligible_gm_cents').run(d,id,otherId,allowed);
  const p=stmt('SELECT * FROM points_account WHERE user_id=?').get(id),oldVol=p.day===d?p.daily_volume_cents:0,oldEarn=p.day===d?p.daily_points:0;
  const vol=oldVol+allowed,totalPoints=Math.min(1000,Math.floor(vol/1000000)*10),award=Math.max(0,totalPoints-oldEarn);
  stmt('UPDATE points_account SET day=?,daily_volume_cents=?,daily_points=?,points=points+? WHERE user_id=?').run(d,vol,totalPoints,award,id);
 }
 // Protected index is the rolling volume-weighted median of trusted trades.
 // Reject >15% price dislocations only once minimum history is available.
 function referencePrice(){
  const rows=stmt('SELECT price,amount_cents FROM trades WHERE suspect=0 AND at>=? ORDER BY price ASC').all(now()-86400);
  const total=rows.reduce((n,r)=>n+r.amount_cents,0);
  if(rows.length<5||total<100000)return null;
  let cumulative=0;for(const r of rows){cumulative+=r.amount_cents;if(cumulative*2>=total)return r.price}return null;
 }
 function outlier(price){const ref=referencePrice();if(!ref)return false;const bps=Number(v('trade_price_guard_bps'));return BigInt(price)*10000n<BigInt(ref)*BigInt(10000-bps)||BigInt(price)*10000n>BigInt(ref)*BigInt(10000+bps)}
 function splitFee(currency,n){const left=Math.floor(n/2);addPool('TREASURY',currency,left);addPool(currency==='gm'?'TRADE_GM_REWARDS':'TRADE_CR_REWARDS',currency,n-left)}
 function finishOrder(o,remaining,locked,received,fee){stmt('UPDATE orders SET remaining_cents=?,locked_cents=?,gross_received_cents=gross_received_cents+?,fee_paid_cents=fee_paid_cents+?,status=? WHERE id=?').run(remaining,locked,received,fee,remaining?'open':'filled',o.id)}
 // Called only inside a database transaction. Prices are in 0.01 CR per whole GM.
 function relatedAccounts(a,b){
  // Being in the same invite tree is a concrete, auditable signal, not identity proof.
  // Related traders may trade but cannot inflate reward-eligible volume or trusted price.
  const x=stmt('SELECT referrer_id FROM referrals WHERE user_id=?').get(a)?.referrer_id;
  const y=stmt('SELECT referrer_id FROM referrals WHERE user_id=?').get(b)?.referrer_id;
  return Boolean((x&&x===b)||(y&&y===a)||(x&&y&&x===y));
 }
 function matchOne(b,s,qty,price,auction=false){if(b.user_id===s.user_id||outlier(price))return false;
  // GM is stored in cents, price in CR cents per full GM. Keep sub-cent
  // remainder on the buyer order, so fragmenting a trade cannot overcharge
  // the buyer or exceed the funds reserved for the complete limit order.
  const raw=BigInt(qty)*BigInt(price)+BigInt(b.quote_remainder||0);
  const cost=safe(Number(raw/100n)),nextRemainder=Number(raw%100n);
  if(cost<1)return false;
  if(b.locked_cents<cost||s.locked_cents<qty)return false;
  const feeB=mulDiv(b.gross_received_cents+qty,5,1000)-mulDiv(b.gross_received_cents,5,1000);
  const feeS=mulDiv(s.gross_received_cents+cost,5,1000)-mulDiv(s.gross_received_cents,5,1000);
  const br=b.remaining_cents-qty,sr=s.remaining_cents-qty;let bl=b.locked_cents-cost,sl=s.locked_cents-qty;
  // A limit buy may get a price improvement; refund unused CR, reserving exactly the remaining limit notional.
  if(b.limit_price){const required=quote(br,b.limit_price);if(bl<required)return false;const refund=bl-required;bl=required;if(refund)walletChange(b.user_id,'cr',refund)}
  walletChange(b.user_id,'gm',qty-feeB);walletChange(s.user_id,'cr',cost-feeS);splitFee('gm',feeB);splitFee('cr',feeS);
  finishOrder(b,br,bl,qty,feeB);finishOrder(s,sr,sl,cost,feeS);
  stmt('UPDATE orders SET quote_remainder=? WHERE id=?').run(nextRemainder,b.id);
  if(br===0&&bl){walletChange(b.user_id,'cr',bl);stmt('UPDATE orders SET locked_cents=0 WHERE id=?').run(b.id)}
  if(sr===0&&sl){walletChange(s.user_id,'gm',sl);stmt('UPDATE orders SET locked_cents=0 WHERE id=?').run(s.id)}
  const tradeId=crypto.randomUUID();
  const pairCount=stmt('SELECT COUNT(*) AS n FROM trades WHERE at>? AND ((buyer=? AND seller=?) OR (buyer=? AND seller=?))').get(now()-3600,b.user_id,s.user_id,s.user_id,b.user_id).n;
  // Tunable risk signal, NOT proof of manipulation. Suspicious volume is excluded from POINTS/shop pricing.
  const suspectThreshold=Math.max(3,Number(process.env.WASH_SIGNAL_TRADES_PER_PAIR_HOUR||12));
  const repeatPair=pairCount>=suspectThreshold;
  const recentPair=stmt('SELECT COUNT(*) AS n FROM trades WHERE at>? AND ((buyer=? AND seller=?) OR (buyer=? AND seller=?))').get(now()-900,b.user_id,s.user_id,s.user_id,b.user_id).n;
  const related=relatedAccounts(b.user_id,s.user_id);
  const suspect=(related||repeatPair||recentPair>=3)?1:0;
  stmt('INSERT INTO trades(id,buy_order,sell_order,buyer,seller,price,amount_cents,quote_cents,at,auction,suspect) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(tradeId,b.id,s.id,b.user_id,s.user_id,price,qty,cost,now(),auction?1:0,suspect);
  if(!suspect){pointsCredit(b.user_id,s.user_id,qty);pointsCredit(s.user_id,b.user_id,qty)}else log('system','suspicious_trade_review',{trade:tradeId,buyer:b.user_id,seller:s.user_id,reason:related?'referral relationship':'repeated counterparty',risk_signal:true});if(!suspect)setting('last_trade_price',price);log('system','gm_cr_trade',{trade:tradeId,buyer:b.user_id,seller:s.user_id,gm_cents:qty,cr_cents:cost,price,fee_gm:feeB,fee_cr:feeS,auction,suspect});return true;
 }
 function book(side,price,excludeUser){return stmt(`SELECT * FROM orders WHERE status='open' AND side=? AND auction=0 AND user_id!=? AND (expires_at IS NULL OR expires_at>?) AND limit_price ${side==='sell'?'<=':'>='} ? ORDER BY limit_price ${side==='sell'?'ASC':'DESC'},priority ASC LIMIT 100`).all(side,excludeUser,now(),price)}
 function transactLimit(o){const side=o.side==='buy'?'sell':'buy';const candidates=book(side,o.limit_price,o.user_id);let latest=o;
  for(const resting of candidates){if(latest.remaining_cents===0)break;const n=Math.min(latest.remaining_cents,resting.remaining_cents);const b=o.side==='buy'?latest:resting,s=o.side==='sell'?latest:resting;const fill=matchOne(b,s,n,resting.limit_price);if(!fill)continue;latest=stmt('SELECT * FROM orders WHERE id=?').get(o.id)}return latest;
 }
 function nextSeq(){const n=Number(v('order_seq'))+1;setting('order_seq',n);return n}
 function expireOrders(){for(const o of stmt("SELECT * FROM orders WHERE status='open' AND expires_at IS NOT NULL AND expires_at<=?").all(now()))cancelOrder(o,'expired')}
 function cancelOrder(o,status='cancelled'){if(o.status!=='open')throw Error('order not open');walletChange(o.user_id,o.side==='buy'?'cr':'gm',o.locked_cents);stmt('UPDATE orders SET locked_cents=0,status=? WHERE id=?').run(status,o.id)}
 function doAuction(){if(v('auction_done')==='1'||now()<Number(v('auction_end')))return;const all=stmt("SELECT * FROM orders WHERE status='open' AND auction=1").all();
  const bids=all.filter(x=>x.side==='buy'),asks=all.filter(x=>x.side==='sell');
  // Identical reference algorithm for public premarket quote and actual auction.
  // Never publish or execute a clearing price based on self-crossing orders alone.
  const indicative=indicativeAuction(all),clearingPrice=indicative.price;
  let cleared=0;if(clearingPrice!==null){const buy=bids.filter(x=>x.limit_price>=clearingPrice).sort((a,b)=>b.limit_price-a.limit_price||a.priority-b.priority),sell=asks.filter(x=>x.limit_price<=clearingPrice).sort((a,b)=>a.limit_price-b.limit_price||a.priority-b.priority);
   for(const bb of buy)for(const ss of sell){const b=stmt('SELECT * FROM orders WHERE id=?').get(bb.id),s=stmt('SELECT * FROM orders WHERE id=?').get(ss.id);if(!b.remaining_cents||!s.remaining_cents)continue;const n=Math.min(b.remaining_cents,s.remaining_cents);if(matchOne(b,s,n,clearingPrice,true))cleared+=n}
  }
  stmt("UPDATE orders SET auction=0,expires_at=CASE WHEN duration_sec=0 THEN NULL ELSE ?+duration_sec END WHERE auction=1 AND status='open'").run(Number(v('auction_end')));setting('auction_done',1);log('system','opening_auction_done',{price:clearingPrice,executed_gm_cents:cleared});
 }
 function settle(){expireOrders();doAuction();settleMining();settleHolding()}
 const err=(e)=>{const m=e instanceof Error?e.message:String(e);return m};
 async function handle(p,verb,id,req,res){
  const read=()=>readBody(req);const response=(status,data)=>send(res,status,data);
  if(p==='/api/market/ohlcv'&&verb==='GET'){
   const params=new URL(req.url,'http://localhost').searchParams,interval=params.get('interval')||'1h';
   if(!INTERVALS[interval])throw Error('invalid interval');
   return response(200,tx(()=>{doAuction();expireOrders();const since=now()-Math.min(365*DAY,Math.max(180*INTERVALS[interval],DAY));const trades=stmt('SELECT rowid AS seq,id,at,price,amount_cents,quote_cents,suspect FROM trades WHERE at>=? ORDER BY at ASC,rowid ASC LIMIT 100000').all(since);return {interval,price_unit:'CR cents/GM',candles:makeCandles(trades,interval,180),synthetic:false}}));
  }
  if(p==='/api/market/ticker'&&verb==='GET')return response(200,tx(()=>{doAuction();expireOrders();const latest=stmt('SELECT rowid AS seq,price,amount_cents,quote_cents,at,suspect FROM trades ORDER BY at DESC,rowid DESC LIMIT 10000').all();const bids=stmt("SELECT limit_price FROM orders WHERE side='buy' AND status='open' ORDER BY limit_price DESC LIMIT 1").all();const asks=stmt("SELECT limit_price FROM orders WHERE side='sell' AND status='open' ORDER BY limit_price ASC LIMIT 1").all();return {...tradingSnapshot(latest,now(),bids,asks),auction_end_at:Number(v('auction_end')),auction_done:v('auction_done')==='1',premarket:v('auction_done')!=='1',trade_test_mode:v('trade_test_mode')==='1',indicative:v('auction_done')==='1'?null:indicativeAuction(stmt("SELECT user_id,side,limit_price,remaining_cents,auction,status FROM orders WHERE status='open' AND auction=1").all())}}));
    if(p==='/api/leaderboard'&&verb==='GET')return response(200,{users:[],pending_rule:true,score_source:'verified_onchain_gm_only',use_endpoint:'/api/holders'});
  if(p==='/api/mining/upgrades'&&verb==='GET')return response(200,tx(()=>{ensure(id);return {upgrade:upgradeState(id),levels:miningUpgradeTable()}}));
  if(p==='/api/tasks'&&verb==='GET')return response(200,{tasks:catalogStatus(id,'tasks')});
  if(p==='/api/achievements'&&verb==='GET')return response(200,{achievements:catalogStatus(id,'achievements')});
  if(p==='/api/tasks/claim'&&verb==='POST')return response(200,claimCatalog(id,'tasks',await read()));
  if(p==='/api/achievements/claim'&&verb==='POST')return response(200,claimCatalog(id,'achievements',await read()));
  if(p==='/api/game/status'&&verb==='GET')return response(200,tx(()=>{ensure(id);settle();const m=stmt('SELECT * FROM mining_state WHERE user_id=?').get(id),h=stmt('SELECT * FROM holding_state WHERE user_id=?').get(id);return {user:stmt('SELECT level,xp,username FROM users WHERE id=?').get(id),wallet:wal(id),mining:{...m,rate_cents_day:rate({...stmt('SELECT level FROM users WHERE id=?').get(id),upgrade_level:upgradeLevel(id)},wal(id)),upgrade:upgradeState(id)},league:leagueForXp(stmt('SELECT xp FROM users WHERE id=?').get(id).xp),leagues:GM_LEAGUES,cosmetics:cosmetics(id),holding:h,points:stmt('SELECT * FROM points_account WHERE user_id=?').get(id),
   box_collection:boxBonusEnabled?collection(id):null,daily:dailyProfile(id),auction:{end_at:Number(v('auction_end')),done:v('auction_done')==='1'},config:{test_economy:testEconomy,holding_enabled:Number(v('holding_daily_bps'))>0,daily_enabled:Number(v('daily_gm_cents'))>0,shop_enabled:v('shop_rate_mode')!=='disabled',boxes_enabled:Object.keys(JSON.parse(v('box_rewards_json'))).length===3,box_rewards:JSON.parse(v('box_rewards_json')),
   box_bonus_enabled:boxBonusEnabled,box_xp_rewards:boxBonusEnabled?boxXp:{},
   box_frame_rewards:boxBonusEnabled?boxFrameCatalog:[],daily_reward_gm:Number(v('daily_gm_cents'))/100}}}));
  const body=verb==='POST'?await read():{};
  const op=()=>requestId(body.operationId);
  if(p==='/api/mining/upgrade'&&verb==='POST')return response(200,tx(()=>{
   ensure(id);settle();
   return once(op(),id,'mining_upgrade',()=>{
    const state=upgradeState(id);
    if(process.env.GM_UPGRADE_PAYMENT_MODE!=='virtual_test')throw Error('wallet-backed upgrades await verified GM token contract; in-game GM cannot buy upgrades');
    if(state.level>=MAX_MINING_UPGRADE_LEVEL)throw Error('maximum mining upgrade level reached');
    if(!Number.isInteger(body.level)||body.level!==state.level+1)throw Error('upgrade levels must be purchased sequentially');
    const costCents=miningUpgradeCost(body.level)*100;
    walletChange(id,'gm',-costCents);
    addPool('TREASURY','gm',costCents);
    if(!stmt('UPDATE mining_upgrades SET level=?,updated_at=? WHERE user_id=? AND level=?').run(body.level,now(),id,state.level).changes)
     throw Error('mining upgrade changed; refresh state');
    log(id,'mining_upgrade',{user:id,from:state.level,to:body.level,gm_cents:costCents,bonus_pct:miningUpgradeBonusPct(body.level)});
    return {upgrade:upgradeState(id),wallet:wal(id)};
   });
  }));
  if(p==='/api/mining/claim'&&verb==='POST')return response(200,tx(()=>{ensure(id);settle();return once(op(),id,'mining_claim',()=>{const m=stmt('SELECT * FROM mining_state WHERE user_id=?').get(id),n=m.pending_cents;if(n<100)throw Error('minimum mining Claim is 1 GM');walletChange(id,'gm',n);const d=day(now()),xp=m.last_xp_day===d?0:20;if(xp)awardXp(id,xp);stmt('UPDATE mining_state SET pending_cents=0,reg_micro=0,overflow_micro=0,processed_cents=0,last_at=?,last_xp_day=? WHERE user_id=?').run(now(),d,id);log(id,'mining_claim',{user:id,gm_cents:n,xp});return {gm_cents:n,xp,wallet:wal(id)}})}));
  if(p==='/api/vault/deposit'&&verb==='POST')return response(200,tx(()=>{ensure(id);settle();return once(op(),id,'vault_deposit',()=>{const n=amount(body.amount);accrueHoldingPosition(id);walletChange(id,'gm',-n);stmt('UPDATE wallets SET vault=vault+? WHERE user_id=?').run(n,id);stmt('INSERT INTO holding_peak(user_id,peak_cents) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET peak_cents=MAX(peak_cents,excluded.peak_cents)').run(id,wal(id).vault);log(id,'vault_deposit',{user:id,gm_cents:n});return {vault_cents:wal(id).vault,wallet:wal(id)}})}));
  if(p==='/api/vault/withdraw'&&verb==='POST')return response(200,tx(()=>{ensure(id);settle();return once(op(),id,'vault_withdraw',()=>{const n=amount(body.amount),w=wal(id),d=day(now()),h=stmt('SELECT * FROM holding_state WHERE user_id=?').get(id);if(h.last_withdraw_day===d)throw Error('only one vault withdrawal per UTC day');if(n>w.vault||(n<100000&&n!==w.vault))throw Error('partial withdrawal minimum 1000 GM; full balance may be smaller');const fee=mulDiv(n,5,100);accrueHoldingPosition(id);stmt('UPDATE wallets SET vault=vault-? WHERE user_id=?').run(n,id);walletChange(id,'gm',n-fee);addPool('HOLDING_FEES','gm',fee);stmt('UPDATE holding_state SET last_withdraw_day=? WHERE user_id=?').run(d,id);log(id,'vault_withdraw',{user:id,gm_cents:n,fee_cents:fee});return {received_cents:n-fee,fee_cents:fee,wallet:wal(id)}})}));
  if(p==='/api/vault/claim'&&verb==='POST')return response(200,tx(()=>{ensure(id);settle();return once(op(),id,'holding_claim',()=>{const h=stmt('SELECT * FROM holding_state WHERE user_id=?').get(id);if(!h.pending_cents)throw Error('no holding rewards pending');walletChange(id,'gm',h.pending_cents);stmt('UPDATE holding_state SET pending_cents=0 WHERE user_id=?').run(id);const ref=stmt('SELECT referrer_id FROM referrals WHERE user_id=?').get(id);let refPaid=0;
   if(ref){const want=mulDiv(h.pending_cents,25,100);const free=Math.min(want,stmt('SELECT gm FROM holding_buckets WHERE name=?').get('REFERRAL').gm,pool('HOLDING'));if(free>0){stmt('UPDATE holding_buckets SET gm=gm-? WHERE name=?').run(free,'REFERRAL');takePool('HOLDING','gm',free);walletChange(ref.referrer_id,'gm',free);refPaid+=free}let extra=want-refPaid;if(extra>0){extra=Math.min(extra,pool('HOLDING_FEES'));if(extra){takePool('HOLDING_FEES','gm',extra);walletChange(ref.referrer_id,'gm',extra);refPaid+=extra}}if(refPaid)log('system','referral_reward',{user:ref.referrer_id,from:id,gm_cents:refPaid})}
   log(id,'holding_claim',{user:id,gm_cents:h.pending_cents,referral_gm_cents:refPaid});return {gm_cents:h.pending_cents,referral_paid_cents:refPaid,wallet:wal(id)}})}));
  if(p==='/api/referrals/me'&&verb==='GET')return response(200,{referred:stmt('SELECT user_id,created_at FROM referrals WHERE referrer_id=?').all(id),my_referrer:stmt('SELECT referrer_id FROM referrals WHERE user_id=?').get(id)?.referrer_id||null,received_gm_cents:stmt("SELECT info FROM journal WHERE kind='referral_reward' AND info LIKE ?").all('%\"user\":\"'+id+'\"%').reduce((sum,r)=>sum+(JSON.parse(r.info).gm_cents||0),0)});
  if(p==='/api/daily/claim'&&verb==='POST')return response(200,tx(()=>once(op(),id,'daily_claim',()=>{
   ensure(id);
   const d=day(now()),base=Number(v('daily_gm_cents'));
   if(!Number.isSafeInteger(base)||base<=0)throw Error('daily reward rate awaiting owners approval');
   const state=dailyProfile(id);
   if(state.claimed_today)throw Error('daily reward already claimed');
   const nextStreak=state.next_streak,cycleDay=dailyCycle(nextStreak);
   const n=dailyRewardCents(base,nextStreak);
   // Transaction includes pool debit, wallet credit, unique claim and journal entry.
   takePool('DAILY','gm',n);
   walletChange(id,'gm',n);
   stmt('INSERT INTO daily_claim(user_id,day) VALUES(?,?)').run(id,d);
   log(id,'daily_claim',{user:id,gm_cents:n,streak:nextStreak,cycle_day:cycleDay,
    milestone:milestoneTestEnabled&&Object.hasOwn(DAILY_MILESTONES,cycleDay)});
   return {gm_cents:n,streak:nextStreak,cycle_day:cycleDay,
    milestone:milestoneTestEnabled&&Object.hasOwn(DAILY_MILESTONES,cycleDay),wallet:wal(id)};
  })));
  if(p==='/api/boxes/open'&&verb==='POST')return response(200,tx(()=>{
   ensure(id);
   return once(op(),id,'box_open',()=>{
    const table=JSON.parse(v('box_rewards_json'));
    const kind=String(body.kind||'').toLowerCase();
    const unitCost={bronze:300,silver:750,gold:1500}[kind];
    if(!unitCost)throw Error('invalid GM Box type');
    const count=body.count===undefined?1:body.count;
    if(!Number.isInteger(count)||![1,3,5,10].includes(count))throw Error('invalid GM Box opening count');
    if(!['bronze','silver','gold'].every(x=>Number.isSafeInteger(table[x])&&table[x]>0))
     throw Error('box rewards awaiting owners approval');
    const cost=unitCost*count;
    const n=table[kind]*100*count;
    if(!Number.isSafeInteger(cost)||!Number.isSafeInteger(n))throw Error('box quantity overflow');
    const today=day(now()),cap=Math.max(0,Number(process.env.BOX_DAILY_GM_CAP||1000))*100;
    const used=stmt('SELECT gm_cents FROM box_day WHERE day=? AND user_id=?').get(today,id)?.gm_cents||0;
    if(used+n>cap)throw Error('GM Boxes daily payout limit reached; try tomorrow');
    if(!stmt('UPDATE points_account SET points=points-? WHERE user_id=? AND points>=?').run(cost,id,cost).changes)
     throw Error('not enough POINTS');
    const totalXp=boxBonusEnabled?boxXp[kind]*count:0;
    const before=boxBonusEnabled?collection(id):null;
    if(!Number.isSafeInteger(totalXp)||totalXp<0)throw Error('invalid XP reward amount');
    const u=stmt('SELECT xp FROM users WHERE id=?').get(id);
    if(totalXp&&(!u||!Number.isSafeInteger(u.xp)||u.xp>Number.MAX_SAFE_INTEGER-totalXp))
     throw Error('XP accounting limit');
    takePool('BOXES','gm',n);
    walletChange(id,'gm',n);
    if(totalXp){settleMining();awardXp(id,totalXp)}
    let unlocked=[];
    if(boxBonusEnabled){
     const column=kind==='bronze'?'bronze':kind==='silver'?'silver':'gold';
     stmt('UPDATE box_collection SET '+column+'='+column+'+? WHERE user_id=?').run(count,id);
     const after=collection(id);
     unlocked=boxFrameCatalog.filter(frame=>
      before[frame.kind]<frame.required&&after[frame.kind]>=frame.required)
      .map(frame=>({id:frame.id,title:frame.title}));
    }
    stmt('INSERT INTO box_day(day,user_id,gm_cents) VALUES(?,?,?) ON CONFLICT(day,user_id) DO UPDATE SET gm_cents=gm_cents+excluded.gm_cents').run(today,id,n);
    log(id,'gm_box_open',{user:id,kind,count,spent_points:cost,gm_cents:n,
     xp:totalXp,unlocked_frames:unlocked.map(frame=>frame.id)});
    return {kind,count,spent_points:cost,gm_cents:n,unit_reward_gm:table[kind],
     xp:totalXp,unit_xp:boxBonusEnabled?boxXp[kind]:0,unlocked_frames:unlocked,
     wallet:wal(id),level:stmt('SELECT level FROM users WHERE id=?').get(id)?.level};
   });
  }));
  if(p==='/api/exchange/book'&&verb==='GET')return response(200,tx(()=>{doAuction();expireOrders();const pre=v('auction_done')!=='1',a=pre?1:0,orders=pre?stmt("SELECT * FROM orders WHERE status='open' AND auction=1").all():[];return {bids:stmt("SELECT limit_price,SUM(remaining_cents) as gm_cents FROM orders WHERE status='open' AND auction=? AND side='buy' AND (expires_at IS NULL OR expires_at>?) GROUP BY limit_price ORDER BY limit_price DESC LIMIT 25").all(a,now()),asks:stmt("SELECT limit_price,SUM(remaining_cents) as gm_cents FROM orders WHERE status='open' AND auction=? AND side='sell' AND (expires_at IS NULL OR expires_at>?) GROUP BY limit_price ORDER BY limit_price ASC LIMIT 25").all(a,now()),auction_end_at:Number(v('auction_end')),auction_done:!pre,indicative:pre?indicativeAuction(orders):null,last_price:Number(v('last_trade_price'))||null}}));
  if(p==='/api/exchange/orders'&&verb==='GET')return response(200,{orders:stmt('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 100').all(id)});
  if(p==='/api/exchange/trades'&&verb==='GET')return response(200,{trades:stmt('SELECT price,amount_cents,quote_cents,at,auction,suspect FROM trades ORDER BY at DESC,rowid DESC LIMIT 100').all()});
  if(p==='/api/exchange/cancel'&&verb==='POST'){tx(()=>{doAuction();expireOrders()});return response(200,tx(()=>once(op(),id,'order_cancel',()=>{const order=stmt('SELECT * FROM orders WHERE id=? AND user_id=?').get(String(body.orderId||''),id);if(!order)throw Error('order not found');cancelOrder(order);log(id,'order_cancel',{user:id,order:order.id});return {cancelled:true,wallet:wal(id)}})));}
  if(p==='/api/exchange/order'&&verb==='POST')return response(200,tx(()=>{ensure(id);activeUser(id);doAuction();expireOrders();return once(op(),id,'order_create',()=>{
   const side=body.side==='buy'?'buy':body.side==='sell'?'sell':null,type=body.type==='market'?'market':body.type==='limit'?'limit':null;if(!side||!type)throw Error('invalid order type/side');const qty=amount(body.amount),period=String(body.duration||'24h');if(qty<1000)throw Error('minimum new order 10 GM');
   const t=now();if(stmt('SELECT COUNT(*) n FROM order_activity WHERE user_id=? AND at>?').get(id,t-60).n>=10)throw Error('10 create/edit operations per rolling minute');
   const auction=v('auction_done')!=='1';if(auction&&type!=='limit')throw Error('opening auction accepts limit orders only');if(type==='limit'&&stmt("SELECT COUNT(*) n FROM orders WHERE user_id=? AND status='open'").get(id).n>=100)throw Error('maximum 100 active orders');
   let p=type==='limit'?amount(body.price):0;if(type==='limit'&&p<1)throw Error('Limit price must be at least 0.01 CR per GM');const dur={'1h':3600,'6h':21600,'12h':43200,'24h':86400,'3d':259200,'7d':604800,'GTC':0}[period];if(dur===undefined)throw Error('invalid duration');
   if(type==='market'){
    const opposite=side==='buy'?'sell':'buy';const all=stmt(`SELECT * FROM orders WHERE status='open' AND auction=0 AND side=? AND user_id!=? AND (expires_at IS NULL OR expires_at>?) ORDER BY limit_price ${side==='buy'?'ASC':'DESC'},priority ASC LIMIT 100`).all(opposite,id,t);
    if(!all.length)throw Error('no matching liquidity for Market Order');
    const first=all[0].limit_price;const bound=side==='buy'?mulDiv(first,103,100):safe(Number((BigInt(first)*97n+99n)/100n));
    const safeLevels=all.filter(x=>side==='buy'?x.limit_price<=bound:x.limit_price>=bound);
    if(!safeLevels.length)throw Error('no liquidity inside 3% slippage protection');
    const reserve=side==='buy'?quote(qty,bound):qty;walletChange(id,side==='buy'?'cr':'gm',-reserve);
    const ident=crypto.randomUUID();stmt('INSERT INTO orders(id,user_id,side,limit_price,amount_cents,remaining_cents,locked_cents,status,auction,created_at,priority,expires_at,duration_sec) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(ident,id,side,bound,qty,qty,reserve,'open',0,t,nextSeq(),null,0);
    stmt('INSERT INTO order_activity(user_id,at) VALUES(?,?)').run(id,t);
    let filled=0;for(const r of safeLevels){const fresh=stmt('SELECT * FROM orders WHERE id=?').get(ident);if(!fresh.remaining_cents)break;const other=stmt('SELECT * FROM orders WHERE id=?').get(r.id),n=Math.min(fresh.remaining_cents,other.remaining_cents);if(n&&matchOne(side==='buy'?fresh:other,side==='sell'?fresh:other,n,other.limit_price))filled+=n}
    const left=stmt('SELECT * FROM orders WHERE id=?').get(ident);if(left.status==='open')cancelOrder(left);
    log(id,'market_order',{user:id,order:ident,side,requested_gm_cents:qty,filled_gm_cents:filled,slippage_limit:bound});return {order:stmt('SELECT * FROM orders WHERE id=?').get(ident),filled_gm_cents:filled,slippage_limit:bound,wallet:wal(id),auction:false};
   }
   const reserve=side==='buy'?quote(qty,p):qty;if(!reserve)throw Error('order notional below 0.01 CR');walletChange(id,side==='buy'?'cr':'gm',-reserve);
   const ident=crypto.randomUUID(),seq=nextSeq(),expiry=auction?null:dur?t+dur:null;stmt('INSERT INTO orders(id,user_id,side,limit_price,amount_cents,remaining_cents,locked_cents,status,auction,created_at,priority,expires_at,duration_sec) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(ident,id,side,p,qty,qty,reserve,'open',auction?1:0,t,seq,expiry,dur);
   stmt('INSERT INTO order_activity(user_id,at) VALUES(?,?)').run(id,t);let latest=stmt('SELECT * FROM orders WHERE id=?').get(ident);if(!auction)latest=transactLimit(latest);log(id,'limit_order_created',{user:id,order:ident,side,qty,p,auction});return {order:latest,wallet:wal(id),auction};
  })}));
  if(p==='/api/exchange/edit'&&verb==='POST'){tx(()=>{doAuction();expireOrders()});return response(200,tx(()=>once(op(),id,'order_edit',()=>{activeUser(id);const old=stmt('SELECT * FROM orders WHERE id=? AND user_id=?').get(String(body.orderId||''),id);if(!old||old.status!=='open')throw Error('open order not found');const t=now();if(stmt('SELECT COUNT(*) n FROM order_activity WHERE user_id=? AND at>?').get(id,t-60).n>=10)throw Error('10 create/edit operations per rolling minute');const newPrice=amount(body.price),newQty=amount(body.amount);if(newQty<1000)throw Error('new order quantity minimum 10 GM');const newLocked=old.side==='buy'?quote(newQty,newPrice):newQty;
   walletChange(id,old.side==='buy'?'cr':'gm',old.locked_cents);walletChange(id,old.side==='buy'?'cr':'gm',-newLocked);
   stmt('UPDATE orders SET limit_price=?,amount_cents=?,remaining_cents=?,locked_cents=?,quote_remainder=0,priority=?,created_at=? WHERE id=?').run(newPrice,newQty,newQty,newLocked,nextSeq(),t,old.id);stmt('INSERT INTO order_activity(user_id,at) VALUES(?,?)').run(id,t);const current=stmt('SELECT * FROM orders WHERE id=?').get(old.id);if(!current.auction)transactLimit(current);log(id,'order_edited',{user:id,order:old.id,newPrice,newQty});return {order:stmt('SELECT * FROM orders WHERE id=?').get(old.id),wallet:wal(id)}})));}
  if(p==='/api/shop/quote'&&verb==='GET'||p==='/api/shop/exchange'&&verb==='POST'){
   const doQuote=()=>{const requested=verb==='GET'?new URL(req.url,'http://localhost').searchParams.get('amount'):body.amount;const n=amount(requested);if(n<100)throw Error('GM Shop minimum 1 GM');if(v('shop_rate_mode')!=='median95')throw Error('shop exchange disabled until dynamic rate approved');
    const history=stmt('SELECT price,amount_cents FROM trades WHERE suspect=0 AND at>=? ORDER BY price ASC').all(now()-DAY);const total=history.reduce((s,t)=>s+t.amount_cents,0);if(history.length<Number(v('shop_min_trades'))||total<Number(v('shop_min_volume_gm'))*100)throw Error('not enough trustworthy 24h market volume');const diversity=stmt('SELECT buyer,seller FROM trades WHERE suspect=0 AND at>=?').all(now()-DAY),actors=new Set(diversity.flatMap(t=>[t.buyer,t.seller]));if(actors.size<4)throw Error('GM Shop requires at least 4 different market participants');let half=0,med=history.at(-1).price;for(const t of history){half+=t.amount_cents;if(half*2>=total){med=t.price;break}}
    const fee=mulDiv(n,1,100),after=n-fee,cr=mulDiv(after,med*95,10000);if(cr<=0)throw Error('shop quote rounds to zero');return {gm_cents:n,fee_gm_cents:fee,net_gm_cents:after,cr_cents:cr,median_price:med,quote_expires_at:now()+60}}
   if(verb==='GET')return response(200,doQuote());return response(200,tx(()=>once(op(),id,'shop_exchange',()=>{const q=doQuote();if(!Number.isSafeInteger(body.minCrCents)||body.minCrCents<1||!Number.isSafeInteger(body.quoteExpiresAt)||body.quoteExpiresAt<now())throw Error('get a new GM Shop quote before confirming exchange');if(q.cr_cents<body.minCrCents)throw Error('shop exchange rate changed; confirm a new quote');const today=day(now());const daily=stmt('SELECT cr_cents FROM shop_day WHERE user_id=? AND day=?').get(id,today)?.cr_cents||0;if(daily+q.cr_cents>5000000)throw Error('GM Shop daily limit 50000 CR');walletChange(id,'gm',-q.gm_cents);takePool('SHOP','cr',q.cr_cents);walletChange(id,'cr',q.cr_cents);addPool('TREASURY','gm',q.gm_cents);stmt('INSERT INTO shop_day(user_id,day,cr_cents) VALUES(?,?,?) ON CONFLICT(user_id,day) DO UPDATE SET cr_cents=cr_cents+excluded.cr_cents').run(id,today,q.cr_cents);log(id,'gm_shop_exchange',{user:id,...q});return {...q,wallet:wal(id)}})));
  }
  return response(404,{error:'game endpoint not found'});
 }
 return {handle,ensure,settle,doAuction,day};
}
