import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {GRAM_VERIFICATION_RECEIVER,GRAM_VERIFICATION_RECEIVER_RAW,GRAM_VERIFICATION_NANOGRAM,encodeGramVerificationMemo,matchConfirmedGramPayment,makeGramVerification} from '../server/gram-verification.mjs';
import {normalizeTonAddress} from '../server/ton-proof.mjs';

const wallet='0:'+'12'.repeat(32);
const owner=GRAM_VERIFICATION_RECEIVER_RAW;
const hash='f'.repeat(64);

test('owner-signed recipient required, fee never charged for ordinary wallet link',async()=>{
 const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,role TEXT NOT NULL);
 CREATE TABLE holder_wallets(user_id TEXT PRIMARY KEY,wallet_address TEXT,verified_at INTEGER);
 CREATE TABLE gram_verification_payments(
  id TEXT PRIMARY KEY,user_id TEXT,wallet_address TEXT,receiver_address TEXT,amount_nanogram TEXT,memo TEXT UNIQUE,
  status TEXT CHECK(status IN ('pending','paid')),tx_hash TEXT UNIQUE,
  created_at INTEGER,expires_at INTEGER,checked_at INTEGER DEFAULT 0,verified_at INTEGER);
 `);
 const stmt=sql=>db.prepare(sql);
 let t=1_800_000_000, fetchCount=0, txs=[], journal=[];
 const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const out=fn();db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}};
 const service=makeGramVerification({stmt,tx,log:(actor,kind,data)=>journal.push({actor,kind,data}),now:()=>t,
  enabled:()=>true,listIncoming:async()=>{fetchCount++;return txs}});
 const p=stmt('INSERT INTO users(id,role) VALUES(?,?)');
 p.run('admin','owner');p.run('player','player');p.run('other','player');
 stmt('INSERT INTO holder_wallets(user_id,wallet_address,verified_at) VALUES(?,?,?)').run('player',wallet,t);
 assert.equal(service.status('player').wallet_proof_verified,true);
 assert.equal(service.status('player').verified,false);
 assert.equal(service.status('player').enabled,false);
 assert.throws(()=>service.begin('player'),/not enabled/);
 stmt('INSERT INTO holder_wallets(user_id,wallet_address,verified_at) VALUES(?,?,?)').run('admin',owner,t);
 assert.equal(service.status('player').enabled,true);

 const invoice=service.begin('player');
 assert.equal(invoice.amount_nanogram,'50000000');
 assert.equal(invoice.receiver,GRAM_VERIFICATION_RECEIVER);
 assert.equal(invoice.memo.length,36);
 assert.equal(service.begin('player').invoice_id,invoice.invoice_id,'duplicate taps reuse invoice');
 const body=encodeGramVerificationMemo(invoice.memo);
 assert.ok(Buffer.from(body,'base64').length>40,'on-chain comment payload is a TON cell');
 const untrustedMessage={hash,success:true,utime:t,in_msg:{source:wallet,destination:owner,value:GRAM_VERIFICATION_NANOGRAM,decoded_body:{text:invoice.memo}}};
 assert.equal(matchConfirmedGramPayment([{...untrustedMessage,in_msg:{...untrustedMessage.in_msg,value:'1000000'}}],{...invoice,wallet_address:wallet,created_at:t}),null,'underpayment never credited');
 assert.equal(matchConfirmedGramPayment([{...untrustedMessage,in_msg:{...untrustedMessage.in_msg,source:owner}}],{...invoice,wallet_address:wallet,created_at:t}),null,'sender must match signed wallet');
 assert.equal(matchConfirmedGramPayment([{...untrustedMessage,success:false}],{...invoice,wallet_address:wallet,created_at:t}),null,'failed transactions rejected');
 txs=[{...untrustedMessage,success:false}];
 assert.equal((await service.check('player')).verified,false);
 assert.equal(fetchCount,1);
 assert.equal((await service.check('player')).verified,false);
 assert.equal(fetchCount,1,'rate-limited to avoid API spam');
 t+=20;txs=[untrustedMessage];
 const paid=await service.check('player');
 assert.equal(paid.verified,true);
 assert.equal(paid.wallet_proof_verified,true);
 assert.equal(journal.length,1,'one audit record');
 assert.equal(service.begin('player').already_paid,true,'cannot charge same verified wallet again');
 assert.equal((await service.check('player')).verified,true);
 assert.equal(journal.length,1,'no duplicate confirmation');
 assert.equal(fetchCount,2);
 // Same wallet cannot be linked to a second account in production; a different user with another wallet
 // and identical transaction hash must never be credited via a different unique memo.
 stmt('INSERT INTO holder_wallets(user_id,wallet_address,verified_at) VALUES(?,?,?)').run('other','0:'+'34'.repeat(32),t);
 const other=service.begin('other');assert.notEqual(other.memo,invoice.memo);
 t+=20;assert.equal((await service.check('other')).verified,false);
 assert.equal(journal.length,1);
 db.close();
});

test('GRAM recipient is a valid mainnet TON account, not a jetton master',()=>{
 assert.equal(normalizeTonAddress(GRAM_VERIFICATION_RECEIVER),GRAM_VERIFICATION_RECEIVER_RAW);
 assert.match(GRAM_VERIFICATION_RECEIVER_RAW,/^0:[0-9a-f]{64}$/);
});
