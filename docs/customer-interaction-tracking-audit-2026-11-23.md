# Customer interaction tracking coverage audit — 23 November 2026

**Status:** Evidence-based audit / proposed implementation plan only. **No tracking collector, consent choice, user record, database schema, or public UI is changed by this document.**

**Code baseline:** `dev` at `5099314538ee20a6282f19883f15bf056a0f0f88` (23 Nov 2026). The active routes and client features were inspected against the current repository. Findings classified as "no producer found" mean no dedicated instrumentation was identified in the examined active components and tracking services; they are not proof that every runtime interaction was exhaustively exercised.

## 1. Objective and counting model

Kurioticket Admin should reconstruct a **useful, reliable, consent-aware sequence of meaningful customer actions** across desktop web, mobile web, iOS and Android. It should not attempt to record literally every tap, keystroke, screen pixel, pointer movement, or private communication.

Preserve the existing distinction:
- **Operational activity:** completed/attempted searches, verified provider redirects, server-confirmed saved-item mutations, support tickets and other functional transactions. These can exist without optional analytics consent; do not label them "journey events" without evidence.
- **Optional customer analytics:** impressions, selections, local saves, sharing, navigation and other behavior. A qualifying event requires an explicit applicable consent state, current ownership, environment and a validated event reference.
- **Customer account audit:** verified changes to account state, notifications and saved/alert records. These may be relevant support evidence without becoming optional behavioral analytics.
- **Search journey:** a group of events for an eligible visitor. The canonical grouping has an inactivity boundary; a verified SearchHistory ID, not approximate time/location, is the authority for search-specific activity. One customer can have several devices, visitors, searches and journey IDs.

Users Activity should remain a compact per-search summary. **View Journey History** should show each authorized event chronologically with its known platform, search reference, product, action/outcome and evidence quality. Do not fabricate "viewed", "shared", "booked", "abandoned" or screenshot events.

## 2. Existing source architecture (verified in code)

| Layer | Verified implementation | Boundary / issue |
|---|---|---|
| Search operations | SearchHistory via flight, hotel and car search handlers and searchJourneyService | Account-owned operational searches are not automatically consented journeys. Search edits are visible only indirectly as new submitted searches. |
| Provider handoff | RedirectLog, providerHandoffActivity and native/web redirect paths | A provider handoff is not a booking or payment. Legacy redirects may have no exact search reference. |
| Canonical journey | SearchJourney and JourneyEvent, idempotent event keys | Canonical types: SEARCH_COMPLETED, RESULTS_VIEWED, OFFER_SELECTED, PROVIDER_HANDOFF_STARTED, RESULT_SAVED, RESULT_UNSAVED, RESULT_SHARED and PRICE_ALERT_CREATED. |
| Web journey sender | JourneyEventsProvider and journeyEventClient | The regular client sender supports only RESULTS_VIEWED and OFFER_SELECTED; save/share use a separate interaction endpoint. |
| Native journey sender | apps/mobile privacy journeyEventCoordinator and journeyEvents | Native coordinator supports results viewed and offers selected for validated request IDs under a consent context. |
| Web save/share tracking | customerInteractionClient -> /api/activity/interactions | Consent gated; server requires verified visitor, same search and ownership for attaching to a journey. Some unlinked events remain account activity. |
| Account saved-item operations | savedRecentService and /api/mobile/v1/saved | Server-confirmed saves/removes generate analytics audit entries with session-derived platform where available. Account auditing is not proof of a canonical search-linked journey step. |
| Price alerts | priceTrackingService; priceAlertJourneyLinkService | Create, pause, resume and delete generate account events. Only eligible creation is represented by PRICE_ALERT_CREATED in canonical JourneyEvent; other lifecycle actions are not canonical stages. |
| Admin Users Activity | adminIdentityActivityService, adminIdentityJourney, adminActivityOverview | Its main activity summary deliberately retains the four original stages; the full journey detail reader additionally exposes some save/share and alert-created events. Filter stage taxonomy does not cover all event types. |
| Admin Journey History | adminJourneyCore and JourneyEventHistory | Displays verified save/unsave/share and price-alert-created events; strict consent, ownership, source-record and environment guards exclude ambiguous records. |

