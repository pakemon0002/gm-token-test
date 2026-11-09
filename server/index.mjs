// GM TOKEN development/test server. Virtual order-book, Telegram auth, support and RBAC.
// No real money, blockchain, or live-money trading; not production-certified.
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {verifyInitData,checkTotp,totp,toCents,gmFunds,crFunds} from './lib.mjs';
import {makeGame} from './game.mjs';
import {makeTelegramWebhook} from './webhook.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const staticRoot=resolve(here,'../miniapp/public');
const dbPath=resolve(process.env.DB_PATH||resolve(here,'../data/gm-token.sqlite'));
mkdirSync(dirname(dbPath),{recursive:true});
const database=new DatabaseSync(dbPath);
database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout=5000;');
database.exec(`CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT DEFAULT '', role TEXT NOT NULL DEFAULT 'player',created_at INTEGER NOT NULL,last_seen INTEGER NOT NULL,level INTEGER DEFAULT 1,xp INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS wallets(user_id TEXT PRIMARY KEY REFERENCES users(id), gm INTEGER NOT NULL DEFAULT 0 CHECK(gm>=0),cr INTEGER NOT NULL DEFAULT 0 CHECK(cr>=0),vault INTEGER NOT NULL DEFAULT 0 CHECK(vault>=0));
CREATE TABLE IF NOT EXISTS pools(name TEXT PRIMARY KEY, gm INTEGER NOT NULL DEFAULT 0 CHECK(gm>=0),cr INTEGER NOT NULL DEFAULT 0 CHECK(cr>=0));
CREATE TABLE IF NOT EXISTS journal(id TEXT PRIMARY KEY,at INTEGER NOT NULL,actor TEXT NOT NULL,kind TEXT NOT NULL,info TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tickets(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),category TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open',priority TEXT NOT NULL DEFAULT 'P3',assigned_to TEXT,claimed_at INTEGER,first_reply_at INTEGER,auto_attempts INTEGER NOT NULL DEFAULT 0,resolved_at INTEGER,updated_at INTEGER NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS used_admin_2fa(owner_id TEXT NOT NULL,step INTEGER NOT NULL,PRIMARY KEY(owner_id,step));
 CREATE TABLE IF NOT EXISTS admin_2fa_failures(owner_id TEXT NOT NULL,at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS idx_admin_2fa_failures ON admin_2fa_failures(owner_id,at);
CREATE TABLE IF NOT EXISTS holding_buckets(name TEXT PRIMARY KEY, gm INTEGER NOT NULL DEFAULT 0 CHECK(gm>=0));
CREATE TABLE IF NOT EXISTS restrictions(user_id TEXT PRIMARY KEY REFERENCES users(id),end_at INTEGER,reason TEXT,issued_by TEXT NOT NULL,issued_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS ticket_messages(id TEXT PRIMARY KEY,ticket_id TEXT NOT NULL REFERENCES tickets(id),author TEXT NOT NULL,body TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status,priority,created_at);`);
const now=()=>Math.floor(Date.now()/1000);
const stmt=(sql)=>database.prepare(sql);
for(const [name,gm] of Object.entries(gmFunds))stmt('INSERT OR IGNORE INTO pools(name,gm,cr) VALUES(?,?,0)').run(name,gm*100);
for(const [name,cr] of Object.entries(crFunds))stmt('INSERT OR IGNORE INTO pools(name,gm,cr) VALUES(?,0,?)').run(name,cr*100);
stmt('INSERT OR IGNORE INTO holding_buckets(name,gm) VALUES(?,?)').run('HOLDER',18400000*100);
stmt('INSERT OR IGNORE INTO holding_buckets(name,gm) VALUES(?,?)').run('REFERRAL',4600000*100);
const ownerIds=(process.env.OWNER_TELEGRAM_IDS||'').split(',').map(x=>x.trim()).filter(Boolean);
const ownerTotps=(()=>{try{return JSON.parse(process.env.OWNER_TOTP_SECRETS||'{}')}catch{return {}}})();
const secret=process.env.BOT_TOKEN||'';
const telegramWebhook = secret && process.env.PUBLIC_APP_URL && process.env.BOT_WEBHOOK_SECRET && process.env.BOT_POLLING !== '1'
 ? makeTelegramWebhook({token:secret,publicUrl:process.env.PUBLIC_APP_URL,webhookSecret:process.env.BOT_WEBHOOK_SECRET,botUsername:process.env.BOT_USERNAME||'gm_token_test_bot'}) : null;
