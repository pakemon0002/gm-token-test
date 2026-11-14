-- GM TOKEN support Telegram outbox. Apply once to the existing Supabase database
-- BEFORE publishing the application code that uses this table.
-- Only server-side gm_game; no anon/authenticated Data API privileges.
BEGIN;
CREATE TABLE IF NOT EXISTS gm_game.support_notifications (
 id TEXT PRIMARY KEY,
 ticket_id TEXT NOT NULL REFERENCES gm_game.tickets(id),
 recipient_id TEXT NOT NULL,
 event TEXT NOT NULL,
 body TEXT NOT NULL,
 created_at BIGINT NOT NULL,
 attempts BIGINT NOT NULL DEFAULT 0 CHECK(attempts>=0),
 next_attempt_at BIGINT NOT NULL,
 sent_at BIGINT,
 status TEXT NOT NULL DEFAULT 'pending'
   CHECK(status IN ('pending','sent','blocked','failed')),
 last_error TEXT,
 UNIQUE(ticket_id,recipient_id,event)
);
CREATE INDEX IF NOT EXISTS idx_support_notifications_due
 ON gm_game.support_notifications(status,next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_support_notifications_recipient
 ON gm_game.support_notifications(recipient_id,created_at DESC);
REVOKE ALL ON gm_game.support_notifications FROM PUBLIC,anon,authenticated;
-- A monotonic per-ticket sequence preserves reply order when several messages
-- share the same timestamp second. Older entries remain untouched (ordinal 0).
ALTER TABLE gm_game.ticket_messages ADD COLUMN IF NOT EXISTS ordinal BIGINT NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_messages_ordinal
 ON gm_game.ticket_messages(ticket_id,ordinal) WHERE ordinal>0;
COMMIT;
