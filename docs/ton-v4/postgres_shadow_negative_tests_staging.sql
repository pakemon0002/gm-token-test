-- Run ONLY after both staging SQL files inside a transaction you will ROLLBACK.
-- Expected: all invalid transitions are rejected; no GM funds move.
insert into gm_ton_shadow.accounts(account_code,account_kind,currency) values
 ('test:clearing','clearing','GM_RAW'),
 ('test:fund','fund','GM_RAW'),
 ('test:player','user_available','GM_RAW');

insert into gm_ton_shadow.journal_batches(operation_id,operation_kind)
 values ('test:opening:1','opening'),('test:transfer:1','transfer');

insert into gm_ton_shadow.journal_entries(batch_id,line_no,account_id,currency,amount_units)
select b.id,1,a.id,'GM_RAW',-10000000000 from gm_ton_shadow.journal_batches b join gm_ton_shadow.accounts a on a.account_code='test:clearing' where b.operation_id='test:opening:1';
insert into gm_ton_shadow.journal_entries(batch_id,line_no,account_id,currency,amount_units)
select b.id,2,a.id,'GM_RAW',10000000000 from gm_ton_shadow.journal_batches b join gm_ton_shadow.accounts a on a.account_code='test:fund' where b.operation_id='test:opening:1';
insert into gm_ton_shadow.journal_entries(batch_id,line_no,account_id,currency,amount_units)
select b.id,1,a.id,'GM_RAW',-1000000000 from gm_ton_shadow.journal_batches b join gm_ton_shadow.accounts a on a.account_code='test:fund' where b.operation_id='test:transfer:1';
insert into gm_ton_shadow.journal_entries(batch_id,line_no,account_id,currency,amount_units)
select b.id,2,a.id,'GM_RAW',1000000000 from gm_ton_shadow.journal_batches b join gm_ton_shadow.accounts a on a.account_code='test:player' where b.operation_id='test:transfer:1';

set constraints all immediate;

do $gm_tests$
declare msg text;
begin
  -- Unique operation ID prevents duplicate bookkeeping.
  begin
    insert into gm_ton_shadow.journal_batches(operation_id,operation_kind) values ('test:transfer:1','transfer');
    raise exception 'FAIL: duplicate operation accepted';
  exception when unique_violation then null;
  end;

  -- Existing journal entry cannot be edited or deleted.
  begin
    update gm_ton_shadow.journal_entries set amount_units=42 where line_no=1;
    raise exception 'FAIL: update accepted';
  exception when object_not_in_prerequisite_state then null;
  end;

  -- Account type cannot be changed after posting.
  begin
    update gm_ton_shadow.accounts set account_kind='clearing' where account_code='test:player';
    raise exception 'FAIL: account update accepted';
  exception when object_not_in_prerequisite_state then null;
  end;

  -- No empty batch after deferrable constraint check.
  begin
    execute 'set constraints all deferred';
    insert into gm_ton_shadow.journal_batches(operation_id,operation_kind) values ('test:orphan:1','transfer');
    execute 'set constraints all immediate';
    raise exception 'FAIL: empty batch accepted';
  exception when check_violation then
    get stacked diagnostics msg=message_text;
    if msg not like 'Journal batch % has fewer than two entries' then raise exception 'Wrong orphan rejection: %',msg; end if;
  end;

  -- Net -1 instead of zero MUST be rejected.
  begin
    execute 'set constraints all deferred';
    insert into gm_ton_shadow.journal_batches(operation_id,operation_kind) values ('test:unbalanced:1','transfer');
    insert into gm_ton_shadow.journal_entries(batch_id,line_no,account_id,currency,amount_units)
      select b.id,1,a.id,'GM_RAW',-100 from gm_ton_shadow.journal_batches b
      join gm_ton_shadow.accounts a on a.account_code='test:fund' where b.operation_id='test:unbalanced:1';
    insert into gm_ton_shadow.journal_entries(batch_id,line_no,account_id,currency,amount_units)
      select b.id,2,a.id,'GM_RAW',99 from gm_ton_shadow.journal_batches b
      join gm_ton_shadow.accounts a on a.account_code='test:player' where b.operation_id='test:unbalanced:1';
    execute 'set constraints all immediate';
    raise exception 'FAIL: unbalanced batch accepted';
  exception when check_violation then
    get stacked diagnostics msg=message_text;
    if msg not like 'Unbalanced journal batch%' then raise exception 'Wrong unbalanced rejection: %',msg; end if;
  end;

  -- A perfectly balanced batch still MUST fail if user balance would go negative.
  begin
    execute 'set constraints all deferred';
    insert into gm_ton_shadow.journal_batches(operation_id,operation_kind) values ('test:overdraft:1','transfer');
    insert into gm_ton_shadow.journal_entries(batch_id,line_no,account_id,currency,amount_units)
      select b.id,1,a.id,'GM_RAW',-5000000000 from gm_ton_shadow.journal_batches b
      join gm_ton_shadow.accounts a on a.account_code='test:player' where b.operation_id='test:overdraft:1';
    insert into gm_ton_shadow.journal_entries(batch_id,line_no,account_id,currency,amount_units)
      select b.id,2,a.id,'GM_RAW',5000000000 from gm_ton_shadow.journal_batches b
      join gm_ton_shadow.accounts a on a.account_code='test:fund' where b.operation_id='test:overdraft:1';
    execute 'set constraints all immediate';
    raise exception 'FAIL: negative player balance accepted';
  exception when check_violation then
    get stacked diagnostics msg=message_text;
    if msg not like 'Negative balance forbidden%' then raise exception 'Wrong overdraft rejection: %',msg; end if;
  end;
end;
  $gm_tests$;

select count(*)::int as accepted_entries,coalesce(sum(amount_units),0)::text as accepted_net
from gm_ton_shadow.journal_entries;