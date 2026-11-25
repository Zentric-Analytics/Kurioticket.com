# Admin search platform attribution: Bots, Website, iOS and Android

## How a search is classified

- `WEB`: proven web account/session transport.
- `IOS` and `ANDROID`: authenticated or server-signed native transport.
- `BOT` (**Bots**): an *executed main search* from an identifiable crawler. Googlebot and Bingbot use forward-confirmed reverse DNS when available. Other identifiable crawler signatures include PerplexityBot/Perplexity-User, GoogleOther, Meta web indexer, Facebook external fetchers, Claude, ChatGPT, Applebot, DuckDuckBot, Bingbot, and other recognizable bot/crawler/spider User-Agent tokens.
- `UNKNOWN` (**Unverified**): records without trustworthy source information. Missing device data, a missing session or a nearby-date pattern alone **does not prove bot traffic**.

Bot attribution is **not authentication**. The `SearchHistory.query` JSON includes `identifiedCrawler` and `crawlerEvidence`:
- `VERIFIED_DNS`: DNS-verified Googlebot/Bingbot. Preserves the `verifiedCrawler` field.
- `DECLARED_USER_AGENT`: recognizable bot signature without DNS proof. No code path may portray this as DNS-verified or use it to grant permissions.

Signed-in session cookies, Authorization or native platform headers prevent User-Agent-only bot attribution. Native client signatures such as `okhttp`, `CFNetwork` and `KurioticketPreview` are not bots.

## Search counts: one main search equals one record

Verified and declared-identifiable crawlers may execute ordinary travel searches, subject to the exact same feature controls, validation and rate limits as users. Only main searches that reach provider-search execution are stored under BOT in `SearchHistory`.

- Flight search: one main `/api/flights/search` search.
- Nearby fares: the nine additional date lookups are internal comparisons and **never counted** as separate searches.
- Hotel or car search: one main search each.
- Package search: one parent search, never one per flight/hotel/car component.

Rejected, blocked or invalid requests do not count. An executed search with no provider availability is recorded once with its actual result status. In Search Activity, **All platforms** includes bot searches and searches with no recorded source. The Website, iOS and Android filters show searches attributed to those platforms. The Bots tile opens Search Activity with the Bot identity filter, and the Overview link for unverified platform searches opens the legacy missing-source view. Merely loading a page or public resource—even thousands of times—never increments Bots.

Bot searches do not create fake customer identities, operational guest sessions or human engagement events. Classifying a bot does not permit it to access accounts, private records, or privileged endpoints.

## Historical staging reconciliation (2026-11-16 through 2026-11-23)

The one-time migration `20261123170000_reconcile_staging_historical_searches`
only corrects the audited staging database `kurioticket_web_staging`, using
individual request-log evidence. No production historical rows are changed;
the `countAsSearch` schema field defaults to `true` everywhere.

For the fixed seven-day audit window, 602 former Unknown rows were reviewed.
Exactly 48 bounded, single-route, consecutive-nearby-date batches contain 456
rows. Each batch keeps its earliest recorded parent as `countAsSearch=true`;
the remaining **408 child rows** become `countAsSearch=false`. Every row and
provider audit log remains in the database, with its original request ID and
search criteria intact. A `historicalSearchReconciliation` JSON annotation
records the original source, matching request-log evidence, canonical parent
reference, and correction version. Direct detail links can still inspect a
child; Overview and Search Activity list/summary count only canonical rows.

Of the 48 batches, 40 have sufficient Googlebot request evidence for source
`BOT`, 2 match the Kurioticket iOS Preview client, and 2 have both okhttp and
same-source-IP native Android API evidence. Four batches remain `UNKNOWN`,
including three okhttp-only batches and one partial Googlebot log match; there
is not enough evidence to assert their platform. Their ten-to-one count
correction is independent of claiming bot or native source.

Separately, 44 hotel search rows and 13 flight search rows with
timestamp-correlated request evidence have attribution corrected (53 BOT and 4
iOS among those 57). This includes an executed PerplexityBot search previously
under Website; GoogleOther / Bingbot matches are recorded as declared evidence
where the exact bot subtype could not be confirmed. Meta has no confirmed
executed travel search in the inspected window and is not given invented
historical counts.

