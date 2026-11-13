// PostgreSQL-only calendar adapter; not wired into the SQLite production server.
// Telegram initData must be validated by the HTTP layer before calling these methods.
import { withTransaction } from './postgres.mjs';

const validId = value => {
  const id = String(value ?? '');
  if (!/^[1-9][0-9]{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n)
    throw new Error('Invalid Telegram user id');
  return id;
};

export async function registerPlayer({ id, username = '', displayName = '' }) {
  const playerId = validId(id);
  await withTransaction(async client => {
    await client.query(
      `INSERT INTO gm_internal.players(telegram_id,username,display_name)
       VALUES ($1,$2,$3)
       ON CONFLICT (telegram_id) DO UPDATE
       SET username=EXCLUDED.username,display_name=EXCLUDED.display_name,last_seen_at=now()`,
      [playerId, String(username).slice(0, 255), String(displayName).slice(0, 255)],
    );
  });
  return playerId;
}

export async function calendarStatus(id) {
  const playerId = validId(id);
  return withTransaction(async client => {
    const [progress, schedule] = await Promise.all([
      client.query(
        `SELECT cycle_number,next_day,last_claim_date, last_claim_date = (now() at time zone 'UTC')::date as claimed_today,best_day,total_claims
         FROM gm_internal.autumn_calendar_progress WHERE player_telegram_id=$1`,
        [playerId],
      ),
      client.query(
        `SELECT calendar_day,reward_type,reward_amount
         FROM gm_internal.autumn_reward_schedule ORDER BY calendar_day`,
      ),
    ]);
    return { progress: progress.rows[0] ?? null, schedule: schedule.rows };
  });
}

export async function claimCalendarReward(id) {
  const playerId = validId(id);
  return withTransaction(async client => {
    const result = await client.query(
      'SELECT * FROM gm_internal.claim_autumn_reward_atomic($1::bigint)',
      [playerId],
    );
    if (result.rows.length !== 1) throw new Error('Calendar claim returned no reward');
    return result.rows[0];
  });
}
