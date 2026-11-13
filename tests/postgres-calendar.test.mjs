import test from 'node:test';
import assert from 'node:assert/strict';
import {registerPlayer, calendarStatus, claimCalendarReward} from '../server/postgres-calendar.mjs';

test('PostgreSQL calendar adapter exports async operations', () => {
  assert.equal(typeof registerPlayer, 'function');
  assert.equal(typeof calendarStatus, 'function');
  assert.equal(typeof claimCalendarReward, 'function');
});

test('invalid Telegram IDs are rejected before opening a database connection', async () => {
  for (const id of ['', '0', '-1', 'abc', '1;DROP TABLE players', '9223372036854775808']) {
    await assert.rejects(registerPlayer({id}), /Invalid Telegram user id/);
    await assert.rejects(calendarStatus(id), /Invalid Telegram user id/);
    await assert.rejects(claimCalendarReward(id), /Invalid Telegram user id/);
  }
});
