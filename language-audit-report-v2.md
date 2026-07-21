# Kurioticket general language audit v2

## 1. Executive summary

- **Audit branch:** `audit/general-language-coverage-v2`.
- **Audit base commit:** `4e01a94ee76f0b4c9b7b8ea348b59b9595e69a9e`.
- **Base availability:** `origin/dev` was not available (`origin` is not configured) and local `dev` was not available, so this branch was created from the current repository state.
- **Previous audit files:** no `language-audit-report.md` or `scripts/audit-i18n-coverage.mjs` existed in this checkout, so there was no prior report/script to validate or replace.
- **Active locales audited:** `en`, `ar`, `nl`, `es`, `fr`, `de`, `it`, `pt-br`, `zh-cn`, `ja`, `ko`, `hi`, `tr`, `pl`, `sv`, `id`, `th`, `vi`.
- **Route groups audited:** `/`, global header, global footer, language selector, country/currency selector, auth login/signup/reset/verification, `/flights`, `/flights/results`, `/flights/details/[id]`, `/hotels`, `/hotels/results`, `/cars`, `/cars/results`, `/deals`, `/destinations`, `/saved`, `/dashboard`, `/dashboard/personal`, `/dashboard/security`, `/dashboard/preferences/customization`, `/dashboard/preferences/booking`, `/dashboard/trips`, `/dashboard/alerts`, `/dashboard/support`, `/faq`, `/faq?from=account`, `/support`, `/service-guarantee`, `/more-service-info`, `/about`, `/how-it-works`, `/legal`, and `/legal/[slug]` detail pages.
- **Total confirmed issues:** 14.
- **Total manual-review / possible issues:** 4.
- **Severity counts:** blocker 0, high 2, medium 7, low 5.

This is a fresh independent audit of current active render paths, current locale dictionaries, current locale registry/normalization code, and current tests. It does not copy an old audit and does not include production UI or dictionary fixes.

## 2. Methodology

### Commands and scripts used

- `git status --short --branch`
- `git rev-parse HEAD`
- `git fetch origin dev --prune` attempted; failed because `origin` is not configured.
- `find . -maxdepth 3 -type f \( -name 'language-audit-report.md' -o -path './scripts/audit-i18n-coverage.mjs' \) -print`
- `JITI_TSCONFIG_PATHS=true node scripts/audit-i18n-coverage-v2.mjs`
- `git diff --check`
- `rg -n "^(<<<<<<<|=======|>>>>>>>)" .`
- `npm run check:conflicts --if-present`
- `npm test -- src/lib/__tests__/language.test.ts`
- `npx tsc --noEmit --pretty false`
- `npm run build`
- `npm run lint`
- source inspection with `sed` and `rg` across `src/app`, `src/components`, `src/lib/i18n`, `src/lib/supportedLocales.ts`, `src/lib/language.ts`, and `src/lib/i18n/index.ts`.

### Automated inspection

`scripts/audit-i18n-coverage-v2.mjs` imports the active dictionaries through the same `getTranslations` path, flattens nested dictionary objects and dotted keys, compares every English key against every active locale, checks placeholder token parity, scans locale files for duplicate property names, checks registry normalization/directionality invariants, verifies the Polish `closeFilters` exact-once and Indonesian `{{email}}` preservation requirements, and searches `src/app` / `src/components` for suspicious visible hardcoded English.

### Manual inspection

Manual route inspection verified the active page files, client/server boundaries, rendered components, data/config dependencies, and key families listed in the route matrix below. Hardcoded-English hits were filtered against the requested non-issue list: operational names, route/API paths, query params, IDs/slugs, provider/airline/airport/currency/locale codes, prices, dates, user data, and legal/support email addresses were not counted as translation defects.

### Known limitations

- This audit did not perform browser screenshot confirmation. Findings are tied to active render files, active dictionary behavior, or current test failures.
- The automated hardcoded-English scanner is intentionally broad and was manually filtered; admin-only routes were not counted because they were outside the requested active route groups.
- Identical-to-English counts are reported as risk indicators, not bulk-confirmed issues, unless tied to active render paths.

## 3. Locale registry summary

