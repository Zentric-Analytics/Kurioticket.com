# Kurioticket active language response audit (ChatGPT)

## Executive summary

- **Branch:** `audit/active-language-response-coverage-chatgpt`
- **Base:** repository default branch `dev`
- **Audit type:** source-based language-response audit. This audit inspected active Kurioticket files through the GitHub repository connector and compared active render paths against active locale dictionaries.
- **Scope:** active public/product route groups, global layout, selectors, auth flows, results pages, account/dashboard pages, FAQ/support/service/legal pages, and active locale registry/dictionary files.
- **Important limitation:** this report does not claim browser screenshot coverage, local build coverage, or local test coverage from this ChatGPT environment. It records source-level confirmed issues and manual-review items separately.
- **Production changes:** none. This branch adds only this audit report.

## Active locales checked

Active available locales observed in the source registry:

`en-us`, `es-es`, `fr`, `de-de`, `it-it`, `pt-br`, `nl`, `ar`, `zh-cn`, `ja`, `ko`, `hi`, `tr`, `pl`, `sv`, `id`, `th`, `vi`.

Registry and normalization notes:

- `src/lib/supportedLocales.ts` includes the 18 active available locales, including Arabic as `rtl` and all other audited locales as `ltr`.
- `src/lib/i18n/index.ts` imports active dictionaries and maps locale aliases for `id-id`, `th-th`, and `vi-vn` to the active dictionaries.
- `src/lib/language.ts` normalizes selected languages and updates the document `lang` / `dir` client-side through `LocaleProvider`.

## Methodology

I inspected source files that actively render language-dependent UI:

- Locale registry and normalization: `src/lib/supportedLocales.ts`, `src/lib/language.ts`, `src/lib/i18n/index.ts`.
- Root layout and metadata: `src/app/layout.tsx`.
- Global language response: `src/components/layout/LocaleProvider.tsx`, `src/components/layout/AppHeader.tsx`.
- Country/currency selector: `src/components/region/CountryCurrencySelector.tsx`.
- Homepage: `src/app/page.tsx`.
- Hotels landing: `src/app/hotels/page.tsx`.
- Auth login code flow: `src/components/auth/SigninForm.tsx`.
- Cars results placeholder behavior: `src/components/results/CarsResultsClient.tsx`.
- Active locale dictionaries for the confirmed affected languages: `vi.ts`, `nl.ts`, `th.ts`, `ko.ts`, `ar.ts`, plus English reference values.
- Existing `language-audit-report-v2.md` was used only as a comparison point; the confirmed findings below were re-checked against active source files where marked confirmed.

False positives intentionally filtered out:

- `Kurioticket`, `Kurioticket LLC`, registration numbers, support/legal emails.
- Route paths, API paths, query params, IDs, slugs, enum values.
- Provider names, airline names, airport codes, flight numbers, hotel/car provider names.
- Country/currency/locale codes in metadata or operational selectors.
- Prices, dates/times as source data, user-entered text, names, emails.
- Placeholder tokens that must remain unchanged.

## Confirmed issues

| ID | Severity | Route / area | Locale(s) | Problem | Evidence | Root cause | Recommended branch | Minimal files |
|---|---|---|---|---|---|---|---|---|
| LRA-001 | High | Auth login-code verification | `vi` | `loginCodeInstructions` omits `{{minutes}}`, while the active login-code UI formats the string with both `email` and `minutes`. | `src/components/auth/SigninForm.tsx` passes `{ email, minutes: 10 }`; `src/lib/i18n/vi.ts` only contains `{{email}}`. | Placeholder mismatch | `fix/i18n-vi-login-code-placeholder` | `src/lib/i18n/vi.ts`, tests |
| LRA-002 | High | `/hotels` destination and inspiration cards | all non-English locales | Several image alt strings come from hardcoded English card config or incomplete `hotelDestination.*.imageAlt` dictionary coverage. | `/hotels` card config contains English `imageAlt`; active `translateHotelCard` falls back to `enTranslations` or the hardcoded card alt. | Hardcoded config / missing locale keys | `fix/i18n-hotels-image-alt` | `src/app/hotels/page.tsx`, locale dictionaries, tests |
| LRA-003 | Medium | Language selector trigger | `nl` | `openLanguagePreferences` drops `{{language}}`, so the active aria/title text cannot include the selected language in Dutch. | `AppHeader` replaces `{{language}}`; `nl.ts` has a static string without the token. | Placeholder mismatch | `fix/i18n-nl-language-selector-placeholders` | `src/lib/i18n/nl.ts`, tests |
| LRA-004 | Medium | Cars results filters | `nl` | `carsResults.activeFilterCount`, `carsResults.selectedFilterCount`, and `carsResults.openFiltersWithCount` use `{{count}}`, but the active cars-results interpolator only replaces `{count}`. | `CarsResultsClient` uses single-brace replacement; Dutch uses double-brace tokens for these active keys. | Placeholder contract mismatch | `fix/i18n-nl-cars-results-count-placeholders` | `src/lib/i18n/nl.ts`, tests |
| LRA-005 | Medium | Country/currency selector option aria labels | `th` | `selectCountryCurrencyOption` omits `{{code}}`, while the active selector formats `country`, `code`, and `currency`. | `CountryCurrencySelector` passes all three values; `th.ts` includes only `{{country}}` and `{{currency}}`. | Placeholder mismatch | `fix/i18n-th-country-currency-placeholder` | `src/lib/i18n/th.ts`, tests |
| LRA-006 | Medium | Language selector unavailable-language message | `th` | `languageUnavailableMessage` omits `{{language}}`, so the Thai message cannot name the selected unavailable language. | `AppHeader` replaces `{{language}}`; `th.ts` uses a fixed sentence without the placeholder. | Placeholder mismatch | `fix/i18n-th-language-unavailable-placeholder` | `src/lib/i18n/th.ts`, tests |
| LRA-007 | Medium | Homepage popular destination save button aria label | `ko` | `homeSaveDestination` uses `{{destination}}`, but the active `DestinationCard` replaces `{{city}}`. | Homepage passes `saveLabelTemplate`; `DestinationCard` calls `.replace("{{city}}", city)`; Korean uses `{{destination}}`. | Placeholder mismatch | `fix/i18n-ko-home-save-placeholder` | `src/lib/i18n/ko.ts`, tests |
| LRA-008 | Medium | Flight / hotel mobile picker count labels | `ar` | Singular count keys `optionFound` and `resultFound` omit `{{count}}`, while English count labels include the count token. | Arabic strings are fixed singular text; English reference strings include `{{count}}`. | Placeholder mismatch | `fix/i18n-ar-picker-count-placeholders` | `src/lib/i18n/ar.ts`, tests |
| LRA-009 | Medium | Global header hidden accessibility labels | all non-English locales | `AppHeader` has hardcoded `aria-label="Kurioticket home"` and `aria-label="Primary"` on active header/nav elements. | Active header file renders these hardcoded aria labels directly instead of using `t.*`. | Hardcoded JSX aria text | `fix/i18n-header-aria-labels` | `src/components/layout/AppHeader.tsx`, locale dictionaries, tests |
| LRA-010 | Low | Global page metadata | all non-English locales | Root metadata title and description are hardcoded English. | `src/app/layout.tsx` metadata uses English `title.default` and `description`. | Hardcoded metadata | `fix/i18n-page-metadata` | metadata helpers/page files, locale dictionaries |
| LRA-011 | Low | Existing language tests | test only | Existing v2 report records stale Thai footer class and Vietnamese hotel budget-price expectations. | `language-audit-report-v2.md` records 298 pass / 2 stale failures. | Stale test expectation | `fix/language-tests-current-render-path` | `src/lib/__tests__/language.test.ts` |

