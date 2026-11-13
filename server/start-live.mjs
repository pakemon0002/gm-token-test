// The deployed entry point never starts the local SQLite fixture or private-test switches.
for (const key of ['GM_TEST_STARTER_FUNDS','GM_ADMIN_TEST_GRANTS','GM_TEST_OPEN_TRADING','GM_PRIVATE_TEST_ECONOMY','GM_MINING_FAST_TRACK','GM_DAILY_MILESTONE_TEST']) {
  process.env[key]='0';
}
if (process.env.GM_UPGRADE_PAYMENT_MODE === 'virtual_test') delete process.env.GM_UPGRADE_PAYMENT_MODE;
process.env.GM_DATABASE_DRIVER='postgres';
if (!process.env.DATABASE_URL || !process.env.BOT_TOKEN) throw new Error('DATABASE_URL and BOT_TOKEN are required');
await import('./index.mjs');