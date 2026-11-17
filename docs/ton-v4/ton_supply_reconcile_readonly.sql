-- GM TOKEN | READ-ONLY reconciliation as observed on Frankfurt project 2026-11-15.
-- Intended project: jbfktyxkmrpgeannzrei (new GM TOKEN).
-- NEVER count gm_game.holding_buckets again: they subdivide gm_game.pools.HOLDING.
-- NEVER count QA restore schemas, synthetic fixtures or chain holdings as game balances.
-- Units: gm_game.*.gm, wallets.gm/cr/vault, mining_state.pending_cents are CENTS.
-- This query does not verify custody, Jetton supply, wallet ownership, or actual TON backing.
-- IMPORTANT: active orders, pending holding payouts and gm_internal GM must be audited
-- before treating this snapshot as complete. This is NOT a go-live clearance.

with wallets as (
  select coalesce(sum(gm),0)::numeric as gm,
         coalesce(sum(cr),0)::numeric as cr,
         coalesce(sum(vault),0)::numeric as vault
  from gm_game.wallets
),
pools as (
  select coalesce(sum(gm),0)::numeric as gm,
         coalesce(sum(cr),0)::numeric as cr,
         coalesce(sum(gm) filter(where name='HOLDING'),0)::numeric as holding
  from gm_game.pools
),
mining as (
  select coalesce(sum(pending_cents),0)::numeric as pending_gm
  from gm_game.mining_state
),
holding as (
  select coalesce(sum(pending_cents),0)::numeric as pending_gm
  from gm_game.holding_state
),
holding_subpools as (
  select coalesce(sum(gm),0)::numeric as subpool_gm
  from gm_game.holding_buckets
),
orders as (
  select count(*)::bigint as order_count
  from gm_game.orders
),
legacy_internal as (
  select coalesce(sum(balance) filter (where currency='GM'),0)::numeric as gm_balance
  from gm_internal.wallets
),
report as (
  select w.gm as wallet_gm_cents,
         w.vault as wallet_vault_gm_cents,
         p.gm as fund_gm_cents,
         m.pending_gm as mining_pending_gm_cents,
         h.pending_gm as holding_pending_gm_cents_review_only,
         p.holding as holding_pool_gm_cents,
         hs.subpool_gm as holding_subpool_gm_cents_not_additive,
         o.order_count as historic_order_count_review_only,
         li.gm_balance as other_schema_gm_review_only,
         w.cr as wallet_cr_cents,
         p.cr as fund_cr_cents,
         (w.gm+w.vault+p.gm+m.pending_gm) as total_gm_cents,
         (w.cr+p.cr) as total_cr_cents
  from wallets w cross join pools p cross join mining m
       cross join holding h cross join holding_subpools hs
       cross join orders o cross join legacy_internal li
)
select *,
  15000000000::numeric - total_gm_cents as gm_gap_vs_limit_cents,
  100000000000::numeric - total_cr_cents as cr_gap_vs_limit_cents,
  case when total_gm_cents=15000000000
             and total_cr_cents=100000000000
             and holding_pending_gm_cents_review_only=0
             and historic_order_count_review_only=0
             and other_schema_gm_review_only=0
             and holding_pool_gm_cents=holding_subpool_gm_cents_not_additive
       then 'GAME_ACCOUNTING_MATCHES_SNAPSHOT'
       else 'REQUIRES_MANUAL_RECONCILIATION'
  end as game_audit_status,
  'ONCHAIN_BACKING_NOT_VERIFIED'::text as onchain_status
from report;