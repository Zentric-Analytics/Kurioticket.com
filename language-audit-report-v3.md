# Kurioticket full language coverage audit v3

## Executive summary

- **Audit date:** 2026-07-20 (UTC).
- **Requested base:** latest `dev`; neither an `origin` remote nor a local `dev` ref exists in this checkout. The actual starting point is **`d6857b296408d9b37df27692a60ac330ee34cc55` — `Merge pull request #3095 from Zentric-Analytics/codex/fix-admin-home-ui-issues`**.
- **Branch:** `audit/general-language-coverage-v3`.
- **Scope:** report-only static audit. No application, locale, package, lockfile, or dependency file was changed.
- **Active locales:** 18.
- **Discovered route patterns:** 76; route-matrix route patterns: 76; **unmapped: 0**.
- **Route/locale rows:** 1,368 (one route pattern × audience/auth state × locale).
- **Shared components reached through route import graphs:** 84.
- **Canonical English keys:** 3,146; statically observed candidate translation keys: 1,249; effective used English keys: 1,209; unused English keys: 1,937. The difference between candidate and effective keys is retained as a manual-review family because generic `t` member access can include typed/non-dictionary objects.
- **Visible/accessibility literal hits:** 371 AST hits, compacted into 46 source-file review findings.
- **Issues:** 428 confirmed and 46 manual-review findings (474 total); severity: 5 high, 469 medium, 0 low, 0 blocker.
- **Runtime:** unavailable. No browser tool or safe authenticated/admin session was supplied, so all rows are `RUNTIME_UNVERIFIED`; no screenshot is claimed or committed.

Most importantly, this audit counts a key as explicit only when its locale module contains an AST-observed property override. A value supplied by `...en` is counted as **inherited English**, even though it exists in the effective runtime dictionary. `translationStatus` is registry metadata only and is never treated as coverage proof.

## Methodology

The v3 script uses the installed TypeScript compiler API to parse all TypeScript/TSX in `src/app`, `src/components`, `src/content`, `src/data`, `src/lib`, and `src/services`. It dynamically imports the live registries, derives available locales, parses dictionary-module resolution from `src/lib/i18n/index.ts`, flattens effective dictionaries, and separately walks each locale's `translations` object without treating spread assignments as explicit overrides.

