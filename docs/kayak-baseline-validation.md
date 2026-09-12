# KAYAK sandbox: baseline validation reconciliation

Status: **in progress, not a release sign-off**. No deployment or live environment
configuration has been changed. The sandbox preview remains isolated from normal
website and native search. User approval covers investigating the pre-existing
failures before releasing the integration.

## Reproduced baseline

The clean dev-based worktree initially reported 2,828 passing and 212 failing
web/server tests. Excluding the KAYAK tests produced the same 212 failure names.
These are not 212 confirmed runtime bugs.

Windows checkout conversion affected source-contract tests containing literal
newlines. Explicit LF attributes and native dependency installation allowed a
subsequent run to report 2,860 passes and 194 failures. The latest full run in
`kurioticket-baseline-reconciled.log` reports 2,886 passes and 170 failures out of
3,056 tests. The next full checkpoint after the corrections below reports **2,909
passes and 154 failures out of 3,063 tests** (`kurioticket-baseline-checkpoint.log`).
Raw logs are retained in the local temporary
directory, not committed because assertion failures can dump entire source files.

## Corrections and rationale

- `.gitattributes`: deterministic LF for text, CRLF exceptions for Windows command
  files. No global Git settings changed. Attribute tests explicitly simulate
  `core.autocrlf=true`. Existing tracked CRLF text is normalized without changing
  its contents.
- Mobile password assertions preserve field-specific error responses introduced
  by `140926531`; the native password flow consumes those fields.
- Render contract checks use `autoDeployTrigger: off`, introduced by `a630ff510`.
  No Blueprint or live service setting changed.
- Feature-control bootstrap compares the complete registry key set and requires
  uniqueness instead of a stale count. Environment isolation assertions remain.
- Review lifecycle fixtures include the fare brand required for an eligible
  round-trip flight. No expiry or eligibility rule was relaxed.
- Package confirmation and breadcrumb fixtures follow the flight-first journey
  introduced by `a9cf92812`. Handoff/storage assertions remain. Retired Car Details
  URLs remain blocked and redirect to the guarded results stage.
- Locale tests compare the composed base + travel-account dictionary introduced
  by `b724e596e`, including fallback and alias behavior, not object identity.
- Legal translation tests exercise the extracted localization helper directly,
  including document namespaces, titles and paragraphs. Legal content was not
  edited.
- Car-picker source tests extract the named form using the TypeScript parser;
  an unrelated JSX fragment no longer prevents the entire test file from running.
  Missing/ambiguous declarations still fail. Picker behavior assertions remain.
- Mobile travel navigation is checked against the localized profile model and
  its actual routes, not English labels expected inside the screen source.
- Mobile flight/car editor tests retain the accessibility and focus behavior
  introduced by `e4ba59a8d`, `adbb6c060` and `a20db71ea`: the visual header state
  is separate from background interactivity, pointer/keyboard modality is passed
  to focus restoration, and scroll containment does not change root overflow.
  Multi-city tests follow the extracted shared drawer and still verify full-leg
  propagation into Results navigation.

## Targeted verification

- Package scenario/order/routes: 16 passed.
- Package breadcrumbs: 25 passed.
- Car request/retired-route guards: 4 passed.
- Legal locale checks: 10 passed.
- Car picker + source extraction checks: 9 passed.
- Native profile model: 5 passed from its native working directory.
- Mobile flight summary/drawer/shortcuts and focus: 16 passed.
- Car cancellation, focus and scroll lifecycle: 11 passed.
- Focused lint for every changed test/helper: passed.

These are focused results, not additive full-suite totals. Some first attempts
used the wrong test runner path configuration or working directory; corrected
commands use `JITI_TSCONFIG_PATHS=true` and the native package directory where
required. Those harness errors are not counted as application failures.

## Remaining investigation

Many UI source contracts still reference removed components, old styles, or old
copy. Each requires comparison with the current implementation and approved
history. The current Saved & Recent component also contains hard-coded English
text; moving assertions alone would not establish localization coverage there.
Do not simply remove these tests or restore retired UI to obtain a green run.

After reconciliation: rerun the full suite, application build and required parity
checks; release through the existing dev review path; configure and test the
staging-only KAYAK provider; complete normal website/native sandbox integration.
No claim of live KAYAK inventory or real booking completion follows from sandbox
results.
