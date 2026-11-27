# Essential-only behavior and verification

Status: **in progress; not a complete Essential sign-off**. Initial inspection: 27 November 2026. Source baseline: `4fbd78355c9a92acbdc1650109d2de14860cc2d5`.

## Goal and order

Verify the categories in this order: **Essential, Analytics, Performance, Marketing**. Finish the defined acceptance work for one category before enabling or redesigning the next. Each optional category must eventually have its own purpose, decision, collectors, withdrawal behavior and tests. Essential services remain the shared foundation; independent optional categories must not silently enable each other.

This phase begins with desktop web, then checks the same Essential contract on mobile web and the installed Android/iOS clients. Code fixtures do not establish physical-device acceptance. Performance and Marketing currently display **Not available** and have no independent switches in the existing consent presentation. That state is not a completed implementation of those categories.

## Expected Essential behavior

Essential means functionality needed for a requested service and its security, with a specific purpose and bounded storage. A record useful to an administrator is not automatically an essential browser identifier. Browser storage, service-side operational records and optional behavioral analytics must be assessed separately.

| Area | Expected behavior with optional categories off |
| --- | --- |
| Authentication and security | Sign-in, CSRF/OAuth protection, verified account access, session expiry and sign-out keep working. An account session never substitutes for Analytics consent. |
| Consent choice | Remember a refusal without creating a returning-visitor analytics identity. Refusal takes effect immediately, including while a server withdrawal is retrying. |
| Requested searches | Flight, hotel and car searches can complete or display a truthful failure. Necessary operational records are independent of optional telemetry. |
| Provider continuation | A user-requested provider handoff can continue and have a necessary operational record. An exact search reference may be carried for that operation; it must not create an optional journey without consent. |
| Account operations | Confirmed saves/removals, alerts, signup and support may have narrowly allowlisted account audit records. Arbitrary page/filter/share events must not enter that writer. |
| Online status | The separate operational presence system can report a currently active visitor. Its short-lived memory credential must not become a persistent returning-visitor identifier. |
| User-requested state | Keep the current search or explicitly requested saved item usable. Assess persistent convenience history and automatically inferred preferences separately; do not classify every existing storage write as Essential. |
| Optional behavior tracking | No optional page-view, results-view, filter/sort/edit/share or detailed journey collection without verified consent. A visible sign-in alone must not enable it. |
| Storage/network failure | Blocked storage, quota errors, malformed preference values or a failed consent request must not cause unrelated controls to crash or silently grant consent. A failed persistence operation is not proof a setting was remembered. |

An Essential-only visitor can therefore be **Online with no recorded page/journey history**. The Users section must preserve that distinction. Neither an empty activity list nor a row in a table named `AnalyticsEvent` is sufficient evidence of a consent failure: the existing allowlisted Essential account audit writer shares that physical table.

## Actual implementation found

- `src/components/privacy/AnalyticsConsentBridge.tsx` keeps an unsaved suggested Analytics choice separate from confirmed permission. Refusal writes `kt_analytics_denied` immediately, invalidates observers and requests server withdrawal. Failure is reported and retried; it is not reported as success.
- `src/services/requestActivityIdentity.ts` keeps independently verified account identity after a refusal while removing visitor attribution. `visitorActivityIdentity.ts` rechecks consent and ownership in the writer transaction.
- `src/services/operationalActivityService.ts` and `operationalAccountAuditService.ts` separate necessary records from optional events. `providerHandoffActivity.ts` retains the operational redirect while skipping optional event/journey work without a visitor.
- `src/components/auth/WebsiteOnlinePresence.tsx` uses `/api/identity/online-presence` independently of Analytics. Its credential is memory-only, coordinated between active same-origin tabs. The 30-second heartbeat and 90-second live window are distinct from best-effort physical cleanup.
- `/api/identity/presence` is a different, optional public-site heartbeat in `AnalyticsConsentBridge`. It requires saved and server-confirmed permission. Do not conflate these two endpoints.
- `src/components/privacy/JourneyEventsProvider.tsx` and the page/journey endpoints require consent for optional observations. Restoring a current search's UI state is distinct from reporting a filter change as an analytics event.

