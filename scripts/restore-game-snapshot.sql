-- Install only in the private, empty destination schema created for this import.
CREATE FUNCTION restore_game_snapshot(snapshot_key text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  destination text := current_schema();
  tab text;
  expected bigint;
  copied bigint;
  occupied boolean;
  bad boolean;
  known text[] := ARRAY['users','wallets','pools','journal','tickets','used_admin_2fa','admin_2fa_failures','holding_buckets','restrictions','ticket_messages','game_settings','mining_state','mining_upgrades','early_player_awards','holding_state','holding_peak','points_account','referrals','orders','trades','points_pair_day','box_day','box_collection','request_ids','order_activity','shop_day','daily_claim','tasks_claim','achievements','balance_ledger','holder_nonces','holder_wallets','holder_snapshots'];
BEGIN
  IF destination IN ('public','gm_internal','pg_catalog','gm_migration') OR destination IS NULL THEN
    RAISE EXCEPTION 'Select a dedicated private destination schema';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM gm_migration.snapshots WHERE id=snapshot_key) THEN
    RAISE EXCEPTION 'Unknown snapshot';
  END IF;
  IF EXISTS(SELECT 1 FROM gm_migration.source_tables WHERE snapshot_id=snapshot_key AND NOT(name=ANY(known))) THEN
    RAISE EXCEPTION 'Unmapped source tables';
  END IF;
  FOREACH tab IN ARRAY known LOOP
    EXECUTE format('LOCK TABLE %I.%I IN ACCESS EXCLUSIVE MODE',destination,tab);
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I)',destination,tab) INTO occupied;
    IF occupied THEN RAISE EXCEPTION 'Destination table % contains data',tab; END IF;
    SELECT row_count INTO STRICT expected FROM gm_migration.source_tables WHERE snapshot_id=snapshot_key AND name=tab;
    IF EXISTS(SELECT FROM gm_migration.source_rows r CROSS JOIN LATERAL jsonb_object_keys(r.payload) k
        WHERE r.snapshot_id=snapshot_key AND r.name=tab AND NOT EXISTS(
          SELECT FROM information_schema.columns c WHERE c.table_schema=destination AND c.table_name=tab AND c.column_name=k)) THEN
      RAISE EXCEPTION 'Unmapped column in %',tab;
    END IF;
    EXECUTE format($query$
      INSERT INTO %1$I.%2$I
      SELECT (jsonb_populate_record(null::%1$I.%2$I, decoded.obj)).*
      FROM gm_migration.source_rows r
      CROSS JOIN LATERAL (
        SELECT jsonb_object_agg(key, CASE WHEN jsonb_typeof(value)='object' AND value ? 'integer'
          THEN to_jsonb((value->>'integer')::bigint) ELSE value END) AS obj FROM jsonb_each(r.payload)
      ) decoded
      WHERE r.snapshot_id=$1 AND r.name=$2
    $query$,destination,tab) USING snapshot_key,tab;
    GET DIAGNOSTICS copied=ROW_COUNT;
    IF expected<>copied THEN RAISE EXCEPTION 'Row count mismatch in %',tab; END IF;
    EXECUTE format($query$
      SELECT EXISTS(
        SELECT to_jsonb(t) FROM %I.%I t EXCEPT ALL
        SELECT (SELECT jsonb_object_agg(key,CASE WHEN jsonb_typeof(value)='object' AND value ? 'integer'
          THEN to_jsonb((value->>'integer')::bigint) ELSE value END) FROM jsonb_each(r.payload))
        FROM gm_migration.source_rows r WHERE r.snapshot_id=$1 AND r.name=$2)
    $query$,destination,tab) INTO bad USING snapshot_key,tab;
    IF bad THEN RAISE EXCEPTION 'Content mismatch in %',tab; END IF;
  END LOOP;
  EXECUTE format('SELECT setval(pg_get_serial_sequence(%L,''rowid''),coalesce(max(rowid),1),count(*)>0) FROM %I.trades',destination||'.trades',destination);
END $$;
REVOKE ALL ON FUNCTION restore_game_snapshot(text) FROM PUBLIC,anon,authenticated;