It discovers all `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, and `default.tsx` files. Route groups and parallel-route labels are removed from URL patterns; dynamic segments are retained. Relative and `@/` imports are resolved recursively, applicable parent layouts are included, and external packages are stopped. Each route row aggregates its reachable user-facing graph rather than assuming a text-free page is translated.

Source inspection covers property, element, call and translation-prop key forms; unresolved computed families are counted rather than silently accepted. JSX text and literal `placeholder`, `title`, `alt`, `aria-label`, and `aria-description` attributes are inspected. `??` and `||` literal fallbacks are recorded. Placeholder parity distinguishes `{{name}}` from `{name}`, checks names/styles, and retains complete key-level evidence only under `/tmp/kurioticket-i18n-audit-v3`.

The committed CSVs are deliberately compact: the route matrix has no source-usage Cartesian product, and the issue matrix deduplicates literal hits by source file. Successful key-level evidence is not committed.

## Locale registry and explicit coverage

`selector` is “yes” for every row because `availableLocaleOptions` is filtered from the same dynamically discovered registry. Resolution is via `normalizeLanguage` followed by `getTranslations`; unknown input falls back to `en-us`. Aliases below are derived from the current normalization/dictionary registry behavior.

| Code | Canonical tag | Module | Dir | translationStatus | Aliases / normalization | Selector | Used effective | Explicit | Explicit % | Inherited English | Inherited % | Blank | Identical explicit | Placeholder defects |
|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| en-us | en-US | en.ts | ltr | ready | en, en-us → en-us | yes | 1,209 | 1,209 | 100.0% | 0 | 0.0% | 0 | 0 | 0 |
| es-es | es-ES | es.ts | ltr | ready | es, es-es → es-es | yes | 1,209 | 1,141 | 94.4% | 68 | 5.6% | 0 | 36 | 0 |
| fr | fr | fr.ts | ltr | partial | fr, fr-fr → fr | yes | 1,209 | 1,137 | 94.0% | 72 | 6.0% | 0 | 41 | 0 |
| de-de | de-DE | de.ts | ltr | ready | de, de-de → language de-de / dictionary de | yes | 1,211 | 1,122 | 92.7% | 89 | 7.3% | 0 | 41 | 0 |
| it-it | it-IT | it.ts | ltr | partial | it, it-it → language it-it / dictionary it | yes | 1,209 | 1,125 | 93.1% | 84 | 6.9% | 0 | 40 | 0 |
| pt-br | pt-BR | pt-br.ts | ltr | partial | pt, pt-br → pt-br | yes | 1,209 | 1,104 | 91.3% | 105 | 8.7% | 0 | 39 | 0 |
| nl | nl-NL | nl.ts | ltr | partial | nl, nl-nl → nl | yes | 1,209 | 1,109 | 91.7% | 100 | 8.3% | 0 | 61 | 5 |
| ar | ar | ar.ts | rtl | partial | ar, ar-sa, ar-ae, ar-eg → ar | yes | 1,209 | 973 | 80.5% | 236 | 19.5% | 0 | 30 | 0 |
| zh-cn | zh-CN | zh-cn.ts | ltr | partial | zh, zh-cn → zh-cn | yes | 1,212 | 986 | 81.4% | 226 | 18.6% | 0 | 31 | 0 |
| ja | ja | ja.ts | ltr | partial | ja, ja-jp → ja | yes | 1,210 | 977 | 80.7% | 233 | 19.3% | 0 | 30 | 4 |
| ko | ko | ko.ts | ltr | partial | ko, ko-kr → ko | yes | 1,210 | 962 | 79.5% | 248 | 20.5% | 0 | 31 | 3 |
| hi | hi-IN | hi.ts | ltr | partial | hi, hi-in → hi | yes | 1,211 | 959 | 79.2% | 252 | 20.8% | 0 | 38 | 0 |
| tr | tr-TR | tr.ts | ltr | partial | tr, tr-tr → tr | yes | 1,209 | 991 | 82.0% | 218 | 18.0% | 0 | 39 | 0 |
| pl | pl-PL | pl.ts | ltr | partial | pl, pl-pl → pl | yes | 1,210 | 927 | 76.6% | 283 | 23.4% | 0 | 37 | 0 |
| sv | sv-SE | sv.ts | ltr | partial | sv, sv-se → sv | yes | 1,209 | 917 | 75.8% | 292 | 24.2% | 0 | 40 | 0 |
| id | id-ID | id.ts | ltr | partial | id, id-id → id | yes | 1,210 | 885 | 73.1% | 325 | 26.9% | 0 | 47 | 0 |
| th | th-TH | th.ts | ltr | partial | th, th-th → th | yes | 1,209 | 890 | 73.6% | 319 | 26.4% | 1 | 28 | 3 |
| vi | vi-VN | vi.ts | ltr | partial | vi, vi-vn → vi | yes | 1,210 | 881 | 72.8% | 329 | 27.2% | 0 | 43 | 0 |

Counts above are unique used/effective keys, not route-weighted successes. The route CSV contains route-specific counts. An explicit value identical to English is reported separately and is not automatically called native translation.

## Complete route inventory

All discovered patterns appear for all 18 locales. Parent layouts and special render files are captured in `page_files`, `layout_files`, and `render_states_checked` in the route matrix.

| Coverage area | Route patterns |
|---|---|
| Public core/search | `/`, `/flights`, `/flights/[slug]`, `/flights/details/[id]`, `/flights/results`, `/hotels`, `/hotels/[slug]`, `/hotels/details/[id]`, `/hotels/results`, `/cars`, `/cars/results`, `/deals`, `/destinations`, `/explore` |
| Public content/legal/support | `/about`, `/contact`, `/faq`, `/guides`, `/guides/[slug]`, `/how-it-works`, `/legal`, `/legal/[slug]`, `/legal-center`, `/more-service-info`, `/privacy`, `/service-guarantee`, `/support`, `/terms`, `/redirect` |
| Authentication | `/auth/signin`, `/auth/signup`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/two-factor`, `/auth/verify-email`, `/auth/verify-login` |
| Logged-in/account | `/dashboard`, `/dashboard/account`, `/dashboard/alerts`, `/dashboard/preferences`, `/dashboard/preferences/booking`, `/dashboard/preferences/customization`, `/dashboard/preferences/email`, `/dashboard/preferences/travel`, `/dashboard/recent-searches`, `/dashboard/saved`, `/dashboard/security`, `/dashboard/settings`, `/dashboard/support`, `/dashboard/trips`, `/saved`, `/recent-searches`, `/email/preferences`, `/account/pending-deletion` |
| Onboarding | `/onboarding`, `/onboarding/security` |
| Admin | `/admin`, `/admin/account-deletions`, `/admin/account-deletions/[id]`, `/admin/bookings`, `/admin/cars`, `/admin/content`, `/admin/flights`, `/admin/hotels`, `/admin/logs`, `/admin/monitoring`, `/admin/operations`, `/admin/platform`, `/admin/providers`, `/admin/redirects`, `/admin/searches`, `/admin/settings`, `/admin/support`, `/admin/support/[id]`, `/admin/system`, `/admin/users` |

