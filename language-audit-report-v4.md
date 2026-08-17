# Customer language audit v4

> Status: **INCOMPLETE / STATIC AUDIT ONLY**. This report does not claim semantic completion.

## Provenance

- Hosted `dev` fetch was attempted twice but blocked by `CONNECT tunnel failed, response 403`.
- Working base available locally: `fcf312dc20df2bd9892a1ffaefbfbd1f2e57eaa2`.
- Available locales: `en-us`, `es-es`, `fr`, `de-de`, `it-it`, `pt-br`, `nl`, `ar`, `zh-cn`, `ja`, `ko`, `hi`, `tr`, `pl`, `sv`, `id`, `th`, `vi`.
- Discovered routes: **81**; route/locale rows: **1,458**; unmapped routes: **0**.
- Canonical English keys: **3,930**; customer-required keys: **1,105**.

## Baseline before

| Locale | Explicit | Inherited non-legal | Identical explicit (legacy metric) | Blank |
| ------ | -------: | ------------------: | ---------------------------------: | ----: |
| es-es  |      929 |                 142 |                                 25 |     0 |
| fr     |      925 |                 146 |                                 31 |     0 |
| de-de  |      917 |                 154 |                                 31 |     0 |
| it-it  |      922 |                 149 |                                 30 |     0 |
| pt-br  |      901 |                 170 |                                 27 |     0 |
| nl     |      898 |                 173 |                                 51 |     0 |
| ar     |      796 |                 275 |                                 24 |     0 |
| zh-cn  |      814 |                 257 |                                 24 |     0 |
| ja     |      794 |                 277 |                                 24 |     0 |
| ko     |      781 |                 290 |                                 25 |     0 |
| hi     |      773 |                 298 |                                 28 |     0 |
| tr     |      799 |                 272 |                                 28 |     0 |
| pl     |      755 |                 316 |                                 27 |     0 |
| sv     |      754 |                 317 |                                 30 |     0 |
| id     |      733 |                 338 |                                 35 |     0 |
| th     |      729 |                 342 |                                 20 |     1 |
| vi     |      727 |                 344 |                                 32 |     0 |

## Current after

| Locale | Explicit | Inherited non-legal | Explicit English review | Mixed | Blank | Placeholder defects |
| ------ | -------: | ------------------: | ----------------------: | ----: | ----: | ------------------: |
| es-es  |      930 |                 142 |                      26 |     2 |     0 |                   0 |
| fr     |      926 |                 146 |                      32 |     2 |     0 |                   0 |
| de-de  |      918 |                 154 |                      32 |     2 |     0 |                   0 |
| it-it  |      923 |                 149 |                      31 |     2 |     0 |                   0 |
| pt-br  |      902 |                 170 |                      28 |     2 |     0 |                   0 |
| nl     |      899 |                 173 |                      52 |     2 |     0 |                   0 |
| ar     |      797 |                 275 |                      25 |     2 |     0 |                   0 |
| zh-cn  |      815 |                 257 |                      25 |     2 |     0 |                   0 |
| ja     |      795 |                 277 |                      25 |     2 |     0 |                   0 |
| ko     |      782 |                 290 |                      26 |     2 |     0 |                   0 |
| hi     |      774 |                 298 |                      29 |     2 |     0 |                   0 |
| tr     |      800 |                 272 |                      29 |     2 |     0 |                   0 |
| pl     |      756 |                 316 |                      28 |     2 |     0 |                   0 |
| sv     |      755 |                 317 |                      31 |     2 |     0 |                   0 |
| id     |      734 |                 338 |                      36 |     2 |     0 |                   0 |
| th     |      730 |                 342 |                      21 |     2 |     0 |                   0 |
| vi     |      728 |                 344 |                      33 |     2 |     0 |                   0 |

## Classification and remaining work

- The audit now separates target-language copy, inherited English, suspicious explicit English, reviewed identical values, confirmed mixed-language copy, blanks, placeholder mismatch, legal blockers, and dynamic/manual review.
- Reviewed identical allowlist: **2 canonical English entries** (`brand.name`, `common.brandName`); non-English required values currently matched no allowlisted keys.
- Legal blockers: **0 currently classified**. No substantive legal copy was reclassified merely to reduce ordinary-UI counts.
- Dynamic/manual-review candidates: **235**.
- Canonical-missing findings: **33**. They remain pending individual disposition; no arbitrary canonical values were added. See `/tmp/kurioticket-i18n-audit-v4/key-analysis.json` from the audit run.
- Confirmed visible English fallbacks: **265**; likely/manual fallbacks: **183**; operational fallbacks excluded: **40**.
- Thai `signupAgreementBetweenLinks` blank was corrected.
- Account recency was translated in every available locale and account session/activity timestamps now use the selected language BCP47 tag.
- Browser/runtime, authenticated-session, mobile, desktop, and visual RTL validation: **RUNTIME UNVERIFIED**.

## Route inventory

The generated route matrix inventories 81 routes across public, authentication, customer dashboard/account, legal, and separately classified admin surfaces. `language-audit-route-matrix-v4.csv` is authoritative for route-to-source and locale evidence.

## Stop-target assessment

The requested zero-defect stop condition is **not met**. Remaining ordinary inherited, explicit-English, mixed-language, fallback, hardcoded-literal, and manual-review findings are preserved rather than hidden or misclassified.