## Browser storage inventory

This is a source inventory, not a claim that every key was observed in a fresh live browser. Installed authentication-library defaults were inspected as well as application writers. Third-party infrastructure and native secure storage still require their own runtime checks.

| Storage | Current purpose and trigger | Current lifetime / boundary |
| --- | --- | --- |
| NextAuth session, callback, CSRF and OAuth cookies | Requested authentication and its protection | Session policy is 8 hours; secure defaults use HttpOnly, SameSite=Lax and Secure on HTTPS. PKCE/state defaults are 15 minutes. Individual defaults must be checked in the actual response. |
| `kt_search_session` | Issued after a requested search; exact operational continuity | 30 minutes, HttpOnly, SameSite=Lax, Path=/api, Secure in production runtime, signed and environment bound. Not issued on ordinary page load. |
| `kt_analytics_denied` | Remembers refusal and blocks optional attribution | One year, host cookie, SameSite=Lax, Secure on HTTPS; browser-readable, contains no identity. |
| `kurioticket:analytics-consent:v1` | Explicit granted/declined choice | LocalStorage; denial marker takes precedence over a stored grant. |
| `kt_visitor` | Optional returning-visitor Analytics identity | One year, HttpOnly, SameSite=Lax; consent gated. It is not an Essential identity. |
| Locale, currency and region override cookies/storage | Explicit selection or account-preference synchronization | Cookies currently last one year; corresponding localStorage values have no independent TTL. Non-secret client-readable preferences. |
| `ct_region` / `kurioticket_region` | Automatically detected region, also updated after explicit selection | One-year cookies plus localStorage. Automatic persistence needs an explicit purpose/retention decision. |
| Recent searches and remember flag | Convenience recall after searches, independent of Analytics | Default enabled unless disabled; up to 10 displayed entries and 90-day logical retention. Category/trigger decision remains open. |
| Recent car locations | Convenience recall after location selection | Up to 3 entries; no date expiry in its reader. Category/retention decision remains open. |
| Guest saved items / hotels / saved recent searches | Explicit save action | LocalStorage with legacy migration paths; no universal expiry. Verify failure messaging and removal independently of account-backed saves. |
| Authenticated idle coordination | Current account activity/logout coordination across tabs | LocalStorage timestamps; 15-minute client inactivity policy with memory fallback. Separate from the 8-hour session limit. |
| Flight results snapshot / return view | Return to a requested result selection | SessionStorage, 30-minute limits plus provider freshness checks. |
| Results scroll / return intent | Current navigation continuity | SessionStorage, generally 10 minutes; a flight return intent can last up to 24 hours. |
| Mobile-web hotel return state | Restore the requested hotel results view | SessionStorage, 30 minutes, consumed on return. |
| Deals trip plan / runtime / handoff | Requested trip-plan and result continuity | Local/session storage with validated plan/provider expiry; legacy plan limit 25 minutes. |
| Sandbox search/offer continuity | Requested sandbox provider operation | Scoped HttpOnly sandbox session cookie; offer snapshot sessionStorage up to 30 minutes, prohibited on the production public host. |
| Optional journey selection context | Consented interaction continuity | SessionStorage, actor checked, 30 minutes; permission gated. |
| Operational handoff references | Exact actor/product/result/request mapping | Memory only, maximum 64 references, 30 minutes, cleared on actor change. |
| Operational presence credential | Current online session, shared across active tabs | Memory only, signed, 30 minutes with renewal; no new cookie/localStorage/sessionStorage. |

