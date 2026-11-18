// Optional, owner-authorized native GRAM verification fee.
// The ordinary TON wallet signature remains free; this service grants a separate anti-bot badge.
// No server-side signing, wallet secrets, client-asserted payments, or automatic debits.
import crypto from 'node:crypto';
import {beginCell} from '@ton/ton';
import {normalizeTonAddress} from './ton-proof.mjs';

export const GRAM_VERIFICATION_RECEIVER='UQAUQTPaWFvCkNF9XD_ZgaKjGB6Z1tMraH_8tGbXYBEMaRNB';
export const GRAM_VERIFICATION_RECEIVER_RAW=normalizeTonAddress(GRAM_VERIFICATION_RECEIVER);
export const GRAM_VERIFICATION_NANOGRAM='50000000'; // Exactly 0.05 native GRAM (9 decimals).
const INVOICE_TTL=600, RECHECK_INTERVAL=15;

export function encodeGramVerificationMemo(memo) {
 if(!/^GMV:[a-f0-9]{32}$/.test(memo))throw Error('invalid payment reference');
 return beginCell().storeUint(0,32).storeStringTail(memo).endCell().toBoc().toString('base64');
}

export async function listIncomingGramPayments(receiver=GRAM_VERIFICATION_RECEIVER_RAW) {
 // Read-only indexed on-chain transactions; missing data always means "pending".
 const url='https://tonapi.io/v2/blockchain/accounts/'+encodeURIComponent(receiver)+'/transactions?limit=100';
 const headers={accept:'application/json'};
 if(process.env.TONAPI_KEY)headers.authorization='Bearer '+process.env.TONAPI_KEY;
 const response=await fetch(url,{headers,signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('TON payment indexing unavailable');
 const payload=await response.json();
 if(!Array.isArray(payload?.transactions))throw Error('invalid TON transaction response');
 return payload.transactions;
}

export function matchConfirmedGramPayment(transactions,invoice) {
 if(!Array.isArray(transactions))return null;
 for(const tx of transactions) {
  // Never interpret outgoing transfers, pending wallet requests or emulations as payments.
  if(tx?.success!==true||!tx?.hash||typeof tx.hash!=='string')continue;
  const msg=tx.in_msg;
  if(!msg?.source||!msg?.destination||String(msg.value)!==GRAM_VERIFICATION_NANOGRAM)continue;
  let from,to;
  try{from=normalizeTonAddress(msg.source);to=normalizeTonAddress(msg.destination)}catch{continue}
  if(from!==invoice.wallet_address||to!==GRAM_VERIFICATION_RECEIVER_RAW)continue;
  const comment=msg.decoded_body?.text??msg.decoded_body?.comment??msg.message;
  if(comment!==invoice.memo)continue;
  const timestamp=Number(tx.utime);
  if(!Number.isSafeInteger(timestamp)||timestamp<invoice.created_at-30||timestamp>invoice.expires_at+7200)continue;
  if(!/^[A-Za-z0-9+/_=-]{32,100}$/.test(tx.hash))continue;
  return {hash:tx.hash,confirmed_at:timestamp};
 }
 return null;
}

export function makeGramVerification({stmt,tx,log,now=()=>Math.floor(Date.now()/1000),listIncoming=listIncomingGramPayments,enabled=()=>process.env.GM_GRAM_VERIFICATION_ENABLED==='1'}) {
 const receiverOwnedByAdmin=()=>Boolean(stmt("SELECT u.id FROM users u JOIN holder_wallets h ON h.user_id=u.id WHERE u.role IN ('owner','coowner') AND h.wallet_address=? AND h.verified_at>0 LIMIT 1").get(GRAM_VERIFICATION_RECEIVER_RAW));
 const isEnabled=()=>Boolean(enabled())&&receiverOwnedByAdmin();
 const linkedWallet=id=>stmt('SELECT wallet_address FROM holder_wallets WHERE user_id=? AND verified_at>0').get(id)?.wallet_address||null;
 const paid=(id,wallet)=>wallet?stmt("SELECT id,tx_hash,verified_at FROM gram_verification_payments WHERE user_id=? AND wallet_address=? AND status='paid' LIMIT 1").get(id,wallet):null;
 const latest=id=>stmt("SELECT id,wallet_address,memo,status,created_at,expires_at,checked_at FROM gram_verification_payments WHERE user_id=? ORDER BY created_at DESC LIMIT 1").get(id)||null;
 const status=id=>{
  const wallet=linkedWallet(id),success=paid(id,wallet),recent=latest(id);
  return {currency:'GRAM',amount:'0.05',amount_nanogram:GRAM_VERIFICATION_NANOGRAM,
   receiver:GRAM_VERIFICATION_RECEIVER,enabled:isEnabled(),wallet_proof_verified:Boolean(wallet),
   verified:Boolean(success),verified_at:success?.verified_at||null,
   pending:!success&&recent?.wallet_address===wallet&&recent.status==='pending'&&recent.expires_at>=now(),
   current_invoice_id:!success&&recent?.wallet_address===wallet&&recent.status==='pending'&&recent.expires_at>=now()?recent.id:null,
   separate_network_fee:true};
 };
 const begin=id=>tx(()=>{
  if(!isEnabled())throw Error('GRAM verification fee is not enabled: receiving wallet must be verified by an owner');
  const wallet=linkedWallet(id);
  if(!wallet)throw Error('verify your TON wallet signature first');
  if(paid(id,wallet))return {...status(id),already_paid:true};
  let row=latest(id);
  if(!row||row.status!=='pending'||row.expires_at<=now()||row.wallet_address!==wallet) {
   const invoiceId=crypto.randomUUID(),memo='GMV:'+crypto.randomBytes(16).toString('hex'),created=now();
   stmt("INSERT INTO gram_verification_payments(id,user_id,wallet_address,receiver_address,amount_nanogram,memo,status,created_at,expires_at,checked_at) VALUES(?,?,?,?,?,?,'pending',?,?,0)")
    .run(invoiceId,id,wallet,GRAM_VERIFICATION_RECEIVER_RAW,GRAM_VERIFICATION_NANOGRAM,memo,created,created+INVOICE_TTL);
   row=latest(id);
  }
  return {verified:false,invoice_id:row.id,receiver:GRAM_VERIFICATION_RECEIVER,
   amount_nanogram:GRAM_VERIFICATION_NANOGRAM,amount:'0.05',currency:'GRAM',
   memo:row.memo,payload:encodeGramVerificationMemo(row.memo),expires_at:row.expires_at,
   separate_network_fee:true};
 });
 const check=async id=>{
  const wallet=linkedWallet(id);
  if(!wallet)throw Error('verify TON wallet first');
  if(paid(id,wallet))return status(id);
  const invoice=stmt("SELECT * FROM gram_verification_payments WHERE user_id=? AND wallet_address=? AND status='pending' ORDER BY created_at DESC LIMIT 1").get(id,wallet);
  if(!invoice)return status(id);
  const t=now();
  if(t>invoice.expires_at+7200)return {...status(id),notice:'verification request expired; contact support if payment was sent'};
  if(invoice.checked_at>t-RECHECK_INTERVAL)return status(id);
  // Reserve the polling slot in the database before external I/O.
  tx(()=>stmt("UPDATE gram_verification_payments SET checked_at=? WHERE id=? AND status='pending' AND checked_at<?").run(t,invoice.id,t-RECHECK_INTERVAL));
  const transactions=await listIncoming(GRAM_VERIFICATION_RECEIVER_RAW);
  const found=matchConfirmedGramPayment(transactions,invoice);
  if(!found)return status(id);
  return tx(()=>{
   if(!linkedWallet(id)||linkedWallet(id)!==invoice.wallet_address)throw Error('verified wallet changed');
   if(paid(id,wallet))return status(id);
   const current=stmt("SELECT status FROM gram_verification_payments WHERE id=? AND user_id=?").get(invoice.id,id);
   if(current?.status!=='pending')return status(id);
   // A unique hash prevents one payment being credited to more than one account/invoice.
   stmt("UPDATE gram_verification_payments SET status='paid',tx_hash=?,verified_at=? WHERE id=? AND status='pending'").run(found.hash,now(),invoice.id);
   log(id,'gram_verification_paid',{user:id,invoice:invoice.id,tx_hash:found.hash,amount_nanogram:GRAM_VERIFICATION_NANOGRAM});
   return status(id);
  });
 };
 return {status,begin,check};
}
