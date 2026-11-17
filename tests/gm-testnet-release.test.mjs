import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GM_TESTNET_CANDIDATE,verifyGmTestnetMetadata,inspectGmTestnetCandidate} from '../server/gm-testnet-release.mjs';
const metadata=JSON.parse(readFileSync(new URL('../docs/ton-v4/GM_TESTNET_METADATA_DRAFT.json',import.meta.url),'utf8'));
const address='0:'+('a'.repeat(64)), admin='0:'+('c'.repeat(64)),fake='0:'+('b'.repeat(64));
const masterResponse=(overrides={})=>({ok:true,result:{
 '@type':'ext.tokens.jettonMasterData',
 contract_type:'jetton_master',
 address,
 total_supply:'150000000000000',
 mintable:true,
 admin_address:admin,
 jetton_content:{type:'offchain'},
 ...overrides
}});
test('GM test token is unambiguously testnet-only and not a mainnet GM Jetton',()=>{
 assert.equal(GM_TESTNET_CANDIDATE.chainId,'-3');
 assert.equal(GM_TESTNET_CANDIDATE.symbol,'GMTEST');
 assert.equal(GM_TESTNET_CANDIDATE.realMoneyValue,false);
 assert.equal(GM_TESTNET_CANDIDATE.realTradingEnabled,false);
 assert.equal(GM_TESTNET_CANDIDATE.realJettonDeployed,false);
 assert.equal(GM_TESTNET_CANDIDATE.proposedRawSupply,'150000000000000');
});
test('test token metadata matches provisional 150m game supply but is NOT deploy-approved',()=>{
 const checked=verifyGmTestnetMetadata(metadata);
 assert.equal(checked.network,'testnet');
 assert.equal(checked.proposedJettonSupplyRaw,'150000000000000');
 assert.equal(checked.gameSupplyGM,'150000000');
 assert.equal(checked.imageReachabilityVerified,false);
 assert.equal(checked.contractDeployed,false);
 assert.equal(checked.unsigned,true);
 assert.equal(checked.chainReserveVerified,false);
 assert.equal(checked.readyForRealTrading,false);
});
test('rejects Mainnet, misleading ticker, incorrect decimal and untrusted metadata URLs',()=>{
 assert.throws(()=>verifyGmTestnetMetadata(metadata,{network:'-239'}),/Testnet-only/);
 assert.throws(()=>verifyGmTestnetMetadata({...metadata,symbol:'GM'}),/visibly different/);
 assert.throws(()=>verifyGmTestnetMetadata({...metadata,name:'GM TOKEN'}),/visibly different/);
 assert.throws(()=>verifyGmTestnetMetadata({...metadata,decimals:'9'}),/6 decimal/);
 assert.throws(()=>verifyGmTestnetMetadata({...metadata,description:'Get rich'}),/disclaimers/);
 for(const image of ['http://gm-token-test-iprj.onrender.com/a.png',
   'https://example.com/a.png','https://gm-token-test-iprj.onrender.com:8443/a.png',
   'https://gm-token-test-iprj.onrender.com/a.png#fragment',
   'https://localhost/a.png','not a url']){
   assert.throws(()=>verifyGmTestnetMetadata({...metadata,image}),/HTTPS|Public immutable|origin/);
 }
});
test('strict master address/admin/supply checks do not imply GM backed by onchain assets',()=>{
 const observed=inspectGmTestnetCandidate(address,metadata,masterResponse(),{expectedAdminAddress:admin});
 assert.equal(observed.matchesSupply,true);
 assert.equal(observed.adminMatchesExpected,true);
 assert.equal(observed.mintable,true);
 assert.equal(observed.productionReady,false);
 assert.equal(observed.liveBackingVerified,false);
 assert.equal(observed.depositsEnabled,false);
 assert.equal(observed.withdrawalsEnabled,false);
 assert.equal(observed.tradingEnabled,false);
 assert.throws(()=>inspectGmTestnetCandidate(address,metadata,masterResponse({address:fake})),/mismatch/);
 assert.throws(()=>inspectGmTestnetCandidate(address,metadata,masterResponse({total_supply:'-1'})),/unsigned decimal/);
 assert.throws(()=>inspectGmTestnetCandidate(address,metadata,masterResponse(),{expectedAdminAddress:fake}),/admin wallet/);
 const mismatch=inspectGmTestnetCandidate(address,metadata,masterResponse({total_supply:'0'}));
 assert.equal(mismatch.matchesSupply,false);
 assert.equal(mismatch.productionReady,false);
});