const isDev=process.env.NODE_ENV!=='production';
function tx(fn){database.exec('BEGIN IMMEDIATE');try{const x=fn();database.exec('COMMIT');return x}catch(e){database.exec('ROLLBACK');throw e}}
function log(actor,kind,data){stmt('INSERT INTO journal(id,at,actor,kind,info) VALUES(?,?,?,?,?)').run(crypto.randomUUID(),now(),actor,kind,JSON.stringify(data))}
function readBody(req){return new Promise((resolve,reject)=>{let body='';req.on('data',c=>{body+=c;if(body.length>16384){reject(Error('payload too large'));req.destroy()}});req.on('end',()=>{try{resolve(body?JSON.parse(body):{})}catch{reject(Error('invalid JSON'))}});req.on('error',reject)})}
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))}
function fail(res,status,message){send(res,status,{error:message})}
function auth(req){const h=req.headers.authorization||'';if(!h.startsWith('tma '))throw Error('Telegram initData required');const user=verifyInitData(h.slice(4),secret);
 const existing=stmt('SELECT role FROM users WHERE id=?').get(user.id);
 if(existing&&['owner','coowner'].includes(existing.role)&&!ownerIds.includes(user.id)){stmt("UPDATE users SET role='player' WHERE id=?").run(user.id);log('system','owner_credentials_revoked',{user:user.id})}
 return user}
