// Server-owned read-only GM holders: scores exist only after signed TON proofs
// and an independent mainnet Jetton balance check for the configured master.
import crypto from 'node:crypto';
import {normalizeTonAddress,resolveGMJettonMaster,verifyTonProof,formatJettonAmount,PROOF_TTL_SECONDS} from './ton-proof.mjs';

export const HOLDINGS_FRESH_SECONDS=900;
export const HOLDINGS_REFRESH_SECONDS=180;

export async function readGMJettonBalance(account,master){
 const addr=normalizeTonAddress(account),token=normalizeTonAddress(master);
 const target='https://tonapi.io/v2/accounts/'+encodeURIComponent(addr)+'/jettons/'+encodeURIComponent(token);
 const headers={accept:'application/json'};
 if(process.env.TONAPI_KEY)headers.authorization='Bearer '+process.env.TONAPI_KEY;
 const response=await fetch(target,{headers,signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new Error('could not verify TON GM balance');
 const data=await response.json();
 if(!data?.jetton?.address||normalizeTonAddress(data.jetton.address)!==token)throw new Error('Jetton contract mismatch');
 const raw=String(data.balance);
 const decimals=Number(data.jetton.decimals);
 formatJettonAmount(raw,decimals);
 return {amount_raw:raw,decimals};
}

export function makeHolders({stmt,tx,now=()=>Math.floor(Date.now()/1000),master=()=>resolveGMJettonMaster(),readBalance=readGMJettonBalance}){
 stmt("CREATE TABLE IF NOT EXISTS holder_nonces (nonce TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL)").run();
 stmt("CREATE TABLE IF NOT EXISTS holder_wallets (user_id TEXT PRIMARY KEY REFERENCES users(id),wallet_address TEXT NOT NULL UNIQUE,verified_at INTEGER NOT NULL,public_opt_in INTEGER NOT NULL DEFAULT 0 CHECK(public_opt_in IN (0,1)))").run();
 stmt("CREATE TABLE IF NOT EXISTS holder_snapshots (user_id TEXT PRIMARY KEY REFERENCES users(id),master_address TEXT NOT NULL,amount_raw TEXT NOT NULL,decimals INTEGER NOT NULL,checked_at INTEGER NOT NULL)").run();
 stmt("CREATE INDEX IF NOT EXISTS idx_holder_snapshots_checked ON holder_snapshots(checked_at)").run();

 const wallet=id=>stmt('SELECT wallet_address,verified_at,public_opt_in FROM holder_wallets WHERE user_id=?').get(id)||null;
 const status=id=>{
  const own=wallet(id),token=master();
  return {wallet_verified:Boolean(own),wallet_address:own?.wallet_address||null,verified_at:own?.verified_at||null,
   opt_in:Boolean(own?.public_opt_in),configured:Boolean(token),contract_pending:!token,
   network:'ton-mainnet',score_source:'verified_onchain_gm_only'};
 };
 const challenge=id=>tx(()=>{
  stmt('DELETE FROM holder_nonces WHERE expires_at<=?').run(now());
  stmt('DELETE FROM holder_nonces WHERE user_id=?').run(id);
  const nonce=crypto.randomBytes(32).toString('hex');
  stmt('INSERT INTO holder_nonces(nonce,user_id,expires_at) VALUES(?,?,?)').run(nonce,id,now()+PROOF_TTL_SECONDS);
  return {payload:nonce,expires_in:PROOF_TTL_SECONDS,network:'-239'};
 });
 const confirm=(id,body,domain)=>{
  const proof=body?.proof;
  if(!proof||typeof proof.payload!=='string'||!domain)return {verified:false,error:'invalid TON proof'};
  const row=stmt('SELECT expires_at FROM holder_nonces WHERE nonce=? AND user_id=?').get(proof.payload,id);
  if(!row||row.expires_at<=now())return {verified:false,error:'proof expired or was not issued to this Telegram user'};
  const address=verifyTonProof(body,proof.payload,domain,now());
  if(!address)return {verified:false,error:'could not verify wallet signature, network, domain or StateInit'};
  try{return tx(()=>{
   const used=stmt('DELETE FROM holder_nonces WHERE nonce=? AND user_id=? AND expires_at>?').run(proof.payload,id,now());
   if(!used.changes)throw new Error('reused/expired proof');
   const linked=stmt('SELECT user_id FROM holder_wallets WHERE wallet_address=?').get(address);
   if(linked&&linked.user_id!==id)throw new Error('wallet is already linked to another account');
   stmt("INSERT INTO holder_wallets(user_id,wallet_address,verified_at,public_opt_in) VALUES(?,?,?,0) ON CONFLICT(user_id) DO UPDATE SET wallet_address=excluded.wallet_address,verified_at=excluded.verified_at,public_opt_in=0")
    .run(id,address,now());
   stmt('DELETE FROM holder_snapshots WHERE user_id=?').run(id);
   return {verified:true,address,network:'-239',opt_in:false};
  })}catch(error){return {verified:false,error:String(error?.message||error)}}
 };
 const consent=(id,optIn)=>{
  if(typeof optIn!=='boolean')throw new Error('opt_in must be boolean');
  if(!stmt('UPDATE holder_wallets SET public_opt_in=? WHERE user_id=?').run(optIn?1:0,id).changes)throw new Error('wallet signature must be verified first');
  return status(id);
 };
 const disconnect=id=>tx(()=>{
  stmt('DELETE FROM holder_snapshots WHERE user_id=?').run(id);
  stmt('DELETE FROM holder_nonces WHERE user_id=?').run(id);
  stmt('DELETE FROM holder_wallets WHERE user_id=?').run(id);
  return {disconnected:true};
 });
 const refresh=async(id)=>{
  const own=wallet(id),token=master();
  if(!own)throw new Error('verified wallet required');
  if(!token)throw new Error('official GM Jetton master contract not configured');
  const old=stmt('SELECT checked_at,master_address FROM holder_snapshots WHERE user_id=?').get(id);
  if(old&&old.master_address===token&&old.checked_at>now()-HOLDINGS_REFRESH_SECONDS)return {updated:false,checked_at:old.checked_at};
  const data=await readBalance(own.wallet_address,token);
  if(!data||typeof data.amount_raw!=='string')throw new Error('unverified balance data');
  formatJettonAmount(data.amount_raw,data.decimals);
  return tx(()=>{
   const current=wallet(id);
   if(!current||current.wallet_address!==own.wallet_address||master()!==token)throw new Error('wallet link changed');
   stmt("INSERT INTO holder_snapshots(user_id,master_address,amount_raw,decimals,checked_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET master_address=excluded.master_address,amount_raw=excluded.amount_raw,decimals=excluded.decimals,checked_at=excluded.checked_at")
    .run(id,token,data.amount_raw,data.decimals,now());
   return {updated:true,checked_at:now()};
  });
 };
 function ranking(id,{offset=0,limit=30}={}){
  const token=master(),own=wallet(id);
  if(!token)return {enabled:false,reason:'contract_pending',participants:0,podium:[],users:[],my_rank:null,next_offset:null,has_more:false,network:'ton-mainnet',wallet_verified:Boolean(own)};
  const freshAfter=now()-HOLDINGS_FRESH_SECONDS;
  const clause=" FROM holder_wallets w JOIN holder_snapshots b ON b.user_id=w.user_id JOIN users u ON u.id=w.user_id WHERE w.public_opt_in=1 AND w.verified_at>0 AND b.master_address=? AND b.checked_at>=? AND b.amount_raw NOT GLOB '*[^0-9]*' AND length(b.amount_raw)>0 AND length(b.amount_raw)<=80";
  const order=" ORDER BY length(b.amount_raw) DESC,b.amount_raw DESC,w.user_id ASC";
  const count=stmt('SELECT COUNT(*) n'+clause).get(token,freshAfter).n;
  const rows=stmt('SELECT w.user_id AS id,u.username,b.amount_raw,b.decimals,b.checked_at'+clause+order+' LIMIT ? OFFSET ?').all(token,freshAfter,limit,offset);
  const podium=stmt('SELECT w.user_id AS id,u.username,b.amount_raw,b.decimals,b.checked_at'+clause+order+' LIMIT 3').all(token,freshAfter);
  const me=own?.public_opt_in?stmt('SELECT b.amount_raw FROM holder_wallets w JOIN holder_snapshots b ON b.user_id=w.user_id WHERE w.user_id=? AND w.public_opt_in=1 AND b.master_address=? AND b.checked_at>=?').get(id,token,freshAfter):null;
  let myRank=null;
  if(me){
   const greater=stmt('SELECT COUNT(*) n'+clause+" AND (length(b.amount_raw)>length(?) OR (length(b.amount_raw)=length(?) AND (b.amount_raw>? OR (b.amount_raw=? AND w.user_id<?))))")
    .get(token,freshAfter,me.amount_raw,me.amount_raw,me.amount_raw,me.amount_raw,id).n;
   myRank=greater+1;
  }
  const convert=(r,rank)=>({rank,username:String(r.username||'GM Holder').replace(/[<>]/g,'').slice(0,30)||'GM Holder',
    gm:formatJettonAmount(r.amount_raw,r.decimals),verified_at:r.checked_at});
  return {enabled:true,reason:count?'ok':'no_verified_holders',participants:count,podium:podium.map((r,i)=>convert(r,i+1)),
   users:rows.map((r,i)=>convert(r,offset+i+1)),my_rank:myRank,has_more:offset+rows.length<count,
   next_offset:offset+rows.length<count?offset+rows.length:null,network:'ton-mainnet',wallet_verified:Boolean(own),
   score_source:'verified_onchain_gm_only',fresh_after:freshAfter};
 }
 return {status,challenge,confirm,consent,disconnect,refresh,ranking};
}