Primary code references (all paths in this repository):
- prisma/schema.prisma (SearchJourney, JourneyEvent, AnalyticsEvent)
- src/lib/search-journey.ts; src/services/searchJourneyService.ts
- src/components/privacy/JourneyEventsProvider.tsx; src/lib/journeyEventClient.ts
- apps/mobile/src/features/privacy/journeyEventCoordinator.ts; apps/mobile/src/features/privacy/journeyEvents.ts
- src/lib/customerInteractionClient.ts; src/app/api/activity/interactions/route.ts
- src/services/savedRecentService.ts; src/app/api/mobile/v1/saved/route.ts
- src/services/priceTrackingService.ts; src/services/priceAlertJourneyLinkService.ts
- src/services/adminIdentityActivityService.ts; src/services/adminJourneyCore.ts; src/services/adminJourneyContract.ts

## 3. Customer-interaction coverage matrix

**Legend:** **Implemented** = active producer/recording path identified, not proof of delivery on all builds; **Partial** = only some products/platforms/outcomes or only account audit; **Gap** = no dedicated end-to-end producer found on inspected active surfaces; **OS-limited** = technical or policy restrictions prevent universal coverage. Mobile web generally shares the website implementation but must still be tested at its own breakpoints. Native iOS and Android share React Native code but device and OS differences must be validated.

| Customer action | Desktop / mobile web | Native iOS / Android | Admin visibility and required correction |
|---|---|---|---|
| Flight/hotel/car search submitted and completed | Implemented (operational) | Implemented (operational) | SearchHistory shows it; connect to exact search and verified visitor when eligible. |
| Search editor opened, fields changed, edit discarded | Gap as separate event; controls exist | Gap as separate event; edit modals exist | Do not capture draft input or each keystroke. Propose SEARCH_EDIT_APPLIED only after committed change and SEARCH_EDIT_CANCELLED only if meaningfully useful. |
| Search repeated with changed dates/party/route | New submitted search recorded | New submitted search recorded | Compare authorized, normalized previous/next submitted search reference; do not infer that every successive search is an edit. |
| Results displayed | Implemented optional RESULTS_VIEWED | Implemented optional RESULTS_VIEWED | Distinguish actual rendered results from search success; honor consent. |
| Sort changed / filter applied or cleared | Gap in reviewed result controls | Gap in reviewed result controls | Add explicit result FILTER_APPLIED / SORT_CHANGED with allowed filter names and counts, no arbitrary text. |
| Result details or rate details opened | Partial: selection events may fire but are not equivalent | Partial: selected card/rate tracked in some paths | Add distinct RESULT_DETAILS_OPENED / RATE_DETAILS_OPENED, avoiding double counting offer selection. |
| Offer selected | Implemented optional OFFER_SELECTED | Implemented optional OFFER_SELECTED | Preserve verified offer identifier and search correlation; dedupe only duplicate emission, not deliberate repeat actions. |
| Provider View deal clickout | Implemented operational/canonical handoff where eligible | Implemented operational/canonical handoff where eligible | Keep redirect attempt and actual external-opening result distinguishable; not a booking confirmation. |
| Saved result / unsaved result (authenticated) | Implemented account operation + some optional journey links | Implemented server-backed saved endpoints with verified session provenance | Compare source account mutations with JourneyEvent; repair legitimate gaps, don't create duplicate events. |
| Guest/local favorite toggle | Implemented in some web result paths with optional local_saved/local_unsaved | Local save controls exist; no equivalent verified canonical collector located | Add consistent *consented* local toggle events where applicable; do not claim server save for a local favorite. |
| Share link copied / share sheet used | Implemented in web flight/hotel/car cards and certain detail pages | Native Share.share in flight/hotel/car flows; separate server analytics emission not found in examined native handlers | Track share action initiated vs copy succeeded. A native share-sheet result does not automatically prove the recipient received anything. Do not collect recipients. |
| Price alert created | Account audit + conditional canonical journey | Native price-alert API also attempts verified journey linkage | Keep exact alert/search association and accepted/failed outcomes. |
| Price alert paused, resumed or deleted | Account audits implemented | Account API mutations implemented | Present in allowed account history; canonical journey lifecycle stages beyond CREATE not implemented. Do not imply "alert off" from screen toggle without server success. |
| Search result list scroll, offer panel expand | Controls exist; no verified analytics collector | Controls exist; no verified analytics collector | Consider one meaningful details-panel event; **not** scroll-by-scroll or touch-by-touch monitoring. |
| Homepage tab, header navigation, footer links | Navigation exists; no global page-view or footer event collector identified | Native tabs/navigation exist; no global navigation event collector identified | Add allowlisted PAGE_VIEWED and NAVIGATION_USED under consent; only successful route changes, normalized route templates. |
| Explore, destinations, editorial, FAQ and legal pages | Routes exist; page-view coverage not verified | Explore and help screens exist; page-view coverage not verified | Instrument a small allowlist of meaningful page visits, not content text read or time-to-the-millisecond gaze inference. |
| Saved searches, saved-items page, recent-search page | Functional pages and account state exist | Functional screens and local/account state exist | Add page-open and saved-item-open events separately from the existing save/remove account mutation. |
| Packages/deals browsing and edits | Routes exist; no complete canonical package journey producer verified | Native package screens exist; no complete canonical package journey producer verified | Audit product contract before introducing PACKAGE-specific event types; do not assume flight/hotel/car journey keys cover it. |
| Support ticket created | Server audit writer identified | Support screen exists; coverage requires native API QA | Retain support creation in functional audit, not ticket body text in optional analytics. Track FAQ navigation separately if consented. |
| Sign-in, security, password, MFA, deletion | Operational/security state exists | Operational/security state exists | Keep security audit separate. Never record credentials, OTPs, password fields or private support contents in behavior events. |
| Notification opened, preferences changed | Functional routes exist | Functional screens exist | Add verified outcomes only where needed; distinguish notification delivery from opened/viewed. |
| Screenshot taken | No reliable passive screenshot API for desktop or mobile website | iOS can notify after screenshot; Android 14+ offers limited per-activity detection | **Not implemented.** Optional, prominent disclosure and separate design/legal review needed. Never upload screenshot pixels, infer the captured content, or claim universal detection. |

