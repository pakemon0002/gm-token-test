import test from 'node:test';
import assert from 'node:assert/strict';
import {previewGmAllocation,simulateTestnetWithdrawals} from '../server/ton-staging-withdrawal-sim.mjs';
const A='0:'+('a'.repeat(64)),B='0:'+('b'.repeat(64));
const user=(userId,availableGmCents)=>({userId,availableGmCents});
const request=(operationId,userId,gmCents,mockFinality='pending',recipientAddress=A)=>({
  operationId,userId,gmCents,mockFinality,recipientAddress,chainId:'-3'
});
const run=(users,requests,overrides={})=>simulateTestnetWithdrawals({
  fixtureType:'synthetic_testnet_only',chainId:'-3',users,requests,...overrides
});

test('Canonical 150m game funds have exact cents and hypothetical raw units, never real custody',()=>{
  const a=previewGmAllocation();
  assert.equal(a.totalGameGM,'150000000');
  assert.equal(a.funds.length,9);
  assert.equal(a.funds.find(x=>x.fund==='MINING').gm,'45000000');
  assert.equal(a.funds.find(x=>x.fund==='HOLDING').gm,'23000000');
  assert.equal(a.funds.find(x=>x.fund==='FOUNDER').gm,'10000000');
  assert.equal(a.funds.reduce((n,x)=>n+BigInt(x.gm),0n),150000000n);
  assert.equal(a.funds.reduce((n,x)=>n+BigInt(x.hypotheticalJettonRaw),0n),150000000000000n);
  assert.equal(a.productionDistributionApproved,false);
  assert.equal(a.realBackingVerified,false);
  assert.equal(a.onchainDistributionEnabled,false);
});

test('Six decimals: 0.01 GM is 10,000 raw; 1 GM is 1,000,000 raw; 150m has exact cap',()=>{
  const allocation=previewGmAllocation();
  assert.equal(allocation.funds.reduce((n,x)=>n+BigInt(x.hypotheticalJettonRaw),0n),150000000000000n);
  const o=run([user('u1','101')],[
    request('six-decimals-cent','u1','1'),
    request('six-decimals-gm','u1','100')
  ]);
  assert.equal(o.results[0].hypotheticalJettonRaw,'10000');
  assert.equal(o.results[1].hypotheticalJettonRaw,'1000000');
  assert.equal(o.wallets[0].simulatedAvailableGmCents,'0');
  assert.equal(o.networkCalls,0);
  assert.equal(o.realWithdrawalsEnabled,false);
});

test('Simulation reserves once, pending cannot be spent again',()=>{
  const o=run([user('u1','250')],[
    request('req:00000001','u1','200'),
    request('req:00000002','u1','100')
  ]);
  assert.equal(o.results[0].status,'SIMULATED_RESERVED_PENDING');
  assert.equal(o.results[0].hypotheticalJettonRaw,'2000000');
  assert.equal(o.results[1].status,'SIMULATED_REJECTED_INSUFFICIENT_BALANCE');
  assert.deepEqual(o.wallets[0],{
    userId:'u1',simulatedAvailableGmCents:'50',simulatedReservedGmCents:'200',
    simulatedConfirmedGmCents:'0'
  });
  assert.equal(o.realTokenTransfers,0);
  assert.equal(o.realWithdrawalsEnabled,false);
  assert.equal(o.networkCalls,0);
  assert.equal(o.databaseWrites,0);
});

test('Identical request replay is idempotent even when wallet funds are exhausted',()=>{
  const one=request('claim:aa0001','u1','100','confirmed');
  const o=run([user('u1','100')],[one,{...one}]);
  assert.equal(o.results[0].status,'SIMULATED_CONFIRMED_NO_CHAIN_TX');
  assert.equal(o.results[1].replayed,true);
  assert.equal(o.wallets[0].simulatedAvailableGmCents,'0');
  assert.equal(o.wallets[0].simulatedConfirmedGmCents,'100');
  assert.equal(o.results[0].realTransactionHash,null);
});

