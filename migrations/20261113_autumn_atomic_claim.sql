-- Server-only claim primitive. Rewards are recorded as entitlements, not
-- credited to the legacy SQLite wallet. Do not expose this function to clients.
CREATE TABLE IF NOT EXISTS gm_internal.autumn_reward_schedule (
  calendar_day integer PRIMARY KEY CHECK (calendar_day BETWEEN 1 AND 30),
  reward_type text NOT NULL CHECK (reward_type IN ('xp','hp','bronze_box','silver_box','gold_box','upgrade')),
  reward_amount bigint NOT NULL CHECK (reward_amount > 0)
);
INSERT INTO gm_internal.autumn_reward_schedule(calendar_day,reward_type,reward_amount)
VALUES
(1,'xp',20),(2,'hp',10),(3,'bronze_box',1),(4,'xp',35),(5,'hp',20),
(6,'bronze_box',1),(7,'silver_box',1),(8,'xp',50),(9,'hp',30),(10,'bronze_box',2),
(11,'xp',60),(12,'silver_box',1),(13,'hp',40),(14,'bronze_box',2),(15,'gold_box',1),
(16,'xp',75),(17,'hp',50),(18,'silver_box',1),(19,'xp',90),(20,'gold_box',1),
(21,'hp',60),(22,'bronze_box',3),(23,'xp',100),(24,'silver_box',2),(25,'gold_box',1),
(26,'xp',120),(27,'hp',80),(28,'silver_box',2),(29,'gold_box',1),(30,'gold_box',3)
ON CONFLICT(calendar_day) DO NOTHING;

CREATE OR REPLACE FUNCTION gm_internal.claim_autumn_reward(
  p_player_telegram_id bigint
) RETURNS TABLE (
  cycle_number integer,
  calendar_day integer,
  reward_type text,
  reward_amount bigint,
  operation_id text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = gm_internal, pg_temp
AS $$
DECLARE
  progress gm_internal.autumn_calendar_progress%ROWTYPE;
  reward gm_internal.autumn_reward_schedule%ROWTYPE;
  claim_day date := (now() AT TIME ZONE 'UTC')::date;
  claim_cycle integer;
  claim_index integer;
  claim_op text;
BEGIN
  IF p_player_telegram_id IS NULL OR p_player_telegram_id <= 0 THEN
    RAISE EXCEPTION 'invalid player id';
  END IF;
  INSERT INTO gm_internal.autumn_calendar_progress(player_telegram_id)
  VALUES (p_player_telegram_id)
  ON CONFLICT DO NOTHING;
  SELECT * INTO progress
  FROM gm_internal.autumn_calendar_progress
  WHERE player_telegram_id=p_player_telegram_id
  FOR UPDATE;
  IF progress.last_claim_date = claim_day THEN
    RAISE EXCEPTION 'already claimed today';
  END IF;
  claim_cycle := progress.cycle_number;
  claim_index := progress.next_day;
  SELECT * INTO STRICT reward FROM gm_internal.autumn_reward_schedule
  WHERE autumn_reward_schedule.calendar_day=claim_index;
  claim_op := 'autumn:' || p_player_telegram_id || ':' || claim_cycle || ':' || claim_index;
  INSERT INTO gm_internal.autumn_calendar_claims(
    player_telegram_id,cycle_number,calendar_day,claim_date,reward_type,reward_amount,operation_id
  ) VALUES(p_player_telegram_id,claim_cycle,claim_index,claim_day,reward.reward_type,reward.reward_amount,claim_op);
  UPDATE gm_internal.autumn_calendar_progress SET
    cycle_number = CASE WHEN claim_index=30 THEN claim_cycle+1 ELSE claim_cycle END,
    next_day = CASE WHEN claim_index=30 THEN 1 ELSE claim_index+1 END,
    last_claim_date=claim_day,
    best_day=GREATEST(progress.best_day,claim_index),
    total_claims=progress.total_claims+1,
    updated_at=now()
  WHERE player_telegram_id=p_player_telegram_id;
  RETURN QUERY SELECT claim_cycle,claim_index,reward.reward_type,reward.reward_amount,claim_op;
END;
$$;
REVOKE ALL ON FUNCTION gm_internal.claim_autumn_reward(bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON gm_internal.autumn_reward_schedule FROM PUBLIC, anon, authenticated;
ALTER TABLE gm_internal.autumn_reward_schedule ENABLE ROW LEVEL SECURITY;
-- No client access. A trusted server must map verified Telegram initData to
-- p_player_telegram_id. Never invoke with an arbitrary client-supplied ID.
