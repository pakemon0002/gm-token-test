-- Isolated PostgreSQL staging guard tests only. Caller wraps this file with BEGIN/ROLLBACK.
-- A truthful local GM/CR total NEVER grants the right to label on-chain reserves verified.
DO $reserve_checks$
DECLARE n bigint;
BEGIN
  BEGIN
    INSERT INTO gm_ton_shadow.reconciliation_snapshots
    (game_gm_cents,game_cr_cents,game_gm_gap_cents,game_cr_gap_cents,assurance,note)
    VALUES (15000000000,100000000000,0,0,'FULLY_BACKED','malicious assertion of 1:1');
    RAISE EXCEPTION 'TEST FAILURE: unsupported FULLY_BACKED claim accepted';
  EXCEPTION WHEN check_violation THEN
    NULL; -- Expected by the schema fail-closed CHECK.
  END;
  BEGIN
    INSERT INTO gm_ton_shadow.reconciliation_snapshots
    (game_gm_cents,game_cr_cents,game_gm_gap_cents,game_cr_gap_cents,assurance,note)
    VALUES (15000000000,100000000000,0,0,'MAINNET_REDEMPTION_ENABLED','malicious payout claim');
    RAISE EXCEPTION 'TEST FAILURE: live redemption claim accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
  INSERT INTO gm_ton_shadow.reconciliation_snapshots
  (game_gm_cents,game_cr_cents,game_gm_gap_cents,game_cr_gap_cents,assurance,note)
  VALUES (15000000000,100000000000,0,0,'GAME_ONLY_UNVERIFIED',
   'Synthetic equal game totals: NO independent Jetton master, custody or 1:1 proof');
  SELECT count(*) INTO n FROM gm_ton_shadow.reconciliation_snapshots;
  IF n<>1 THEN RAISE EXCEPTION 'Unexpected reconciliation snapshots count %',n; END IF;

  BEGIN
    UPDATE gm_ton_shadow.reconciliation_snapshots SET note='manipulated backing' WHERE assurance='GAME_ONLY_UNVERIFIED';
    RAISE EXCEPTION 'TEST FAILURE: append-only observation could be modified';
  EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;
  END;

  BEGIN
    DELETE FROM gm_ton_shadow.reconciliation_snapshots;
    RAISE EXCEPTION 'TEST FAILURE: append-only observation could be deleted';
  EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;
  END;
END
$reserve_checks$;

SELECT assurance,count(*)::int AS snapshots
FROM gm_ton_shadow.reconciliation_snapshots GROUP BY assurance;
