import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_MINING_UPGRADE_LEVEL, miningUpgradeCost, miningUpgradeBonusPct, miningUpgradeTotalCost, miningUpgradeTable, GM_LEAGUES, leagueForXp} from '../server/mining-progression.mjs';

test('exactly 200 deterministic upgrade levels', () => {
  const levels = miningUpgradeTable();
  assert.equal(levels.length, 200);
  assert.equal(MAX_MINING_UPGRADE_LEVEL, 200);
  assert.deepEqual(levels[0], {level:1,cost_gm:0,bonus_pct:0,total_gm:0});
  assert.equal(levels[1].cost_gm,150);
  assert.equal(levels[2].cost_gm,200);
  assert.equal(levels[199].bonus_pct,406);
  for(let i=1;i<levels.length;i++) {
    assert.ok(levels[i].cost_gm >= levels[i-1].cost_gm);
    assert.equal(levels[i].total_gm,levels[i-1].total_gm+levels[i].cost_gm);
  }
});
test('invalid upgrade levels rejected',()=>{
  for(const value of [0,201,-1,1.5,NaN,'2']) assert.throws(()=>miningUpgradeCost(value),RangeError);
});
test('league progression has 10 ordered ranks',()=>{
  assert.equal(GM_LEAGUES.length,10);
  assert.equal(leagueForXp(0).name,'Bronze');
  assert.equal(leagueForXp(160000).name,'GM Immortal');
  assert.equal(leagueForXp(49999).name,'Master');
  for(let i=1;i<GM_LEAGUES.length;i++) assert.ok(GM_LEAGUES[i].min_xp>GM_LEAGUES[i-1].min_xp);
  assert.throws(()=>leagueForXp(-1),RangeError);
});
test('upgrade values are pure and reproducible',()=>{
  for(let i=1;i<=200;i++){
    assert.equal(miningUpgradeTotalCost(i),miningUpgradeTable()[i-1].total_gm);
    assert.ok(Number.isSafeInteger(miningUpgradeBonusPct(i)));
  }
});
