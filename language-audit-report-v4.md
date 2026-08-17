# Kurioticket customer language audit v4

## Scope, provenance, and verification boundary

- **Audit date:** 2026-08-17 UTC.
- **Hosted `dev` fetch:** attempted from `https://github.com/Zentric-Analytics/Kurioticket.com.git`, but the environment's CONNECT proxy returned HTTP 403. The newest hosted-development snapshot present in the supplied repository, and therefore the exact base used, is **`fe8c09dd1f88ccc45baa88a2e7672f5c37858bd0`**. This is newer than the inspection-time SHA `9e0c0b1be11ca75654425f761735ca3382167320`.
- **Branch:** `codex/full-customer-language-audit`; target requested: `dev`.
- **Method:** `scripts/audit-i18n-coverage-v4.mjs` uses the installed TypeScript compiler API, derives available languages from the live registry, separates explicit source properties from `...en` inheritance, follows customer route import graphs, and emits the committed issue and route matrices.
- **Runtime status:** **RUNTIME UNVERIFIED**. No browser automation or safe authenticated account/session was available. Static inspection must not be read as desktop, mobile, persistence, or authenticated runtime proof.

## Inventory

The live selector exposes 18 available locales: `en-us`, `es-es`, `fr`, `de-de`, `it-it`, `pt-br`, `nl`, `ar`, `zh-cn`, `ja`, `ko`, `hi`, `tr`, `pl`, `sv`, `id`, `th`, and `vi`.

The audit discovered **81** route patterns from current `src/app`: **39 public/optional-session**, **25 customer account/auth**, and **17 admin**. Admin is inventoried but excluded from the customer remediation total. Customer routes comprise seven logged-out authentication routes, fifteen statically logged-in routes, and three routes whose auth state requires runtime review. The exact 1,458 route/locale rows, special files, reachable shared components, state candidates, metadata/accessibility counts, and route classifications are in `language-audit-route-matrix-v4.csv`.

The current English dictionary has 3,929 keys. Static binding analysis found **1,104 translation-key references**, of which **1,071 resolve to canonical English customer-visible keys**; 33 referenced keys are absent from English and remain a contract blocker. It found 2,237 visible-source literal hits, 265 confirmed visible English fallbacks, 182 fallback candidates needing review, 235 unresolved dynamic-key candidates, and 173 RTL manual-review candidates. These are candidates across production source; runtime visibility was not claimed.

## Before and after language matrix

“Explicit” means a property declared in the locale module source. “Inherited” means the required value comes from English through spread/fallback. Explicit-identical values are retained as review risks rather than automatically declared defects. Hardcoded/mixed is a global source-candidate count because a literal can affect every locale through shared UI.