Hotel Details is explicitly present as `/hotels/details/[id]` and the newer discovery detail route `/hotels/[slug]`. Header, Footer, locale selector, country/currency selector, mobile navigation, account menus, dashboard/preference navigation, admin navigation, cards, filters, pickers, dialogs, gallery/loading/empty/error components, forms and toast-related modules are mapped through imports and listed per row.

## Route status findings

### Fully explicitly translated routes

No route is certified `FULLY_EXPLICITLY_TRANSLATED` across every active locale. Runtime is unverified for every route, and every non-English locale has inherited-English used keys at application level. Individual route/locale rows may include the status only when the static graph has no inherited key, literal, blank, placeholder, or dynamic finding; `RUNTIME_UNVERIFIED` remains alongside it and prevents an end-to-end certification.

### Partially translated and English-fallback routes

All major route groups are partially translated in at least one locale. The largest unique inherited-English proportions are Vietnamese 27.2%, Indonesian 26.9%, Thai 26.4%, Swedish 24.2%, Polish 23.4%, Hindi 20.8%, Korean 20.5%, Arabic 19.5%, Japanese 19.3%, and Simplified Chinese 18.6%. Scoped helper fallback, hardcoded fallback, raw-key/undefined candidates, and blanks are distinct `failure_type`/`fallback_type` values in the issue CSV; they are not collapsed into effective-dictionary presence.

### Hardcoded visible text

The audit found 371 literal hits and reports 46 compact source-file review rows rather than repeating them by locale or route usage. Separately, 423 reachable `??`/`||` English fallback expressions are confirmed rows because each represents a distinct source behavior. Operational names and values are filtered as described under Known non-issues. The imported-route mapping in the route CSV shows affected route groups; shared defects propagate to every route graph that imports them.

### Placeholder defects

Five compact confirmed locale findings cover used-key placeholder discrepancies: Dutch (5 unique keys), Japanese (4), Korean (3), and Thai (3), plus the high-level used-key resolution review. Token matching distinguishes single/double braces and catches removed, extra and renamed tokens. Full expected/actual signatures are temporary-only.

## Audience and state coverage

### Logged-out findings

Thirty-one public patterns plus seven authentication routes were statically traversed. Coverage includes home, desktop/mobile header, Footer, selectors, navigation, all flight/hotel/car surfaces (including Hotel Details), marketing/content/legal/support routes, password reset, email/login verification and two-factor authentication. Loaded branches and all discovered special route files are mapped. Literal, fallback, metadata and accessibility hits are in the issue CSV.

### Logged-in findings

Twenty-five customer/authenticated patterns cover dashboard/account/security/settings, customization/booking/travel/email preferences, saved items, recent searches, trips, alerts, support, account deletion, and email preference management. Empty/loading/error/success/session branches reachable in imports were inspected statically. No credentials or safe existing session were available, so signed-in display-name, no-content, pending deletion and destructive-dialog behavior remain runtime-unverified.

### Onboarding findings

`/onboarding` and `/onboarding/security` are present for all locales and are no longer excluded as they were in v2. Their shared auth/account graph is analyzed, but completion, validation, unverified-account and success transitions need a safe session.

### Admin findings

All 20 current admin patterns and shared admin imports are included. Admin currently participates in the application locale/shared-component graph in places, but substantial admin literal/fallback findings mean it cannot be characterized as intentionally English-only or fully locale-aware. Language switching and locale inheritance need authenticated runtime verification; hardcoded customer/operator-visible English is listed rather than silently excluded.