The corrected snapshot *for exactly that original fixed window*, if the
pre-deployment source population remains unchanged, is **427 canonical
searches** (126 Website, 59 iOS, 55 Android, 93 Bots, 94 Unverified).
A rolling seven-day dashboard viewed later can differ. The migration includes
a staging-only exact-baseline guard and a post-update expected-row guard, and
fails rather than silently applying if evidence has drifted.

Reconciliation metadata uses `DECLARED_USER_AGENT` for historical log claims,
not retroactive DNS verification. A missing device or anonymous guest session
does not justify a BOT classification, and historical blocked attempts are
never turned into completed searches.

## Historical attribution

Before the 2026-11-23 deployment, only DNS-verified Googlebot/Bingbot could receive the BOT source. Earlier records may include declared PerplexityBot, GoogleOther or Meta traffic under WEB/UNKNOWN. Retrospective classification requires **evidence for each specific search**: matched request logs or retained verified evidence, plus careful separation from native `okhttp` and `KurioticketPreview` clients.

Historical ten-date batches must be reduced to one parent search for customer-facing counts *without deleting the individual provider audit evidence*. Never move every UNKNOWN record to BOT based solely on timing, session presence, device gaps or a crawler-like pattern. Historical `crawler-blocked-search` attempts remain attempted requests, not searches, and must never be backfilled into `SearchHistory` as successful or completed searches.

Only platform-origin and crawler-evidence semantics are changing here. No operational event grants an authorization privilege.

See [Google crawler verification](https://developers.google.com/crawling/docs/crawlers-fetchers/verify-google-requests) and [Bingbot verification](https://www.bing.com/webmasters/help/how-to-verify-bingbot-3905dc26).


## All-time history audit and nearby-date count correction

The dashboard must represent the complete search ledger dating from **2026-05-21**.
The previous staging backfill corrected only a fixed seven-day cohort and
excluded 408 historical nearby-date child records. The follow-on migration
`20261123180000_alltime_nearby_fare_search_counts` evaluates **all earlier
recorded search history** (not a rolling seven- or thirty-day UI window),
including records that predate application-source and operational-session
capture.

**Read-only audit baseline (2026-11-23):** 50,046 raw SearchHistory rows,
49,638 currently counted after the earlier 408 child exclusions, and 49,169
canonical rows with no recorded application source. Existing BOT rows: 103.
These snapshot figures change as genuine new searches are recorded.

Two conservative, disjoint historical patterns qualify for **count-only**
correction:

1. **Session-backed date-strip fan-out:** 563 operational-session groups,
   4,955 rows. Each group has 4–10 consecutive departure dates within one
   minute, one product and route, identical nondate query parameters and
   owners, consistent return-date offsets, and no previously excluded rows.
   Retain 563 counted parent records; exclude 4,392 date-comparison children.
   Only groups recorded before the fix for nearby-date logging went live
   (2026-11-23 14:18:27 UTC) are eligible.
2. **Older records without session references:** 565 date-strip clusters,
   5,528 rows. Records must be 8–10 consecutive departure dates, same minute,
   same route/traveler/query attributes, and recorded less than 20 seconds
   apart. Retain 565 counted records; exclude 4,963 children. Because no
   session identifier exists, the grouping is explicitly **pattern-inferred**;
   no source attribution or original user-selected departure date is claimed.

**Total potential change:** 1,128 counted searches instead of 10,483 raw
entries, suppressing **9,355 additional duplicate contributions** without
deleting or rewriting the individual provider/search audit rows. The
all-time baseline would be 40,283 canonical searches if the audited cohort
remains unchanged, plus any subsequent genuine new searches. This is a
pre-deployment projection, **not a verified deployed number**.

The migration changes only `countAsSearch` and writes
`historicalNearbyReconciliation` metadata for audit. It **never changes
`applicationSource`**. The first completed record is retained for stable
linking but may not represent the exact departure date originally selected
by the customer; the metadata says so. It refuses to proceed if its
staging-only preflight row counts drift, and fails the transaction if the
post-update count differs. On production, no existing rows are modified.

**Historical Bots are not reconstructed from repetition alone.** Before
source recording, SearchHistory and provider logs lacked persisted User-Agent
or verified crawler evidence. Render's request-log retention is insufficient
to prove all older crawler identities. Such records must stay Unverified
until corroborating source-specific evidence is available. "Nearby fare
automation" is frontend behavior, not evidence that Googlebot, Perplexity,
Meta or another crawler initiated the parent search.
