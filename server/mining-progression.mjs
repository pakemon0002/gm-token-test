// GM TOKEN 2.0 — deterministic proposed upgrade schedule; token payment not active without verified contract.
// Upgrades are separate from the account XP level. Do not replace legacy levels.
export const MAX_MINING_UPGRADE_LEVEL = 200;
export const MINING_UPGRADE_VERSION = 'v2-proposal-2026-11-10';
export function miningUpgradeCost(level) {
  if (!Number.isInteger(level) || level < 1 || level > MAX_MINING_UPGRADE_LEVEL) throw new RangeError('invalid mining upgrade level');
  if (level === 1) return 0;
  if (level === 2) return 150;
  return Math.round((200 * 1.04 ** (level - 3)) / 10) * 10;
}
export function miningUpgradeBonusBps(level) {
  if (!Number.isInteger(level) || level < 1 || level > MAX_MINING_UPGRADE_LEVEL) throw new RangeError('invalid mining upgrade level');
  return level === 1 ? 0 : 10 + 2 * (level - 2);
}
export function miningUpgradeBonusPct(level) { return miningUpgradeBonusBps(level) / 100; }
export function miningUpgradeTotalCost(level) {
  if (!Number.isInteger(level) || level < 1 || level > MAX_MINING_UPGRADE_LEVEL) throw new RangeError('invalid mining upgrade level');
  let total = 0;
  for (let next = 2; next <= level; next++) total += miningUpgradeCost(next);
  return total;
}
export function miningUpgradeTable() {
  return Array.from({length: MAX_MINING_UPGRADE_LEVEL}, (_, i) => {
    const level = i + 1;
    return {level, cost_gm: miningUpgradeCost(level), bonus_pct: miningUpgradeBonusPct(level), total_gm: miningUpgradeTotalCost(level)};
  });
}
export const GM_LEAGUES = Object.freeze([
  {name:'Bronze', min_xp:0},
  {name:'Silver', min_xp:1000},
  {name:'Gold', min_xp:3000},
  {name:'Platinum', min_xp:7500},
  {name:'Diamond', min_xp:15000},
  {name:'Master', min_xp:30000},
  {name:'Grandmaster', min_xp:50000},
  {name:'Elite', min_xp:75000},
  {name:'Legend', min_xp:110000},
  {name:'GM Immortal', min_xp:160000}
]);
export function leagueForXp(xp) {
  if (!Number.isSafeInteger(xp) || xp < 0) throw new RangeError('invalid XP');
  return GM_LEAGUES.findLast(league => xp >= league.min_xp);
}