function upsertUser(user){return tx(()=>{
 let target=stmt('SELECT * FROM users WHERE id=?').get(user.id);const t=now();
 let role=ownerIds.indexOf(user.id)===0?'owner':ownerIds.indexOf(user.id)===1?'coowner':'player';
 if(!target){
  stmt('INSERT INTO users(id,username,role,created_at,last_seen) VALUES(?,?,?,?,?)').run(user.id,user.username,role,t,t);
  stmt('INSERT INTO wallets(user_id) VALUES(?)').run(user.id);
  const link=/^ref_(\d{5,20})$/.exec(user.startParam||'');
  if(link&&link[1]!==user.id&&stmt('SELECT id FROM users WHERE id=?').get(link[1])){stmt('INSERT OR IGNORE INTO referrals(user_id,referrer_id,created_at) VALUES(?,?,?)').run(user.id,link[1],t);log('system','referral_linked',{user:user.id,referrer:link[1]})}
  const reserve=stmt('SELECT cr FROM pools WHERE name=?').get('WELCOME');
  if(reserve&&reserve.cr>=500000){stmt('UPDATE pools SET cr=cr-500000 WHERE name=?').run('WELCOME');stmt('UPDATE wallets SET cr=cr+500000 WHERE user_id=?').run(user.id);log('system','welcome_cr',{user:user.id,cr:500000})}
  else log('system','welcome_depleted',{user:user.id});
 } else {
  const preserved=role!=='player'?role:['owner','coowner'].includes(target.role)?'player':target.role;
  stmt('UPDATE users SET username=?,role=?,last_seen=? WHERE id=?').run(user.username,preserved,t,user.id)
 }
 return stmt('SELECT * FROM users WHERE id=?').get(user.id)
})}
function roleCheck(user,roles){const role=stmt('SELECT role FROM users WHERE id=?').get(user.id)?.role;if(!roles.includes(role))throw Error('insufficient permission');return role}
function require2FA(user,body){
 const privateSecret=ownerTotps[user.id];const code=String(body.code||'');
 const cutoff=now()-900;
 if(stmt('SELECT COUNT(*) AS n FROM admin_2fa_failures WHERE owner_id=? AND at>?').get(user.id,cutoff).n>=5)throw Error('TOTP attempts temporarily limited (15 minutes)');
 if(!privateSecret||!checkTotp(privateSecret,code)){stmt('INSERT INTO admin_2fa_failures(owner_id,at) VALUES(?,?)').run(user.id,now());throw Error('valid TOTP required')}
 stmt('DELETE FROM admin_2fa_failures WHERE owner_id=?').run(user.id);
 const t=Date.now();let matched=null;
 for(const shift of [-1,0,1])if(totp(privateSecret,t+shift*30000)===code){matched=Math.floor((t+shift*30000)/30000);break}
 if(matched===null)throw Error('invalid TOTP');
 const consumed=stmt('INSERT OR IGNORE INTO used_admin_2fa(owner_id,step) VALUES(?,?)').run(user.id,matched);
 if(!consumed.changes)throw Error('TOTP already used; wait for a fresh code');
 // Keep latest only: stale step values do not convey any ongoing privilege.
 stmt('DELETE FROM used_admin_2fa WHERE step<?').run(Math.floor(t/30000)-5);
}
function cleanTickets(){
 const t=now();
 stmt('UPDATE tickets SET status=\'open\',assigned_to=NULL,claimed_at=NULL,updated_at=? WHERE status=\'in_review\' AND first_reply_at IS NULL AND claimed_at<?').run(t,t-12*3600);
 stmt('UPDATE tickets SET status=\'closed\',updated_at=? WHERE status=\'resolved\' AND priority=\'P3\' AND resolved_at<?').run(t,t-48*3600);
}
function publicPools(){return stmt('SELECT name,gm,cr FROM pools ORDER BY name').all()}
function sendTelegram(id,message){if(!secret)return;fetch(`https://api.telegram.org/bot${secret}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:id,text:message.slice(0,1000)})}).catch(()=>{})}
const game=makeGame({db:database,stmt,tx,log,now,send,readBody,sendTelegram});
const routes=async(req,res)=>{
 const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);const p=url.pathname;const verb=req.method||'GET';
 if(p==='/api/health')return send(res,200,{ok:true,mode:'GM TOKEN server / no real-money operations',time:new Date().toISOString()});
 if(p==='/api/telegram/webhook' && verb==='POST'){
   if(!telegramWebhook || !telegramWebhook.validateSecret(req.headers['x-telegram-bot-api-secret-token']))return fail(res,403,'forbidden');
   try{const payload=await readBody(req);send(res,200,{ok:true});void telegramWebhook.handleUpdate(payload).catch(err=>console.error('Telegram webhook update failed:',err?.message));}
   catch{return fail(res,400,'invalid webhook payload')}
   return;
 }
 if(p==='/api/public/pools'&&verb==='GET')return send(res,200,{pools:publicPools(),precision:'cents',totalSupply:{GM:15000000000,CR:100000000000}});
 if(!p.startsWith('/api/'))return staticFile(p,res);
 let id;
 try{
  if(!secret)throw Error('BOT_TOKEN must be configured for API authentication');
  const identity=auth(req);id=identity.id;
  if(p==='/api/bootstrap'&&verb==='GET'){
   const user=upsertUser(identity);game.ensure(id);const wallet=stmt('SELECT * FROM wallets WHERE user_id=?').get(id);
   return send(res,200,{user:{id:user.id,role:user.role,username:user.username,level:user.level,xp:user.xp},wallet,virtual:true});
  }
  const current=stmt('SELECT * FROM users WHERE id=?').get(id);if(!current)throw Error('call /api/bootstrap first');
  if(p==='/api/me'&&verb==='GET'){const r=stmt('SELECT end_at,reason,issued_at FROM restrictions WHERE user_id=?').get(id);return send(res,200,{user:current,wallet:stmt('SELECT * FROM wallets WHERE user_id=?').get(id),restriction:r&&(!r.end_at||r.end_at>now())?r:null})}
  if(p==='/api/history'&&verb==='GET')return send(res,200,{events:stmt('SELECT * FROM journal WHERE info LIKE ? ORDER BY at DESC LIMIT 50').all(`%"user":"${id}"%`)});
  if(p==='/api/tickets'&&verb==='GET'){
   cleanTickets();const mod=['owner','coowner','moderator'].includes(current.role);
   const rows=mod?stmt('SELECT * FROM tickets WHERE status!=\'auto_support\' ORDER BY CASE priority WHEN \'P1\' THEN 1 WHEN \'P2\' THEN 2 ELSE 3 END,created_at ASC LIMIT 100').all():stmt('SELECT * FROM tickets WHERE user_id=? ORDER BY created_at DESC LIMIT 100').all(id);
   return send(res,200,{tickets:rows});
  }
  if(p==='/api/tickets'&&verb==='POST'){
   const data=await readBody(req);const body=String(data.body||'').trim();const category=String(data.category||'Общий вопрос').slice(0,45);
   if(body.length<10||body.length>3000)throw Error('description length 10..3000');
   const priority=category==='Апелляция'||category==='Баланс GM/CR'?'P2':category==='Критический инцидент'?'P1':'P3';
   const ticket=crypto.randomUUID(),t=now();
   const dailyCount=stmt('SELECT COUNT(*) n FROM tickets WHERE user_id=? AND created_at>?').get(id,t-86400).n;
   const openCount=stmt("SELECT COUNT(*) n FROM tickets WHERE user_id=? AND status IN ('open','in_review','auto_support')").get(id).n;
   const isUrgent=priority!=='P3';
   if(dailyCount>=(isUrgent?20:10)||openCount>=10)throw Error('too many support tickets; use an existing ticket or wait');
   tx(()=>{stmt('INSERT INTO tickets(id,user_id,category,body,status,priority,updated_at,created_at) VALUES(?,?,?,?,?,?,?,?)').run(ticket,id,category,body,priority==='P3'?'auto_support':'open',priority,t,t);log(id,'ticket_created',{user:id,ticket,category})});
   return send(res,201,{ticket,priority,autoSupport:priority==='P3'?'2 attempts maximum':'manual review immediately'});
  }
  const match=p.match(/^\/api\/tickets\/([a-f0-9-]+)\/(auto|claim|reply|resolve|reopen)$/);
  if(match&&verb==='POST'){
   cleanTickets();const [_,ticketId,action]=match;
   const ticket=stmt('SELECT * FROM tickets WHERE id=?').get(ticketId);if(!ticket)throw Error('ticket not found');
   const isMod=['owner','coowner','moderator'].includes(current.role);const isOwner=ticket.user_id===id;
   if(!isMod&&!isOwner)throw Error('permission denied');
   const data=await readBody(req),t=now();
   if(action==='auto'){
    if(!isOwner||ticket.priority!=='P3'||ticket.auto_attempts>=2)throw Error('automatic help unavailable');
    const response=ticket.auto_attempts===0?'Проверьте статус операции и историю начислений в Mini App. Если вопрос остался, запросите дополнительную проверку.':'Автоматическая проверка завершена. Обращение передано в очередь модераторов.';
    tx(()=>{stmt('UPDATE tickets SET auto_attempts=auto_attempts+1,updated_at=?,status=CASE WHEN auto_attempts+1>=2 THEN \'open\' ELSE \'auto_support\' END WHERE id=?').run(t,ticketId);stmt('INSERT INTO ticket_messages(id,ticket_id,author,body,created_at) VALUES(?,?,?,?,?)').run(crypto.randomUUID(),ticketId,'auto',response,t)});
    return send(res,200,{answer:response,attempts:ticket.auto_attempts+1,escalated:ticket.auto_attempts+1>=2});
   }
   if(action==='claim'){
    if(!isMod)throw Error('moderator role required');
    const changed=stmt('UPDATE tickets SET assigned_to=?,claimed_at=?,updated_at=?,status=\'in_review\' WHERE id=? AND assigned_to IS NULL AND status=\'open\'').run(id,t,t,ticketId);
    if(!changed.changes)throw Error('already assigned');log(id,'ticket_claimed',{user:ticket.user_id,ticket:ticketId});return send(res,200,{claimed:true});
   }
   if(action==='reply'){
    const body=String(data.body||'').trim();if(body.length<1||body.length>3000)throw Error('invalid reply');
    if(stmt('SELECT COUNT(*) AS n FROM ticket_messages WHERE author=? AND created_at>?').get(id,t-60).n>=(isMod?30:12))throw Error('support reply rate limit reached');
    if(isMod&&ticket.assigned_to!==id&&current.role!=='owner'&&current.role!=='coowner')throw Error('ticket is not assigned to you');
    tx(()=>{stmt('INSERT INTO ticket_messages(id,ticket_id,author,body,created_at) VALUES(?,?,?,?,?)').run(crypto.randomUUID(),ticketId,id,body,t);stmt('UPDATE tickets SET first_reply_at=COALESCE(first_reply_at,?),updated_at=?,status=? WHERE id=?').run(isMod?t:null,t,isMod?'in_review':'open',ticketId)});
    if(isMod)sendTelegram(ticket.user_id,'GM TOKEN Support: новый ответ в обращении '+ticketId);
    return send(res,200,{sent:true});
   }
   if(action==='resolve'){
    if(!isMod)throw Error('moderator role required');
    if(current.role==='moderator'&&ticket.assigned_to!==id)throw Error('ticket is not assigned to you');
    if(ticket.priority!=='P3'&&current.role==='moderator')throw Error('serious tickets require owner review');
    stmt('UPDATE tickets SET status=\'resolved\',resolved_at=?,updated_at=? WHERE id=?').run(t,t,ticketId);log(id,'ticket_resolved',{ticket:ticketId,user:ticket.user_id});sendTelegram(ticket.user_id,'GM TOKEN Support: обращение решено '+ticketId);return send(res,200,{resolved:true,autoCloseAfterHours:ticket.priority==='P3'?48:null});
   }
   if(action==='reopen'){
    if(!isOwner)throw Error('only ticket author can reopen');
    stmt('UPDATE tickets SET status=\'open\',resolved_at=NULL,assigned_to=NULL,claimed_at=NULL,first_reply_at=NULL,updated_at=? WHERE id=?').run(t,ticketId);return send(res,200,{reopened:true});
   }
  }
  if(p==='/api/admin/stats'&&verb==='GET'){
   roleCheck({id},['owner','coowner']);return send(res,200,{users:stmt('SELECT COUNT(*) n FROM users').get().n,orders:stmt('SELECT COUNT(*) n FROM orders').get().n,trades_24h:stmt('SELECT COUNT(*) n FROM trades WHERE at>=?').get(now()-86400).n,open_tickets:stmt("SELECT COUNT(*) n FROM tickets WHERE status IN ('open','in_review','auto_support')").get().n});
  }
  if(p==='/api/admin/team'&&verb==='GET'){
   roleCheck({id},['owner','coowner']);return send(res,200,{team:stmt('SELECT id,username,role,created_at FROM users WHERE role!=\'player\'').all()});
  }
  if(p==='/api/admin/moderators'&&verb==='POST'){
   roleCheck({id},['owner','coowner']);const body=await readBody(req);require2FA({id},body);
   const target=String(body.telegramId||'').trim();if(!/^\d{5,20}$/.test(target))throw Error('invalid Telegram ID');
   const user=stmt('SELECT role FROM users WHERE id=?').get(target);if(!user||['owner','coowner'].includes(user.role))throw Error('target not found or protected');
   const desired=body.action==='revoke'?'player':'moderator';stmt('UPDATE users SET role=? WHERE id=?').run(desired,target);log(id,'role_change',{user:target,role:desired});return send(res,200,{updated:true,user:target,role:desired});
  }
  if(p==='/api/admin/restrictions'&&verb==='POST'){
   roleCheck({id},['owner','coowner','moderator']);const data=await readBody(req);
   const target=String(data.userId||''),hours=Number(data.hours),reason=String(data.reason||'').trim();
   const critical=data.critical===true;
   if(critical){if(current.role==='moderator'||reason.length<20)throw Error('critical restriction requires owner and detailed reason');require2FA({id},data)}
   else if(!Number.isFinite(hours)||hours<1||hours>(current.role==='moderator'?24:168)||reason.length<10)throw Error('restriction requires 1..24h for moderators or 1..168h for owners, with a reason');
   const restricted=stmt('SELECT role FROM users WHERE id=?').get(target);if(!restricted)throw Error('user not found');if(['owner','coowner'].includes(restricted.role)||current.role==='moderator'&&restricted.role==='moderator')throw Error('cannot restrict staff accounts');
   const t=now(),end=critical?null:t+Math.round(hours*3600);
   stmt('INSERT INTO restrictions(user_id,end_at,reason,issued_by,issued_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET end_at=excluded.end_at,reason=excluded.reason,issued_by=excluded.issued_by,issued_at=excluded.issued_at').run(target,end,reason,id,t);
   log(id,critical?'critical_restriction':'temporary_restriction',{user:target,hours:critical?null:hours,reason});sendTelegram(target,critical?`GM TOKEN: торговля ограничена до рассмотрения поддержки. Причина: ${reason}. Подайте апелляцию через Support.`:`GM TOKEN: временно ограничены торговые функции на ${hours} ч. Причина: ${reason}. Можно подать апелляцию.`);
   return send(res,200,{user:target,endAt:end,critical});
  }
  if(p==='/api/admin/restrictions/revoke'&&verb==='POST'){
   roleCheck({id},['owner','coowner']);const data=await readBody(req);require2FA({id},data);
   const target=String(data.userId||''),reason=String(data.reason||'').trim();if(reason.length<10)throw Error('reason required to lift restriction');
   const old=stmt('SELECT user_id,reason,end_at FROM restrictions WHERE user_id=?').get(target);if(!old)throw Error('restriction not found');
   tx(()=>{stmt('DELETE FROM restrictions WHERE user_id=?').run(target);log(id,'restriction_revoked',{user:target,reason,previous_reason:old.reason,previous_end:old.end_at})});
   sendTelegram(target,'GM TOKEN: ограничение торговых функций снято после рассмотрения.');
   return send(res,200,{revoked:true,user:target});
  }
  if(p==='/api/admin/transfer'&&verb==='POST'){
   roleCheck({id},['owner','coowner']);const data=await readBody(req);require2FA({id},data);
   const source=String(data.source||''),target=String(data.target||''),amount=toCents(String(data.amount||''));
   const reason=String(data.reason||'').trim(),op=String(data.operationId||'');
   if(!['TREASURY','FUTURE'].includes(source)||!['MINING','HOLDING','BOXES','DAILY','COMMUNITY','DEVELOPMENT'].includes(target)||source===target)throw Error('pool transfer forbidden');
   if(reason.length<15||!op||op.length>100)throw Error('reason and operationId required');
   tx(()=>{
    if(stmt('SELECT id FROM journal WHERE id=?').get(op))throw Error('duplicate transfer');
    if(!stmt('UPDATE pools SET gm=gm-? WHERE name=? AND gm>=?').run(amount,source,amount).changes)throw Error('insufficient free GM reserve');
    stmt('UPDATE pools SET gm=gm+? WHERE name=?').run(amount,target);
    if(target==='HOLDING'){
     const holder=Math.floor(amount*4/5),refer=amount-holder;
     stmt('UPDATE holding_buckets SET gm=gm+? WHERE name=?').run(holder,'HOLDER');
     stmt('UPDATE holding_buckets SET gm=gm+? WHERE name=?').run(refer,'REFERRAL');
    }
    stmt('INSERT INTO journal(id,at,actor,kind,info) VALUES(?,?,?,?,?)').run(op,now(),id,'pool_transfer',JSON.stringify({source,target,cents:amount,reason}));
   });
   return send(res,200,{success:true,operationId:op,source,target,amountCents:amount});
  }
  if(p==='/api/admin/supply-audit'&&verb==='GET'){
   roleCheck({id},['owner','coowner']);
   const [p,w,m,h,o]=[
    stmt('SELECT COALESCE(SUM(gm),0) gm,COALESCE(SUM(cr),0) cr FROM pools').get(),
    stmt('SELECT COALESCE(SUM(gm),0) gm,COALESCE(SUM(cr),0) cr,COALESCE(SUM(vault),0) vault FROM wallets').get(),
    stmt('SELECT COALESCE(SUM(pending_cents),0) n FROM mining_state').get(),
    stmt('SELECT COALESCE(SUM(pending_cents),0) n FROM holding_state').get(),
    stmt("SELECT COALESCE(SUM(CASE WHEN side='sell' THEN locked_cents ELSE 0 END),0) gm,COALESCE(SUM(CASE WHEN side='buy' THEN locked_cents ELSE 0 END),0) cr FROM orders WHERE status='open'").get()];
   const gm=p.gm+w.gm+w.vault+m.n+h.n+o.gm,cr=p.cr+w.cr+o.cr;
   return send(res,200,{gm_cents:gm,cr_cents:cr,expected_gm_cents:15000000000,expected_cr_cents:100000000000,ok:gm===15000000000&&cr===100000000000,breakdown:{pools:p,wallets:w,mining_pending:m.n,holding_pending:h.n,orders_locked:o}});
  }
  if(p==='/api/admin/pools'&&verb==='GET'){
   roleCheck({id},['owner','coowner']);return send(res,200,{pools:publicPools(),holdingBuckets:stmt('SELECT * FROM holding_buckets').all()});
  }
  if(p==='/api/admin/test-grant'&&verb==='POST'){
   roleCheck({id},['owner','coowner']);
   if(process.env.GM_ADMIN_TEST_GRANTS!=='1')throw Error('test grants are disabled on this server');
   const body=await readBody(req);
   const currency=String(body.currency||''),amount=toCents(String(body.amount||''));
   if(!['GM','CR'].includes(currency))throw Error('invalid test currency');
   const maxPerGrant=currency==='GM'?10000*100:100000*100;
   const maxDaily=currency==='GM'?50000*100:500000*100;
   if(amount>maxPerGrant)throw Error('test grant exceeds per-operation limit');
   const recipient=String(body.recipient||'');
   const target=recipient==='self'?id:recipient==='other-owner'?ownerIds.find(x=>x!==id):recipient==='id'?String(body.userId||'').trim():null;
   if(!target||!/^\d{5,20}$/.test(target))throw Error('invalid test recipient or co-owner is not configured');
   const reason=String(body.reason||'').trim();
   if(reason.length<15||reason.length>200)throw Error('test grant reason must be 15-200 characters');
   const op=String(body.operationId||'');
   if(!/^[A-Za-z0-9_.:-]{8,100}$/.test(op))throw Error('invalid operationId');
   require2FA({id},body);
   const pool=currency==='GM'?'TREASURY':'SHOP',col=currency==='GM'?'gm':'cr';
   tx(()=>{
    if(stmt('SELECT id FROM journal WHERE id=?').get(op))throw Error('duplicate operationId');
    const targetUser=stmt('SELECT id FROM users WHERE id=?').get(target);
    if(!targetUser||!stmt('SELECT user_id FROM wallets WHERE user_id=?').get(target))throw Error('recipient must open GM TOKEN once before receiving a test grant');
    const earlier=stmt("SELECT info FROM journal WHERE kind='admin_test_grant' AND at>=?").all(Math.floor(now()/86400)*86400);
    let total=0;
    for(const entry of earlier){
     try{const d=JSON.parse(entry.info);if(d.user===target && d.currency===currency)total+=Number(d.cents)||0}catch{}
    }
    if(total+amount>maxDaily)throw Error('recipient daily test grant limit reached');
    if(!stmt(`UPDATE pools SET ${col}=${col}-? WHERE name=? AND ${col}>=?`).run(amount,pool,amount).changes)throw Error('test fund reserve insufficient');
    stmt(`UPDATE wallets SET ${col}=${col}+? WHERE user_id=?`).run(amount,target);
    stmt('INSERT INTO journal(id,at,actor,kind,info) VALUES(?,?,?,?,?)').run(op,now(),id,'admin_test_grant',JSON.stringify({user:target,pool,currency,cents:amount,reason,test:true}));
   });
   sendTelegram(target,`GM TOKEN: тестовое начисление +${(amount/100).toFixed(2)} ${currency}. Виртуальная валюта; причина: ${reason}`);
   return send(res,200,{ok:true,userId:target,currency,amount_cents:amount,sourcePool:pool,operationId:op,test:true});
  }
  if(p==='/api/admin/correction'&&verb==='POST'){
   roleCheck({id},['owner','coowner']);const body=await readBody(req);require2FA({id},body);
   const target=String(body.userId||''),pool=String(body.sourcePool||''),currency=String(body.currency||''),direction=body.direction==='debit'?'debit':'credit';
   if(!['GM','CR'].includes(currency))throw Error('currency must be GM or CR');
   const n=toCents(String(body.amount||''));const reason=String(body.reason||'').trim();const ticket=String(body.ticket||'');const op=String(body.operationId||'');
   if(reason.length<15||!ticket||!op||op.length>100)throw Error('reason, case and operationId required');
   const col=currency==='GM'?'gm':'cr';
   tx(()=>{
    if(stmt('SELECT id FROM journal WHERE id=?').get(op))throw Error('duplicate operation id');
    if(!stmt('SELECT user_id FROM wallets WHERE user_id=?').get(target))throw Error('user not found');
    if(!stmt('SELECT id FROM tickets WHERE id=? AND user_id=?').get(ticket,target))throw Error('correction requires an existing ticket owned by this user');
    if(!stmt('SELECT name FROM pools WHERE name=?').get(pool))throw Error('pool not found');if(['HOLDING','HOLDING_FEES','FOUNDER','TRADE_GM_REWARDS','TRADE_CR_REWARDS'].includes(pool))throw Error('source pool reserved: dedicated correction workflow required');if(currency==='GM'&&['WELCOME','SHOP','TRADE_CR_REWARDS'].includes(pool)||currency==='CR'&&['MINING','BOXES','DAILY','COMMUNITY','DEVELOPMENT','FUTURE','FOUNDER'].includes(pool))throw Error('source pool has incompatible currency');
    if(direction==='credit'){
     if(!stmt(`UPDATE pools SET ${col}=${col}-? WHERE name=? AND ${col}>=?`).run(n,pool,n).changes)throw Error('pool insufficient');
     stmt(`UPDATE wallets SET ${col}=${col}+? WHERE user_id=?`).run(n,target)
    } else {
     if(!stmt(`UPDATE wallets SET ${col}=${col}-? WHERE user_id=? AND ${col}>=?`).run(n,target,n).changes)throw Error('player balance insufficient');
     stmt(`UPDATE pools SET ${col}=${col}+? WHERE name=?`).run(n,pool)
    }
    stmt('INSERT INTO journal(id,at,actor,kind,info) VALUES(?,?,?,?,?)').run(op,now(),id,'correction',JSON.stringify({user:target,pool,currency,direction,cents:n,reason,ticket}));
   });
   sendTelegram(target,`GM TOKEN: проведена корректировка ${direction==='credit'?'+':'-'}${(n/100).toFixed(2)} ${currency}. Тикет: ${ticket}`);
   return send(res,200,{success:true,operationId:op});
  }
  if(['/api/market','/api/exchange','/api/shop','/api/mining','/api/vault','/api/game','/api/boxes','/api/daily','/api/referrals','/api/tasks','/api/achievements','/api/leaderboard'].some(prefix=>p.startsWith(prefix)))return await game.handle(p,verb,id,req,res);
  return fail(res,404,'endpoint not found');
 }catch(e){const message=e instanceof Error?e.message:String(e);return fail(res,message.match(/permission|role|TOTP|protected|assigned/i)?403:400,message)}
};
function staticFile(path,res){
 let loc=decodeURIComponent(path==='/'?'/preview.html':path);
 if(loc.includes('..')||loc.includes('\\')||loc.includes('\0'))return res.writeHead(403).end('Forbidden');
 const full=resolve(staticRoot,'.'+loc);if(!full.startsWith(staticRoot+'/'))return res.writeHead(403).end('Forbidden');
 if(!existsSync(full))return res.writeHead(404).end('Not found');
 const ext=extname(full),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.json':'application/json','.jpg':'image/jpeg'}[ext]||'application/octet-stream';
 res.writeHead(200,{'Content-Type':mime,'X-Content-Type-Options':'nosniff'});res.end(readFileSync(full));
}
// Automated housekeeping runs even when no moderators are online.
const housekeeping=setInterval(()=>{try{tx(()=>{cleanTickets();game.settle();stmt('DELETE FROM order_activity WHERE at<?').run(now()-120);stmt('DELETE FROM admin_2fa_failures WHERE at<?').run(now()-3600)})}catch(e){console.error('housekeeping failed',e)}},60000);housekeeping.unref();
const port=Number(process.env.PORT||8787);
const app=createServer((req,res)=>{routes(req,res).catch(e=>{console.error('request failure',e);fail(res,500,'internal error')})});
app.listen(port,'0.0.0.0',()=>{
 console.log(`GM TOKEN server on :${port} | ${secret?'Telegram auth enabled':'Telegram auth requires BOT_TOKEN'} | ${isDev?'development':'production'}`);
 if(telegramWebhook)void telegramWebhook.configure().catch(err=>console.error('Telegram webhook setup failed:',err?.message));
});
if(process.env.BOT_POLLING==='1'&&secret)import('./bot.mjs').catch(e=>console.error('bot startup failed',e));
process.on('SIGTERM',()=>{clearInterval(housekeeping);app.close();database.close()});