Primary source locations: `src/lib/auth.ts`, `account-session.ts`, `operationalSearchSession.ts`, `analyticsConsentClient.ts`, `visitor-identity.ts`, `preferences/preferences.ts`, `recent-searches.ts`, `cars/recentCarLocations.ts`, `saved-items-local.ts`, `flights/flightResultsSessionCache.ts`, `results/resultsReturnIntent.ts`, `operationalHandoffContext.ts`, `websiteOnlinePresenceClient.ts`, and their production callers.

### Native foundation: source inspection only

Android/iOS account sessions use Expo SecureStore with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, rather than the website's HttpOnly cookies. The existing server policy is 30 days for mobile sessions versus 8 hours for web; that difference is not itself a defect. Native operational search and presence credentials stay in memory and are cleared with account-boundary changes. Foreground presence uses its separate endpoint independently of Analytics permission; optional identity begins unknown and requires a saved, confirmed grant with the matching account context.

Native controls also show Essential as always active and Performance/Marketing as unavailable. The public mobile website, an Expo web preview and an installed native app are distinct verification targets. In particular, a web preview does not test SecureStore, and a responsive desktop fixture does not establish native cold-restart, expiry, revocation, background/foreground or storage-denial behavior.

Inspected source: `apps/mobile/src/storage/sessionStorage.ts`, `apps/mobile/src/api/travelApi.ts`, `apps/mobile/src/features/privacy/useNativePresence.ts`, `nativePresenceClient.ts`, `visitorIdentityCoordinator.ts`, `AnalyticsConsentControl.tsx`, and `src/lib/account-session.ts`. No additional native defect was established sufficiently to justify a change in this phase. Staging-specific history-enrichment headers and actual installed build versions remain runtime acceptance items.

## Verified defects and bounded repairs

The initial isolated reproduction imported the real production helpers. A throwing `window.localStorage` getter caused six preference getters/setters and both saved-item helpers to throw `SecurityError`. A malformed percent-encoded locale cookie caused `getStoredLocale` to throw `URIError`.

The affected preference helpers are invoked from provider hydration and user-selection handlers. `LocaleProvider` also had its own unguarded storage reads. The saved-item availability check evaluated the throwing getter before entering its existing try/catch.

Mounted ReactDOM/JSDOM tests then established the provider failures and an additional unguarded debug-flag read in the actual country/currency control. The bounded repair makes storage access and malformed-value recovery safe, preserves normal preference precedence, legacy keys, SSR hydration and current-document selections, and retains readable legacy saved items when migration cannot write. It does not decide the outstanding retention/category questions or change consent into a grant.

The real mounted guest flight-save hook then reproduced a separate failed-write outcome: no item was persisted, no error was shown, and `local_saved` was emitted. The existing storage-sync event reset that hook's button, so the demonstrated problem was missing feedback and a false success action rather than a permanently incorrect button label. The storage writer now returns success/failure; all four production callers update state and emit success only after persistence succeeds. Failed saves/removals keep their previous state and use the existing error UI. The signed-in backend paths are unchanged.

A separate historical-reader probe found that a linked Essential account action can disappear after its optional canonical journey becomes ineligible, while a direct-account optional SHARE remains visible. The actual save, removal and alert writers and production linkers reproduced the linked Essential state; this was not assumed from manually fabricated metadata. The reader now retains a verified direct-account Essential action unless its exact canonical replacement is currently eligible in the same view. It validates the unique event key, type, stored journey/search IDs, consent, owner, environment and source references inside the existing snapshot. Page filling, complete history and counts share the same projection; replacement lookup does not inherit the pagination cursor.

That repair changes display eligibility only. It does not delete records, remove historical links or grant tracking permission. The separate historical optional SHARE inconsistency remains a policy question for the later Analytics phase; no historical optional record has been reclassified as Essential.

## Evidence and remaining acceptance work

