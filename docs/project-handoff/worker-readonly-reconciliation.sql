-- PREPARATION ONLY. Not executed. Use only the separately verified Preview
-- release ledger database, never application staging or production. No helper
-- bootstrap, migrations, claim, adoption, recovery or worker startup command.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '3000ms';
SET LOCAL lock_timeout = '1000ms';
SET LOCAL idle_in_transaction_session_timeout = '10000ms';

-- Verify database identity outside this bundle against independently inspected
-- resource metadata before running these statements. Credentials stay in memory.
SELECT current_setting('transaction_read_only') = 'on' AS read_only;

SELECT state, count(*)::integer AS releases,
  count(*) FILTER (WHERE lock_expires_at > now())::integer AS active_leases,
  count(*) FILTER (WHERE lock_expires_at <= now())::integer AS expired_leases
FROM preview_release GROUP BY state ORDER BY state;

SELECT source_sha, state, mode, classification, lock_expires_at,
  lock_expires_at > now() AS active_lease, progression_order, updated_at
FROM preview_release
WHERE state NOT IN ('COMPLETE','SUPERSEDED') OR lock_expires_at > now()
ORDER BY updated_at DESC LIMIT 100;

SELECT kind,state,count(*)::integer AS actions
FROM preview_release_action GROUP BY kind,state ORDER BY kind,state;

-- Metadata for independent remote reconciliation. No payload, recipients,
-- raw errors, URLs, or arbitrary evidence JSON.
SELECT source_sha,kind,state,remote_id,updated_at
FROM preview_release_action
WHERE state NOT IN ('FINISHED','REMOTE_OBJECT_UNAVAILABLE','CANCELED','CANCELLED')
ORDER BY updated_at DESC LIMIT 100;

SELECT platform,state,count(*)::integer AS notifications,
  count(*) FILTER (WHERE next_attempt_at <= now())::integer AS due
FROM preview_native_notification GROUP BY platform,state ORDER BY platform,state;

SELECT platform,state,count(*)::integer AS incidents
FROM preview_native_ownership_incident GROUP BY platform,state ORDER BY platform,state;

SELECT platform,source_sha,fingerprint,eas_build_id,app_version,build_number,
  submission_id,apple_build_id,testflight_distribution_id,delivered_at
FROM preview_delivered_native_state ORDER BY platform;

SELECT count(*)::integer AS conflicting_remote_id_groups FROM (
  SELECT kind,remote_id FROM preview_release_action WHERE remote_id IS NOT NULL
  GROUP BY kind,remote_id HAVING count(DISTINCT source_sha)>1
) conflicts;

ROLLBACK;

-- Limits are disclosure bounds, not proof of complete reconciliation. If any
-- bounded result reaches 100, use approved metadata pagination before claiming
-- completeness. An unfamiliar state remains unresolved, not successful. Match
-- remote IDs independently to exact Render/EAS project/SHA/profile/platform.
