import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import * as ton from '@ton/ton';
import {DatabaseSync} from 'node:sqlite';
import {verifyTonProof,supportedWalletVersions,formatJettonAmount,normalizeTonAddress} from '../server/ton-proof.mjs';
import {makeHolders} from '../server/holders.mjs';

const DOMAIN='gm-token-test-iprj.onrender.com';
const now=()=>Math.floor(Date.now()/1000);
function signedWalletProof(nonce,{privateKey,publicKey,wallet},timestamp=now(),domain=DOMAIN){
 const state=ton.beginCell().store(ton.storeStateInit(wallet.init)).endCell().toBoc().toString('base64');
 const addr=wallet.address;
 const dl=Buffer.from(domain),wc=Buffer.alloc(4),len=Buffer.alloc(4),ts=Buffer.alloc(8);
 wc.writeInt32BE(addr.workChain);len.writeUInt32LE(dl.length);ts.writeBigUInt64LE(BigInt(timestamp));
 const msg=Buffer.concat([Buffer.from('ton-proof-item-v2/'),wc,addr.hash,len,dl,ts,Buffer.from(nonce)]);
 const digest=crypto.createHash('sha256').update(Buffer.concat([Buffer.from([255,255]),Buffer.from('ton-connect'),crypto.createHash('sha256').update(msg).digest()])).digest();
 const signature=crypto.sign(null,digest,privateKey).toString('base64');
 return {address:addr.toString(),network:'-239',public_key:publicKey.toString('hex'),
  proof:{timestamp,domain:{lengthBytes:dl.length,value:domain},signature,payload:nonce,state_init:state}};
}
function generateWallet(){
 const {publicKey,privateKey}=crypto.generateKeyPairSync('ed25519');
 const pk=publicKey.export({format:'der',type:'spki'}).subarray(-32);
 return {publicKey:pk,privateKey,wallet:ton.WalletContractV4.create({workchain:0,publicKey:pk})};
}
function fixture(opts={}){
 const db=new DatabaseSync(':memory:');
 db.exec("PRAGMA foreign_keys=ON; CREATE TABLE users(id TEXT PRIMARY KEY,username TEXT)");
 for(const [id,name] of [['11','First'],['12','Second'],['13','Third']])db.prepare('INSERT INTO users(id,username) VALUES(?,?)').run(id,name);
 const stmt=sql=>db.prepare(sql);
 const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const val=fn();db.exec('COMMIT');return val}catch(e){db.exec('ROLLBACK');throw e}};
 let time=now(),master=opts.master??null;
 const holder=makeHolders({stmt,tx,now:()=>time,master:()=>master,readBalance:opts.readBalance??(async()=>({amount_raw:'0',decimals:9}))});
 return {db,holder,setMaster:v=>{master=v},advance:v=>{time+=v},now:()=>time,stmt};
}
test('ton proof accepts only matching Ed25519 signature of a recognized StateInit, domain and fresh nonce',()=>{
 const wallet=generateWallet(),nonce=crypto.randomBytes(32).toString('hex');
 assert.ok(supportedWalletVersions().includes('V4'));
 const valid=signedWalletProof(nonce,wallet);
 assert.equal(verifyTonProof(valid,nonce,DOMAIN),wallet.wallet.address.toRawString());
 const corrupted=structuredClone(valid);corrupted.proof.signature=Buffer.alloc(64).toString('base64');
 assert.equal(verifyTonProof(corrupted,nonce,DOMAIN),null);
 assert.equal(verifyTonProof(valid,'other-nonce',DOMAIN),null);
 assert.equal(verifyTonProof(valid,nonce,'wrong.example.com'),null);
 assert.equal(verifyTonProof({...valid,network:'-3'},nonce,DOMAIN),null);
 assert.equal(verifyTonProof({...valid,public_key:'ff'.repeat(32)},nonce,DOMAIN),null);
 assert.equal(verifyTonProof(valid,nonce,DOMAIN,now()+700),null);
 assert.equal(verifyTonProof({...valid,proof:{...valid.proof,state_init:'invalid'}},nonce,DOMAIN),null);
});
test('wallet proof supports standard V5R1 if available in official TON SDK',t=>{
 if(!ton.WalletContractV5R1){t.skip('V5R1 not provided by this SDK');return}
 const {publicKey,privateKey}=crypto.generateKeyPairSync('ed25519');
 const pk=publicKey.export({format:'der',type:'spki'}).subarray(-32);
 const wallet=ton.WalletContractV5R1.create({workchain:0,publicKey:pk});
 const nonce=crypto.randomBytes(32).toString('hex');
 const proof=signedWalletProof(nonce,{privateKey,publicKey:pk,wallet});
 assert.ok(supportedWalletVersions().includes('V5R1'),'wallet contract code is recognized');
 assert.equal(verifyTonProof(proof,nonce,DOMAIN),wallet.address.toRawString(),'V5 proof is signed with valid StateInit key');
});
test('a verified wallet never becomes a holder without official contract and opt-in',async()=>{
 const f=fixture();
 const wa=generateWallet(),nonce=f.holder.challenge('11').payload;
 const proof=signedWalletProof(nonce,wa,f.now());
 const result=f.holder.confirm('11',proof,DOMAIN);
 assert.equal(result.verified,true,JSON.stringify(result));
 assert.equal(f.holder.status('11').wallet_verified,true);
 assert.equal(f.holder.status('11').opt_in,false);
 assert.equal(f.holder.ranking('11').enabled,false);
 assert.deepEqual(f.holder.ranking('11').podium,[]);
 const replay=f.holder.confirm('11',proof,DOMAIN);
 assert.equal(replay.verified,false,'single-use challenge');
 const other=f.holder.challenge('12').payload;
 assert.equal(f.holder.confirm('12',signedWalletProof(other,wa,f.now()),DOMAIN).verified,false,'same wallet blocked across players');
 assert.throws(()=>f.holder.consent('13',true),/verified wallet required|signature must be verified/);
 f.db.close();
});
test('ranking sorts only verified server-fetched balances by BigInt, with consent and pagination',async()=>{
 let source={'11':{amount_raw:'100000000000000000000000000000',decimals:9},
  '12':{amount_raw:'95000000000000000000000000000',decimals:9},
  '13':{amount_raw:'2000000000',decimals:9}};
 const wallets=[generateWallet(),generateWallet(),generateWallet()];
 const token=wallets[0].wallet.address.toRawString();
 const association=new Map(wallets.map((w,i)=>[w.wallet.address.toRawString(),['11','12','13'][i]]));
 const f=fixture({master:token,readBalance:async addr=>source[association.get(addr)]});
 for(let i=0;i<3;i++){
  const id=['11','12','13'][i],nonce=f.holder.challenge(id).payload;
  assert.equal(f.holder.confirm(id,signedWalletProof(nonce,wallets[i],f.now()),DOMAIN).verified,true);
  assert.equal((await f.holder.refresh(id)).updated,true);
  f.holder.consent(id,true);
 }
 let result=f.holder.ranking('12',{offset:0,limit:2});
 assert.equal(result.enabled,true);
 assert.equal(result.participants,3);
 assert.equal(result.my_rank,2);
 assert.deepEqual(result.podium.map(p=>p.rank),[1,2,3]);
 assert.deepEqual(result.users.map(p=>p.username),['First','Second']);
 assert.equal(result.has_more,true);
 assert.equal(f.holder.ranking('12',{offset:2,limit:2}).users[0].username,'Third');
 assert.equal(formatJettonAmount('123450000000',9),'123.45');
 assert.throws(()=>formatJettonAmount('2e12',9),/invalid/);
 f.holder.consent('11',false);
 assert.equal(f.holder.ranking('12').participants,2);
 assert.equal(f.holder.ranking('12').my_rank,1);
 f.advance(901);
 assert.equal(f.holder.ranking('12').participants,0,'stale chain checks are excluded');
 f.holder.disconnect('12');
 assert.equal(f.holder.status('12').wallet_verified,false);
 f.db.close();
});
test('expired and cross-user challenges do not link a wallet; no browser-controlled balance API',()=>{
 const f=fixture(),w=generateWallet(),nonce=f.holder.challenge('11').payload;
 assert.equal(f.holder.confirm('12',signedWalletProof(nonce,w,f.now()),DOMAIN).verified,false);
 f.advance(601);
 assert.equal(f.holder.confirm('11',signedWalletProof(nonce,w,f.now()-601),DOMAIN).verified,false);
 assert.equal(f.holder.status('11').wallet_verified,false);
 f.db.close();
});