Concrete inspected customer-facing surfaces:
- Website: src/app/page.tsx; src/app/flights; src/app/hotels; src/app/cars; src/app/packages; src/app/deals; src/app/explore; src/app/destinations; src/app/saved; src/app/dashboard; src/app/support; src/app/faq; src/app/legal; src/components/layout/Footer.tsx; src/components/layout/AppHeader.tsx; src/components/results; src/components/search.
- Native: apps/mobile/app; apps/mobile/src/features/flow; apps/mobile/src/features/search; apps/mobile/src/features/saved; apps/mobile/src/features/recent; apps/mobile/src/features/explore; apps/mobile/src/features/profile; apps/mobile/src/features/privacy.

**Do not claim a missing event merely from absence in Recent journeys.** Existing canonical and account events can be stored and visible only in the full Journey History, or only in unlinked account activity. Conversely, presence of a UI control or event sender does not prove the backend accepted it.

## 4. Read-only staging reality check

Aggregated **staging** sample from 16 Nov 2026 (inclusive) to 24 Nov 2026 (exclusive), using environment-tagged SearchHistory.query and JourneyEvent.metadata. Includes test traffic; not representative of production and not unique users.

| Verified source label on SearchHistory | Search rows | Search rows with visitorId |
|---|---:|---:|
| WEB | 140 | 45 |
| IOS | 49 | 4 |
| ANDROID | 53 | 0 |

In the same staging window, environment-tagged canonical JourneyEvent rows labelled IOS included **4 SEARCH_COMPLETED**, **4 RESULTS_VIEWED**, **8 OFFER_SELECTED**, and **3 PROVIDER_HANDOFF_STARTED**. Web-labelled canonical rows are present as well; older records include unattributed source values. Android's zero in the source-labelled, visitor-linked search sample **does not prove all Android users should have been tracked**: consent, app version and event eligibility must be checked for each test.

Staging AnalyticsEvent also contains account/action events (including saved-item confirmation/removal, share-link copying and price-alert changes). Some have UNKNOWN applicationSource. **Unknown platform is a data-quality state, not proof of a specific device.**

**QA consequence:** event coverage must be tested end-to-end with consent granted and separately with consent declined/withdrawn, across all four surfaces. Search counts cannot be used as denominators for expected optional events without knowing eligible visitor consent and whether the action was performed.

## 5. Critical gaps and integration risks