## Manual-review items

| ID | Area | Suspicious item | Why manual-review |
|---|---|---|---|
| MR-001 | Root HTML language | `src/app/layout.tsx` renders `<html lang="en">` server-side and `LocaleProvider` updates `lang` / `dir` client-side. | Needs runtime SSR/hydration review to decide whether the initial server document language should follow stored/selected locale. |
| MR-002 | Header flag fallback alt | `AppHeader` has fallback alt text `"Flag"` if no `fallbackText` is present. | Active registry appears to provide fallback text for audited locales, so this is likely not visible, but should be checked when adding locales. |
| MR-003 | Mobile preferences heading fallback | `AppHeader` uses `t.mobilePreferencesHeading || "Preferences"`. | If any active locale lacks the key, the mobile drawer can show English. Needs full key parity check. |
| MR-004 | Existing broad identical-English counts | The previous v2 report noted broad identical-English risk in partial locales. | These need browser/runtime screenshot sweeps and cannot be bulk-confirmed from dictionary equality alone because many values are operational names or intentionally preserved. |
| MR-005 | Admin/onboarding routes | Previous audit noted admin/onboarding English hits outside the requested route matrix. | Needs a separate admin/onboarding audit if those routes are user-facing. |

## Non-issues preserved

Not counted as translation defects:

- Airport codes, country codes, currency codes, and locale codes.
- Route paths, API paths, query params, object IDs, slugs, enum values.
- Provider/airline/hotel/car-provider names.
- User-provided names, emails, free text, dates/times, and source prices.
- `Kurioticket`, `Kurioticket LLC`, `2172630-70`, support/legal/privacy emails.
- Placeholder tokens when intentionally preserved.

## Recommended fix order

1. `fix/i18n-placeholder-parity-v2` or split smaller branches:
   - `fix/i18n-vi-login-code-placeholder`
   - `fix/i18n-nl-language-selector-placeholders`
   - `fix/i18n-nl-cars-results-count-placeholders`
   - `fix/i18n-th-country-currency-placeholder`
   - `fix/i18n-th-language-unavailable-placeholder`
   - `fix/i18n-ko-home-save-placeholder`
   - `fix/i18n-ar-picker-count-placeholders`
2. `fix/i18n-hotels-image-alt`
3. `fix/i18n-header-aria-labels`
4. `fix/i18n-page-metadata`
5. `fix/language-tests-current-render-path`
6. Optional follow-up: `audit/admin-onboarding-language-coverage`

## Test/check status for this ChatGPT audit branch

- Source inspection completed through GitHub connector.
- Branch created: `audit/active-language-response-coverage-chatgpt`.
- Production UI/dictionaries changed: no.
- Package or lockfile changes: no.
- Local tests/build/lint were not run by this ChatGPT environment. The existing v2 report on `dev` records build passing, lint passing with existing `<img>` warnings, language test failing only on stale Thai/Vietnamese assertions, and standalone `tsc` failing on unrelated `RouteContext` errors.

## Conclusion

The language system is generally wired through active locale dictionaries and the selector/registry normalization is working for the active locale set. The remaining confirmed issues are mostly placeholder-contract mismatches, hardcoded accessibility/metadata text, and `/hotels` image-alt coverage. The safest next branch is the placeholder parity fix because it is concrete, low-risk, and testable without UI redesign.
