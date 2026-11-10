import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_MINING_LEVEL,upgradeCostGM,miningBonusPercent,miningRateCentsDay,miningStorageHours,totalUpgradeCostGM,LEAGUES,leagueForXP,miningMilestones} from '../server/mining-progression.mjs';

test('GM 2.0: mining has 200 sequential, increasing price levels',()=>{
  assert.equal(MAX_MINING_LEVEL,200);
  assert.equal(upgradeCostGM(1),0);
  assert.equal(upgradeCostGM(2),150);
  assert.equal(upgradeCostGM(3),200);
  assert.equal(upgradeCostGM(10),260);
  assert.equal(upgradeCostGM(25),470);
  assert.equal(upgradeCostGM(50),1260);
  assert.equal(upgradeCostGM(100),8980);
  assert.equal(upgradeCostGM(200),453520);
  assert.equal(totalUpgradeCostGM(200),11786640);
  for(let l=3;l<=200;l++)assert.ok(upgradeCostGM(l)>=upgradeCostGM(l-1));
  for(const invalid of [0,201,NaN,2.5,-3]) assert.throws(()=>upgradeCostGM(invalid),RangeError);
});
test('GM 2.0: percentages replace previous levels, do not stack',()=>{
  assert.equal(miningBonusPercent(1),0);
  assert.equal(miningBonusPercent(2),10);
  assert.equal(miningBonusPercent(10),26);
  assert.equal(miningBonusPercent(200),406);
  assert.equal(miningRateCentsDay(1),1000);
  assert.equal(miningRateCentsDay(2),1100);
  assert.equal(miningRateCentsDay(200),5060);
  assert.equal(miningStorageHours(1),8);
  assert.equal(miningStorageHours(200),22);
  assert.equal(miningMilestones().length,8);
  assert.equal(miningMilestones()[7].rewardCode,'skin_gm_immortal');
});
test('GM 2.0: 10 leagues have stable XP boundaries',()=>{
  assert.equal(LEAGUES.length,10);
  assert.equal(leagueForXP(0).current.id,'bronze');
  assert.equal(leagueForXP(999).remaining_xp,1);
  assert.equal(leagueForXP(1000).current.id,'silver');
  assert.equal(leagueForXP(160000).current.id,'immortal');
  assert.equal(leagueForXP(160000).next,null);
  assert.throws(()=>leagueForXP(-1),RangeError);
});
