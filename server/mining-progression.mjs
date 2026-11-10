// GM TOKEN 2.0 — game-only progression. No monetary value or chain operations.
// Keep mining-upgrade progression separate from the account's XP level.
export const MAX_MINING_LEVEL = 200;
export const MINING_BASE_DAILY_GM = 10;
export const MINING_MILESTONE_STEP = 25;

export function assertMiningLevel(level) {
  if (!Number.isSafeInteger(level) || level < 1 || level > MAX_MINING_LEVEL)
    throw new RangeError('mining level must be an integer from 1 to 200');
  return level;
}

// Exact approved progression. All costs are in whole *virtual* GM.
export function upgradeCostGM(level) {
  assertMiningLevel(level);
  if (level === 1) return 0;
  if (level === 2) return 150;
  return Math.round((200 * Math.pow(1.04, level - 3)) / 10) * 10;
}

export function miningBonusPercent(level) {
  assertMiningLevel(level);
  return level === 1 ? 0 : 10 + 2 * (level - 2);
}

export function miningRateCentsDay(level, baseDailyGM = MINING_BASE_DAILY_GM) {
  assertMiningLevel(level);
  if (!Number.isSafeInteger(baseDailyGM) || baseDailyGM <= 0)
    throw new RangeError('invalid daily base rate');
  return Math.floor(baseDailyGM * 100 * (100 + miningBonusPercent(level)) / 100);
}

export function miningStorageHours(level) {
  assertMiningLevel(level);
  // 8 hours initially, up to 22 hours through seven milestone upgrades.
  return Math.min(24, 8 + Math.floor((level - 1) / MINING_MILESTONE_STEP) * 2);
}

export function totalUpgradeCostGM(level) {
  assertMiningLevel(level);
  let sum = 0;
  for (let i = 2; i <= level; i++) sum += upgradeCostGM(i);
  return sum;
}

export function miningMilestones() {
  return Array.from({length:8}, (_, i) => ({
    level: (i + 1) * MINING_MILESTONE_STEP,
    kind: 'cosmetic',
    rewardCode: (i + 1) === 8 ? 'skin_gm_immortal' : 'milestone_' + ((i + 1) * MINING_MILESTONE_STEP),
    label: (i + 1) === 8 ? 'GM Immortal' : 'GM · ' + ((i + 1) * MINING_MILESTONE_STEP)
  }));
}

export const LEAGUES = Object.freeze([
  {id:'bronze',name:'Bronze',xp:0},
  {id:'silver',name:'Silver',xp:1000},
  {id:'gold',name:'Gold',xp:3000},
  {id:'platinum',name:'Platinum',xp:7500},
  {id:'diamond',name:'Diamond',xp:15000},
  {id:'master',name:'Master',xp:30000},
  {id:'grandmaster',name:'Grandmaster',xp:50000},
  {id:'elite',name:'Elite',xp:75000},
  {id:'legend',name:'Legend',xp:110000},
  {id:'immortal',name:'GM Immortal',xp:160000}
]);

export function leagueForXP(xp) {
  if (!Number.isSafeInteger(xp) || xp < 0) throw new RangeError('invalid XP');
  let current = LEAGUES[0], next = null;
  for (let i = 0; i < LEAGUES.length; i++) {
    if (xp >= LEAGUES[i].xp) current = LEAGUES[i];
    else {next = LEAGUES[i];break;}
  }
  return {current,next,remaining_xp:next?next.xp-xp:0,progress_pct:next?
    Math.min(100,Math.floor((xp-current.xp)*100/(next.xp-current.xp))):100};
}
