import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarXpLevel, claimCalendarRewardWithClient } from '../server/postgres-calendar.mjs';

test('calendar uses the exact live-game XP thresholds', () => {
  for (const [xp,level] of [
    [0,1],[20,1],[99,1],[100,2],[249,2],[250,3],
    [449,3],[450,4],[749,4],[750,5],[1149,5],[1150,6],
    [1699,6],[1700,7],[2399,7],[2400,8],[3299,8],
    [3300,9],[4399,9],[4400,10],[100000,10]
  ]) assert.equal(calendarXpLevel(xp),level,'XP='+xp);
  for(const invalid of [-1,NaN,Infinity,1.2,Number.MAX_SAFE_INTEGER+1])
    assert.throws(()=>calendarXpLevel(invalid),/Invalid calendar XP/);
});

test('XP calendar claim updates the live account in the same transaction', async () => {
  const calls = [];
  const client = {async query(sql,params) {
    calls.push({sql,params});
    if(sql.includes('SELECT xp FROM gm_game.users')) return {rows:[{xp:245}]};
    if(sql.includes('claim_autumn_reward_atomic')) return {rows:[
      {calendar_day:1, reward_type:'xp',reward_amount:'20',operation_id:'autumn:42:1:1'}
    ]};
    if(sql.includes('UPDATE gm_game.users')) return {rowCount:1};
    throw Error('Unexpected SQL');
  }};
  const result=await claimCalendarRewardWithClient(client,'42');
  assert.equal(result.reward_type,'xp');
  assert.equal(calls.length,3);
  assert.match(calls[0].sql,/FOR UPDATE/);
  assert.deepEqual(calls[0].params,['42']);
  assert.match(calls[1].sql,/claim_autumn_reward_atomic/);
  assert.deepEqual(calls[2].params,['42',265,3]);
});

test('box calendar claim does not fake an opened box or duplicate XP',async()=>{
  const sql=[];
  const client={async query(query,params){
    sql.push({query,params});
    return query.includes('gm_game.users')?{rows:[{xp:200}]}:
      {rows:[{calendar_day:3,reward_type:'bronze_box',reward_amount:'1'}]};
  }};
  const result=await claimCalendarRewardWithClient(client,'500');
  assert.equal(result.reward_type,'bronze_box');
  assert.equal(sql.length,2);
});

test('missing game player is rejected before calendar claim',async()=>{
  const sql=[];
  const client={async query(query,params){sql.push({query,params});return {rows:[]}}};
  await assert.rejects(claimCalendarRewardWithClient(client,'555'),/Game account unavailable/);
  assert.equal(sql.length,1,'must not issue a calendar reward without a game account');
});

test('invalid XP causes the whole transaction to be rejected',async()=>{
  const sql=[];
  const client={async query(query,params){
    sql.push(query);
    return query.includes('gm_game.users')?{rows:[{xp:Number.MAX_SAFE_INTEGER}]}:
      {rows:[{reward_type:'xp',reward_amount:50}]};
  }};
  await assert.rejects(claimCalendarRewardWithClient(client,'555'),/Invalid calendar XP/);
  assert.equal(sql.length,2,'UPDATE must not run with overflowing XP');
});
