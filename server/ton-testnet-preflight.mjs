// TON TESTNET ONLY: read-only preflight for a future GM Jetton Master.
// This code NEVER signs, mints, transfers, credits game balances or checks mainnet.
// A successful preflight means "metadata observed", NOT "1:1 reserves verified".
import {Address} from '@ton/ton';

export const TON_TESTNET_CHAIN_ID='-3';
export const TON_MAINNET_CHAIN_ID='-239';
export const TON_TESTNET_TOKEN_DATA_ENDPOINT='https://testnet.toncenter.com/api/v2/getTokenData';

const normalize=(value)=>{
  if(typeof value!=='string'||value.length>100)throw new Error('Valid TON address required');
  const parsed=Address.parse(value.trim());
  if(parsed.workChain!==0)throw new Error('Only basechain Jetton Masters are supported');
  return parsed.toRawString();
};
const uint=(value,label)=>{
  if(typeof value!=='string'||!/^(0|[1-9][0-9]*)$/.test(value)||value.length>78)
    throw new Error('Invalid '+label+'; must be an unsigned decimal integer string');
  return BigInt(value);
};

export function gmTokenTestnetExpectation({masterAddress,chainId=TON_TESTNET_CHAIN_ID,decimals=6,supplyGM='150000000'}={}) {
  if(String(chainId)!==TON_TESTNET_CHAIN_ID)throw new Error('Testnet-only verifier: TON Mainnet and other networks are forbidden');
  if(!Number.isSafeInteger(decimals)||decimals<2||decimals>18)throw new Error('Invalid Jetton decimals');
  const address=normalize(masterAddress);
  const supply=uint(String(supplyGM),'GM supply');
  if(supply!==150000000n)throw new Error('Proposed GM emission must equal 150,000,000 for this draft');
  return Object.freeze({
    network:'testnet',
    chainId:TON_TESTNET_CHAIN_ID,
    masterAddress:address,
    decimals,
    expectedRawSupply:(supply*10n**BigInt(decimals)).toString(),
    approvedForTrading:false,
    approvedForWithdrawals:false
  });
}

export function inspectTestnetMasterResponse(response,expectation) {
  if(expectation?.network!=='testnet'||expectation?.chainId!==TON_TESTNET_CHAIN_ID)
    throw new Error('Testnet expectation required');
  if(!response||response.ok!==true||typeof response.result!=='object'||response.result===null)
    throw new Error('TON Testnet did not return a successful Jetton Master response');
  const data=response.result;
  if(data.contract_type!=='jetton_master'||data['@type']!=='ext.tokens.jettonMasterData')
    throw new Error('Not a Jetton Master contract');
  const found=normalize(data.address);
  if(found!==expectation.masterAddress)throw new Error('Jetton Master address mismatch — reject spoofed token');
  const rawSupply=uint(data.total_supply,'on-chain raw supply');
  if(typeof data.mintable!=='boolean')throw new Error('Jetton mintable status missing');
  if(data.admin_address!==undefined&&data.admin_address!==null)normalize(data.admin_address);
  const matchesProposal=rawSupply.toString()===expectation.expectedRawSupply;
  return Object.freeze({
    network:'testnet',
    masterAddress:found,
    rawSupply:rawSupply.toString(),
    expectedRawSupply:expectation.expectedRawSupply,
    matchesProposedSupply:matchesProposal,
    mintable:data.mintable,
    adminAddress:data.admin_address?normalize(data.admin_address):null,
    jettonContentPresent:data.jetton_content!==undefined&&data.jetton_content!==null,
    checkedAtSource:'testnet-toncenter-getTokenData',
    // This endpoint does NOT prove that a custodial wallet owns enough Jettons.
    gameToChainBackingVerified:false,
    liveMintingEnabled:false,
    withdrawalEnabled:false
  });
}

export async function fetchTestnetMasterStatus(expectation,{fetchImpl=fetch,signal}={}) {
  if(expectation?.network!=='testnet'||expectation.chainId!==TON_TESTNET_CHAIN_ID)
    throw new Error('Testnet expectation required');
  // Endpoint is fixed. Neither configuration nor user input can redirect to mainnet.
  const response=await fetchImpl(TON_TESTNET_TOKEN_DATA_ENDPOINT,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({address:expectation.masterAddress}),
    signal
  });
  if(!response.ok)throw new Error('Testnet API unavailable: HTTP '+response.status);
  return inspectTestnetMasterResponse(await response.json(),expectation);
}
