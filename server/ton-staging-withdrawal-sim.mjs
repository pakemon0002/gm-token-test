// GM TOKEN: offline, synthetic TON Testnet withdrawal-flow simulator.
// Absolutely NO blockchain calls, signer, database writes, wallet keys or production actions.
// Do not import into a live withdrawal handler: a game-balance match is NOT custody proof.
import {Address} from '@ton/ton';
import {TON_GAME_ALLOCATION} from './ton-prelaunch.mjs';

const TESTNET_CHAIN='-3';
const MAX_GM=150000000n;
const GM_CENT_TO_JETTON_RAW=10000000n;
const INT=/^(0|[1-9][0-9]*)$/;
const ID=/^[a-zA-Z0-9_.:-]{1,100}$/;

function integer(value,label){
  if(typeof value!=='string'||!INT.test(value)||value.length>30)
    throw new TypeError(label+' must be a non-negative integer string');
  return BigInt(value);
}
function id(value,label){
  if(typeof value!=='string'||!ID.test(value))throw new TypeError('Invalid '+label);
  return value;
}
function testnetAddress(value){
  if(typeof value!=='string'||value.length>100)throw new TypeError('TON address required');
  const parsed=Address.parse(value);
  if(parsed.workChain!==0)throw new Error('Only TON basechain addresses accepted in demo');
  return parsed.toRawString();
}

// Transparent read-only rendering of the existing GAME budget, not a planned onchain transfer.
export function previewGmAllocation(){
  const entries=Object.entries(TON_GAME_ALLOCATION).map(([fund,amount])=>{
    const gm=BigInt(amount);
    if(gm<0n)throw new Error('Negative game fund');
    return Object.freeze({fund,gm:gm.toString(),gmCents:(gm*100n).toString(),
      hypotheticalJettonRaw:(gm*100n*GM_CENT_TO_JETTON_RAW).toString()});
  });
  const sum=entries.reduce((v,e)=>v+BigInt(e.gm),0n);
  if(sum!==MAX_GM)throw new Error('Existing game fund allocation does not reconcile to 150m');
  return Object.freeze({
    mode:'UNAPPROVED_GAME_ALLOCATION_PREVIEW',chainId:TESTNET_CHAIN,
    totalGameGM:sum.toString(),funds:Object.freeze(entries),
    hypotheticalJettonEquivalenceOnly:true,realBackingVerified:false,
    productionDistributionApproved:false,onchainDistributionEnabled:false
  });
}

// Pure deterministic example. Only accepts explicitly labelled synthetic fixtures.
// Replays of the exact request ID never debit twice. No real GM or GMTEST is transferred.
export function simulateTestnetWithdrawals({fixtureType,chainId,users,requests}={}){
  if(fixtureType!=='synthetic_testnet_only'||chainId!==TESTNET_CHAIN)
    throw new Error('Only synthetic TON Testnet fixtures accepted; Mainnet forbidden');
  if(!Array.isArray(users)||users.length>1000||!Array.isArray(requests)||requests.length>2000)
    throw new TypeError('Bounded users and requests arrays required');
  const available=new Map(),reserved=new Map(),settled=new Map(),seen=new Map();
  for(const user of users){
    if(!user||typeof user!=='object')throw new TypeError('User fixture required');
    const name=id(user.userId,'userId');
    if(available.has(name))throw new Error('Duplicate test user');
    const amount=integer(user.availableGmCents,'availableGmCents');
    if(amount>MAX_GM*100n)throw new Error('Game balance exceeds total GM supply');
    available.set(name,amount);
    reserved.set(name,0n);
    settled.set(name,0n);
  }
  if([...available.values()].reduce((a,b)=>a+b,0n)>MAX_GM*100n)
    throw new Error('Sum of sample balances exceeds game budget');

  const results=[];
  for(const request of requests){
    if(!request||typeof request!=='object')throw new TypeError('Withdrawal request fixture required');
    if(request.chainId!==TESTNET_CHAIN)throw new Error('Mainnet or unknown chain forbidden');
    const operationId=id(request.operationId,'operationId'),name=id(request.userId,'userId');
    if(!available.has(name))throw new Error('Unknown test user');
    const amount=integer(request.gmCents,'gmCents');
    if(amount===0n||amount>MAX_GM*100n)throw new Error('Invalid claim amount');
    const recipient=testnetAddress(request.recipientAddress);
    const finality=request.mockFinality??'pending';
    if(!['pending','confirmed','failed'].includes(finality))
      throw new Error('Mock finality must be pending, confirmed or failed');
    const fingerprint=JSON.stringify([name,amount.toString(),recipient,finality]);
    if(seen.has(operationId)){
      const original=seen.get(operationId);
      if(original.fingerprint!==fingerprint)throw new Error('Conflicting reused operation ID');
      results.push({...original.record,replayed:true});
      continue;
    }
    let status;
    if(available.get(name)<amount){
      status='SIMULATED_REJECTED_INSUFFICIENT_BALANCE';
    }else{
      available.set(name,available.get(name)-amount);
      if(finality==='failed'){
        available.set(name,available.get(name)+amount);
        status='SIMULATED_RELEASED_AFTER_FAILURE';
      }else if(finality==='confirmed'){
        settled.set(name,settled.get(name)+amount);
        status='SIMULATED_CONFIRMED_NO_CHAIN_TX';
      }else{
        reserved.set(name,reserved.get(name)+amount);
        status='SIMULATED_RESERVED_PENDING';
      }
    }
    const record={operationId,userId:name,gmCents:amount.toString(),
      hypotheticalJettonRaw:(amount*GM_CENT_TO_JETTON_RAW).toString(),
      recipient,status,replayed:false,realTransactionHash:null,
      realWithdrawal:false};
    seen.set(operationId,{fingerprint,record});
    results.push({...record});
  }
  return Object.freeze({
    mode:'SYNTHETIC_TESTNET_WITHDRAWAL_QUEUE_ONLY',
    chainId:TESTNET_CHAIN,networkCalls:0,databaseWrites:0,
    realBackingVerified:false,realWithdrawalsEnabled:false,
    realTokenTransfers:0,gameBalancesWritten:false,
    wallets:[...available.keys()].map(userId=>Object.freeze({
      userId,simulatedAvailableGmCents:available.get(userId).toString(),
      simulatedReservedGmCents:reserved.get(userId).toString(),
      simulatedConfirmedGmCents:settled.get(userId).toString()
    })),
    results:Object.freeze(results.map(x=>Object.freeze(x)))
  });
}