| Code audited | Registry code/tag observed | Direction | Status | Aliases checked | Registry/normalization finding |
|---|---:|---:|---:|---|---|
| en | `en-us` / `en-US` | ltr | available | `en`, `en-us` | OK |
| ar | `ar` / `ar` | rtl | available | `ar`, `ar-SA`, `ar-AE`, `ar-EG` | OK; Arabic remains RTL |
| nl | `nl` / `nl-NL` | ltr | available | `nl`, `nl-NL` | OK |
| es | `es-es` / `es-ES` | ltr | available | `es`, `es-ES` | OK |
| fr | `fr` / `fr` | ltr | available | `fr`, `fr-FR` | OK |
| de | `de-de` / `de-DE` | ltr | available | `de`, `de-DE` | OK via language normalization to `de-de`; i18n dictionary alias resolves to `de` |
| it | `it-it` / `it-IT` | ltr | available | `it`, `it-IT` | OK via language normalization to `it-it`; i18n dictionary alias resolves to `it` |
| pt-br | `pt-br` / `pt-BR` | ltr | available | `pt`, `pt-BR` | OK |
| zh-cn | `zh-cn` / `zh-CN` | ltr | available | `zh`, `zh-CN` | OK |
| ja | `ja` / `ja-JP` | ltr | available | `ja`, `ja-JP` | OK |
| ko | `ko` / `ko-KR` | ltr | available | `ko`, `ko-KR` | OK |
| hi | `hi` / `hi-IN` | ltr | available | `hi`, `hi-IN` | OK |
| tr | `tr` / `tr-TR` | ltr | available | `tr`, `tr-TR` | OK |
| pl | `pl` / `pl-PL` | ltr | available | `pl`, `pl-PL` | OK |
| sv | `sv` / `sv-SE` | ltr | available | `sv`, `sv-SE` | OK |
| id | `id` / `id-ID` | ltr | available | `id`, `id-ID`, `id-id` | OK; all normalize to `id` |
| th | `th` / `th-TH` | ltr | available | `th`, `th-TH`, `th-th` | OK; all normalize to `th` |
| vi | `vi` / `vi-VN` | ltr | available | `vi`, `vi-VN`, `vi-vn` | OK; all normalize to `vi` |

## 4. Route coverage matrix

