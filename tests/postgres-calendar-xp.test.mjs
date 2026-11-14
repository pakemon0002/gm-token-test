import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { calendarXpLevel, claimCalendarRewardWithClient } from '../server/postgres-calendar.mjs';

const xpReward={calendar_day:1,reward_type:'xp',reward_amount:'20',operation_id:'autumn:42:1:1'};
function mockCalendar({xp=245,legacyClaim=false,reward=xpReward,gameExists=true,auditAlreadyExists=false}={}){
  const queries=[];
  const client={async query(sql,params){
    queries.push({sql,params});
    if(sql.includes('pg_advisory_xact_lock'))return {rows:[{}]};
    if(sql.includes('SELECT xp FROM gm_game.users'))
      return {rows:gameExists?[{xp}]:[]};
    if(sql.includes('SELECT 1 FROM gm_game.daily_claim'))
      return {rows:legacyClaim?[{exists:1}]:[]};
    if(sql.includes('claim_autumn_reward_atomic'))
      return {rows:[reward]};
    if(sql.includes('UPDATE gm_game.users'))
      return {rows:[{xp:params[1],level:params[2]}],rowCount:1};
    if(sql.includes('INSERT INTO gm_game.journal'))
      return {rows:auditAlreadyExists?[]:[{id:params[0]}],rowCount:auditAlreadyExists?0:1};
    if(sql.includes('INSERT INTO gm_game.daily_claim'))
      return {rowCount:1};
    throw Error('Unexpected SQL: '+sql);
  }};
  return {client,queries};
}

test('calendar shares canonical live-game level thresholds',()=>{
  for(const [xp,level] of [
    [0,1],[20,1],[99,1],[100,2],[249,2],[250,3],
    [449,3],[450,4],[749,4],[750,5],[1149,5],[1150,6],
    [1699,6],[1700,7],[2399,7],[2400,8],[3299,8],
    [3300,9],[4399,9],[4400,10],[100000,10]
  ]) assert.equal(calendarXpLevel(xp),level,'XP='+xp);
  for(const invalid of [-1,NaN,Infinity,1.2,Number.MAX_SAFE_INTEGER+1])
    assert.throws(()=>calendarXpLevel(invalid),/Invalid calendar XP/);
});

test('XP claim updates game profile and daily streak in the SAME transaction',async()=>{
  const {client,queries}=mockCalendar();
  const reward=await claimCalendarRewardWithClient(client,'42');
  assert.equal(reward.reward_type,'xp');
  assert.equal(queries.length,7);
  assert.match(queries[0].sql,/pg_advisory_xact_lock/);
  assert.match(queries[1].sql,/FOR UPDATE/);
  assert.deepEqual(queries[1].params,['42']);
  assert.match(queries[2].sql,/gm_game.daily_claim/);
  assert.match(queries[3].sql,/claim_autumn_reward_atomic/);
  assert.deepEqual(queries[4].params,['42',265,3]);
  assert.match(queries[5].sql,/INSERT INTO gm_game.daily_claim/);
  assert.match(queries[5].sql,/INSERT INTO gm_game.journal/);
  assert.equal(queries[5].params[0],'calendar:xp:mirrored:'+xpReward.operation_id);
  assert.deepEqual(queries[5].params[1],'42');
  assert.match(queries[6].sql,/INSERT INTO gm_game.daily_claim/);
  assert.deepEqual(queries[6].params,['42']);
});

test('box and HP rewards share daily state without duplicate game XP',async()=>{
  for(const reward_type of ['bronze_box','hp']){
    const {client,queries}=mockCalendar({reward:{calendar_day:3,reward_type,reward_amount:1}});
    const reward=await claimCalendarRewardWithClient(client,'500');
    assert.equal(reward.reward_type,reward_type);
    assert.equal(queries.length,5);
    assert.ok(queries.every(x=>!x.sql.includes('UPDATE gm_game.users')));
    assert.match(queries[4].sql,/INSERT INTO gm_game.daily_claim/);
  }
});

test('missing game player rejected BEFORE calendar reward',async()=>{
  const {client,queries}=mockCalendar({gameExists:false});
  await assert.rejects(claimCalendarRewardWithClient(client,'555'),/Game account unavailable/);
  assert.equal(queries.length,2);
});

test('a legacy daily claim blocks a second calendar reward on same UTC date',async()=>{
  const {client,queries}=mockCalendar({legacyClaim:true});
  await assert.rejects(claimCalendarRewardWithClient(client,'555'),/already claimed today/);
  assert.equal(queries.length,3);
  assert.ok(queries.every(x=>!x.sql.includes('claim_autumn_reward_atomic')));
});

test('overflow rejects the transaction without game XP or daily claim writes',async()=>{
  const {client,queries}=mockCalendar({xp:Number.MAX_SAFE_INTEGER,reward:{reward_type:'xp',reward_amount:50}});
  await assert.rejects(claimCalendarRewardWithClient(client,'555'),/Invalid calendar XP/);
  assert.equal(queries.length,4);
});

test('live PostgreSQL legacy Daily Reward route calls autumn calendar only',()=>{
  const code=readFileSync(new URL('../server/index.mjs',import.meta.url),'utf8');
  const pos=code.indexOf("(p === '/api/daily/claim' && verb === 'POST' && process.env.GM_DATABASE_DRIVER === 'postgres')");
  const calendar=code.indexOf('await calendar.claimCalendarReward(id)');
  const engine=code.indexOf('return await game.handle(p,verb,id,req,res)');
  assert.ok(pos>0&&calendar>pos&&engine>calendar,'legacy route must hit protected calendar before the legacy game engine');
});

test('calendar XP audit conflict aborts the same transaction before daily claim',async()=>{
  const {client,queries}=mockCalendar({auditAlreadyExists:true});
  await assert.rejects(claimCalendarRewardWithClient(client,'42'),/Calendar XP operation already mirrored/);
  assert.ok(queries.some(x=>x.sql.includes('UPDATE gm_game.users')));
  assert.ok(queries.some(x=>x.sql.includes('INSERT INTO gm_game.journal')));
  assert.ok(!queries.some(x=>x.sql.includes('INSERT INTO gm_game.daily_claim')));
});

test('calendar status reads profile XP from canonical game schema, not private XP wallet',()=>{
  const code=readFileSync(new URL('../server/postgres-calendar.mjs',import.meta.url),'utf8');
  assert.match(code,/SELECT xp,level FROM gm_game.users WHERE id=\$1/);
  assert.match(code,/xp:Number\(gameProfile.rows\[0\]\?\.xp\?\?0\)/);
  assert.match(code,/level:Number\(gameProfile.rows\[0\]\?\.level\?\?1\)/);
  assert.match(code,/hp:Number\(hp.rows\[0\]\?\.balance\?\?0\)/);
});

test('all XP credits update profile and append game audit in one transaction',()=>{
  const sql=readFileSync(new URL('../server/postgres-calendar.mjs',import.meta.url),'utf8');
  const update=sql.indexOf('UPDATE gm_game.users SET xp=$2');
  const audit=sql.indexOf('INSERT INTO gm_game.journal');
  const daily=sql.indexOf('INSERT INTO gm_game.daily_claim');
  assert.ok(update>0 && audit>update && daily>audit);
  assert.match(sql,/ON CONFLICT \(id\) DO NOTHING RETURNING id/);
});