1. **Two data vocabularies:** canonical JourneyEvent vs AnalyticsEvent account/interaction audit. The main Users Activity service intentionally projects only the original four journey stages even though JourneyEvent supports saves, unsaves, shares and alert creation in full detail. Build an explicit unified *read model*, not a duplicate collector.
2. **Incomplete native interaction producer parity:** native Share.share UI and local favorite controls do not demonstrate equivalent consented interaction event delivery to the website /api/activity/interactions flow. The native saved-item account API does write verified audits, which must not be counted twice.
3. **Partial alert lifecycle:** created is supported as a canonical search-linked journey event when verified; paused, resumed and deleted are primarily AnalyticsEvent account records.
4. **Missing normalized navigation and search-edit events:** no cross-app page-view collector or dedicated search-edit/filter/sort taxonomy was found in the active routes, footers and search controls inspected.
5. **Attribution:** searchHistoryId, current verified visitor/account, product and environment must agree. Do not connect an event using time, route similarity, user-agent strings, device fingerprints, or a previous account's token. A search can span a visitor journey rollover without changing its SearchHistory ID.
6. **Delivery and presentation:** client emission is not server acceptance. Include queued/sent/accepted/rejected and version/environment QA; show unknown evidence plainly. Never backfill historical behavior by inference.
7. **Consent and retention:** optional behavior must remain opt-in where applicable. Storing additional page/navigation or screenshot events requires a refreshed data-minimization, retention, purpose and transparency review. This audit does not establish a legally approved retention period.

## 6. Proposed versioned event catalog (not yet implemented)

**Keep existing canonical names** rather than renaming historical events:

- Existing journey: SEARCH_COMPLETED; RESULTS_VIEWED; OFFER_SELECTED; PROVIDER_HANDOFF_STARTED; RESULT_SAVED; RESULT_UNSAVED; RESULT_SHARED; PRICE_ALERT_CREATED.
- Existing account audit names: saved_item_confirmed, saved_item_removed, local_saved, local_unsaved, share_link_copied, share_sheet_completed, price_alert_created, price_alert_paused, price_alert_reactivated, price_alert_deleted.
- **Proposed P1:** SEARCH_EDIT_APPLIED, SEARCH_FILTER_APPLIED, SEARCH_SORT_CHANGED, RESULT_DETAILS_OPENED, RATE_DETAILS_OPENED; only after a real observed action.
- **Proposed P2:** PAGE_VIEWED, NAVIGATION_USED, SAVED_ITEM_OPENED, FAQ_ARTICLE_OPENED, PRICE_ALERT_PAUSED, PRICE_ALERT_RESUMED, PRICE_ALERT_DELETED, with canonical mapping only if provenance is verified.
- **Separate opt-in research, not approved for implementation:** SCREENSHOT_DETECTED, for native supported OS versions only. No screenshot image, no content snapshot, no photo-library or screen-recording access.

Event contract for any new optional event:
- eventId/idempotency key; schema version; event type; server receivedAt and bounded client occurredAt; purpose/consent version; outcome (attempted, completed, failed, or unknown).
- Session-derived platform WEB/IOS/ANDROID, app version, environment, request/visitor/verified account scope; never trust a client-provided account or platform as sole authority.
- Whitelisted route template/screen name; product and exact searchHistoryId when applicable; allowlisted filter/sort identifiers and **coarse** counts; server-owned saved-item/alert identifiers after verification.
- No raw free-text, private search drafts, email/password/OTP, payment data, full URLs with query tokens, screenshot content, pasted clipboard contents, messages, contacts, exact pointer movements or silent screen recordings.
- Consent withdrawal should stop future optional emission, invalidate pending events, and apply existing deletion/retirement policy. Functional account and security audit must remain separate from optional behavior.

## 7. Screenshot feasibility and conditions

- **iOS:** UIApplication.userDidTakeScreenshotNotification posts **after** a screenshot; the notification contains no screenshot image. Requires native wiring and device verification. Reference: https://developer.apple.com/documentation/uikit/uiapplication/userdidtakescreenshotnotification
- **Android:** Android 14's Activity.ScreenCaptureCallback is per Activity and only recognizes supported capture methods; it does not provide image pixels and may show a system disclosure. Requires DETECT_SCREEN_CAPTURE and native implementation, not just a JavaScript UI change. Reference: https://developer.android.com/about/versions/14/features/screenshot-detection
- **Desktop/mobile web:** the browser Screen Capture API is for **user-authorized** capture/streaming and does not supply reliable passive notification of someone taking a device screenshot. Reference: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia

