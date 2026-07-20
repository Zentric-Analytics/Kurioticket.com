# Kurioticket full language coverage audit v3 — corrected scanner

## Executive summary

- **Audit date:** 2026-07-20 UTC.
- **Audit base:** `d6857b296408d9b37df27692a60ac330ee34cc55` — `Merge pull request #3095 from Zentric-Analytics/codex/fix-admin-home-ui-issues`.
- **Existing hosted PR:** #3096, `docs(i18n): refresh full language coverage audit`; previous hosted head supplied by the user: `4a10644ea62a637d3eecf3df04b8b5296c425c25`; target: `dev`.
- **Scope:** report-only. No application, locale dictionary, package, lockfile, generated application source, test, fixture, or dependency file is changed.
- **Available locales:** 18.
- **Production TypeScript/TSX source files traversed:** 485.
- **Excluded test/spec/fixture/mock/story/generated source files:** 115. These files do not contribute strings, keys, fallbacks, routes, or coverage counts.
- **Route patterns:** 76; route/locale rows: 1,368; unmapped routes: 0.
- **Canonical English keys:** 3,146; binding-resolved used-key candidates: 1,096; effective English used keys: 1,056; finite dynamically resolved keys: 6; unresolved dynamic candidates: 208; generic `t` false-positive candidates: 331.
- **UI-sink/context literal hits:** 1,772.
- **Fallbacks:** 168 confirmed visible, 172 manual/likely, and 55 operational fallbacks excluded from UI defect totals.
- **RTL:** 146 source-level manual-review candidates, compacted into 36 source-file issues.
- **Placeholder defects:** 14 independently reviewable issue rows with exact English/locale values, tokens, brace styles, dictionary lines, and source excerpts.
- **Issues:** 248 confirmed source defects and 288 manual-review findings; severity totals are 15 high, 478 medium, and 43 low.
- **Runtime:** no browser tooling or safe logged-in/admin session was supplied. No end-to-end route or conditional state is claimed as runtime verified.

These corrected counts supersede the first v3 output. In particular, the old scanner counted any identifier named `t`, included test source, treated every English `??`/`||` fallback as confirmed visible, implied render-state verification from file traversal, and forced RTL counts to zero. The corrected scanner does none of those things.

## Corrected methodology and proof boundaries

The script uses the installed TypeScript compiler API and the live locale/i18n registries. It parses production `.ts`/`.tsx` source under `src/app`, `src/components`, `src/content`, `src/data`, `src/lib`, and `src/services`. Before analysis it excludes `*.test.*`, `*.spec.*`, `__tests__`, fixtures, mocks, stories, and generated trees. Excluded tests are used only for the separately reported validation run.

### Translation usage

The scanner tracks dictionary/function bindings established by i18n imports, `getTranslations()`, `useLocale()` destructuring, imported English dictionaries, and local helper functions whose body reads a dictionary. It does **not** automatically treat every `t` call as translation usage. Unbound `t` calls are retained as generic false-positive candidates in `/tmp`, outside confirmed coverage.

It resolves literal keys and attempts finite evaluation through constants, literal/as-const arrays, object maps, parentheses/assertions, ternaries, and nullish/boolean alternatives. It reports four separate totals: binding-confirmed keys, finite dynamic keys, unresolved dynamic candidates, and generic identifier candidates. String-literal unions and values passed through another module or prop can still require review; the scanner does not claim full TypeScript data-flow analysis.

### Visible text and fallback classification

Visible text analysis is sink/context based. It covers JSX text, string/template/conditional JSX expressions, accessibility/title/placeholder attributes, common UI configuration fields, metadata-shaped title/description fields, and message sinks such as toast, alert, confirm, `setError`, `setStatus`, `setMessage`, and `setSuccess`. It does not classify every arbitrary source literal as visible.

