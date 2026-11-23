-- Correct every *evidence-backed* historical nearby-fare overcount in the
-- staging SearchHistory since the first recorded search, not just a 7/30 day
-- dashboard window. All original search/provider audit rows are preserved.
-- This migration NEVER changes applicationSource; automatic nearby-date
-- fan-out is not proof that a caller was a crawler.
--
-- Read-only preflight snapshot 2026-11-23 (May 21 onward):
-- 563 session-backed groups => 4,955 rows => 4,392 nearby children
-- 565 sessionless strict date-strip groups => 5,528 rows => 4,963 children
-- Combined: 1,128 parent searches; 9,355 child rows cease contributing to
-- search totals. Counted customer searches retain their original sources.
-- This correction is staging-only: production obtains no data changes.
BEGIN;

DO $alltime$
DECLARE
  session_groups integer;
  session_rows integer;
  legacy_groups integer;
  legacy_rows integer;
  child_rows integer;
  updated_rows integer;
  verified_children integer;
BEGIN
  IF current_database() <> 'kurioticket_web_staging' THEN
    RETURN;
  END IF;

  -- Prevent a concurrent write from changing a cohort between the baseline
  -- check and mutation. Public reads remain possible during the migration.
  LOCK TABLE "SearchHistory" IN SHARE ROW EXCLUSIVE MODE;

  CREATE TEMP TABLE historical_nearby_candidates ON COMMIT DROP AS
  WITH
  -- The newer web/native implementation assigned the same signed operational
  -- session to a main flight search and its nearby-date queries. A session is
  -- only eligible when *every* row has compatible traveler/query parameters,
  -- dates are consecutive, and there is no prior canonical correction.
  session_groups AS (
    SELECT query->>'operationalSessionId' AS sid,
      COUNT(*)::integer AS n,
      COUNT(DISTINCT type)::integer AS products,
      MIN(type::text) AS product,
      COUNT(DISTINCT COALESCE(origin,'(missing)') || '|' ||
                          COALESCE(destination,'(missing)'))::integer AS routes,
      COUNT(DISTINCT query->>'departureDate')::integer AS departure_dates,
      MIN(CASE WHEN query->>'departureDate' ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
               THEN (query->>'departureDate')::date END) AS min_departure,
      MAX(CASE WHEN query->>'departureDate' ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
               THEN (query->>'departureDate')::date END) AS max_departure,
      COUNT(DISTINCT CASE WHEN
           query->>'departureDate' ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
           AND query->>'returnDate' ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
           THEN (query->>'returnDate')::date - (query->>'departureDate')::date END)::integer
           AS return_offsets,
      COUNT(DISTINCT query->>'tripType')::integer AS trip_modes,
      COUNT(DISTINCT query - 'departureDate' - 'returnDate' - 'legs')::integer AS stable_queries,
      COUNT(DISTINCT COALESCE("userId",'(guest)'))::integer AS users,
      COUNT(DISTINCT COALESCE("visitorId",'(none)'))::integer AS visitors,
      MIN("createdAt") AS first_at,
      MAX("createdAt") AS last_at,
      COUNT(*) FILTER (WHERE NOT "countAsSearch")::integer AS previously_excluded
    FROM "SearchHistory"
    WHERE query->>'operationalSessionId' IS NOT NULL
    GROUP BY 1
  ),
  eligible_sessions AS (
    SELECT sid FROM session_groups
    WHERE n BETWEEN 4 AND 10
      AND products=1 AND product='FLIGHT' AND routes=1
      AND departure_dates=n AND max_departure-min_departure=n-1
      AND return_offsets<=1 AND trip_modes=1 AND stable_queries=1
      AND users=1 AND visitors=1
      AND previously_excluded=0
      AND last_at-first_at<=INTERVAL '60 seconds'
      AND last_at<TIMESTAMPTZ '2026-11-23T14:18:27Z'
  ),
  session_candidates AS (
    SELECT s.id, 'SESSION_NEARBY_DATES'::text AS method,
      ROW_NUMBER() OVER (PARTITION BY e.sid ORDER BY s."createdAt",s.id) AS rn,
      FIRST_VALUE(s.id) OVER (PARTITION BY e.sid ORDER BY s."createdAt",s.id) AS parent_id
    FROM "SearchHistory" s
    JOIN eligible_sessions e ON s.query->>'operationalSessionId'=e.sid
  ),
  -- Older SearchHistory rows had no operational session and no saved source.
  -- A 60-second bucket, matching traveler identity and *all* immutable query
  -- fields, plus 8-10 consecutive dates and a <20 second span, is deliberately
  -- conservative. Never infer BOT from these request patterns.
  older_base AS (
    SELECT s.id,s."createdAt",
      DATE_TRUNC('minute',s."createdAt") AS minute_bucket,
      COALESCE(s.origin,'(missing)') AS orig,
      COALESCE(s.destination,'(missing)') AS dest,
      COALESCE(s."userId",'(guest)') AS usr,
      COALESCE(s."visitorId",'(none)') AS vis,
      s.query - 'departureDate' - 'returnDate' - 'legs' AS stable_query,
      (s.query->>'departureDate')::date AS departure_date,
      CASE WHEN s.query->>'returnDate' ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
           THEN (s.query->>'returnDate')::date - (s.query->>'departureDate')::date END AS trip_days
    FROM "SearchHistory" s
    WHERE s.query->>'operationalSessionId' IS NULL
      AND s.type::text='FLIGHT'
      AND s."createdAt"<TIMESTAMPTZ '2026-10-24T00:00:00Z'
      AND s.query->>'applicationSource' IS NULL
      AND s."countAsSearch"=TRUE
      AND s.query->>'departureDate' ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
  ),
  older_groups AS (
    SELECT minute_bucket,orig,dest,usr,vis,stable_query,
      COUNT(*)::integer AS n,
      COUNT(DISTINCT departure_date)::integer AS dates,
      MIN(departure_date) AS min_dep,
      MAX(departure_date) AS max_dep,
      COUNT(DISTINCT trip_days)::integer AS trip_durations,
      MIN("createdAt") AS first_at,MAX("createdAt") AS last_at
    FROM older_base
    GROUP BY 1,2,3,4,5,6
  ),
  eligible_older AS (
    SELECT * FROM older_groups
    WHERE n BETWEEN 8 AND 10
      AND dates=n AND max_dep-min_dep=n-1
      AND trip_durations<=1
      AND last_at-first_at<INTERVAL '20 seconds'
  ),
  older_candidates AS (
    SELECT o.id, 'SESSIONLESS_STRICT_DATE_STRIP'::text AS method,
      ROW_NUMBER() OVER (
        PARTITION BY o.minute_bucket,o.orig,o.dest,o.usr,o.vis,o.stable_query
        ORDER BY o."createdAt",o.id
      ) AS rn,
      FIRST_VALUE(o.id) OVER (
        PARTITION BY o.minute_bucket,o.orig,o.dest,o.usr,o.vis,o.stable_query
        ORDER BY o."createdAt",o.id
      ) AS parent_id
    FROM older_base o
    JOIN eligible_older e
      ON o.minute_bucket=e.minute_bucket
     AND o.orig=e.orig AND o.dest=e.dest
     AND o.usr=e.usr AND o.vis=e.vis
     AND o.stable_query=e.stable_query
  )
  SELECT * FROM session_candidates
  UNION ALL
  SELECT * FROM older_candidates;

  IF EXISTS (
    SELECT 1 FROM historical_nearby_candidates
    GROUP BY id HAVING COUNT(*)<>1
  ) THEN
    RAISE EXCEPTION 'All-time migration candidate overlap; nothing updated';
  END IF;

  SELECT
    COUNT(DISTINCT parent_id) FILTER(WHERE method='SESSION_NEARBY_DATES'),
    COUNT(*) FILTER(WHERE method='SESSION_NEARBY_DATES'),
    COUNT(DISTINCT parent_id) FILTER(WHERE method='SESSIONLESS_STRICT_DATE_STRIP'),
    COUNT(*) FILTER(WHERE method='SESSIONLESS_STRICT_DATE_STRIP'),
    COUNT(*) FILTER(WHERE rn>1)
  INTO session_groups,session_rows,legacy_groups,legacy_rows,child_rows
  FROM historical_nearby_candidates;

  -- Fail closed on any drift in the historical cohort. This protects against
  -- replay, changing query semantics, or unreviewed edits to legacy records.
  IF session_groups<>563 OR session_rows<>4955
    OR legacy_groups<>565 OR legacy_rows<>5528 OR child_rows<>9355 THEN
    RAISE EXCEPTION 'All-time reconciliation baseline drift: session %/% legacy %/% children %',
      session_groups,session_rows,legacy_groups,legacy_rows,child_rows;
  END IF;

  UPDATE "SearchHistory" s
  SET "countAsSearch"=(c.rn=1),
      query=s.query || jsonb_build_object(
        'historicalNearbyReconciliation',jsonb_build_object(
          'version','20261123-alltime-v1',
          'method',c.method,
          'originalApplicationSource',COALESCE(s.query->>'applicationSource','(missing)'),
          'parentSearchHistoryId',c.parent_id,
          'isCanonicalSearch',c.rn=1,
          'parentSelection','EARLIEST_RECORDED_RESULT_NOT_PROVEN_USER_SELECTED_DATE',
          'rule','ONE_ORIGINAL_SEARCH_NOT_EACH_NEARBY_FARE_DATE'))
  FROM historical_nearby_candidates c
  WHERE s.id=c.id AND s."countAsSearch"=TRUE;
  GET DIAGNOSTICS updated_rows=ROW_COUNT;

  IF updated_rows<>10483 THEN
    RAISE EXCEPTION 'All-time reconciliation update row count %, expected 10483',updated_rows;
  END IF;

  SELECT COUNT(*) INTO verified_children FROM "SearchHistory"
  WHERE "countAsSearch"=FALSE
    AND query#>>'{historicalNearbyReconciliation,version}'='20261123-alltime-v1';

  IF verified_children<>9355 THEN
    RAISE EXCEPTION 'All-time reconciled child count %, expected 9355',verified_children;
  END IF;
END
$alltime$;

COMMIT;
