# Admin search source and verified-crawler policy

## Classification

Search Activity and Overview must distinguish **application origin** from **verified crawler identity**.

- `WEB`: validated web account session, same-origin Fetch Metadata, or previously server-signed same-origin operational search session. Includes desktop and mobile web.
- `IOS` / `ANDROID`: authenticated mobile session provenance or server-signed, platform-bound guest operational session.
- `BOT` (displayed as **Bots**): a main search that actually reaches the search execution pipeline after its request IP and Googlebot/Bingbot user agent are verified through forward-confirmed reverse DNS. This category must be set server-side, never from a client claim or a missing platform header.
- `UNKNOWN` (displayed as **Unverified**): a search without trustworthy platform or verified crawler evidence. Missing device information does not establish bot identity. Historical unknown rows are unchanged.

A declared crawler user-agent by itself does not qualify as `BOT`. The existing verification uses the trusted ingress IP, approved Google/Bing crawler DNS hostnames, and a forward-confirmed IP match. DNS failures or timeouts leave the request unverified; they do not grant bot status.

## Execution and counting

Verified Googlebot and Bingbot requests are **not blocked by crawler classification**. The regular flight, hotel, car and package request pipelines handle these requests. Feature controls, validation, rate limits, and downstream provider responses remain in effect for all callers.

**One executed main search = one SearchHistory record** (subject to the existing request-ID idempotency); verified bot requests use `SearchHistory.query.applicationSource = "BOT"` and `SearchHistory.query.verifiedCrawler`. A search that ran but returned unavailable provider results is recorded as FAILED. Requests rejected before execution by validation, feature controls or rate limits are not counted as bot searches. Bots do not acquire guest operational sessions or customer identities; bot searches do not create customer engagement AnalyticsEvent writes.

- `POST /api/flights/search`: one main flight search (one BOT SearchHistory row).
- `POST /api/flights/nearby-fare`: optional nearby-date comparisons belong to the main search, and **never create a SearchHistory row**, even for a verified crawler. One flight search plus nine nearby-fare requests counts as **one** search.
- `POST /api/hotels/search`: one hotel search.
- `POST /api/cars/search`: one car search.
- `POST /api/packages/search`: one package search for the parent orchestration, not additional bot searches for each flight/hotel/car component.

The Overview **Bots** tile, All Platforms, Platform Health, and Search Activity are sourced from the same persisted `SearchHistory` records. `BOT` contributes to All Platforms but is disjoint from Website, iOS, Android and Unverified. The Bots tile opens Search Activity filtered to `BOT`.

## Historical attempts

The old `ApiProviderLog.service = "crawler-blocked-search"` entries are historical **blocked attempts**, not executed searches. They remain in audit history but are **not** included in the Bots tile, All Platforms or current search activity. Do not migrate, re-label, or inflate these entries as if they had executed. Provider-call metrics still exclude the historical crawler-blocked-search ledger.

## Privacy and safeguards

A bot classification does not authorize access to user accounts, saved data, traveler identities, or protected endpoints. It does not bypass normal product feature gates, search validation, rate limits or external provider access restrictions. No client-supplied user ID, native-platform header or bare user-agent is sufficient for BOT attribution.

References: Google crawler verification (https://developers.google.com/crawling/docs/crawlers-fetchers/verify-google-requests) and Bingbot verification (https://www.bing.com/webmasters/help/how-to-verify-bingbot-3905dc26).