A literal at a direct UI sink is confirmed source evidence. Template/configuration propagation that cannot be proven to render is a candidate. Nullish/boolean fallbacks are classified as `confirmed_visible_fallback`, `manual_review`, or `operational_fallback`; the 55 operational provider/route/code/logging-style cases are excluded from confirmed UI issue totals. “Confirmed” proves a source path to a recognized UI sink, not that the runtime branch was exercised.

### Route graph and render states

Routes are derived from current `src/app` `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, and `default.tsx` files. Route groups are removed and dynamic segments retained. Relative and `@/` imports and applicable layouts are followed through production source only.

The route CSV now separates:

- `special_route_files_discovered`: special files found on disk;
- `conditional_state_candidates`: static state-like identifiers found in reachable code;
- `runtime_states_verified`: always `none` in this environment.

A traversed conditional is not described as a checked/rendered state. Audience/auth classification uses route location plus reachable session calls, redirects, and auth/admin guards. Four customer routes without conclusive static guard evidence are explicitly `auth_state_requires_runtime_review`; public routes that consume optional session state are `optional_session`.

### RTL review

Arabic is the available RTL locale. The scanner finds physical margin/padding/left/right/border utilities, inline direction assumptions, directional transforms/icons, and full-text `dir="ltr"`. It filters recognizable numeric, time, price, currency, airport/flight-number, map, and coordinate contexts. Every retained item is `manual_review` unless static breakage can actually be proven; evidence contains file, line, context, reason, and affected routes through the import graph.

## Locale registry and explicit coverage

`translationStatus` is registry metadata, not coverage proof. A property supplied through `...en` is inherited English even when present in the effective runtime dictionary. An explicit override identical to English is reported separately and is not automatically considered native translation.

| Code | Tag | Module | Dir | Registry status | Effective used | Explicit | Explicit % | Inherited English | Inherited % | Blank | Identical explicit | Placeholder defects |
|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| en-us | en-US | en.ts | ltr | ready | 1,056 | 1,056 | 100.0% | 0 | 0.0% | 0 | 0 | 0 |
| es-es | es-ES | es.ts | ltr | ready | 1,056 | 988 | 93.6% | 68 | 6.4% | 0 | 28 | 0 |
| fr | fr | fr.ts | ltr | partial | 1,056 | 984 | 93.2% | 72 | 6.8% | 0 | 33 | 0 |
| de-de | de-DE | de.ts | ltr | ready | 1,058 | 978 | 92.4% | 80 | 7.6% | 0 | 33 | 0 |
| it-it | it-IT | it.ts | ltr | partial | 1,056 | 981 | 92.9% | 75 | 7.1% | 0 | 33 | 0 |
| pt-br | pt-BR | pt-br.ts | ltr | partial | 1,056 | 960 | 90.9% | 96 | 9.1% | 0 | 30 | 0 |
| nl | nl-NL | nl.ts | ltr | partial | 1,056 | 957 | 90.6% | 99 | 9.4% | 0 | 54 | 5 |
| ar | ar | ar.ts | rtl | partial | 1,056 | 852 | 80.7% | 204 | 19.3% | 0 | 26 | 1 |
| zh-cn | zh-CN | zh-cn.ts | ltr | partial | 1,059 | 862 | 81.4% | 197 | 18.6% | 0 | 27 | 0 |
| ja | ja | ja.ts | ltr | partial | 1,057 | 853 | 80.7% | 204 | 19.3% | 0 | 26 | 4 |
| ko | ko | ko.ts | ltr | partial | 1,057 | 840 | 79.5% | 217 | 20.5% | 0 | 27 | 3 |
| hi | hi-IN | hi.ts | ltr | partial | 1,058 | 825 | 78.0% | 233 | 22.0% | 0 | 30 | 0 |
| tr | tr-TR | tr.ts | ltr | partial | 1,056 | 854 | 80.9% | 202 | 19.1% | 0 | 30 | 0 |
| pl | pl-PL | pl.ts | ltr | partial | 1,057 | 795 | 75.2% | 262 | 24.8% | 0 | 30 | 0 |
| sv | sv-SE | sv.ts | ltr | partial | 1,056 | 785 | 74.3% | 271 | 25.7% | 0 | 32 | 0 |
| id | id-ID | id.ts | ltr | partial | 1,057 | 766 | 72.5% | 291 | 27.5% | 0 | 38 | 0 |
| th | th-TH | th.ts | ltr | partial | 1,056 | 784 | 74.2% | 272 | 25.8% | 1 | 22 | 1 |
| vi | vi-VN | vi.ts | ltr | partial | 1,057 | 761 | 72.0% | 296 | 28.0% | 0 | 34 | 0 |

Aliases/normalization remain derived from the live registries: `en→en-us`, `es→es-es`, `de→de-de` (dictionary `de`), `it→it-it` (dictionary `it`), `pt→pt-br`, `zh→zh-cn`, regional Japanese/Korean/Hindi/Turkish/Polish/Indonesian/Thai/Vietnamese forms to their internal codes, and `ar-SA`/`ar-AE`/`ar-EG→ar`. All 18 are selector-available and resolve through the runtime dictionary registry.

## Complete route inventory and audience review

| Area | Routes | Static auth classification |
|---|---|---|
| Public/search/content | `/`, `/about`, `/cars`, `/cars/results`, `/contact`, `/deals`, `/destinations`, `/explore`, `/faq`, `/flights`, `/flights/[slug]`, `/flights/details/[id]`, `/flights/results`, `/guides`, `/guides/[slug]`, `/hotels`, `/hotels/[slug]`, `/hotels/details/[id]`, `/hotels/results`, `/how-it-works`, `/legal`, `/legal/[slug]`, `/legal-center`, `/more-service-info`, `/privacy`, `/redirect`, `/service-guarantee`, `/support`, `/terms` | 29 `optional_session` because shared session-aware navigation is reachable. |
| Authentication | `/auth/forgot-password`, `/auth/reset-password`, `/auth/signin`, `/auth/signup`, `/auth/two-factor`, `/auth/verify-email`, `/auth/verify-login` | logged out |
| Authenticated customer | `/account/pending-deletion`, `/dashboard`, `/dashboard/account`, `/dashboard/alerts`, `/dashboard/preferences`, `/dashboard/preferences/booking`, `/dashboard/preferences/customization`, `/dashboard/preferences/email`, `/dashboard/preferences/travel`, `/dashboard/recent-searches`, `/dashboard/saved`, `/dashboard/security`, `/dashboard/settings`, `/dashboard/support`, `/dashboard/trips`, `/dashboard/trips`, `/email/preferences`, `/onboarding`, `/onboarding/security`, `/recent-searches`, `/saved` | 16 statically guarded; 4 require runtime auth-state review. Exact row classification is in the route CSV. |
| Admin | `/admin` plus account-deletions, bookings, cars, content, flights, hotels, logs, monitoring, operations, platform, providers, redirects, searches, settings, support, system, and users, including dynamic detail routes | 20 statically admin-authenticated patterns. |

Hotel Details is explicitly covered at `/hotels/details/[id]` and `/hotels/[slug]`. Header, Footer, language and country/currency selectors, mobile navigation, account/preference/admin navigation, cards, filters, sort controls, pickers, pagination, saved/share actions, dialogs, galleries, loading/error/empty forms and message components are mapped through production import graphs.

## Static route status answers

- **Statically fully explicitly translated:** none. No route/locale row satisfies explicit-only coverage after reachable shared UI, literal candidates, dynamic candidates, placeholders, and inherited English are considered. This is a static finding, not an end-to-end judgment.
- **Routes with inherited English:** 49 of 76 patterns in at least one locale.
- **Routes with confirmed source hardcoded English:** 76 of 76 patterns because confirmed shared/root UI sinks propagate through applicable layout graphs.
- **Routes with candidate hardcoded English:** 76 of 76 patterns because unresolved configuration/template candidates also propagate through shared graphs.
- **Placeholder locales:** Dutch (5), Arabic (1), Japanese (4), Korean (3), Thai (1).
- **Runtime verification required:** all 76 patterns. Four customer patterns also require auth-state classification at runtime.

The route matrix reports route-local counts. It does not claim a visible literal or fallback branch necessarily executes for every locale; `confirmed` means the source reaches a recognized UI sink, while `runtime_status` remains `RUNTIME_UNVERIFIED`.

## Placeholder evidence

The issue CSV contains one row per defect, not one aggregate locale row. IDs `GLV3-001`–`GLV3-014` include exact English and locale excerpts, dictionary file/line, expected and actual token signatures, and brace style. Findings cover Dutch language/preferences/cars/recent-search tokens; Arabic `resultFound`; Japanese baggage tokens; Korean destination/baggage tokens; and Thai unavailable-language text. This critical evidence remains independently reviewable after `/tmp` is deleted.

## Fallback, visible text, metadata, and accessibility

- 168 fallbacks are confirmed to reach JSX or a recognized message/visible sink.
- 172 are manual/likely because propagation cannot be proven locally.
- 55 operational fallbacks are counted for transparency but excluded from UI defects.
- 1,772 visible-literal hits are grouped by production source file and distinguish direct sink evidence from candidates.
- Metadata-shaped title/description and accessibility attributes are included; route rows retain metadata/accessibility counts.
- Operational provider names, routes, codes, identifiers, internal logging, currency/airport codes, prices, dates, emails, legal identifiers, and user data are not automatically treated as localized UI.

## RTL and formatting

The 146 retained RTL candidates cover physical spacing/borders/positions, directional transforms/icons, and unsafe-looking full-text LTR declarations after filtering recognizable safe numeric/time/price/airport/map contexts. They are compacted into 36 source-file manual-review issues with exact line/context/reason. Static review cannot prove visual breakage, so the report does not call them confirmed RTL defects. Arabic desktop/mobile menus, filters, cards, galleries, dialogs, date ranges, plural ordering, and sentence/value order remain a priority runtime queue.

## Conditional states and runtime honesty

Fifteen route patterns have one or more special route files discovered. Component identifiers suggest loading, error, empty, unavailable, success, authenticated/unauthenticated, dialog-open, and mobile-menu-open candidates. These appear only in `conditional_state_candidates`; `runtime_states_verified` is `none` everywhere. Logged-in empty/success/error, onboarding, account deletion, provider unavailable, discovery/priced hotel, missing image, filter/dialog-open, and admin states require a safe runtime session and are not claimed as checked.

## Language-test failure reconciliation

The required language test currently has 208 tests: 172 pass and 36 fail. All failures inspect exact source text, component names, Tailwind classes, configuration snippets, helper calls, or template shapes; none renders the UI. They are excluded from production coverage and reconciled as validation-only manual issues:

| Failing assertion group | Count | Locale/source area | GLV3 issue | Status |
|---|---:|---|---|---|
| Saved/search-history exact `t(...)` and aria-label snippets | 5 | vi, pl, id, sv; saved/recent searches | GLV3-530 | stale/source-shape assertion; runtime localization not proven by this test |
| Preference component names and layout classes | 5 | th, pl, id, vi, sv; account preferences | GLV3-531 | stale/source-shape assertion |
| Dashboard/alerts/trips exact href, config, count, and template snippets | 9 | th, vi, tr, pl, id, sv | GLV3-532 | stale/source-shape assertion |
| Cars key reads, operational fixtures, classes, and time-format snippets | 8 | sv, pl, id, tr, th | GLV3-533 | stale/source-shape assertion |
| Hotel-results exact key-read assertion | 1 | sv; hotel results | GLV3-534 | stale/source-shape assertion |
| Homepage newsletter class and FAQ-key snippets | 3 | sv, pl; home | GLV3-535 | stale/source-shape assertion |
| Flight price-helper and details-link template snippets | 5 | pl, sv, th, id; flights | GLV3-536 | stale/source-shape assertion |
| **Total** | **36** | | | **all reconciled** |

This classification does not declare the corresponding UI correct. It says the failed assertion does not prove a current translation defect because it asserts implementation text rather than output. Relevant routes remain covered by inherited/literal/fallback/dynamic issues and remain runtime-unverified.

## V2 reconciliation

| Classification | Items |
|---|---|
| still present | GLV2-003, -004, -005, -007, -008, -009 |
| fixed | GLV2-001, -006, -013, -014 |
| partially fixed/runtime-unverified | GLV2-010, -011, -012 |
| obsolete architecture/scope | GLV2-002; MR-004 |
| still a coverage risk | MR-002 |
| cannot verify without runtime | MR-001, MR-003 |

Current exact placeholder evidence supersedes v2 line references. Admin, onboarding, Hotel Details, pending deletion, preferences and recent-search routes are no longer excluded.

## Manual runtime-review queue

1. Switch all 18 available selectors across representative public pages and verify document `lang`/`dir`, explicit versus fallback copy, and metadata/Open Graph.
2. Inspect desktop/mobile header, Footer, selectors, menus, filters, dialogs, galleries and cards, especially Arabic.
3. Exercise public loading/error/empty/unavailable and provider states without purchases or destructive actions.
4. With a supplied safe session, inspect authenticated dashboard/preferences/trips/alerts/saved/recent/account-deletion/onboarding/session states.
5. With a supplied safe admin session, verify locale inheritance/switching and operator-visible text across all 20 admin patterns.
6. Replace source-shape language tests with rendered/behavioral assertions before using them as localization proof.

## Known non-issues

Kurioticket branding; company registration data; route/API/query names; internal identifiers and logging; provider, airline, airport, hotel and supplier names; user data; currency/airport codes; prices; dates; support emails; legal identifiers; deliberate map/graph coordinates; and numeric/time/price/airport LTR isolation are not localization defects by themselves. Explicit strings identical to English are risk indicators, not automatically defects.

## Completeness and validation

- Available locales: 18/18 in the matrix.
- Routes: 76 discovered, 76 mapped, 0 unmapped.
- Production/test exclusion: 485 included, 115 excluded.
- Special route files, Hotel Details, header/Footer/selectors, logged-out/authenticated/onboarding/admin/account-deletion/email-preference/recent-search coverage: present.
- Inherited English is not counted as native translation.
- No runtime behavior is claimed without browser/session evidence.
- Detailed temporary evidence is written only beneath `/tmp/kurioticket-i18n-audit-v3`.

Validation command outcomes are updated after the final regenerated artifacts are checked and committed.

## Final validation results

| Command | Result |
|---|---|
| `JITI_TSCONFIG_PATHS=true node scripts/audit-i18n-coverage-v3.mjs` | PASS — 18 locales, 485 production files, 115 excluded files, 76/76 routes, 0 unmapped. |
| `npm run audit:i18n` | PASS — historical comparison completed. |
| `JITI_TSCONFIG_PATHS=true node --test --import jiti/register src/lib/__tests__/language.test.ts` | FAIL — 172 pass, 36 fail; all 36 are grouped and reconciled above and in GLV3-530–536. |
| `./node_modules/.bin/eslint scripts/audit-i18n-coverage-v3.mjs` | PASS — no findings. |
| `git diff --check` | PASS. |
| `git grep -n -E '^(<<<<<<<|=======|>>>>>>>)' -- .` | PASS — exit 1, no matches. |
| `npm run check:conflicts --if-present` | PASS. |
| `npm run build` | PASS — production build completed and emitted `.next/BUILD_ID`. |
| `npm run lint` | PASS with 7 existing warnings and 0 errors. |
