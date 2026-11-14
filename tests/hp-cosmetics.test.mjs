import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  HP_COSMETICS,getHpCosmetics,unlockHpCosmeticWithClient,unlockHpCosmetic
} from '../server/hp-cosmetics.mjs';

function mock(initial=290,status='active'){
  const state={balance:initial,operations:new Set(),debits:0,inserts:0,queries:[]};
  const client={async query(sql,params){
    state.queries.push(sql);
    if(sql.includes('SELECT status FROM gm_internal.players'))return {rows:[{status}]};
    if(sql.includes('SELECT balance FROM gm_internal.wallets'))return {rows:state.balance==null?[]:[{balance:state.balance}]};
    if(sql.includes('SELECT 1 FROM gm_internal.ledger'))return {rows:state.operations.has(params[1])?[{}]:[]};
    if(sql.includes('UPDATE gm_internal.wallets')) {
      if(state.balance<params[1])return {rowCount:0};
      state.balance-=params[1];state.debits++;return {rowCount:1};
    }
    if(sql.includes('INSERT INTO gm_internal.ledger')){
      if(state.operations.has(params[2]))throw Error('unique violation');
      state.operations.add(params[2]);state.inserts++;return {rowCount:1};
    }
    if(sql.includes('SELECT operation_key FROM gm_internal.ledger'))return {rows:[...state.operations].map(operation_key=>({operation_key}))};
    throw Error('Unexpected SQL: '+sql);
  }};
  return {client,state};
}

test('fixed, non-monetary HP cosmetics have an approved closed catalog',()=>{
  assert.deepEqual(HP_COSMETICS.map(x=>[x.id,x.cost]),[
    ['autumn_spark',30],['autumn_star',80],['autumn_crown',160]
  ]);
  assert.equal(HP_COSMETICS.reduce((n,x)=>n+x.cost,0),270);
});

test('HP cosmetics deduct once and persist a permanent ledger unlock',async()=>{
  const {client,state}=mock();
  const first=await unlockHpCosmeticWithClient(client,'12345','autumn_spark');
  assert.deepEqual(first,{id:'autumn_spark',hp:260,alreadyUnlocked:false});
  assert.equal(state.debits,1);assert.equal(state.inserts,1);
  assert.match(state.queries[0],/SELECT status FROM gm_internal.players/);
  assert.match(state.queries[1],/FOR UPDATE/);
  const second=await unlockHpCosmeticWithClient(client,'12345','autumn_spark');
  assert.deepEqual(second,{id:'autumn_spark',hp:260,alreadyUnlocked:true});
  assert.equal(state.debits,1);assert.equal(state.inserts,1);
  const list=await getHpCosmetics(client,'12345');
  assert.equal(list.filter(x=>x.unlocked).length,1);
  assert.equal(list.find(x=>x.id==='autumn_spark').unlocked,true);
});

test('blocked accounts cannot spend HP even when a balance exists',async()=>{
  const {client,state}=mock(290,'blocked');
  await assert.rejects(unlockHpCosmeticWithClient(client,'12345','autumn_spark'),
    /player not found or inactive/);
  assert.equal(state.debits,0);
  assert.equal(state.inserts,0);
});

test('HP cannot go below zero, including on short balance or missing wallet',async()=>{
  for(const amount of [0,20,null]){
    const {client,state}=mock(amount);
    await assert.rejects(unlockHpCosmeticWithClient(client,'12345','autumn_star'),/Not enough HP/);
    assert.equal(state.debits,0);
    assert.equal(state.inserts,0);
  }
});

test('no arbitrary item, negative costs, spoofed user IDs or external grants',async()=>{
  const {client,state}=mock();
  for (const item of ['free_gm','autumn_crown:1',null,{},'__proto__']){
    await assert.rejects(unlockHpCosmeticWithClient(client,'12345',item),/Invalid HP cosmetic/);
  }
  for(const id of ['0','-1','123 OR true','9223372036854775808']){
    await assert.rejects(unlockHpCosmetic(id,'autumn_spark'),/Invalid Telegram user id/);
  }
  assert.equal(state.queries.length,0);
});

test('all three items spend 270 HP, without touching GM or CR',async()=>{
  const {client,state}=mock(300);
  for(const item of HP_COSMETICS)await unlockHpCosmeticWithClient(client,'991',item.id);
  assert.equal(state.balance,30);
  assert.equal(state.inserts,3);
  const owned=await getHpCosmetics(client,'991');
  assert.ok(owned.every(x=>x.unlocked));
  assert.ok(state.queries.every(sql=>!sql.includes('gm_game.wallets')&&!sql.includes('gm_game.pools')));
});

test('HTTP route is authenticated, bound to Telegram identity, and cannot write arbitrary rewards',()=>{
  const server=readFileSync(new URL('../server/index.mjs',import.meta.url),'utf8');
  const verify=server.indexOf('const identity=auth(req);id=identity.id;');
  const route=server.indexOf("(p === '/api/hp/cosmetics/unlock' && verb === 'POST')");
  const call=server.indexOf("unlockHpCosmetic(id,(await readBody(req))?.itemId)");
  assert.ok(verify>0 && route>verify && call>route);
  assert.match(server,/if \(error\.message === 'Not enough HP'\) return fail\(res, 409/);
  const calendar=readFileSync(new URL('../server/postgres-calendar.mjs',import.meta.url),'utf8');
  assert.match(calendar,/hp_cosmetics:cosmetics/);
  const ui=readFileSync(new URL('../miniapp/src/main.tsx',import.meta.url),'utf8');
  assert.match(ui,/api\('\/api\/hp\/cosmetics\/unlock',\{itemId\}\)/);
  assert.match(ui,/gm-hp-profile-badge/);
});