**Decision recommendation:** do not ship screenshot monitoring as part of the general event collector. First establish a concrete customer-support use case, specific consent wording, visible in-app notice, platform-specific accuracy, opt-out, minimal metadata and a privacy review. Do not mark unsupported capture methods as "no screenshot taken."

## 8. Phased work plan and acceptance gates

### Phase 0 — reconcile and prove baseline (required before new event types)
- Create a matrix of **actual** user flows for desktop web, mobile web, iOS and Android, each under signed-in, consenting guest, declined and withdrawn consent where applicable.
- Compare SearchHistory, JourneyEvent, AnalyticsEvent, RedirectLog and account audit with exact owned references; verify source and application version. Reuse real staging records without copying customer-identifying data into fixtures.
- Inspect already-supported saves, shares, local toggles and price alerts for each flight/hotel/car surface and verify the proper admin reader. Record "not observed" vs "observed but excluded" vs "not emitted".
- Acceptance: no false account merge; no duplicate canonical event; accurate consent attribution; no claim of tracking without eligible observation. Explicitly verify cases with zero analytics events.

### Phase 1 — unify existing interactions and admin display (highest return, lowest new data)
- Preserve server-written saved-item and alert audits. Define a unified, deduplicated admin event DTO for optional search-linked stages and separately named account audit entries.
- Link existing web/native save, unsave, share and alert lifecycle actions to the verified SearchHistory where evidence is available. Unknown linkage remains unlinked instead of being guessed.
- Show a concise per-search summary on Users Activity and a full event chronology in View Journey History. Filters include event group, product, platform and UTC window; summaries must match the displayed event eligibility.
- Acceptance: confirmed account mutation has exactly one meaningful timeline entry, source platform when verified, and full-history filtering does not hide legitimate actions.

### Phase 2 — instrument meaningful travel workflow decisions
- Add submitted search edits, filter/sort application, details opened and optionally expanded fare sections across flight/hotel/car on all four surfaces.
- Use a common typed event catalog and per-platform adapters, with first-party authenticated server validation. Do not send uncommitted search text, every field change or every scroll.
- Acceptance: same named event means the same action and outcome across devices; retry and navigation do not double-count; instrumentation does not break results or provider clickout.

### Phase 3 — curated site-wide navigation and support
- Add consented page/screen viewed and navigation used to allowlisted header/footer, account, saved/recent, support/FAQ, explore/destinations and package pages. Treat protected security routes as operational audits only.
- Acceptance: no raw route parameters or sensitive content; exact platform and route template recorded; no background repeated page-view flood.

### Phase 4 — optional platform-specific capability research
- Decide screenshot event purpose after privacy/product/legal review. Native-only prototype with clear notice and user-controlled opt-in; no screenshot content. Do **not** promise universal capture or parity with browser platforms.

### Shared CI / manual acceptance checklist
- Consent off/unknown/withdrawn -> **no optional behavior events**, but permitted operational searches and account mutations continue.
- Same verified customer across website, mobile web, iOS and Android -> eligible events coexist without cross-account or guest attribution.
- Each real user action produces at most one canonical event with a stable eventId; genuine repeated actions remain distinct.
- Search with zero results; provider redirect denied/fails; share sheet cancelled; save failed; alert API rejected -> no false "completed" event.
- A search across a 30-minute journey rollover retains its verified search reference; an orphan interaction never attaches to the closest search.
- View at 100% desktop and narrow mobile width: no overlap/hidden sections, readable filters, no duplicate rows and expected empty states.
- Compare counts against raw authorized staging sources per product/source/event and preserve "unknown/not recorded" distinctions.
- No plaintext identifiers, tokens, raw URLs, screenshots, private form fields or account secrets in event logs or admin UI.

## 9. Decision / next implementation request

**Audit finding:** The appropriate next implementation is **Phase 0 + Phase 1**, not a universal "record every movement" feature. This yields reliable saved/share/alert visibility and verified cross-platform attribution before growing the event vocabulary. Phase 2 and 3 should follow through narrowly scoped, separately reviewed PRs. Screenshot monitoring stays unapproved pending explicit privacy/product requirements.

**Evidence boundary:** This document is a source/code audit with one aggregate read-only staging snapshot, not a claim that every on-device UI path was clicked or that all listed producers currently deliver successfully in production. No new event collection or runtime tracking should be deployed by merging this documentation PR.
