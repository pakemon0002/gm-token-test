-- GM TOKEN autumn calendar (staging migration, not yet applied).
-- Existing wallets, transactions and daily rewards are deliberately untouched.
-- All monetary rewards must be credited by the authenticated server in the
-- same database transaction as the calendar claim and its ledger entry.
-- Never trust a user-supplied reward amount or Telegram user ID.
CREATE SCHEMA IF NOT EXISTS gm_internal;

CREATE TABLE IF NOT EXISTS gm_internal.autumn_calendar_progress (
  player_telegram_id bigint PRIMARY KEY CHECK (player_telegram_id > 0),
  cycle_number integer NOT NULL DEFAULT 1 CHECK (cycle_number > 0),
  next_day integer NOT NULL DEFAULT 1 CHECK (next_day BETWEEN 1 AND 30),
  last_claim_date date,
  best_day integer NOT NULL DEFAULT 0 CHECK (best_day BETWEEN 0 AND 30),
  total_claims integer NOT NULL DEFAULT 0 CHECK (total_claims >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gm_internal.autumn_calendar_claims (
  player_telegram_id bigint NOT NULL CHECK (player_telegram_id > 0),
  cycle_number integer NOT NULL CHECK (cycle_number > 0),
  calendar_day integer NOT NULL CHECK (calendar_day BETWEEN 1 AND 30),
  claim_date date NOT NULL,
  reward_type text NOT NULL CHECK (reward_type IN ('gm','xp','hp','bronze_box','silver_box','gold_box','upgrade')),
  reward_amount bigint NOT NULL CHECK (reward_amount > 0),
  operation_id text NOT NULL UNIQUE,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_telegram_id, cycle_number, calendar_day),
  UNIQUE (player_telegram_id, claim_date),
  FOREIGN KEY (player_telegram_id) REFERENCES gm_internal.autumn_calendar_progress(player_telegram_id)
);

CREATE INDEX IF NOT EXISTS autumn_calendar_claims_by_player_date
  ON gm_internal.autumn_calendar_claims(player_telegram_id, claimed_at DESC);

-- These tables are private server-side state, not a client-writable API.
REVOKE ALL ON SCHEMA gm_internal FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA gm_internal FROM PUBLIC, anon, authenticated;
ALTER TABLE gm_internal.autumn_calendar_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE gm_internal.autumn_calendar_claims ENABLE ROW LEVEL SECURITY;

-- Migration notes:
-- 1. Back up SQLite and existing Supabase before applying.
-- 2. Establish one authoritative balance ledger and map Telegram IDs.
-- 3. Use a single SQL transaction for claim, reward credit and progress.
-- 4. Use the database date (UTC) consistently; no client clock trust.
-- 5. Do not reset progress merely because the user misses a day.
-- 6. Cycle day 30 -> next cycle day 1, preserving claim history.
-- 7. This file does not enable withdrawals or on-chain transfers.
