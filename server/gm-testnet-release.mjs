// GM TOKEN: Testnet-only release candidate checks, never deploys or mints.
// CR and POINTS are entirely virtual; the GM Jetton is not yet in circulation.
import {Address} from '@ton/ton';
import {TON_JETTON_PROPOSAL, TON_GAME_ALLOCATION, proposedSupplyBaseUnits} from './ton-prelaunch.mjs';
import {gmTokenTestnetExpectation, inspectTestnetMasterResponse, TON_TESTNET_CHAIN_ID} from './ton-testnet-preflight.mjs';

export const GM_TESTNET_CANDIDATE=Object.freeze({
  network:'testnet',
  chainId:TON_TESTNET_CHAIN_ID,
  name:'GM TOKEN TESTNET',
  symbol:'GMTEST',
  decimals:'9',
  proposedSupplyGM:'150000000',
  proposedRawSupply:proposedSupplyBaseUnits.toString(),
  purpose:'development_only',
  sourceTemplate:'TON official Acton jetton template; not yet generated or deployed',
  realMoneyValue:false,
  realJettonDeployed:false,
  liveConversionEnabled:false,
  realTradingEnabled:false
});
function checkAddress(address,label){
  if(typeof address!=='string'||address.length>100)throw new TypeError(label+' must be a TON address');
  const parsed=Address.parse(address);
  if(parsed.workChain!==0)throw new Error(label+' must be in TON basechain');
  return parsed.toRawString();
}
export function verifyGmTestnetMetadata(metadata,{network=TON_TESTNET_CHAIN_ID}={}){
  if(network!==TON_TESTNET_CHAIN_ID)throw new Error('Testnet-only metadata; Mainnet not allowed');
  if(!metadata||typeof metadata!=='object'||Array.isArray(metadata))
    throw new TypeError('Jetton metadata object required');
  if(metadata.name!==GM_TESTNET_CANDIDATE.name||metadata.symbol!==GM_TESTNET_CANDIDATE.symbol)
    throw new Error('Test token must be visibly different from the proposed Mainnet GM');
  if(String(metadata.decimals)!=='9')throw new Error('9 decimal digits required for candidate test token');
  const description=metadata.description;
  if(typeof description!=='string'||description.length<30||description.length>600
     || !/testnet/i.test(description)|| !/no monetary value/i.test(description))
    throw new Error('Testnet and non-monetary disclaimers required');
  const image=metadata.image;
  if(typeof image!=='string'||image.length>400)throw new Error('HTTPS image URL required');
  let url;
  try{url=new URL(image)}catch{throw new Error('HTTPS image URL required')}
  if(url.protocol!=='https:'||url.username||url.password||url.port
    ||url.hostname==='localhost'||url.hostname==='example.com'||url.search||url.hash)
    throw new Error('Public immutable HTTPS image URL required');
  if(url.hostname!=='gm-token-test-iprj.onrender.com')
    throw new Error('Token preview image must stay on the existing GM TOKEN origin');
  const sum=Object.values(TON_GAME_ALLOCATION).reduce((acc,x)=>acc+BigInt(x),0n);
  if(sum!==150000000n||TON_JETTON_PROPOSAL.supply_gm!==150000000)
    throw new Error('GM game supply does not reconcile with test token proposal');
  return Object.freeze({
    network:'testnet',
    chainId:TON_TESTNET_CHAIN_ID,
    name:metadata.name,
    symbol:metadata.symbol,
    decimals:'9',
    gameSupplyGM:sum.toString(),
    proposedJettonSupplyRaw:proposedSupplyBaseUnits.toString(),
    imageUrl:url.href,
    imageReachabilityVerified:false,
    contractSourceAudited:false,
    contractDeployed:false,
    chainReserveVerified:false,
    readyForRealTrading:false,
    unsigned:true
  });
}
export function inspectGmTestnetCandidate(masterAddress,metadata,chainResponse,{expectedAdminAddress}={}){
  const draft=verifyGmTestnetMetadata(metadata);
  const expected=gmTokenTestnetExpectation({masterAddress,chainId:TON_TESTNET_CHAIN_ID});
  const observed=inspectTestnetMasterResponse(chainResponse,expected);
  let adminMatch=null;
  if(expectedAdminAddress!==undefined){
    const normalized=checkAddress(expectedAdminAddress,'Expected admin');
    adminMatch=observed.adminAddress===normalized;
    if(!adminMatch)throw new Error('Testnet admin wallet does not match expected address');
  }
  return Object.freeze({
    network:'testnet',
    masterAddress:observed.masterAddress,
    expectedRawSupply:draft.proposedJettonSupplyRaw,
    observedRawSupply:observed.rawSupply,
    matchesSupply:observed.matchesProposedSupply,
    mintable:observed.mintable,
    metadataPresent:observed.jettonContentPresent,
    adminAddress:observed.adminAddress,
    adminMatchesExpected:adminMatch,
    important:'On-chain supply matching does NOT prove backing of in-game GM',
    liveBackingVerified:false,
    productionReady:false,
    depositsEnabled:false,
    withdrawalsEnabled:false,
    tradingEnabled:false
  });
}
