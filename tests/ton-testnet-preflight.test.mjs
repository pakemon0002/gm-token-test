import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TON_TESTNET_CHAIN_ID,TON_TESTNET_TOKEN_DATA_ENDPOINT,
  gmTokenTestnetExpectation,inspectTestnetMasterResponse,fetchTestnetMasterStatus
} from '../server/ton-testnet-preflight.mjs';

const MASTER='0:'+('a'.repeat(64));
const OTHER='0:'+('b'.repeat(64));
const proposal=gmTokenTestnetExpectation({masterAddress:MASTER});
const response=(overrides={})=>({ok:true,result:{
  '@type':'ext.tokens.jettonMasterData',contract_type:'jetton_master',
  address:MASTER,total_supply:proposal.expectedRawSupply,
  mintable:false, admin_address:OTHER, jetton_content:{type:'offchain'},
  ...overrides
}});

test('TON testnet is the only allowed network, raw supply uses BigInt',()=>{
  assert.equal(proposal.chainId,TON_TESTNET_CHAIN_ID);
  assert.equal(proposal.expectedRawSupply,'150000000000000000');
  assert.equal(proposal.masterAddress,MASTER);
  assert.throws(()=>gmTokenTestnetExpectation({masterAddress:MASTER,chainId:'-239'}),/Testnet-only/);
  assert.throws(()=>gmTokenTestnetExpectation({masterAddress:MASTER,chainId:'-100'}),/Testnet-only/);
  assert.throws(()=>gmTokenTestnetExpectation({masterAddress:MASTER,decimals:1}),/decimals/);
  assert.throws(()=>gmTokenTestnetExpectation({masterAddress:MASTER,supplyGM:'200000000'}),/150,000,000/);
  assert.throws(()=>gmTokenTestnetExpectation({masterAddress:'fake'}),/address|Invalid/i);
});

test('rejects fake master, malformed supply, non-jetton response and absent metadata',()=>{
  assert.throws(()=>inspectTestnetMasterResponse(response({address:OTHER}),proposal),/mismatch/);
  assert.throws(()=>inspectTestnetMasterResponse(response({total_supply:'1.5'}),proposal),/unsigned decimal/);
  assert.throws(()=>inspectTestnetMasterResponse(response({total_supply:'-1'}),proposal),/unsigned decimal/);
  assert.throws(()=>inspectTestnetMasterResponse(response({contract_type:'jetton_wallet'}),proposal),/Not a Jetton Master/);
  assert.throws(()=>inspectTestnetMasterResponse({ok:false,result:{}},proposal),/successful/);
  assert.throws(()=>inspectTestnetMasterResponse(response({mintable:'false'}),proposal),/mintable status/);
});

test('onchain supply match remains read-only and does not claim backing',()=>{
  const inspected=inspectTestnetMasterResponse(response(),proposal);
  assert.equal(inspected.matchesProposedSupply,true);
  assert.equal(inspected.gameToChainBackingVerified,false);
  assert.equal(inspected.withdrawalEnabled,false);
  assert.equal(inspected.mintable,false);
  const changed=inspectTestnetMasterResponse(response({total_supply:'123456789'}),proposal);
  assert.equal(changed.matchesProposedSupply,false);
});

test('read-only fetch is pinned to TON Center TESTNET endpoint',async()=>{
  let calls=0;
  const fetchImpl=async(url,opts)=>{
    calls++;
    assert.equal(url,TON_TESTNET_TOKEN_DATA_ENDPOINT);
    assert.equal(opts.method,'POST');
    assert.deepEqual(JSON.parse(opts.body),{address:MASTER});
    return {ok:true,json:async()=>response()};
  };
  const data=await fetchTestnetMasterStatus(proposal,{fetchImpl});
  assert.equal(data.masterAddress,MASTER);
  assert.equal(calls,1);
  await assert.rejects(()=>fetchTestnetMasterStatus(proposal,{fetchImpl:async()=>({ok:false,status:429})}),/429/);
});
