-- Reconcile exactly one staging flight search using the preserved 2026-11-24
-- native-preview POST and contemporaneous verified iOS account-session evidence.
-- This is an evidence-correlated platform attribution, NOT device attestation or
-- proof that a specific authenticated session originated this search.
-- Do not modify search counting, identities, provider logs, or any other row.
DO $single_ios_search_attribution$
DECLARE matched integer;
BEGIN
  IF current_database() <> 'kurioticket_web_staging' THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO matched
  FROM "SearchHistory"
  WHERE id = 'cmwuj9qiz001l2dixwb4nu3nl'
    AND "requestId" = '4de077d2-c2b5-46fb-8770-14c3173d8d52'
    AND "createdAt" = TIMESTAMP '2026-11-24 10:09:57.131'
    AND type::text = 'FLIGHT'
    AND origin = 'ATL' AND destination = 'MCO'
    AND status::text = 'SUCCESS'
    AND "resultCount" = 209
    AND "countAsSearch" = TRUE
    AND "userId" IS NULL AND "visitorId" IS NULL
    AND query->>'environment' = 'staging'
    AND query->>'applicationSource' = 'UNKNOWN'
    AND query->>'operationalSessionId' = 'b6810cc4-80fe-41ac-92c8-b6da3bf20931';

  IF matched <> 1 THEN
    RAISE EXCEPTION 'Single iOS preview attribution guard failed: matched % rows', matched;
  END IF;

  UPDATE "SearchHistory"
  SET query = query
    || jsonb_build_object('applicationSource', 'IOS')
    || jsonb_build_object('historicalSearchReconciliation', jsonb_build_object(
      'version', '20261124-ios-preview-singleton-v1',
      'originalApplicationSource', 'UNKNOWN',
      'observedClient', 'KURIOTICKET_PREVIEW_APPLE_CFNETWORK',
      'sourceEvidence', 'MATCHED_PREVIEW_POST_WITH_TEMPORALLY_CORRELATED_IOS_ACCOUNT_SESSION',
      'attributionConfidence', 'CORRELATED_NOT_CRYPTOGRAPHICALLY_BOUND',
      'countingRule', 'ONE_SEARCH_ROW_PRESERVED'
    ))
  WHERE id = 'cmwuj9qiz001l2dixwb4nu3nl'
    AND "requestId" = '4de077d2-c2b5-46fb-8770-14c3173d8d52'
    AND query->>'applicationSource' = 'UNKNOWN';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Single iOS preview attribution update did not change expected row';
  END IF;
END $single_ios_search_attribution$;
