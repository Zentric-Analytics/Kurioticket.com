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

Rejected, blocked or invalid requests do not count. An executed search with no provider availability is recorded once with its actual result status. Bot searches are included in **All Platforms** but are separate from Website, iOS, Android and Unverified. The Bots tile opens Search Activity filtered to BOT. Merely loading a page or public resource—even thousands of times—never increments Bots.

Bot searches do not create fake customer identities, operational guest sessions or human engagement events. Classifying a bot does not permit it to access accounts, private records, or privileged endpoints.

## Historical attribution

Before the 2026-11-23 deployment, only DNS-verified Googlebot/Bingbot could receive the BOT source. Earlier records may include declared PerplexityBot, GoogleOther or Meta traffic under WEB/UNKNOWN. Retrospective classification requires **evidence for each specific search**: matched request logs or retained verified evidence, plus careful separation from native `okhttp` and `KurioticketPreview` clients.

Historical ten-date batches must be reduced to one parent search for customer-facing counts *without deleting the individual provider audit evidence*. Never move every UNKNOWN record to BOT based solely on timing, session presence, device gaps or a crawler-like pattern. Historical `crawler-blocked-search` attempts remain attempted requests, not searches, and must never be backfilled into `SearchHistory` as successful or completed searches.

Only platform-origin and crawler-evidence semantics are changing here. No operational event grants an authorization privilege.

See [Google crawler verification](https://developers.google.com/crawling/docs/crawlers-fetchers/verify-google-requests) and [Bingbot verification](https://www.bing.com/webmasters/help/how-to-verify-bingbot-3905dc26).
