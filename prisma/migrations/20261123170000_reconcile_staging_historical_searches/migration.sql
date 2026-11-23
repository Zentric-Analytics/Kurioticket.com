-- Historical Staging Search Activity reconciliation, reviewed against Render
-- request logs on 2026-11-23. Only the fixed, evidence-backed 7-day slice is
-- eligible. No customer/provider audit records are deleted.
-- Schema flag is TRUE for all other searches and all future environments.
BEGIN;
ALTER TABLE "SearchHistory" ADD COLUMN "countAsSearch" BOOLEAN NOT NULL DEFAULT TRUE;

-- Each row here is a SINGLE operational session whose SearchHistory contains
-- nearby-date fan-out. The manifest hashes are MD5 of the historical, otherwise
-- unpersisted signed session references; no IPs or user agents are committed.
-- GOOGLEBOT is declared UA evidence from matched request logs, not retroactive
-- DNS verification. OKHTTP-only sets remain UNKNOWN unless a matching native
-- API request from the same log source IP was also observed. No identity claim
-- is inferred from an absent device signal.
WITH manifest (session_hash, expected_count, source, observed_client, evidence) AS (
  VALUES
    ('ba4320b81ca9609f679df02e828d7bce', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('cc151e56ad2440cb8144a059488983e0', 10, 'UNKNOWN', 'ANDROID_HTTP_CLIENT', 'OKHTTP_REQUEST_UA_ONLY'),
    ('11337063f2cd20db03dc8cd4c26cc273', 10, 'UNKNOWN', 'GOOGLEBOT', 'GOOGLEBOT_8_OF_10_INCOMPLETE'),
    ('073961e6550cf5285920556645dbbc69', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('02b60b37d0b5f7a75b40e2222f67146c', 10, 'IOS', 'KURIOTICKET_PREVIEW_IOS', 'KURIOTICKET_PREVIEW_UA_10_OF_10'),
    ('7daaefdbb78ebca642df5ff93313cf38', 10, 'ANDROID', 'ANDROID_HTTP_CLIENT', 'OKHTTP_PLUS_SAME_IP_MOBILE_API'),
    ('005886de38891eee1420f6db313f33cc', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('f8b1343bf833b25bd90c487cf1666f1c', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('d5cb7801c9cab589f51a8ac886c10a62', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('9522fa1664be200a998c9c9b2ddd25d8', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('5a57e7e105a0545d809dccc4072fadff', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('2598f27f91ae3b21355c679f79d713c3', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('534b4ffeaf652b88a9f9ad4378444f12', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('7c0d3c4eade933a86513aa468cbde4a3', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('1bd5198dd5f8f3ae019f3dacf28eaf6f', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('c1f2d539092b67ca20c8d0d8de1af7a2', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('436be34b4feabb61b9fd2892345b9815', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('a9cc3b6e56e3ab2f34ee4ef5d50e4ce9', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('1ced5c1384d5041855cdc548989b9b42', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('597255d9e4cb05a81e4e3bd11ececa2e', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('6cf0b1c3fe2bc6902841cad69cca9a81', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('7f5db743a89c5154ba8b80b5354c1e3e', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('9ab92e5157cfe037eabb40ce54f88160', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('b8f69d8673efef40c36ebb2b621d72da', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('ebe3c0ea4d3fd5721220205c1dbad300', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('0d3400fc242f7f41c87a529903ebd217', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('2920edacd14413f5c9d754370c778cde', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('16c205be0cd91f489c0c5f6fce35483e', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('21bc0ca0cc147ad77c43d8284d9f279d', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('e6ae0dc79d1f1f10ef1cdd717092083a', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('a0a91efff3901f2374fb5e0829da21d2', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('3cbb869ba2d82b7e74c8058e391bd24b', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('62b7b904b8008b3a864621545d64e259', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('19fd6511ffdd9b8756a7699e48f28eac', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('9a01e93760861a0ca46302dfc1472e9a', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('6e3d2a9cd68de3f905d3187234df2b35', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('3d94586bbd99e7dbb18d79fc7dc4fca1', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('62cad9743a5da78c82ccec8b0790fe56', 10, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_10_OF_10'),
    ('dfdeebce98bdbe204ff29d82c7087fb7', 10, 'ANDROID', 'ANDROID_HTTP_CLIENT', 'OKHTTP_PLUS_SAME_IP_MOBILE_API'),
    ('29e61a082dc96f0b5aa67bc85638d750', 10, 'IOS', 'KURIOTICKET_PREVIEW_IOS', 'KURIOTICKET_PREVIEW_UA_10_OF_10'),
    ('10dd66c679ec43327153f7ef7ac690c1', 10, 'UNKNOWN', 'ANDROID_HTTP_CLIENT', 'OKHTTP_REQUEST_UA_ONLY'),
    ('79e52f9de5c8761817c8a4c92ae398f5', 10, 'UNKNOWN', 'ANDROID_HTTP_CLIENT', 'OKHTTP_REQUEST_UA_ONLY'),
    ('73260f17a87d5b1db15848d311bfb1a4', 6, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_ALL_MATCHING_REQUESTS'),
    ('f301df15c42f6104595a559f9dda396a', 7, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_ALL_MATCHING_REQUESTS'),
    ('c82160f9e0336f49b2c1db8af70cf974', 4, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_ALL_MATCHING_REQUESTS'),
    ('638d9486bf0158a41cd41de3f02c0dd1', 4, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_ALL_MATCHING_REQUESTS'),
    ('f200ab4837b085037a17b27f8ccb77bc', 6, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_ALL_MATCHING_REQUESTS'),
    ('445ac36ec8b5a58d465eb16560989e9c', 9, 'BOT', 'GOOGLEBOT', 'GOOGLEBOT_ALL_MATCHING_REQUESTS')
),
batches AS (
  SELECT md5(s.query->>'operationalSessionId') AS session_hash,
    COUNT(*)::int AS n,
    COUNT(DISTINCT s.query->>'departureDate')::int AS dates,
    COUNT(DISTINCT COALESCE(s.origin, '') || '|' || COALESCE(s.destination, ''))::int AS routes,
    COUNT(DISTINCT s.type)::int AS products,
    EXTRACT(EPOCH FROM MAX(s."createdAt")-MIN(s."createdAt")) AS span
  FROM "SearchHistory" s
  WHERE s."createdAt" >= TIMESTAMPTZ '2026-11-16T14:27:53Z'
    AND s."createdAt" < TIMESTAMPTZ '2026-11-23T14:27:53Z'
    AND s.query->>'environment' = 'staging'
    AND s.query->>'applicationSource' = 'UNKNOWN'
  GROUP BY 1
),
eligible AS (
  SELECT m.* FROM manifest m JOIN batches b ON b.session_hash = m.session_hash
  WHERE b.n = m.expected_count
    AND b.dates = b.n AND b.routes = 1 AND b.products = 1
    AND b.n BETWEEN 4 AND 10 AND b.span <= 60
),
ranked AS (
  SELECT s.id, e.source, e.observed_client, e.evidence,
    ROW_NUMBER() OVER (PARTITION BY e.session_hash ORDER BY s."createdAt",s.id) AS rn,
    FIRST_VALUE(s.id) OVER (PARTITION BY e.session_hash ORDER BY s."createdAt",s.id) AS parent_id
  FROM "SearchHistory" s JOIN eligible e
    ON md5(s.query->>'operationalSessionId')=e.session_hash
  WHERE s."createdAt" >= TIMESTAMPTZ '2026-11-16T14:27:53Z'
    AND s."createdAt" < TIMESTAMPTZ '2026-11-23T14:27:53Z'
    AND s.query->>'environment' = 'staging'
    AND s.query->>'applicationSource' = 'UNKNOWN'
)
UPDATE "SearchHistory" s
SET "countAsSearch" = (r.rn = 1),
    query = s.query
      || jsonb_build_object('applicationSource',r.source)
      || jsonb_build_object('historicalSearchReconciliation',
          jsonb_build_object(
            'version','20261123-v1', 'originalApplicationSource','UNKNOWN',
            'observedClient',r.observed_client,
            'sourceEvidence',r.evidence,
            'parentSearchHistoryId',r.parent_id,
            'isCanonicalSearch',r.rn=1,
            'countingRule','ONE_PARENT_SEARCH_PER_NEARBY_BATCH'))
FROM ranked r
WHERE s.id = r.id
  AND s."countAsSearch" = TRUE
  AND s.query->>'applicationSource' = 'UNKNOWN';

-- Exact, timestamp-correlated singleton search corrections are appended below.
COMMIT;