### Header, Footer and navigation

The root layout import graph maps `AppHeader`, `Footer`, language selector, country/currency selector and mobile navigation into applicable public/customer routes. Authenticated account menus, dashboard/preferences navigation and admin navigation are included through their route layouts. Shared-component defects are aggregated once in issues and linked to all reachable route rows.

### Loading, error, empty and dialog states

Every discovered `loading`, `error`, `not-found`, and `default` file is attached to its route pattern. Static conditional branches additionally cover loading/loaded, empty/partial/unavailable, API and validation errors, success/disabled, logged-out/in, verification/2FA, pending deletion, no saved/recent/alert/trip content, provider availability, discovery/priced hotel, missing images, mobile/filter panels and dialogs. Branch reachability is not claimed as runtime proof.

## Metadata and accessibility

Metadata/Open Graph literals are inspected where statically reachable; route rows include `metadata_issue_count`. Current dictionary metadata keys resolve some v2 findings, while remaining source-level hardcoded metadata and fallback behavior is retained for review. Accessibility inspection covers literal alt text, `aria-label`, `aria-description`, title attributes and screen-reader-facing JSX; route rows provide `accessibility_issue_count`, and issue rows distinguish `accessibility_only`.

## RTL, directionality and formatting

Arabic is the only available RTL locale; all other registry entries are LTR. `applyLanguageToDocument` sets both canonical `lang` and registry direction. The static audit reviewed locale-sensitive date/number/currency use, counts/plural wording, physical left/right classes, and full-text `dir="ltr"` risks. Numeric-only LTR isolation is a known non-issue. No RTL issue is auto-confirmed solely from a physical utility class because visual context is required; Arabic rows remain runtime-unverified and manual visual review is required for date ranges, sentence order, panels, galleries and menus.

## Issue distribution

| Measure | Count |
|---|---:|
| Confirmed | 428 |
| Manual review | 46 |
| High | 5 |
| Medium | 469 |
| Placeholder defect groups | 4 |
| Used-key resolution group | 1 |
| Hardcoded literal review groups | 46 |
| Hardcoded English fallback expressions | 423 |

Because shared/fallback findings usually affect every non-English locale, issue counts are 470 each for `es-es`, `fr`, `de-de`, `it-it`, `pt-br`, `ar`, `zh-cn`, `hi`, `tr`, `pl`, `sv`, `id`, `vi`; 471 for `ja`, `ko`, `th`, and `nl`; and 1 English manual key-resolution finding. Route-group totals are best read from `confirmed_issue_ids` in the route matrix: issues are deduplicated at component/source behavior level rather than multiplied by every importing route.

## V2 reconciliation

| V2 ID | Current classification | Current evidence |
|---|---|---|
| GLV2-001 | fixed | Vietnamese `loginCodeInstructions` now contains both `{{email}}` and `{{minutes}}`; no current VI mismatch. |
| GLV2-002 | obsolete | Hotel landing/detail architecture changed; v3 re-audits current Hotel Details and literal alts independently rather than carrying old line references. |
| GLV2-003 | still_present | Dutch `openLanguagePreferences` remains in the Dutch placeholder group. |
| GLV2-004 | still_present | Dutch `removeRecentSearch` remains in the Dutch placeholder group. |
| GLV2-005 | still_present | Dutch `carsResults` single/double-brace discrepancies remain. |
| GLV2-006 | fixed | Thai selector value now contains country, code and currency tokens. |
| GLV2-007 | still_present | Thai unavailable-language text still omits `{{language}}`. |
| GLV2-008 | still_present | Korean `homeSaveDestination` still renames English `{{city}}` to `{{destination}}`. |
| GLV2-009 | still_present | Arabic singular `optionFound`/`resultFound` values still omit `{{count}}`; they were not counted as used by the conservative static family resolver and remain confirmed by direct current source reconciliation. |
| GLV2-010 | partially_fixed | Flight metadata dictionary keys now exist; runtime locale selection for metadata remains unverified. |
| GLV2-011 | partially_fixed | Hotel metadata dictionary keys now exist; runtime locale selection remains unverified. |
| GLV2-012 | partially_fixed | Static content has broad dictionary coverage; metadata/runtime locale resolution still needs browser verification. |
| GLV2-013 | fixed | The former exact Thai Footer-class failure is absent from the current 36 failures. |
| GLV2-014 | fixed | The former Vietnamese hotel-budget expected-value failure is absent from the current 36 failures. |
| MR-001 | cannot_verify | Empty signed-in profile requires a supplied safe authenticated session. |
| MR-002 | still_present | Identical-explicit and inherited-English totals remain material, but only contextual hits are issues. |
| MR-003 | cannot_verify | Missing legal-document metadata branch requires runtime generation/invalid slug behavior. |
| MR-004 | obsolete | Admin, onboarding and pending-deletion routes are now explicitly within v3 scope. |