test('Failed mock finality restores amount; simulation never creates a TX hash',()=>{
  const o=run([user('u1','100')],[request('claim:failed1','u1','100','failed')]);
  assert.equal(o.results[0].status,'SIMULATED_RELEASED_AFTER_FAILURE');
  assert.equal(o.wallets[0].simulatedAvailableGmCents,'100');
  assert.equal(o.wallets[0].simulatedReservedGmCents,'0');
  assert.equal(o.results[0].realTransactionHash,null);
});

test('Same operation ID with changed sum, owner, recipient or outcome fails closed',()=>{
  const original=request('claim:dupe01','u1','100');
  for(const altered of [
    {...original,gmCents:'99'},
    {...original,userId:'u2'},
    {...original,recipientAddress:B},
    {...original,mockFinality:'confirmed'}
  ]){
    assert.throws(()=>run([user('u1','500'),user('u2','500')],[original,altered]),/Conflicting reused operation ID/);
  }
});

test('No Mainnet, unlabeled fixture, malicious chain or malformed recipient accepted',()=>{
  const regular=request('claim:abc01','u1','10');
  assert.throws(()=>run([user('u1','100')],[regular],{chainId:'-239'}),/Mainnet forbidden/);
  assert.throws(()=>run([user('u1','100')],[regular],{fixtureType:'real'}),/synthetic TON Testnet/);
  assert.throws(()=>run([user('u1','100')],[{...regular,chainId:'-239'}]),/Mainnet/);
  assert.throws(()=>run([user('u1','100')],[{...regular,recipientAddress:'invalid'}]),/address|Invalid/i);
});

test('Amounts must be exact integer cents, reject zero, negative, decimals, oversized balances',()=>{
  assert.throws(()=>run([user('u1','50')],[request('claim:a01','u1','0')]),/Invalid claim amount/);
  assert.throws(()=>run([user('u1','50')],[request('claim:a01','u1','-10')]),/non-negative integer/);
  assert.throws(()=>run([user('u1','50')],[request('claim:a01','u1','0.1')]),/non-negative integer/);
  assert.throws(()=>run([user('u1',-1)],[]),/non-negative integer/);
  assert.throws(()=>run([user('u1','15000000001')],[]),/exceeds total GM supply/);
  assert.throws(()=>run([user('u1','10000000000'),user('u2','10000000000')],[]),/exceeds game budget/);
});

test('Input snapshots are immutable and no simulation changes source game balances',()=>{
  const u=Object.freeze(user('u1','200'));
  const q=Object.freeze(request('claim:immut01','u1','150'));
  const source=Object.freeze([u]),requests=Object.freeze([q]);
  const o=run(source,requests);
  assert.equal(u.availableGmCents,'200');
  assert.equal(o.wallets[0].simulatedAvailableGmCents,'50');
  assert.equal(o.gameBalancesWritten,false);
  assert.equal(q.gmCents,'150');
});

test('Duplicate users, missing recipients, missing users and invalid request ids rejected',()=>{
  assert.throws(()=>run([user('u1','100'),user('u1','200')],[]),/Duplicate test user/);
  assert.throws(()=>run([user('u1','100')],[request('claim:missing','u2','10')]),/Unknown test user/);
  assert.throws(()=>run([user('u1','100')],[request('x x','u1','10')]),/operationId/);
  assert.throws(()=>run([user('u1','100')],[{...request('claim:null01','u1','10'),recipientAddress:null}]),/TON address/);
});

test('Multiple requests for multiple users never exceed each individual game balance',()=>{
  const o=run([user('u1','500'),user('u2','300')],[
    request('claim:u1a','u1','220','confirmed'),
    request('claim:u2a','u2','300','pending',B),
    request('claim:u1b','u1','280','pending'),
    request('claim:u1c','u1','1','confirmed')
  ]);
  assert.deepEqual(o.results.map(x=>x.status),[
    'SIMULATED_CONFIRMED_NO_CHAIN_TX','SIMULATED_RESERVED_PENDING',
    'SIMULATED_RESERVED_PENDING','SIMULATED_REJECTED_INSUFFICIENT_BALANCE'
  ]);
  assert.equal(o.wallets[0].simulatedAvailableGmCents,'0');
  assert.equal(o.wallets[1].simulatedAvailableGmCents,'0');
  assert.equal(o.realTokenTransfers,0);
});
