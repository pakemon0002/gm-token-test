import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {makeSupportNotifier} from '../server/support-notify.mjs';

function fixture() {
 const db=new DatabaseSync(':memory:');
 db.exec(`PRAGMA foreign_keys=ON;
 CREATE TABLE users(id TEXT PRIMARY KEY,role TEXT NOT NULL);
 CREATE TABLE tickets(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,category TEXT,priority TEXT,status TEXT,created_at INTEGER);
 CREATE TABLE support_notifications(
  id TEXT PRIMARY KEY,ticket_id TEXT NOT NULL REFERENCES tickets(id),
  recipient_id TEXT NOT NULL,event TEXT NOT NULL,body TEXT NOT NULL,created_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,next_attempt_at INTEGER NOT NULL,
  sent_at INTEGER,status TEXT NOT NULL DEFAULT 'pending',last_error TEXT,
  UNIQUE(ticket_id,recipient_id,event)
 );`);
 for(const [id,role] of [['303003','moderator'],['404004','player'],['555555','player']])
  db.prepare('INSERT INTO users(id,role) VALUES(?,?)').run(id,role);
 db.prepare('INSERT INTO tickets(id,user_id,category,priority,status,created_at) VALUES(?,?,?,?,?,?)')
  .run('ticket-1','404004','Mining','P3','auto_support',100);
 const stmt=sql=>db.prepare(sql);
 let tick=200;
 let active=false;
 const delivered=[];
 const send=async(id,text)=>{
  if(id==='303003'&&!active){const err=new Error('Forbidden: bot was blocked by the user');err.httpStatus=403;throw err}
  delivered.push({id,text});
 };
 const notifier=makeSupportNotifier({stmt,now:()=>tick,ownerIds:['101001','202002'],send,schedule:false,logger:{warn(){},error(){}}});
 return {db,notifier,delivered,unblock:()=>{active=true},tick:()=>++tick,stmt};
}

test('owners and moderators all get a durable ticket alert, including auto-support',async()=>{
 const f=fixture();
 try{
  assert.equal(f.notifier.queueStaff('ticket-1','created','GM TOKEN · new support ticket','404004'),3);
  assert.equal(f.notifier.queueStaff('ticket-1','created','GM TOKEN · duplicate','404004'),0,'unique event per recipient');
  assert.equal(f.stmt("SELECT count(*) n FROM support_notifications").get().n,3);
  await f.notifier.deliverBatch();
  assert.deepEqual(f.delivered.map(x=>x.id).sort(),['101001','202002']);
  const blocked=f.notifier.statusForStaff('303003');
  assert.equal(blocked.length,1);assert.equal(blocked[0].status,'blocked');
  assert.equal(blocked[0].action,'open_bot_and_start');
  assert.ok(!Object.hasOwn(blocked[0],'last_error'),'do not leak Telegram API details');
  assert.equal(f.notifier.retryForChat('303003'),1);
  await f.notifier.deliverBatch();
  assert.equal(f.notifier.statusForStaff('303003')[0].status,'blocked','blocking again without /start cannot mark delivered');
  f.unblock();
  assert.equal(f.notifier.retryForChat('303003'),1);
  await f.notifier.deliverBatch();
  assert.equal(f.notifier.statusForStaff('303003')[0].status,'sent');
  assert.equal(f.delivered.at(-1).id,'303003');
 }finally{f.db.close()}
});

test('reply alerts are distinct, per-ticket and bounded to correct recipient',async()=>{
 const f=fixture();
 try{
  assert.equal(f.notifier.queuePlayer('ticket-1','reply:unique-id','404004','Reply ready'),true);
  assert.equal(f.notifier.queuePlayer('ticket-1','reply:unique-id','404004','Reply ready'),false);
  assert.equal(f.notifier.queuePlayer('ticket-1','reply:unique-id-2','404004','Second reply'),true);
  await f.notifier.deliverBatch();
  assert.equal(f.delivered.length,2);
  assert.ok(f.delivered.every(x=>x.id==='404004'));
 }finally{f.db.close()}
});

test('pending staff notifications survive a new notifier instance (restart)',async()=>{
 const f=fixture();
 try{
  f.notifier.queueStaff('ticket-1','created','New support ticket');
  const notifier2=makeSupportNotifier({
   stmt:f.stmt,now:()=>200,ownerIds:['101001','202002'],
   send:async(id,text)=>{f.delivered.push({id,text})},
   schedule:false,logger:{warn(){},error(){}}
  });
  assert.equal(notifier2.queueExisting(),0,'existing queue entries must not be duplicated');
  await notifier2.deliverBatch();
  assert.equal(f.delivered.length,3);
  assert.equal(f.stmt("SELECT count(*) n FROM support_notifications WHERE status='sent'").get().n,3);
 }finally{f.db.close()}
});

test('temporary Telegram outage leaves a retryable notification rather than losing it',async()=>{
 const f=fixture();
 try{
  f.notifier.queuePlayer('ticket-1','reply:failed','404004','Reply');
  const fail=makeSupportNotifier({
   stmt:f.stmt,now:()=>200,
   send:async()=>{throw new Error('network unavailable')},
   schedule:false,logger:{warn(){},error(){}}
  });
  await fail.deliverBatch();
  const row=f.stmt("SELECT status,attempts,next_attempt_at FROM support_notifications WHERE event='reply:failed'").get();
  assert.equal(row.status,'pending');
  assert.equal(row.attempts,1);
  assert.ok(row.next_attempt_at>200);
 }finally{f.db.close()}
});
