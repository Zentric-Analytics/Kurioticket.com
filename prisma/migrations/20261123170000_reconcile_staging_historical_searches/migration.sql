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
  WHERE current_database() = 'kurioticket_web_staging'
    AND s."createdAt" >= TIMESTAMPTZ '2026-11-16T14:27:53Z'
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
  AND current_database() = 'kurioticket_web_staging'
  AND s."countAsSearch" = TRUE
  AND s.query->>'applicationSource' = 'UNKNOWN';

-- Unambiguous one-to-one matches: single recorded HOTEL search with exactly
-- one Googlebot POST in the +/-2.5-second request-log correlation window.
-- These searches ran and remain counted once; only source attribution changes.
WITH singleton_evidence (search_id, old_source, crawler, recorded_at) AS (
  VALUES
    ('cmwjm1hpy003329gk988o4m7u', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-16T18:42:03.382Z'),
    ('cmwjmxy2b001r2ak4g4ft4u4d', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-16T19:07:17.555Z'),
    ('cmwjp3kcn000c1skq0x4sxq7c', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-16T20:07:38.951Z'),
    ('cmwk7woma000k2ak9t29tzy8t', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-17T04:54:10.594Z'),
    ('cmwkl9hkc00022ambgll7jg0t', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-17T11:08:02.988Z'),
    ('cmwknp37r000l2ahz31a19r7g', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-17T12:16:10.119Z'),
    ('cmwkohj4a000r2ahzllerj2hw', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-17T12:38:17.098Z'),
    ('cmwkpajv6000x2dhc8980j9ca', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-17T13:00:51.09Z'),
    ('cmwlb91qn003d1sjgmk4hnx1a', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-17T23:15:32.495Z'),
    ('cmwlb9gkp003g1sjg83fvvodz', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-17T23:15:51.721Z'),
    ('cmwlbw59j003j1sjguqpn1w4i', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-17T23:33:30.151Z'),
    ('cmwlcwkbs004r1sjg80vtv8s0', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-18T00:01:49.289Z'),
    ('cmwlhtqvw00721sjgeknm80pe', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-18T02:19:35.9Z'),
    ('cmwlkp2kc00891sjg4bghndjk', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-18T03:39:56.604Z'),
    ('cmwlkt5xs008c1sjgnpuehfad', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-18T03:43:07.6Z'),
    ('cmwlvsh2900022aj5utmtk1p5', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-18T08:50:31.137Z'),
    ('cmwn9sawf00022cjhvb476drv', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T08:10:03.951Z'),
    ('cmwnf38p500022akwdnx4bnbx', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T10:38:32.393Z'),
    ('cmwnfgu0f00022aju0vg0aaa9', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T10:49:06.543Z'),
    ('cmwng4yuz00072aju9l2etdi9', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T11:07:52.571Z'),
    ('cmwngxk27000a2ajutbrotdam', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T11:30:06.415Z'),
    ('cmwnhux0a000g2aju52due29v', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T11:56:02.842Z'),
    ('cmwni9aca000j2ajuv8fvw530', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T12:07:13.306Z'),
    ('cmwnitnri000n2ajufoleipdl', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T12:23:03.822Z'),
    ('cmwnvjrcd001l29kamugubn2q', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T18:19:16.909Z'),
    ('cmwnvjyhc001o29kaezy9n57z', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T18:19:26.16Z'),
    ('cmwo0k63q002l2aklhcwn4a2j', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T20:39:34.118Z'),
    ('cmwo0lgi9002o2akllf0obbv8', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T20:40:34.257Z'),
    ('cmwo0lrtx002r2aklgaj29423', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T20:40:48.933Z'),
    ('cmwo0m4ft002u2akl232t7pyj', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T20:41:05.273Z'),
    ('cmwo0o5o8002x2aklze4x540m', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T20:42:40.184Z'),
    ('cmwo0vubl00302akldifsxj64', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T20:48:38.721Z'),
    ('cmwo1vlz900372aklun849gqv', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T21:16:27.525Z'),
    ('cmwo2b471003a2aklk4t5tm65', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T21:28:30.973Z'),
    ('cmwo2r8pv005l2akl5ijrj33a', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T21:41:03.331Z'),
    ('cmwo4eygd007w2aklu0puvnvj', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T22:27:29.389Z'),
    ('cmwo4xfoj008n2aklb71f691s', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T22:41:51.523Z'),
    ('cmwo540p8008q2aklmzlaq8o9', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T22:46:58.7Z'),
    ('cmwo572oc008t2aklm3cynwl2', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T22:49:21.228Z'),
    ('cmwo6j7g400a02aklngrmit3l', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T23:26:46.9Z'),
    ('cmwo787zq00b72aklp22sjhsg', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-19T23:46:14.006Z'),
    ('cmwo90dqz00fn2aklbeypq657', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-20T00:36:07.451Z'),
    ('cmwomwcvu00j72akl7gy7uavb', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-20T07:04:54.33Z'),
    ('cmwooh4yv00jm2akl04x7pen3', 'UNKNOWN', 'GOOGLEBOT', TIMESTAMPTZ '2026-11-20T07:49:03.463Z')
)
UPDATE "SearchHistory" s
SET query = s.query || jsonb_build_object('applicationSource','BOT',
      'identifiedCrawler',e.crawler, 'crawlerEvidence','DECLARED_USER_AGENT',
      'historicalSearchReconciliation',jsonb_build_object(
        'version','20261123-v1','originalApplicationSource',e.old_source,
        'observedClient',e.crawler, 'sourceEvidence','EXACT_POST_LOG_MATCH',
        'countingRule','ONE_SEARCH_ROW_PRESERVED'))
FROM singleton_evidence e
WHERE current_database() = 'kurioticket_web_staging'
  AND s.id = e.search_id
  AND s."createdAt" = e.recorded_at
  AND s."createdAt" >= TIMESTAMPTZ '2026-11-16T14:27:53Z'
  AND s."createdAt" < TIMESTAMPTZ '2026-11-23T14:27:53Z'
  AND s.query->>'environment' = 'staging'
  AND s.query->>'applicationSource' = e.old_source
  AND s.type::text = 'HOTEL'
  AND s."countAsSearch" = TRUE;

COMMIT;
