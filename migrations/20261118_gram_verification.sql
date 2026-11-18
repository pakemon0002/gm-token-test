-- GM TOKEN: optional native GRAM anti-bot verification, no effect on game GM/CR.
-- This table is server-owned. The client never receives SQL or writes to Supabase.
CREATE TABLE IF NOT EXISTS gm_game.gram_verification_payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES gm_game.users(id),
  wallet_address TEXT NOT NULL,
  receiver_address TEXT NOT NULL,
  amount_nanogram TEXT NOT NULL CHECK(amount_nanogram='50000000'),
  memo TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid')),
  tx_hash TEXT UNIQUE,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  checked_at BIGINT NOT NULL DEFAULT 0,
  verified_at BIGINT,
  CHECK((status='pending' AND tx_hash IS NULL AND verified_at IS NULL) OR
        (status='paid' AND tx_hash IS NOT NULL AND verified_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_gram_verify_user_created ON gm_game.gram_verification_payments(user_id,created_at DESC);
ALTER TABLE gm_game.gram_verification_payments ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies or grants: private server-side access only.
