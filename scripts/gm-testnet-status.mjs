#!/usr/bin/env node
// GM TOKEN Testnet-only, read-only status CLI. It does not deploy/mint/sign.
// Usage: node scripts/gm-testnet-status.mjs
// Read-only after testnet deployment: node scripts/gm-testnet-status.mjs --master=<TESTNET_MASTER>
import {readFile} from 'node:fs/promises';
import {GM_TESTNET_CANDIDATE,verifyGmTestnetMetadata,inspectGmTestnetCandidate} from '../server/gm-testnet-release.mjs';
import {gmTokenTestnetExpectation,fetchTestnetMasterStatus} from '../server/ton-testnet-preflight.mjs';
const args=process.argv.slice(2);
if(args.some(arg=>/mainnet|mnemonic|seed|private.key|wallet.key|sign|mint|transfer|withdraw/i.test(arg)))
  throw new Error('Read-only Testnet status tool does not accept signing, minting or Mainnet arguments');
const known=['--master=','--admin='];
if(args.some(arg=>!known.some(prefix=>arg.startsWith(prefix))))
  throw new Error('Only --master=<TESTNET_ADDRESS> and --admin=<TESTNET_ADDRESS> are supported');
const get=(key)=>args.find(arg=>arg.startsWith(key))?.slice(key.length);
const metadata=JSON.parse(await readFile(new URL('../docs/ton-v4/GM_TESTNET_METADATA_DRAFT.json',import.meta.url),'utf8'));
const candidate=verifyGmTestnetMetadata(metadata);
const master=get('--master='),admin=get('--admin=');
if(admin&&!master)throw new Error('--admin is accepted only together with --master');
const result={
  phase:master?'testnet_read_only_validation':'testnet_predeploy',
  status:master?'checking':'waiting_for_wallet_deployment',
  candidate:GM_TESTNET_CANDIDATE,
  metadata:{
    name:candidate.name,
    symbol:candidate.symbol,
    imageUrl:candidate.imageUrl,
    imageReachabilityVerified:false
  },
  testnetMasterAddress:master||null,
  contractDeployed:false,
  realTokensReleased:false,
  mainnetEnabled:false,
  gameBalanceChanged:false,
  mainnetBackingVerified:false,
  nextManualStep:master?null:'Use the official Acton Jetton template in TON Testnet; wallet owner must approve the signing action separately'
};
if(master) {
  const expectation=gmTokenTestnetExpectation({masterAddress:master,chainId:'-3'});
  const observed=await fetchTestnetMasterStatus(expectation,{signal:AbortSignal.timeout(12000)});
  const chainShape={ok:true,result:{
    '@type':'ext.tokens.jettonMasterData',
    contract_type:'jetton_master',
    address:observed.masterAddress,
    total_supply:observed.rawSupply,
    mintable:observed.mintable,
    admin_address:observed.adminAddress,
    jetton_content:observed.jettonContentPresent?{type:'offchain'}:null
  }};
  const validated=inspectGmTestnetCandidate(master,metadata,chainShape,
    admin?{expectedAdminAddress:admin}:{});
  result.status=validated.matchesSupply?'testnet_supply_matches_proposal':'testnet_supply_not_yet_minted';
  result.contractDeployed=true;
  result.inspection=validated;
}
process.stdout.write(JSON.stringify(result,null,2)+'\n');