| Check | Evidence / status |
| --- | --- |
| Consent decision, identity lifecycle, search/operational separation | Initial focused local run: 159 tests passed, 0 failed, 0 skipped. Tests include dependency fixtures/in-memory transactions; they do not constitute live database acceptance. |
| Operational versus optional presence | Dedicated source trace and existing client/route tests cover independent memory credentials, origin/platform boundaries and consented optional presence. |
| Blocked storage and malformed cookie | Actual production-function and mounted ReactDOM/JSDOM failures reproduced before repair; mounted recovery succeeds afterward. Thirteen focused helper/SSR tests pass. Five actual component-browser cases are included for CI; the local Chromium binary is unavailable. |
| Truthful guest saves/removals | Actual mounted hook and four actual production handlers reproduce the failed-write issue before repair. After repair, blocked/quota writes show an error and emit no success; normal storage still saves/removes. The focused handler/helper/contract batch passes 22 tests. Five additional Chromium hook cases are included for CI. Counts overlap with the earlier helper batch. |
| Actual PostgreSQL search/handoff ownership and optional-write rejection | Existing `scripts/search-journey.integration.ts` contains Essential-only cases and exact correlation assertions. The existing Hotel search resilience CI runs it against disposable localhost PostgreSQL. Record the exact candidate run result before release. |
| Cookie presentation/reload browser tests | Existing `qa/mobile-web/tests/cookie-consent.spec.ts` mocks identity endpoints. Useful UI evidence; not proof of real withdrawal, cookie persistence or database behavior. |
| Live Essential-only desktop journey | Still required: fresh guest and registered account, real refusal, reload/new tab, requested search, safe provider continuation, online status, optional-write absence, logout/account change and retry. Use test identities and safe provider fixtures. |
| Mobile web and installed Android/iOS | Still required for Essential sign-off on those surfaces. Responsive source fixtures cannot replace installed-client evidence. |
| Persistent preference/convenience contract | Still required: explicitly classify automatic region, recent-search memory and recent-car-location persistence; document triggers and retention before changing behavior. |
| Essential account visibility after withdrawal | Actual writers/linkers and reader reproduce the loss before repair. Seven new regression groups pass afterward, including 521 mixed actions paginated in both directions, exact counts, invalid/foreign links, filtering, withdrawal/reassignment and lookup failure. The focused reader/helper suite passes 79 tests. Real PostgreSQL replacement-query evidence is required from the candidate CI integration case. |
| Historical optional account activity visibility | A direct-account optional SHARE remains visible after withdrawal while optional page/journey sources are hidden. Preserve existing records while defining a consistent historical-read rule in the Analytics phase; this observation does not prove new collection after refusal. |
| Live third-party storage/network inventory | Still required: observe the real deployed responses and requests without exposing credentials. Source absence alone cannot certify infrastructure behavior. |

The earlier `essential-recording-phase-2.md` explicitly describes initial separation rather than complete certification. Keep that limit until this acceptance record has evidence for every applicable gate.

## How each category will be completed

1. Define purpose, required user-facing behavior, exact data/storage, trigger and lifetime.
2. Trace actual clients, endpoints and writers. Reproduce a discrepancy before fixing it.
3. Run the category alone: Essential with all optional categories off; later, one optional category enabled at a time.
4. Verify both positive behavior (requested service works) and negative behavior (unpermitted collectors remain off), including reload, failure and withdrawal.
5. Verify the deployed build on each supported surface, record remaining limits, and complete the category before proceeding.

The target is an explicit, repeatable acceptance standard. A passing helper test, an attractive preference panel or a successful deployment is not proof of the entire cookie system.

## Reference principles

- [MDN: Secure cookie configuration](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Cookies) — scope and lifetime, Secure, HttpOnly and SameSite protections.
- [ICO: Storage/access technology exceptions](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/) — a purpose-specific explanation of necessity from the requested-service perspective. This is a UK regulatory reference, not a conclusion that a particular jurisdiction governs every Kurioticket visitor.

These references inform the inspection; they do not replace the actual product contract or evidence from its implementation.