Totals: **6 still_present, 4 fixed, 1 obsolete, 3 partially_fixed, 0 false_positive, 0 cannot_verify; MR: 1 still_present, 1 obsolete, 2 cannot_verify.**

## Manual runtime-review queue

1. All 31 public, 25 logged-in/customer, and 20 admin route patterns: validate document `lang`/`dir` across all 18 selectors.
2. Desktop/mobile AppHeader, Footer, language/country/currency selectors, account menu, filter panels and dialogs in Arabic and representative LTR locales.
3. Hotel discovery-only, priced and unavailable Hotel Details; flight/car provider unavailable and API-error states.
4. Empty saved/recent/trips/alerts, unverified/2FA/pending-deletion, onboarding validation/success and sign-out/session expiry.
5. Metadata/Open Graph for every public route and legal slug.
6. Admin locale inheritance, switching and operator-visible literals using only a supplied safe session.

## Recommended repair order

1. Correct confirmed placeholder parity without changing product wording or behavior.
2. Centralize/deduplicate confirmed hardcoded English fallback expressions, starting with shared header/auth/search/detail components.
3. Review the 46 literal source groups, prioritizing accessibility, Hotel Details, authentication, account deletion/onboarding and admin.
4. Fill explicit native overrides in the highest inherited-English locales; do not use effective dictionary presence as completion.
5. Localize metadata and validate locale-aware formatting/pluralization/RTL visually.
6. Execute the runtime queue with safe sessions and convert manual findings to confirmed/fixed outcomes.

## Known non-issues and ignored categories

The scanner intentionally ignores Kurioticket branding; company registration and legal identifiers; route/API paths and query names; code identifiers; provider, airline, airport, hotel and supplier names; user data; currency/airport codes; prices and dates; support email addresses; and operational IDs. Numeric-only LTR isolation is not an RTL defect. Identical-to-English explicit values are risk totals, not automatic defects. Raw API payloads are flagged only when a reachable display/fallback expression suggests customer visibility.

## Completeness and validation results

- Every available locale appears in the matrix: yes (18/18).
- Every discovered route appears: yes (76/76); unmapped routes: 0.
- All discovered special route files are mapped: yes.
- Hotel Details, AppHeader, Footer, selectors, logged-out/authenticated/onboarding/admin, pending deletion, email preferences and recent searches: present.
- Metadata and accessibility inspection: present.
- English inheritance distinguished from explicit translation: yes.
- V2 GLV2-001…014 and MR-001…004 reconciled: yes.
- Browser/runtime: unavailable; every row is `RUNTIME_UNVERIFIED`.

Validation outcomes:

| Command | Result |
|---|---|
| `JITI_TSCONFIG_PATHS=true node scripts/audit-i18n-coverage-v3.mjs` | PASS; 18 locales, 76/76 routes, 0 unmapped, 428 confirmed and 46 manual-review issues. |
| `npm run audit:i18n` | PASS; historical comparison reports 3,146 English keys. |
| `JITI_TSCONFIG_PATHS=true node --test --import jiti/register src/lib/__tests__/language.test.ts` | FAIL; 172 passed and 36 failed out of 208. Failures are current pre-existing localization/render-source assertions; this report-only audit did not alter them. |
| `./node_modules/.bin/eslint scripts/audit-i18n-coverage-v3.mjs` | PASS, no warnings. |
| `git diff --check` | PASS. |
| conflict-marker grep | PASS (exit 1 means no matches). |
| `npm run check:conflicts --if-present` | PASS. |
| `npm run build` | PASS. |
| `npm run lint` | PASS with 7 existing warnings and 0 errors. |

Temporary detailed JSON remains only in `/tmp/kurioticket-i18n-audit-v3` and is not committed.