| Locale | Dir | Explicit before | Inherited before | Placeholder before | Hardcoded/mixed before | Explicit after | Inherited after | Identical after | Blank after | Placeholder after | Known blocker                             |
| ------ | --- | --------------: | ---------------: | -----------------: | ---------------------: | -------------: | --------------: | --------------: | ----------: | ----------------: | ----------------------------------------- |
| en-us  | ltr |           1,071 |                0 |                  0 |         2,238 / review |          1,071 |               0 |           1,071 |           0 |                 0 | source literals/runtime                   |
| es-es  | ltr |             929 |              142 |                  0 |         2,238 / review |            929 |             142 |              25 |           0 |                 0 | inherited UI; legal approval              |
| fr     | ltr |             925 |              146 |                  0 |         2,238 / review |            925 |             146 |              31 |           0 |                 0 | inherited UI; legal approval              |
| de-de  | ltr |             917 |              154 |                  0 |         2,238 / review |            917 |             154 |              31 |           0 |                 0 | inherited UI; legal approval              |
| it-it  | ltr |             922 |              149 |                  0 |         2,238 / review |            922 |             149 |              30 |           0 |                 0 | inherited UI; legal approval              |
| pt-br  | ltr |             901 |              170 |                  0 |         2,238 / review |            901 |             170 |              27 |           0 |                 0 | inherited UI; legal approval              |
| nl     | ltr |             898 |              173 |                  3 |         2,238 / review |            898 |             173 |              51 |           0 |                 0 | inherited UI; legal approval              |
| ar     | rtl |             796 |              275 |                  1 |         2,238 / review |            796 |             275 |              24 |           0 |                 0 | inherited UI; legal approval; RTL runtime |
| zh-cn  | ltr |             814 |              257 |                  0 |         2,238 / review |            814 |             257 |              24 |           0 |                 0 | inherited UI; legal approval              |
| ja     | ltr |             794 |              277 |                  4 |         2,238 / review |            794 |             277 |              24 |           0 |                 0 | inherited UI; legal approval              |
| ko     | ltr |             781 |              290 |                  3 |         2,238 / review |            781 |             290 |              25 |           0 |                 0 | inherited UI; legal approval              |
| hi     | ltr |             773 |              298 |                  0 |         2,238 / review |            773 |             298 |              28 |           0 |                 0 | inherited UI; legal approval              |
| tr     | ltr |             799 |              272 |                  0 |         2,238 / review |            799 |             272 |              28 |           0 |                 0 | inherited UI; legal approval              |
| pl     | ltr |             755 |              316 |                  0 |         2,238 / review |            755 |             316 |              27 |           0 |                 0 | inherited UI; legal approval              |
| sv     | ltr |             754 |              317 |                  0 |         2,238 / review |            754 |             317 |              30 |           0 |                 0 | inherited UI; legal approval              |
| id     | ltr |             733 |              338 |                  0 |         2,238 / review |            733 |             338 |              35 |           0 |                 0 | inherited UI; legal approval              |
| th     | ltr |             729 |              342 |                  1 |         2,238 / review |            729 |             342 |              20 |           1 |                 0 | inherited UI; blank; legal approval       |
| vi     | ltr |             727 |              344 |                  0 |         2,238 / review |            727 |             344 |              32 |           0 |                 0 | inherited UI; legal approval              |

**Before totals:** 12 placeholder defects in five locales; 2,238 source literal hits; 265 visible English fallbacks; mixed-language values remain a manual-review category rather than a reliable automated count. **After totals:** zero placeholder defects; 2,237 literal hits after removing the confirmed `Guests & Rooms` fallback/branch pattern. Explicit/inherited totals did not materially change because placeholder corrections update existing explicit properties rather than adding unapproved bulk translations.

## Confirmed remediation

1. Root server rendering now derives canonical `html lang` and `dir` from the validated locale cookie and supplies the same initial locale to `LocaleProvider`, preventing the known server-English/client-selected mismatch. Unsupported cookie values normalize safely to `en-us`; Arabic starts as RTL.
2. The provider initializes from the server locale instead of independently reading client storage during hydration. Current and legacy `ct_language` storage remain supported; writes synchronize the cookie and both storage keys.
3. Account preference hydration now uses a separate account-hydration setter. A manual/current cookie-backed selection cannot be silently replaced by a later account fetch; a valid stored account locale can hydrate only from the default source. Unsupported account locales remain rejected by the available-locale set.
4. Removed two customer-visible English `Guests & Rooms` safety fallbacks and the locale-specific English branch; these controls consistently consume the translation contract.
5. Corrected all 12 audited placeholder mismatches in Dutch, Arabic, Japanese, Korean, and Thai without changing provider/search/package behavior.
6. `npm run audit:i18n` now runs the v4 AST audit and emits explicit, inherited, identical, blank, placeholder, hardcoded/fallback, route, accessibility, metadata, and RTL evidence.

## Defects and blockers still open

This audit **does not claim complete localization**. Available non-English locales still inherit 142–344 of the 1,071 canonical used keys. The committed issue matrix also retains hardcoded-source, metadata/accessibility, fallback, dynamic-key, formatting, and RTL review findings. Substantive legal copy is explicitly blocked pending approved human/legal translations; the repository labels portions of the English privacy/legal material as drafts requiring qualified legal review, so this change does not invent translations. Thai retains one blank required value. The literal `Recently` and broader security/account copy in `DashboardGrid.tsx` remain confirmed logged-in localization work, alongside browser-locale `Intl` formatting sites.

Consequently, logged-out, logged-in, mobile, desktop, Arabic RTL, and persistence behavior are **STATICALLY REVIEWED / RUNTIME UNVERIFIED**, not passed end-to-end. The success condition is not fully met until the inherited and approved-legal blockers are resolved and the runtime matrix is executed with a safe session.