| Route group | Active render files inspected | Active i18n key families | Data/config files involved | Rendering/fallback notes | Remaining gaps |
|---|---|---|---|---|---|
| `/` | `src/app/page.tsx`, `AppHeader`, `Footer`, `SearchTabs`, `FaqAccordion` | home/search/header/footer/newsletter/FAQ, `homeDiscoveryRoute.*`, `flightLandingImageAlt.*` | `src/data/homeDiscovery`, `src/data/marketHomeContent`, `src/content/faqs` | Client page; uses `useLocale`; some metadata remains English. | Manual review: broad homepage identical-English risk in partial locales. |
| Global header | `src/components/layout/AppHeader.tsx` | nav/auth/account/language/global modal keys | session/router state | Client component with locale context. | No confirmed visible gap. |
| Global footer | `src/components/layout/Footer.tsx` | `footer*`, legal labels, product labels | `src/data/legalProfile` | Client component; seller notice has legal fallback. | Test-only stale footer class expectation. |
| Language selector | `AppHeader`, `LocaleProvider`, `supportedLocales`, `language.ts` | language selector labels, unavailable message, `openLanguagePreferences` | locale registry | Client; normalization and document dir/lang update. | NL/TH placeholder defects. |
| Country/currency selector | `CountryCurrencySelector`, `RegionProvider` | country/currency selector and country display names | region/country/currency data | Client modal. | TH `selectCountryCurrencyOption` placeholder defect. |
| Auth login/signup/reset/verification | `src/app/auth/*`, `src/components/auth/*` | auth/signin/signup/reset/verification/login-code keys | NextAuth/session routes | Mostly client forms. | VI login-code placeholder defect. |
| `/flights` | `src/app/flights/page.tsx`, `FlightLandingClient`, `StandaloneFlightSearchForm` | flight landing/search/datepicker/image alt | airport/date utilities | Server wrapper + client landing; metadata uses English dictionary. | Metadata English/manual SEO issue. |
| `/flights/results` | `src/app/flights/results/page.tsx`, `FlightResultsClient`, `FlightCard` | `flightResults.*`, filters, cards, loading | flight API query params/results | Server page + client results; metadata title hardcoded. | Low metadata issue. |
| `/flights/details/[id]` | `src/app/flights/details/[id]/page.tsx`, `FlightDetailsClient` | selected flight/details/provider labels | `/api/flights/details` | Dynamic server page + client detail. | Low metadata issue. |
| `/hotels` | `src/app/hotels/page.tsx`, `HotelSearchBar`, mobile picker | hotel landing/search/destination cards | destination images | Client page; card text comes from English dictionary constants and image alts are hardcoded English. | High visible alt/dictionary-source issue. |
| `/hotels/results` | `src/app/hotels/results/page.tsx`, `HotelResultsClient`, `HotelCard` | `hotelResults.*`, loading, filters | hotel search API | Server page + client results. | Test-only stale VI expectation; metadata English. |
| `/cars` | `src/app/cars/page.tsx` | cars landing/search/datepicker/cards/FAQ | `carsLandingContent`, `carsSearchUtils` | Client page using `getTranslations`. | No confirmed visible gap. |
| `/cars/results` | `src/app/cars/results/page.tsx`, `CarsResultsClient` | `carsResults.*`, datepicker/filter labels | car result params | Server page + client results. | NL placeholder syntax mismatch uses `{{count}}` where English active key expects `{count}`. |
| `/deals` | `src/app/deals/page.tsx` | `deals.*` package/cabin/destination/calendar | local config arrays | Client page; config carries key names. | No confirmed visible gap. |
| `/destinations` | `src/app/destinations/page.tsx`, `DestinationCard` | destinations/region/tag keys | destination seed arrays | Client page; names/images are operational destination data. | No confirmed visible gap. |
| `/saved` | `src/app/saved/page.tsx`, `SavedTripsAndRecentSearches` | saved/search-history/account shell | saved trips APIs/local storage | Server wrapper + client content. | NL `removeRecentSearch` placeholder defect. |
| `/dashboard` and account subroutes | dashboard page/components and preference/trips/alerts/support pages | `accountDashboard.*`, personal/security/preferences/trips/alerts/support | user profile/session | Server pages with client dashboard components. | Dynamic fallback words `traveler` need manual runtime review. |
| `/faq`, `/faq?from=account` | `src/app/faq/page.tsx`, `FaqContent`, `FaqAccordion` | FAQ/account support CTA keys | `src/content/faqs` | Server wrapper + client content. | No confirmed visible gap. |
| `/support` | `SupportContent`, `SupportForm` | support page/form keys | support API | Client/server content. | Metadata English. |
| `/service-guarantee` | `ServiceGuaranteeContent` | service guarantee keys | static content | Content component. | Metadata English. |
| `/more-service-info` | `MoreServiceInfoContent` | more service info keys | static content | Uses English dictionary metadata only. | No confirmed visible content gap. |
| `/about` | `AboutPageContent` | about page keys | static content | Server wrapper + component. | Metadata English. |
| `/how-it-works` | `HowItWorksContent` | how-it-works keys | static content | Content component. | Metadata English. |
| `/legal` | `LegalPageContent` | `legal.index.*` | legal document service | Server page lists documents. | Metadata English. |
| `/legal/[slug]` | `LegalViewer`, `legalDocumentService` | `legal.*` namespaces | legal documents | Dynamic detail; static params from service. | Fallback title `Legal Document` hardcoded if missing document metadata. |

## 5. Confirmed issues table

