import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotGameAccounts,projectGameTransition,requireGameSupply,readGameAccountSnapshot} from '../server/ton-shadow-projection.mjs';

function state({miningPool=40000, dailyPool=10000, fees=0, gm=0, vault=0, mp=0, hp=0, cr=0, welcome=100000, order=[]}={}) {
  return snapshotGameAccounts({
    pools:[{name:'MINING',gm:miningPool,cr:0},{name:'DAILY',gm:dailyPool,cr:0},{name:'HOLDING_FEES',gm:fees,cr:0},{name:'WELCOME',gm:0,cr:welcome}],
    wallets:[{user_id:'101',gm,cr,vault}],
    mining:[{user_id:'101',pending_cents:mp}],
    holding:[{user_id:'101',pending_cents:hp}],
    orders:order
  });
}
function check(before,after,id,expectedAccounts) {
  const projected=projectGameTransition(state(before),state(after),id);
  assert.deepEqual(projected.entries.map(x=>[x.accountCode,x.amountUnits]).sort(),expectedAccounts.sort());
  return projected;
}

test('Mining settlement moves funded GM into pending, claim moves only that pending to wallet',()=>{
  check({}, {miningPool:38950,mp:1050}, 'mining:settle:1',[
    ['fund:MINING:GM','-10500000000'],
    ['pending:mining:101:GM','10500000000']
  ]);
  check({miningPool:38950,mp:1050}, {miningPool:38950,gm:1050}, 'mining:claim:1',[
    ['pending:mining:101:GM','-10500000000'],
    ['wallet:101:GM','10500000000']
  ]);
});

test('Vault deposit and withdrawal with 5 percent fee stay zero-sum',()=>{
  check({miningPool:38950,gm:1050},{miningPool:38950,gm:550,vault:500},'vault:deposit:1',[
    ['wallet:101:GM','-5000000000'],['vault:101:GM','5000000000']
  ]);
  check({miningPool:38950,gm:550,vault:500},{miningPool:38950,gm:645,vault:400,fees:5},'vault:withdraw:1',[
    ['wallet:101:GM','950000000'],['vault:101:GM','-1000000000'],['fund:HOLDING_FEES:GM','50000000']
  ]);
});

test('Daily reward and one-time welcome CR are backed transfers',()=>{
  check({miningPool:38950,gm:1050},{miningPool:38950,dailyPool:9800,gm:1250},'daily:claim:1',[
    ['fund:DAILY:GM','-2000000000'],['wallet:101:GM','2000000000']
  ]);
  check({},{welcome:95000,cr:5000},'welcome:credit:1',[
    ['fund:WELCOME:CR','-5000'],['wallet:101:CR','5000']
  ]);
});

test('Open sell orders are counted exactly once as reserved GM',()=>{
  const order=[{id:'ask1',side:'sell',status:'open',locked_cents:100}];
  check({miningPool:38950,gm:1050},{miningPool:38950,gm:950,order},'order:open:1',[
    ['wallet:101:GM','-1000000000'],['order:ask1:GM','1000000000']
  ]);
  const before=state({miningPool:38950,gm:950,order});
  const unchanged=projectGameTransition(before,before,'order:replay:1');
  assert.equal(unchanged.changed,false);
  assert.deepEqual(unchanged.entries,[]);
});

test('Synthetic mint, duplicate account, fraction and negative values are rejected',()=>{
  assert.throws(()=>projectGameTransition(state(),state({gm:1}),'test:mint:1'),/Unbalanced/);
  assert.throws(()=>state({gm:-1}),/negative balance/);
  assert.throws(()=>state({gm:0.01}),/exact integer/);
  assert.throws(()=>snapshotGameAccounts({pools:[{name:'X',gm:1,cr:0},{name:'X',gm:1,cr:0}]}),/Duplicate snapshot/);
  assert.throws(()=>projectGameTransition(state(),state(),'abc'),/operationId/);
});

test('Supply check never mistakes accounting equality for real TON backing',()=>{
  const game=snapshotGameAccounts({pools:[{name:'MINING',gm:'15000000000',cr:'100000000000'}]});
  assert.equal(requireGameSupply(game),true);
  assert.throws(()=>requireGameSupply(state()),/supply mismatch/);
  assert.equal(Object.hasOwn(game,'onchainSupply'),false);
});

test('Database reader ignores nested holding buckets, reads only canonical accounts',()=>{
  const db={prepare(sql){
    return {all(){
      if(sql.startsWith('SELECT name,gm,cr')) return [{name:'MINING',gm:100,cr:0}];
      if(sql.startsWith('SELECT user_id,gm,cr,vault')) return [{user_id:'x',gm:0,cr:500,vault:0}];
      if(sql.includes('mining_state')) return [{user_id:'x',pending_cents:0}];
      if(sql.includes('holding_state')) return [{user_id:'x',pending_cents:0}];
      if(sql.includes('orders')) return [];
      throw Error('Unexpected SQL');
    }};
  }};
  const s=readGameAccountSnapshot(db);
  assert.equal(s.gmCents,100n);assert.equal(s.crCents,500n);
});
