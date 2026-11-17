-- GM TOKEN v4 staging ledger. ADDITIVE ONLY. Does not alter gm_game or gm_internal.
-- NO TON mainnet integration. Not a source of truth until a separately approved cutover.
create schema gm_ton_shadow;
revoke all on schema gm_ton_shadow from public, anon, authenticated;
grant usage on schema gm_ton_shadow to service_role;

create table gm_ton_shadow.accounts (
  id bigint generated always as identity primary key,
  account_code text not null unique,
  account_kind text not null check (account_kind in ('fund','user_available','user_vault','user_reserved','user_pending','custody','clearing')),
  currency text not null check (currency in ('GM_RAW','CR_CENTS')),
  created_at timestamptz not null default now(),
  unique (id,currency),
  check (length(account_code) between 3 and 180)
);

create table gm_ton_shadow.journal_batches (
  id uuid primary key default gen_random_uuid(),
  operation_id text not null unique check (length(operation_id) between 6 and 180),
  operation_kind text not null check (length(operation_kind) between 3 and 80),
  source_reference text,
  policy_version text not null default 'v4-draft',
  created_at timestamptz not null default now()
);

create table gm_ton_shadow.journal_entries (
  batch_id uuid not null references gm_ton_shadow.journal_batches(id),
  line_no integer not null check (line_no > 0),
  account_id bigint not null,
  currency text not null check (currency in ('GM_RAW','CR_CENTS')),
  amount_units numeric(38,0) not null check (amount_units <> 0),
  created_at timestamptz not null default now(),
  primary key (batch_id,line_no),
  foreign key (account_id,currency) references gm_ton_shadow.accounts(id,currency)
);

create index journal_entries_account_idx on gm_ton_shadow.journal_entries(account_id,currency,created_at);

create function gm_ton_shadow.reject_record_change()
returns trigger language plpgsql security invoker
set search_path=pg_catalog,gm_ton_shadow as $$
begin
  raise exception 'GM shadow ledger records are append-only' using errcode='55000';
end;
$$;

create trigger journal_entries_append_only
before update or delete on gm_ton_shadow.journal_entries
for each row execute function gm_ton_shadow.reject_record_change();

create trigger journal_batches_append_only
before update or delete on gm_ton_shadow.journal_batches
for each row execute function gm_ton_shadow.reject_record_change();

create function gm_ton_shadow.assert_balanced_batch()
returns trigger language plpgsql security invoker
set search_path=pg_catalog,gm_ton_shadow as $$
declare
  entry_count bigint;
  net_units numeric(38,0);
begin
  select count(*),coalesce(sum(amount_units),0)
    into entry_count,net_units
    from gm_ton_shadow.journal_entries
    where batch_id=new.batch_id and currency=new.currency;
  if entry_count < 2 or net_units <> 0 then
    raise exception 'Unbalanced journal batch %, currency %, count %, net %',
      new.batch_id,new.currency,entry_count,net_units
      using errcode='23514';
  end if;
  return null;
end;
$$;

create constraint trigger journal_batch_balances_on_commit
after insert on gm_ton_shadow.journal_entries
deferrable initially deferred
for each row execute function gm_ton_shadow.assert_balanced_batch();

create table gm_ton_shadow.reconciliation_snapshots (
  id bigint generated always as identity primary key,
  observed_at timestamptz not null default now(),
  game_gm_cents numeric(38,0) not null check(game_gm_cents >= 0),
  game_cr_cents numeric(38,0) not null check(game_cr_cents >= 0),
  game_gm_gap_cents numeric(38,0) not null,
  game_cr_gap_cents numeric(38,0) not null,
  onchain_master text,
  onchain_supply_raw numeric(38,0),
  onchain_custody_raw numeric(38,0),
  assurance text not null default 'GAME_ONLY_UNVERIFIED'
    check(assurance='GAME_ONLY_UNVERIFIED'),
  note text,
  check(onchain_supply_raw is null or onchain_supply_raw>=0),
  check(onchain_custody_raw is null or onchain_custody_raw>=0)
);

create trigger reconciliation_snapshots_append_only
before update or delete on gm_ton_shadow.reconciliation_snapshots
for each row execute function gm_ton_shadow.reject_record_change();

-- Never expose these through user-facing Data API. Access only from privileged backend.
revoke all on all tables in schema gm_ton_shadow from public,anon,authenticated;
revoke all on all sequences in schema gm_ton_shadow from public,anon,authenticated;
revoke all on all functions in schema gm_ton_shadow from public,anon,authenticated;
grant select,insert on all tables in schema gm_ton_shadow to service_role;
grant usage,select on all sequences in schema gm_ton_shadow to service_role;