| ID | Severity | Route/page | Locale(s) | Text/key | Source | Root cause | Evidence | Recommended branch | Minimal files | Impact |
|---|---|---|---|---|---|---|---|---|---|---|
| GLV2-001 | high | Auth login-code verification | `vi` | `loginCodeInstructions` missing `{{minutes}}` | `src/lib/i18n/vi.ts:494` | placeholder mismatch | English active key includes `{{email}}` and `{{minutes}}`; Vietnamese keeps only `{{email}}`, so expiry minutes cannot be interpolated. | `fix/i18n-vi-login-code-placeholder` | `src/lib/i18n/vi.ts`, tests | Visible UI |
| GLV2-002 | high | `/hotels` destination cards | all non-English locales | hotel destination `imageAlt` strings | `src/app/hotels/page.tsx:48`, `:57`, `:66`, `:75`, `:88`, `:97`, `:106`, `:115`, `:127`, `:136`, `:145`, `:154`, `:163` | hardcoded JSX/config string | Active `/hotels` client page renders hardcoded English alt text from the card config. | `fix/i18n-hotels-image-alt` | `src/app/hotels/page.tsx`, locale dictionaries/tests | Hidden accessibility label |
| GLV2-003 | medium | Language selector | `nl` | `openLanguagePreferences` missing `{{language}}` | `src/lib/i18n/nl.ts:1560` | placeholder mismatch | Active English key announces current language with `{{language}}`; Dutch drops it. | `fix/i18n-nl-language-selector-placeholders` | `src/lib/i18n/nl.ts`, tests | Hidden aria label |
| GLV2-004 | medium | Saved/recent searches | `nl` | `removeRecentSearch` missing `{{label}}` | `src/lib/i18n/nl.ts:1631` | placeholder mismatch | Remove action loses the searched label in Dutch. | `fix/i18n-nl-recent-search-placeholder` | `src/lib/i18n/nl.ts`, tests | Hidden aria label |
| GLV2-005 | medium | `/cars/results` filters | `nl` | `carsResults.activeFilterCount`, `selectedFilterCount`, `openFiltersWithCount` use `{{count}}` but active keys expect `{count}` | `src/lib/i18n/nl.ts:1611`, `:1621`, `:1625` | placeholder mismatch | Cars results active dotted keys have brace-style mismatch versus English, risking unreplaced count. | `fix/i18n-nl-cars-results-count-placeholders` | `src/lib/i18n/nl.ts`, tests | Visible UI / aria |
| GLV2-006 | medium | Country/currency selector | `th` | `selectCountryCurrencyOption` missing `{{code}}` | `src/lib/i18n/th.ts:229` | placeholder mismatch | English active aria option includes country code, country, and currency; Thai omits code. | `fix/i18n-th-country-currency-placeholder` | `src/lib/i18n/th.ts`, tests | Hidden aria label |
| GLV2-007 | medium | Language selector | `th` | `languageUnavailableMessage` missing `{{language}}` | `src/lib/i18n/th.ts:216` | placeholder mismatch | Unavailable-language message cannot identify selected language in Thai. | `fix/i18n-th-language-unavailable-placeholder` | `src/lib/i18n/th.ts`, tests | Visible UI |
| GLV2-008 | medium | Home destination save action | `ko` | `homeSaveDestination` uses `{{destination}}` instead of `{{city}}` | `src/lib/i18n/ko.ts:967` | placeholder mismatch | Active homepage formatter expects city placeholder; Korean uses a different token. | `fix/i18n-ko-home-save-placeholder` | `src/lib/i18n/ko.ts`, tests | Hidden aria/action label |
| GLV2-009 | medium | Flight/hotel mobile picker result counts | `ar` | `optionFound`, `resultFound` missing `{{count}}` | `src/lib/i18n/ar.ts:1020`, `:1022` | placeholder mismatch | Arabic strings are singular fixed text and drop the active count token. | `fix/i18n-ar-picker-count-placeholders` | `src/lib/i18n/ar.ts`, tests | Visible UI |
| GLV2-010 | low | Flight result pages metadata | all non-English locales | `Flight Results`, `Flight Details` | `src/app/flights/results/page.tsx:13`, `src/app/flights/details/[id]/page.tsx:5` | hardcoded metadata string | Active server route metadata is English-only. | `fix/i18n-flight-metadata` | page metadata/helpers | Metadata/SEO |
| GLV2-011 | low | Hotel results metadata | all non-English locales | `Hotel Results` | `src/app/hotels/results/page.tsx:7` | hardcoded metadata string | Active server route metadata is English-only. | `fix/i18n-hotel-metadata` | page metadata/helpers | Metadata/SEO |
| GLV2-012 | low | Static informational pages metadata | all non-English locales | `Customer support`, `Service Guarantee`, `About Kurioticket`, `How Kurioticket Works`, `Legal Center` | `src/app/support/page.tsx:3`, `src/app/service-guarantee/page.tsx:3`, `src/app/about/page.tsx:5`, `src/app/how-it-works/page.tsx:3`, `src/app/legal/page.tsx:4` | hardcoded metadata string | Active pages render localized content but English page titles. | `fix/i18n-static-page-metadata` | page metadata/helpers | Metadata/SEO |
| GLV2-013 | low | Tests for Thai footer | test only | stale class expectation | `src/lib/__tests__/language.test.ts:14191` | stale test expectation | Test asserts an exact footer class string that no longer matches active footer markup. | `fix/tests-th-footer-class-expectation` | `src/lib/__tests__/language.test.ts` | Test only |
| GLV2-014 | low | Tests for Vietnamese hotel results | test only | stale expected `hotelResults.budgetPrice` | `src/lib/__tests__/language.test.ts:15402` | stale test expectation | Current Vietnamese dictionary has `Ngân sách / mỗi đêm`; a later test fixture still expects `Ngân sách / Giá`. | `fix/tests-vi-hotel-budget-price` | `src/lib/__tests__/language.test.ts` | Test only |

## 6. Manual-review / possible false-positive table

