-- Run in an ISOLATED staging DB after the shadow migration. No permanent changes.
begin;
insert into gm_ton_shadow.accounts(account_code,account_kind,currency) values
 ('test:smoke:mining','fund','GM_RAW'),('test:smoke:player','user_available','GM_RAW');
insert into gm_ton_shadow.journal_batches(operation_id,operation_kind)
 values ('test:smoke:balanced','transfer');
insert into gm_ton_shadow.journal_entries(batch_id,line_no,account_id,currency,amount_units)
select b.id,1,a.id,'GM_RAW',-1000000000
 from gm_ton_shadow.journal_batches b join gm_ton_shadow.accounts a
 on a.account_code='test:smoke:mining'
 where b.operation_id='test:smoke:balanced';
insert into gm_ton_shadow.journal_entries(batch_id,line_no,account_id,currency,amount_units)
select b.id,2,a.id,'GM_RAW',1000000000
 from gm_ton_shadow.journal_batches b join gm_ton_shadow.accounts a
 on a.account_code='test:smoke:player'
 where b.operation_id='test:smoke:balanced';
set constraints all immediate;
select count(*) as entry_count, sum(amount_units) as net_units
 from gm_ton_shadow.journal_entries
 where batch_id=(select id from gm_ton_shadow.journal_batches where operation_id='test:smoke:balanced');
rollback;