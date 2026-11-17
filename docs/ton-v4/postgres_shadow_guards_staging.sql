-- Stage-only, additive hardening for postgres_shadow_ledger_staging.sql.
-- Run AFTER the base shadow schema in an ISOLATED staging DB only.
-- Never enable actual GM/Jetton transfers from this prototype.

create function gm_ton_shadow.assert_batch_not_empty()
returns trigger language plpgsql security invoker
set search_path=pg_catalog,gm_ton_shadow as $gm_batch$
begin
  if (select count(*) from gm_ton_shadow.journal_entries where batch_id=new.id)<2 then
    raise exception 'Journal batch % has fewer than two entries',new.id using errcode='23514';
  end if;
  return null;
end;
  $gm_batch$;

create constraint trigger journal_batch_nonempty_on_commit
after insert on gm_ton_shadow.journal_batches
deferrable initially deferred
for each row execute function gm_ton_shadow.assert_batch_not_empty();

-- Serialize transactions touching an account. Production posting must take
-- all account locks in the same order to avoid deadlocks.
create function gm_ton_shadow.lock_posting_account()
returns trigger language plpgsql security invoker
set search_path=pg_catalog,gm_ton_shadow as $gm_lock$
begin
  perform 1 from gm_ton_shadow.accounts where id=new.account_id for update;
  return new;
end;
  $gm_lock$;

create trigger lock_account_before_post
before insert on gm_ton_shadow.journal_entries
for each row execute function gm_ton_shadow.lock_posting_account();

-- Prevent negative spendable shadow balances. The clearing account exception
-- is ONLY a bookkeeping counter for test opening entries; not real GM backing.
create function gm_ton_shadow.assert_nonnegative_account()
returns trigger language plpgsql security invoker
set search_path=pg_catalog,gm_ton_shadow as $gm_balance$
declare
  kind text;
  current_balance numeric;
begin
  select account_kind into kind from gm_ton_shadow.accounts where id=new.account_id;
  if kind='clearing' then return null; end if;
  select coalesce(sum(amount_units),0) into current_balance
  from gm_ton_shadow.journal_entries
  where account_id=new.account_id and currency=new.currency;
  if current_balance<0 then
    raise exception 'Negative balance forbidden: account %, currency %, balance %',
      new.account_id,new.currency,current_balance using errcode='23514';
  end if;
  return null;
end;
  $gm_balance$;

create constraint trigger account_balance_nonnegative_on_commit
after insert on gm_ton_shadow.journal_entries
deferrable initially deferred
for each row execute function gm_ton_shadow.assert_nonnegative_account();

create trigger accounts_append_only
before update or delete on gm_ton_shadow.accounts
for each row execute function gm_ton_shadow.reject_record_change();
