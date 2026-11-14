import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../server/index.mjs', import.meta.url),'utf8');
const calendar = readFileSync(new URL('../server/postgres-calendar.mjs', import.meta.url),'utf8');
const ui = readFileSync(new URL('../miniapp/src/main.tsx', import.meta.url),'utf8');

test('autumn calendar creates the normal account after Telegram verification but before reward handling',()=>{
  const auth = server.indexOf('const identity=auth(req);id=identity.id;');
  const route = server.indexOf("if ((p === '/api/autumn-calendar' && verb === 'GET')");
  const upsert = server.indexOf('upsertUser(identity);',route);
  const ensured = server.indexOf('game.ensure(id);',route);
  const registered = server.indexOf('await calendar.registerPlayer(identity);',route);
  const claimed = server.indexOf('await calendar.claimCalendarReward(id)',route);
  const bootstrap = server.indexOf("if(p==='/api/bootstrap'",route);
  assert.ok(auth>=0 && auth<route,'Telegram identity must be verified first');
  assert.ok(route<upsert && upsert<ensured && ensured<registered && registered<claimed);
  assert.ok(claimed<bootstrap,'calendar must be protected even without explicit bootstrap');
  assert.match(server.slice(route,registered),/if \(!stmt\('SELECT id FROM users WHERE id=\?'\)\.get\(id\)\)/);
});

test('calendar marks the existing UTC game daily claim as unavailable before payout',()=>{
  assert.match(calendar,/SELECT 1 FROM gm_game\.daily_claim/);
  assert.match(calendar,/day=\(now\(\) at time zone 'UTC'\)::date::text/);
  assert.match(calendar,/daily_claimed_today:daily\.rows\.length>0/);
  assert.match(ui,/claimedViaDaily = !!data\?\.daily_claimed_today/);
  assert.match(ui,/\(received\|\|claimedViaDaily\)&&!preview/);
  assert.match(ui,/Ежедневная награда уже получена/);
  assert.match(calendar,/if \(legacyDay\.rows\.length\) throw new Error\('already claimed today'\)/);
});

test('calendar never mistakes a legacy daily claim for the completed 30th day',()=>{
  assert.match(ui,/const completed = received && next === 1 \? 30 : next - 1/);
  assert.match(ui,/const today = received \? completed : next/);
  assert.match(ui,/const received = !!progress\?\.claimed_today/);
  assert.match(ui,/const claimedViaDaily = !!data\?\.daily_claimed_today/);
});