| ID | Route/page | Locale(s) | Suspicious item | Why not confirmed | Recommended verification |
|---|---|---|---|---|---|
| MR-001 | `/dashboard` | all non-English | fallback display name `traveler` | It is only used when no user name/email exists and may not be visible for real signed-in users. | Runtime signed-in state with empty profile. |
| MR-002 | `/` and marketing pages | partial locales | large identical-to-English counts in automated scan | Many values are brand, location, provider, legal, short labels, or intentionally preserved operational text; individual active hits need runtime review. | Screenshot/runtime sweep per locale. |
| MR-003 | Legal detail pages | all non-English | `Legal Document` fallback metadata | Fallback only occurs when a missing document would hit `notFound`; not normally visible for active slugs. | Check generated metadata for every active slug. |
| MR-004 | Admin/account-deletion/onboarding hits | all non-English | hardcoded English found by source scanner | These routes were outside the requested route matrix or appear operational/admin-only. | Separate admin/onboarding language audit. |

## 7. Resolved/obsolete prior-audit findings

No prior `language-audit-report.md` or `scripts/audit-i18n-coverage.mjs` existed in this checkout, so no previous finding could be marked confirmed, resolved, false positive, or manual-review. This v2 report is independent.

## 8. Non-issues / preserved operational text

Examples intentionally not flagged: `Kurioticket`, `Kurioticket LLC`, `2172630-70`, route paths, query keys, API paths, slugs, airport codes, airline/provider/hotel/car-provider names, city names used as search payload values, country/currency/locale codes, prices, dates/times from source data, support/legal emails, and placeholder tokens such as `{{email}}`, `{{minutes}}`, `{{country}}`, `{{currency}}`, `{{language}}`, `{{origin}}`, `{{destination}}`, `{{price}}`, `{{score}}`, and `{{label}}` when intentionally preserved.

## 9. Test/check status

| Check | Status | Notes |
|---|---:|---|
| Duplicate keys in active locale files | PASS | No duplicate property names detected by the audit script; Polish `closeFilters` appears exactly once as a bare key. |
| Placeholder parity | FAIL | Confirmed mismatches listed as GLV2-001, GLV2-003 through GLV2-009; script also reports lower-risk non-active/nested mismatches for some bag/departs keys. |
| Registry normalization | PASS | `vi`, `vi-VN`, `vi-vn`; `th`, `th-TH`, `th-th`; and `id`, `id-ID`, `id-id` normalize as required. |
| Directionality | PASS | Arabic is `rtl`; all other active available locales are `ltr`. |
| Polish `closeFilters` exact once | PASS | Exact bare-key count: 1. |
| Indonesian `{{email}}` preservation | PASS | Indonesian dictionary still contains `{{email}}`. |
| Source hardcoded-English search | REVIEWED | 144 broad hits; confirmed active requested-route defects are hotel alts and metadata. |
| Suspicious English in non-English locale files | REVIEWED | High identical-English counts remain risk indicators, not bulk-confirmed issues. |
| `git diff --check` | PASS | No whitespace errors. |
| Conflict markers | PASS | `rg` and `npm run check:conflicts --if-present` found no conflict markers. |
| `npm test -- src/lib/__tests__/language.test.ts` | FAIL | 298 passed, 2 failed: stale Thai footer class assertion and stale Vietnamese budget-price expected value. |
| `npx tsc --noEmit --pretty false` | FAIL | Existing unrelated `RouteContext` errors in `src/app/api/account/security/passkeys/[id]/route.ts`. |
| `npm run build` | PASS | Build completed successfully despite standalone tsc issue. |
| `npm run lint` | PASS with warnings | Existing `<img>` warnings plus the audit script warning was removed after first lint run. |
| Package/lockfile changes | PASS | No package or lockfile files changed. |

## 10. Recommended fix order

1. `fix/i18n-placeholder-parity-v2`: GLV2-001, GLV2-003 through GLV2-009. Safest first because these are concrete interpolation defects and can be tested without UI redesign.
2. `fix/i18n-hotels-image-alt`: GLV2-002. Add locale keys for `/hotels` destination image alts or route card alt builders without changing hotel search behavior.
3. `fix/i18n-page-metadata`: GLV2-010 through GLV2-012. Centralize localized metadata for active marketing/result/legal pages.
4. `fix/language-tests-current-render-path`: GLV2-013 and GLV2-014. Update stale assertions only after confirming the active footer markup and Vietnamese value are intended.
5. `audit/admin-onboarding-language-coverage`: MR-004 follow-up for hardcoded English outside this requested route scope.
