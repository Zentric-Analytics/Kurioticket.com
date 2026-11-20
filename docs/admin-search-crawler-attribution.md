# Admin search source and verified-crawler policy

## Classification contract

Search Activity and Platform Health must distinguish **application origin** from **crawler identity**.

- `WEB`: validated web account session, same-origin Fetch Metadata, or a previously issued, server-signed same-origin operational web search session. A freshly prepared session from an Origin header alone does not qualify. Includes desktop and mobile browsers.
- `IOS` and `ANDROID`: authenticated mobile session provenance or a server-signed, platform-bound v2 operational search session for guests. No analytics consent is required for essential operational attribution.
- `UNKNOWN` (displayed to administrators as **Unverified source**): no trustworthy platform proof. It **must not** be labeled a crawler, WEB, Android or iOS merely because of user-agent or IP shape.
- **Verified crawler:** independent request-origin classification. Only an identifying Googlebot/Bingbot user-agent **and** forward-confirmed reverse DNS for its connecting IP qualify. Claimed crawler headers are not enough. Unverified or unavailable DNS fails open for human search behavior.
 
The system does not use `UNKNOWN` as a synonym for crawler. A dedicated aggregate records verified crawlers; it is deliberately separate from the application-source filter.

## POST search protection

The server checks verified crawler identities before paid provider execution, SearchHistory creation or AnalyticsEvent writes on:

- `POST /api/flights/search`
- `POST /api/flights/nearby-fare`
- `POST /api/hotels/search`
- `POST /api/cars/search`

These endpoints return HTTP 403 with `CRAWLER_SEARCH_BLOCKED` only after successful DNS verification. Public website GET pages, `robots.txt`, public images and indexing remain unaffected.

Verified blocked attempts are recorded through the existing `ApiProviderLog` ledger under service `crawler-blocked-search` with **only** product, crawler kind and environment. No IP, user-agent, customer identity, URL, route or search payload is written. These records are excluded from platform provider-call health totals and customer-search counts; Platform Health shows their count for the selected window as a separate shared operational observation.

DNS verification is bounded to 2.5 seconds for **claimed crawler** requests only, with short negative and 30-minute positive cache. It is not performed for ordinary web/native requests. DNS failures do not generate an authenticated crawler classification.

References: Google's crawler verification guidance (https://developers.google.com/crawling/docs/crawlers-fetchers/verify-google-requests) and Microsoft's Bingbot verification guidance (https://www.bing.com/webmasters/help/how-to-verify-bingbot-3905dc26). Crawler providers without an approved forward-confirmed reverse DNS policy remain unverified.

## Historical records and correctness

Existing `SearchHistory.query.applicationSource = 'UNKNOWN'` entries are kept **unaltered**. They cannot be safely transformed into verified crawlers or native/web users using stored route, time, request count, operational session UUID or bare user-agent alone. The November 19–20 staging review found many Googlebot-*claimed* requests in infrastructure logs and historical native searches sharing this raw label. Neither source-log adjacency nor a claimed user-agent establishes a record-level audit-grade backfill.

Never edit raw SearchHistory rows or collapse ten old searches in place solely to make dashboards look cleaner. Retain complete provider, search and audit history, and investigate attribution anomalies with consent and ownership preserved.

## Test invariants

- Real Android/iOS signed sessions and server-verified web requests retain their source.
- A forged native header, invalid token or unverified crawler request cannot claim a platform or bot identity.
- A verified crawler never triggers customer-search history, optional customer analytics or provider execution.
- Blocked-crawler totals are reported separately; Platform Health and Search Activity customer counts remain consistent.
- No changes to native builds, providers, feature controls, application routes, consent or permissions.
