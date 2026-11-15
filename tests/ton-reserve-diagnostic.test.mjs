import test from 'node:test';
import assert from 'node:assert/strict';
import {Address} from '@ton/ton';
import {snapshotGameAccounts} from '../server/ton-shadow-projection.mjs';
import {
 gmBackingReadiness,evaluateSyntheticGmtestCoverage,
 GMTEST_CANDIDATE_RAW_CAP,GM_CENT_TO_JETTON_RAW
} from '../server/ton-reserve-diagnostic.mjs';

const MASTER='0:'+('a'.repeat(64));
const WALLET_A='0:'+('b'.repeat(64));
const WALLET_B='0:'+('c'.repeat(64));
const SECOND_MASTER='0:'+('d'.repeat(64));
const cap=GMTEST_CANDIDATE_RAW_CAP.toString();
const game=snapshotGameAccounts({
 pools:[{name:'TREASURY',gm:'14999999800',cr:'100000000000'}],
 wallets:[{user_id:'100',gm:'50',cr:'0',vault:'50'}],
 mining:[{user_id:'100',pending_cents:'25'}],
 holding:[{user_id:'100',pending_cents:'25'}],
 orders:[{id:'order0001',side:'sell',status:'open',locked_cents:'50'}]
});
const fixture=(overrides={})=>({
 fixtureType:'synthetic_testnet_only',
 chainId:'-3',decimals:9,masterAddress:MASTER,masterSupplyRaw:cap,
 custodyWallets:[{walletAddress:WALLET_A,masterAddress:MASTER,balanceRaw:cap}],
 ...overrides
});

test('game GM supply uses all canonical accounts including vault/mining/holding/open orders, never counts CR as TON',()=>{
 assert.equal(game.gmCents,15_000_000_000n);
 assert.equal(game.crCents,100_000_000_000n);
 assert.equal(GM_CENT_TO_JETTON_RAW,10000000n);
 const s=gmBackingReadiness(game);
 assert.equal(s.proposedCoverageRequiredRaw,cap);
 assert.equal(s.gameSupplyReconciled,true);
 assert.equal(s.crIsOnChain,false);
 assert.equal(s.pointsAreOnChain,false);
 assert.equal(s.currentRealReservesVerified,false);
 assert.equal(s.actualCustodyVerified,false);
 assert.equal(s.gameToJettonRedemptionEnabled,false);
 assert.equal(s.liveWithdrawalsEnabled,false);
 assert.equal(s.realTradingEnabled,false);
 assert.equal(s.approvedForRelease,false);
 assert.equal(s.simulatedCoverage,null);
 assert.match(s.evidenceStatus,/NO_INDEPENDENT/);
});

test('even synthetic 1:1 matching master supply and custody MUST NOT enable withdrawals or claim real reserves',()=>{
 const v=evaluateSyntheticGmtestCoverage(game,fixture());
 assert.equal(v.simulatedCoverage.arithmeticCoverageOnly,true);
 assert.equal(v.simulatedCoverage.syntheticShortfallRaw,'0');
 assert.equal(v.simulatedCoverage.accountsCounted,1);
 assert.equal(v.currentRealReservesVerified,false);
 assert.equal(v.actualCustodyVerified,false);
 assert.equal(v.gameToJettonRedemptionEnabled,false);
 assert.equal(v.liveDepositsEnabled,false);
 assert.equal(v.liveWithdrawalsEnabled,false);
 assert.equal(v.realTradingEnabled,false);
 assert.equal(v.approvedForRelease,false);
 assert.equal(v.equivalentToRealGM,false);
 assert.match(v.evidenceStatus,/SYNTHETIC_TEST/);
 assert.equal(Object.isFrozen(v),true);
});

test('synthetic partial coverage and no wallets explicitly expose shortfall rather than falsely saying backed',()=>{
 const sub=evaluateSyntheticGmtestCoverage(game,fixture({custodyWallets:[
  {walletAddress:WALLET_A,masterAddress:MASTER,balanceRaw:'149000000000000000'}
 ]}));
 assert.equal(sub.simulatedCoverage.syntheticShortfallRaw,'1000000000000000');
 assert.equal(sub.simulatedCoverage.arithmeticCoverageOnly,false);
 const missing=evaluateSyntheticGmtestCoverage(game,fixture({custodyWallets:[]}));
 assert.equal(missing.simulatedCoverage.syntheticShortfallRaw,cap);
 assert.equal(missing.simulatedCoverage.arithmeticCoverageOnly,false);
 assert.equal(missing.approvedForRelease,false);
});

test('reject Mainnet, missing fixture label, incorrect decimals and fake master address',()=>{
 for(const x of [
  {chainId:'-239'}, {chainId:'1'}, {fixtureType:'independent_audit'},
  {fixtureType:null},{decimals:6},{masterAddress:'not-a-ton-address'}
 ]) assert.throws(()=>evaluateSyntheticGmtestCoverage(game,fixture(x)),/synthetic|Testnet|decimals|address|Invalid/i);
});

test('reject duplicate custody wallets even when address encodings differ, fake master and negative funds',()=>{
 const friendly=Address.parse(WALLET_A).toString();
 assert.throws(()=>evaluateSyntheticGmtestCoverage(game,fixture({custodyWallets:[
  {walletAddress:WALLET_A,masterAddress:MASTER,balanceRaw:'1'},
  {walletAddress:friendly,masterAddress:MASTER,balanceRaw:'1'}
 ]})),/Duplicate synthetic custody wallet/);
 assert.throws(()=>evaluateSyntheticGmtestCoverage(game,fixture({custodyWallets:[
  {walletAddress:WALLET_B,masterAddress:SECOND_MASTER,balanceRaw:'1'}
 ]})),/different Jetton master/);
 for(const balance of ['-1','1.5','1e4','001','1000000000000000000000000000000000000000000000000000000000000000000000000000000']) {
  assert.throws(()=>evaluateSyntheticGmtestCoverage(game,fixture({custodyWallets:[
    {walletAddress:WALLET_A,masterAddress:MASTER,balanceRaw:balance}
  ]})),/unsigned decimal integer/);
 }
});

test('reject overstated master, duplicated ownership beyond total supply and unbalanced game accounting',()=>{
 assert.throws(()=>evaluateSyntheticGmtestCoverage(game,fixture({masterSupplyRaw:'150000000000000001'})),/exceeds GMTEST candidate cap/);
 assert.throws(()=>evaluateSyntheticGmtestCoverage(game,fixture({masterSupplyRaw:'1'})),/cannot exceed master total supply/);
 assert.throws(()=>evaluateSyntheticGmtestCoverage(game,fixture({custodyWallets:[
  {walletAddress:WALLET_A,masterAddress:MASTER,balanceRaw:'90000000000000000'},
  {walletAddress:WALLET_B,masterAddress:MASTER,balanceRaw:'90000000000000000'}
 ]})),/cannot exceed master total supply/);
 const minted=snapshotGameAccounts({pools:[{name:'MINING',gm:'15000000001',cr:'100000000000'}]});
 assert.throws(()=>gmBackingReadiness(minted),/game supply mismatch/);
 assert.throws(()=>evaluateSyntheticGmtestCoverage(minted,fixture()),/game supply mismatch/);
});
