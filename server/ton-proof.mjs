// Read-only TON Connect proof-of-control verifier. No transfers, wallet secrets or on-chain writes.
import crypto from 'node:crypto';
import * as ton from '@ton/ton';

const {Address,Cell,contractAddress,loadStateInit}=ton;
export const PROOF_TTL_SECONDS=600;

function knownWalletCodes(){
 const codes=new Map();
 const versions=[['V4',ton.WalletContractV4,0],['V5R1',ton.WalletContractV5R1,1]];
 for(const [name,Wallet,offset] of versions){
  if(!Wallet?.create)continue;
  try {
   const instance=Wallet.create({workchain:0,publicKey:Buffer.alloc(32)});
   const codeHash=instance.init?.code?.hash()?.toString('hex');
   if(codeHash)codes.set(codeHash,{name,offset});
  }catch{/* Unsupported SDK layout remains untrusted */}
 }
 return codes;
}
const walletCodes=knownWalletCodes();
export function supportedWalletVersions(){return Array.from(walletCodes.values()).map(v=>v.name)}

export function normalizeTonAddress(input){
 if(typeof input!=='string'||input.length>100)throw new Error('invalid TON address');
 const address=Address.parse(input);
 if(address.workChain!==0)throw new Error('only TON basechain accounts are supported');
 return address.toRawString();
}
export function resolveGMJettonMaster(value=process.env.GM_JETTON_MASTER_ADDRESS){
 if(!value||typeof value!=='string'||value.length>100)return null;
 try{return normalizeTonAddress(value.trim())}catch{return null}
}
export function verifyTonProof(body,nonce,domain,now=Math.floor(Date.now()/1000)){
 try{
  if(!body||body.network!=='-239'||!body.proof||typeof nonce!=='string'||!nonce)return null;
  const proof=body.proof;
  if(proof.payload!==nonce||typeof proof.signature!=='string'||proof.signature.length>160)return null;
  if(typeof proof.state_init!=='string'||proof.state_init.length>16384)return null;
  const domainBytes=Buffer.from(domain,'utf8');
  if(!domain.includes('.')||domainBytes.length>128||proof.domain?.value!==domain||proof.domain.lengthBytes!==domainBytes.length)return null;
  const timestamp=Number(proof.timestamp);
  if(!Number.isSafeInteger(timestamp)||Math.abs(now-timestamp)>PROOF_TTL_SECONDS)return null;
  const address=Address.parse(body.address);
  if(address.workChain!==0)return null;
  const state=loadStateInit(Cell.fromBase64(proof.state_init).beginParse());
  if(!state?.code||!state?.data||!contractAddress(address.workChain,state).equals(address))return null;
  const type=walletCodes.get(state.code.hash().toString('hex'));
  if(!type)return null; // Refuse unknown code instead of trusting user-submitted public keys/getters.
  const bits=state.data.beginParse();
  if(type.offset===1&&!bits.loadBit())return null;
  bits.loadUint(32); // seqno
  bits.loadUint(32); // wallet ID
  const publicKey=bits.loadBuffer(32);
  if(body.public_key!==undefined){
   if(typeof body.public_key!=='string'||!/^[0-9a-fA-F]{64}$/.test(body.public_key)||!publicKey.equals(Buffer.from(body.public_key,'hex')))return null;
  }
  const signature=Buffer.from(proof.signature,'base64');
  if(signature.length!==64)return null;
  const workchain=Buffer.alloc(4);workchain.writeInt32BE(address.workChain);
  const len=Buffer.alloc(4);len.writeUInt32LE(domainBytes.length);
  const time=Buffer.alloc(8);time.writeBigUInt64LE(BigInt(timestamp));
  const payload=Buffer.concat([Buffer.from('ton-proof-item-v2/'),workchain,address.hash,len,domainBytes,time,Buffer.from(nonce)]);
  const digest=crypto.createHash('sha256').update(Buffer.concat([
   Buffer.from([255,255]),Buffer.from('ton-connect'),
   crypto.createHash('sha256').update(payload).digest()
  ])).digest();
  const key=crypto.createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),publicKey]),format:'der',type:'spki'});
  return crypto.verify(null,digest,key,signature)?address.toRawString():null;
 }catch{return null}
}

export function formatJettonAmount(raw,decimals){
 if(!/^(0|[1-9][0-9]*)$/.test(String(raw))||!Number.isInteger(decimals)||decimals<0||decimals>18)throw new Error('invalid Jetton amount');
 const s=BigInt(raw).toString().padStart(decimals+1,'0');
 if(!decimals)return s;
 const fractional=s.slice(-decimals).replace(/0+$/,'');
 return fractional?s.slice(0,-decimals)+'.'+fractional:s.slice(0,-decimals);
}
