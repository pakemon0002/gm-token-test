// Persistent, least-privilege support notification queue.
// Ticket history and notifications remain in gm_game (PostgreSQL in production).
// Telegram may reject private DMs until the recipient opens the bot with /start.
import crypto from 'node:crypto';

export function makeSupportNotifier({stmt,tx,now,ownerIds=[],send,logger=console,schedule=true}) {
  if(typeof send!=='function')throw Error('Telegram notification sender missing');
  let processing=false;
  let timer=null;
  const staffRecipients=(exclude='')=>{
    const saved=stmt("SELECT id FROM users WHERE role IN ('owner','coowner','moderator')").all();
    return [...new Set([...ownerIds,...saved.map(x=>x.id)].map(String))]
      .filter(id=>/^\d{5,20}$/.test(id)&&id!==String(exclude));
  };
  function queueOne(ticketId,recipientId,event,message) {
    const id=String(recipientId);
    if(!/^\d{5,20}$/.test(id)||typeof event!=='string'||!event||!ticketId)return false;
    const result=stmt(
      `INSERT OR IGNORE INTO support_notifications
       (id,ticket_id,recipient_id,event,body,created_at,next_attempt_at,status)
       VALUES (?,?,?,?,?,?,?,'pending')`
    ).run(crypto.randomUUID(),ticketId,id,event,String(message).slice(0,900),now(),now());
    return result.changes===1;
  }
  const queueStaff=(ticketId,event,message,exclude='')=>{
    let count=0;
    for(const id of staffRecipients(exclude))if(queueOne(ticketId,id,'staff:'+event,message))count++;
    if(count)wake();
    return count;
  };
  const queuePlayer=(ticketId,event,playerId,message)=>{
    const added=queueOne(ticketId,playerId,'player:'+event,message);
    if(added)wake();
    return added;
  };
  function wake() {
    if(!schedule)return;
    if(timer)return;
    timer=setTimeout(()=>{timer=null;void deliverBatch()},300);
    timer.unref?.();
  }
  async function deliverBatch() {
    if(processing)return;
    processing=true;
    try {
      const pending=stmt(
        "SELECT id,recipient_id,event,body,attempts FROM support_notifications WHERE status='pending' AND next_attempt_at<=? ORDER BY created_at,id LIMIT 15"
      ).all(now());
      for(const item of pending) {
        if(item.event.startsWith('staff:')&&!staffRecipients().includes(item.recipient_id)){
          stmt("UPDATE support_notifications SET status='failed',last_error='staff role revoked' WHERE id=?").run(item.id);
          continue;
        }
        try {
          await send(item.recipient_id,item.body);
          stmt("UPDATE support_notifications SET status='sent',sent_at=?,attempts=attempts+1,last_error=NULL WHERE id=? AND status='pending'")
            .run(now(),item.id);
        } catch(error) {
          const description=String(error?.message||error).slice(0,180);
          const blocked=error?.httpStatus===403||/bot was blocked|chat not found|user is deactivated|can't initiate conversation/i.test(description);
          const invalid=error?.httpStatus===400;
          const attempts=item.attempts+1;
          const status=blocked||invalid?'blocked':attempts>=12?'failed':'pending';
          const retry=now()+Math.min(3600,10*Math.pow(2,Math.min(attempts,8)));
          stmt("UPDATE support_notifications SET status=?,attempts=?,next_attempt_at=?,last_error=? WHERE id=?")
            .run(status,attempts,retry,description,item.id);
          logger.warn?.('Support Telegram delivery not completed:',error?.httpStatus||'network',status);
        }
      }
    } catch(error) {
      logger.error?.('Support notification queue error:',String(error?.message||error).slice(0,150));
    } finally{processing=false}
  }
  function retryForChat(chatId) {
    const id=String(chatId);
    if(!/^\d{5,20}$/.test(id))return 0;
    const staff=staffRecipients().includes(id);
    const result=staff
      ?stmt("UPDATE support_notifications SET status='pending',attempts=0,next_attempt_at=?,last_error=NULL WHERE recipient_id=? AND status='blocked'").run(now(),id)
      :stmt("UPDATE support_notifications SET status='pending',attempts=0,next_attempt_at=?,last_error=NULL WHERE recipient_id=? AND status='blocked' AND event LIKE 'player:%'").run(now(),id);
    if(result.changes)wake();
    return result.changes;
  }
  function statusForStaff(id) {
    return stmt("SELECT event,status,attempts,last_error,created_at,sent_at FROM support_notifications WHERE recipient_id=? ORDER BY created_at DESC LIMIT 20")
      .all(String(id)).map(x=>({
        event:x.event,status:x.status,attempts:x.attempts,
        // Do not expose raw Telegram API errors or recipients in the UI.
        action:x.status==='blocked'?'open_bot_and_start':x.status==='failed'?'contact_admin':null,
        created_at:x.created_at,sent_at:x.sent_at
      }));
  }
  function queueExisting(limit=30) {
    const rows=stmt("SELECT id,user_id,category,priority FROM tickets WHERE status IN ('open','auto_support','in_review') ORDER BY created_at DESC LIMIT ?").all(limit);
    let count=0;
    for(const t of rows)count+=queueStaff(t.id,'created','GM TOKEN · обращение #'+t.id.slice(0,8)+'\nКатегория: '+t.category+'\nПриоритет: '+t.priority+'\nОткрой Mini App → Поддержка.',t.user_id);
    return count;
  }
  const interval=schedule?setInterval(()=>void deliverBatch(),15000):null;
  interval?.unref?.();
  return {queueStaff,queuePlayer,queueExisting,staffRecipients,deliverBatch,retryForChat,statusForStaff};
}

export async function deliverSupportTelegram({token,chatId,text,fetchImpl=fetch}) {
  if(!token)throw Error('Telegram bot not configured');
  const response=await fetchImpl('https://api.telegram.org/bot'+token+'/sendMessage',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({chat_id:chatId,text:String(text).slice(0,900)}),
    signal:AbortSignal.timeout(10000)
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data?.ok){
    const error=new Error('Telegram notification rejected: '+String(data?.description||response.status).slice(0,130));
    error.httpStatus=response.status;
    throw error;
  }
  return true;
}
