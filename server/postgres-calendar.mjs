// PostgreSQL-only calendar adapter; not wired into the SQLite production server.
// Telegram initData must be validated by the HTTP layer before calling these methods.
import { withTransaction } from './postgres.mjs';
import { xpLevels } from './game.mjs';

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
    // Use one PG connection sequentially; status is read-only.
    const progress = await client.query(
      `SELECT cycle_number,next_day,last_claim_date,
              last_claim_date = (now() at time zone 'UTC')::date as claimed_today,
              best_day,total_claims
       FROM gm_internal.autumn_calendar_progress WHERE player_telegram_id=$1`,
      [playerId],
    );
    const schedule = await client.query(
      `SELECT calendar_day,reward_type,reward_amount
       FROM gm_internal.autumn_reward_schedule ORDER BY calendar_day`,
    );
    const inventory = await client.query(
      `SELECT tier,quantity FROM gm_internal.box_inventory
       WHERE player_id=$1`,
      [playerId],
    );
    const hp = await client.query(
      `SELECT balance FROM gm_internal.wallets
       WHERE player_id=$1 AND currency='HP'`,
      [playerId],
    );
    // Legacy Daily Reward and Autumn Calendar share the same UTC-day lock.
    // Expose that day's state so the client never offers an impossible claim.
    const daily = await client.query(
      `SELECT 1 FROM gm_game.daily_claim
       WHERE user_id=$1 AND day=(now() at time zone 'UTC')::date::text
       LIMIT 1`,
      [playerId],
    );
    const availableBoxes = {bronze:0,silver:0,gold:0};
    for (const row of inventory.rows) {
      if (Object.hasOwn(availableBoxes,row.tier)) {
        const amount = Number(row.quantity);
        if (Number.isSafeInteger(amount) && amount >= 0) availableBoxes[row.tier]=amount;
      }
    }
    return {
      progress:progress.rows[0]??null,
      schedule:schedule.rows,
      inventory:availableBoxes,
      hp:Number(hp.rows[0]?.balance??0),
      daily_claimed_today:daily.rows.length>0
    };
  });
}

// XP earned from the autumn calendar is part of the same in-game profile
// progression as mining and tasks. The private calendar ledger is retained,
// while the real GM game profile is updated in the very same PG transaction.
export function calendarXpLevel(xp) {
  if (!Number.isSafeInteger(xp) || xp < 0) throw new Error('Invalid calendar XP');
  return Math.max(1, Math.min(10, xpLevels.findLastIndex(threshold => xp >= threshold) + 1));
}

export async function claimCalendarRewardWithClient(client, playerId) {
  // Use the same PostgreSQL advisory lock as the game worker to protect XP
  // against concurrent mining/task writes (and maintain a consistent lock order).
  await client.query("SELECT pg_advisory_xact_lock(hashtext('gm_game_writer'))");
  // Lock the user's game profile *before* recording the claim so a successful
  // claim can never exist without the corresponding game XP.
  const profile = await client.query(
    'SELECT xp FROM gm_game.users WHERE id=$1 FOR UPDATE',
    [playerId],
  );
  if (profile.rows.length !== 1) throw new Error('Game account unavailable');

  const legacyDay = await client.query(
    `SELECT 1 FROM gm_game.daily_claim
     WHERE user_id=$1 AND day=(now() at time zone 'UTC')::date::text`,
    [playerId],
  );
  if (legacyDay.rows.length) throw new Error('already claimed today');

  const result = await client.query(
    'SELECT * FROM gm_internal.claim_autumn_reward_atomic($1::bigint)',
    [playerId],
  );
  if (result.rows.length !== 1) throw new Error('Calendar claim returned no reward');

  const reward = result.rows[0];
  if (reward.reward_type === 'xp') {
    const amount = Number(reward.reward_amount);
    const current = Number(profile.rows[0].xp);
    if (!Number.isSafeInteger(amount) || amount <= 0 ||
        !Number.isSafeInteger(current) || current < 0 ||
        !Number.isSafeInteger(current + amount)) {
      throw new Error('Invalid calendar XP');
    }
    const nextXp = current + amount;
    await client.query(
      'UPDATE gm_game.users SET xp=$2,level=$3 WHERE id=$1',
      [playerId, nextXp, calendarXpLevel(nextXp)],
    );
  }
  // Calendar and game daily streak share one unique UTC date. An exception
  // also rolls back both the calendar payout and any XP mirror.
  await client.query(
    `INSERT INTO gm_game.daily_claim(user_id,day)
     VALUES ($1,(now() at time zone 'UTC')::date::text)`,
    [playerId],
  );
  // HP is a persistent non-transferable in-game resource; earned box
  // inventory is redeemable through the authenticated game box-opening path.
  return reward;
}

export async function claimCalendarReward(id) {
  const playerId = validId(id);
  return withTransaction(client => claimCalendarRewardWithClient(client, playerId));
}
