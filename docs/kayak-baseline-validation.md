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

### Next reconciliation group

Sign-in assertions now tolerate the multi-line Google provider call introduced by
the account-chooser update; six selected authentication/localization checks pass.
No authentication implementation changed. Date expectations retain weekday/year
formatting from `a6fd3703b` and check the current shared date-rendering paths;
three targeted date checks pass. Package-name expectations follow the existing
`4ee27c840` rename, not a new product-name change. The Package editor still uses
the `deals.*` translation namespace; its ten tests now verify those actual labels,
pending-state protection, and modal behavior. Focused lint passes.

A language-suite-only rerun reports **138 passes and 71 failures out of 209** in
`kurioticket-language-checkpoint.log`. This is not a new full-suite result and
does not supersede the full 2,909/154 checkpoint above.

These are focused results, not additive full-suite totals. Some first attempts
used the wrong test runner path configuration or working directory; corrected
commands use `JITI_TSCONFIG_PATHS=true` and the native package directory where
required. Those harness errors are not counted as application failures.

## Remaining investigation

### Completed all-file type-check remediation

The separate all-file TypeScript check initially reported 130 diagnostics, all in
test files. Fixes are being validated in focused groups, not hidden by excluding
tests or disabling type checking. Corrections include literal inference, optional
field narrowing, target-compatible equivalent regexes, complete recent-search
records, and explicit dependency interfaces for the session and database portions
actually consumed by recent-search and travel-preference handlers. Those handlers
retain their existing active-user checks and production dependencies.

The first 34 targeted checks passed; two-factor/travel preferences passed nine,
recent searches passed two, flight revalidation/discovery passed four, and
support/account-notification/saved-car checks passed fourteen. These counts are
separate focused runs, not a full-suite total.

The all-file check now passes with zero TypeScript diagnostics. Changed-file lint
and `git diff --check` also pass. Additional focused runs passed 25 manifest and
handoff checks, 21 hotel/journey checks, 57 package journey checks, 75 destination
editorial checks, and 55 notification/price-alert/WebAuthn/itinerary checks.
These are overlapping focused runs, not an additive suite total.

The latest full-suite result is 3,067 tests: 2,933 passed and 134 failed. Remaining
runtime/source-contract failures are not hidden by the type-check correction.
The complete logs are retained temporarily as `kurioticket-post-types-full-tests.log`
and `kurioticket-post-types-lint.log`. No release or staging configuration changed.

### Normal flight-route integration checkpoint

The local flight-results route has an explicit `provider=kayak-sandbox` branch.
It is protected by the existing server-side staging/development gate and noindex
metadata. It preserves supported normal flight criteria through a tested adapter,
shows simulated results in a separate view, and provides only sandbox click-outs.
The live booking pipeline is unchanged. A browser run for a Boston–New York return
journey returned 538 simulated offers with matching outbound/return dates.

This is not yet a complete normal-search journey: the normal form's sandbox entry,
hotel/car route integration, native integration, and staging release remain open.
The new screen and adapter are local, uncommitted work in progress.

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

### Further reconciliation after type validation

The complete application build passed. The homepage/directory group now passes
all 21 checks after matching the recorded removal of the newsletter
(`d77383f73`) and verifying same-location car intent through the current parser.
The compact Hotel header group passes four checks after retaining the intentional
Sort shortcut (`d5b25a9fb`). The language group is 141 passed / 68 failed after
matching the current account-menu key and same-location car URL representation.

Outstanding localization findings include hard-coded copy in `SavedRecentContent`
and the newer mobile Hotel shortcut controls. Some locale dictionaries also contain
copy from another language (for example, the Thai trip-load error is Chinese and
the Vietnamese one is French). These are not resolved by changing old source-path
assertions. No localization behavior change has been made for these findings yet.

### Car browser failures recovered locally

Package UI reconciliation reduced its targeted group from 16 failures to six
(157 of 163 passed), before a subsequent whitespace-only Hotel region assertion
correction. A new complete-suite total has not yet been established.

Fixed a real quick-filter keyboard defect: the active quick/full dialog now owns
initial focus, Tab wrapping and Escape, with launcher focus restored on closing.
All 13 car structure/keyboard checks passed. On the local app at 390 by 844,
both Transmission quick filters and the full Filters dialog opened by keyboard,
wrapped Shift-Tab/Tab between first and last controls, and returned focus to the
correct launcher after Escape. The temporary viewport was reset and test tab closed.

That browser run also reproduced a car results crash: the curated image helper's
new version was absent from Next Image's exact local query allowlist. The current
version is now shared with that allowlist, preserving the previous allowed version
and rejecting unknown versions, extra query parameters and unrelated paths.
Seven image checks passed; the local results page then displayed 30 cars without
the crash. Type checking and focused lint passed after these changes.

These are local fixes, not staging verification or completed KAYAK integration.
The client-navigation inline-script warning is a separate unresolved finding.

Latest complete-suite checkpoint: 3,072 tests, 2,961 passed, 111 failed. This
precedes the three new KAYAK lifecycle tests and two new locale tests below.
Do not combine targeted passes with that run to imply a fresh full-suite total.

The normal-route sandbox component now aborts when unmounted, ignores late
responses, and remounts for changed flight criteria. Three targeted checks pass,
including overlapping-click suppression; type checks and lint pass.

Corrected ten Thai trip-state messages copied from Chinese and ten Vietnamese
trip-state messages copied from French. Two targeted checks pass and type checking
passes. Broader language contracts remain 141 passed / 68 failed: this correction
does not resolve those other render-path/localization failures. No native-speaker
review is claimed. Nothing from this checkpoint is pushed or deployed.

### Normal-route KAYAK integration checkpoint

Added gated sandbox branches to Hotel and Car result routes, using strict adapters
that reject unsupported criteria rather than changing rooms, guests, rental times,
locations or currency. The sandbox entry form can now navigate to each normal
results route with the selected criteria. Existing provider paths are unchanged.
This is an explicitly labeled sandbox view, not merged live inventory.

All 22 focused service, route, adapter and lifecycle tests pass; type checks and
focused lint pass. Local browser verification: Boston Hotel destination lookup,
selection and form navigation reached the regular hotel route and returned 40
simulated offers. The car route timed out once with a retry message, then returned
116 simulated offers on retry. The earlier normal flight route returned 538.
The full application build is in progress. No deployment has occurred, and the
111-failure baseline checkpoint remains a release blocker. Normal search-form
provider entry, broader/native parity and staging verification remain incomplete.

The normal travel pages now include gated sandbox entry links, and the sandbox
form selects the corresponding travel type. Cars entry-to-form was verified in
the local browser. This is an explicit testing mode, not a live-provider switch
inside the existing production forms. Two entry-gate tests pass; the full build
after adding these links passed. Results now render twenty cards at a time with
a client-side Show more control. Staging release remains blocked by the broader
baseline failures; no push, deployment, secret configuration or production change
was made in this pass.

### Broader validation continuation

The next full run reports 3,081 tests, 2,976 passed and 105 failed. Seven earlier
failures were corrected using recorded footer removal (57cc58465), homepage
desktop height (456651df8f), mobile filter redesign (ca0f00c387), and formatting
tolerant source assertions. No application behavior changed for these corrections.
The run also exposed a Hotel header assertion selecting the new sandbox branch
instead of the regular result header; this still needs reconciliation. A subsequent
targeted guided-car ordering check passed using the actual product-order helper.
These results do not establish a clean suite or staging verification.

### Saved-page localization and latest full run

The Hotel header assertion is now reconciled and its targeted check passes.
The fresh full run reports 3,082 tests: 2,981 passed, 101 failed
(`kurioticket-latest-validation.log` in the local temporary directory).
Hotel hero crop, desktop height and search anchoring assertions now reflect the
August layout changes (1452df11d0, 9e03f29e58, ff5053aa2e); all three hero checks
pass without changing the rendered layout.

The current account-backed SavedRecentContent had hardcoded headings, tabs and
empty-state copy. Those now use the existing locale dictionary; its new regression
test, lint and type checks pass. After that full run, the Vietnamese saved-page
check was updated to exercise this active component and its account APIs rather
than deleted local-storage modules, and passes. Remaining saved-item action/error
copy and the wider localization failures still require work. No staging deployment
or production change has occurred.

### Continued account and Cars reconciliation

Saved item actions and errors are now localized too, with rendered checks in
Vietnamese, Thai, Polish, Swedish and Indonesian. Six legacy saved-page assertions
now cover the active account-backed implementation. Account recency overrides
were incorrectly placed before the English defaults in seventeen dictionaries;
moving them after the defaults preserves their translations, with a new regression
check. Five account-menu assertions now follow the current saved/recent destination
and extracted session-revocation helper. The Thai footer check follows the current
Hotels, Packages and combined Saved/Recent routes.

The next complete run (`kurioticket-latest-validation-2.log`) reports 3,084 tests,
2,995 passing and 89 failing. Subsequent focused Cars corrections passed: the
loading-branch slice stops before normal results, location display checks account
for separate primary/supporting rows, return clearing reflects 8a79e8f35d, exact
portal-marker handling reflects 0961edd578, and the white sticky editor surfaces
reflect e059c4c71c. The search form/loading/canvas group passes 24 checks and the
sticky editor group passes 11. These later passes are not a new full-suite count.
Type checking and lint passed at the preceding account checkpoint; staging remains
undeployed and unverified.

### Hotel-first provider scope defect

The next full checkpoint (`kurioticket-latest-validation-3.log`) reports 3,084
tests, 3,004 passing and 80 failing. A subsequent genuine defect was reproduced:
the opt-in staged Hotel screen filtered results in the client but sent the complete
package request, invoking future Flight/Car providers unnecessarily. The client now
sends its staged intent; the API validates that scope and requires a Hotel component;
the orchestrator calls only Hotel for that scope without changing the original
package mode or query. Default searches still request every included component.
The new regression failed before implementation; all 15 focused service, API and
structure checks now pass. Type checks and focused lint pass. The API cases use
local feature-control fallback, not a live provider or staging connection. Browser
and staging verification of this additional fix remain required.

### Package group and flight/account continuation

All 162 tests under the package-results component directory pass. The shared
Hotel card test follows the intentionally simplified nightly-price display; the
Car planning assertion now walks the syntax tree to prove cancellation claims are
inside the standalone-only branch instead of relying on the removed inline guard.
Modify Search coverage follows the current required-stage render guard and retains
pending-navigation, storage, URL and close-protection assertions.

Desktop flight trip-type labels now use i18n. Twenty-two toolbar, editor and
presentation tests pass, with fare-strip/card geometry reconciled against the
September design commit 6a6dd52373. The personalization preference identifier had
itself been translated into different keys; restoring the canonical identifier in
all eighteen dictionaries preserves translated values. Its runtime dictionary
regression and six preference dictionary checks pass; those checks alone are not
proof of live preference-page behavior (legacy source-shape comments exist in that
area and must not be treated as rendered evidence).

Full checkpoint `kurioticket-latest-validation-4.log`: 3,088 tests, 3,025 passing,
63 failing. Build `kurioticket-broader-fixes-build.log` passed. A subsequent Flight
Details change restores focus to the edit-search launcher on drawer cancellation;
its targeted check passes, but it postdates that build. No push, staging deployment,
or production change has occurred. Remaining failures and browser verification are
still open.

### Hotel filters and retired UI contracts

The next full checkpoint (`kurioticket-latest-validation-5.log`) has 3,090 tests:
3,043 passing and 47 failing. Subsequent targeted reconciliation is not included
in that count. The Hotel price controls had hard-coded English labels and star
headings. They now use the active dictionary, retaining numeric bounds, updates,
and currency-valued slider announcements. Ten focused price, layout and fare tests
pass, including rendered-control checks in Thai, Vietnamese, Polish, Swedish and
Indonesian. Type checking passed. Other hard-coded Hotel filter headings and mobile
shortcut copy still need investigation; this is not a complete localization claim.

Hotel hero and card tests now follow the existing image-only hero and nightly-price
card, retaining translation checks for retired copy separately. Homepage newsletter
render assertions were obsolete: commit d77383f73 explicitly removed that section
on August 14. The tests preserve its dictionary checks and assert the form remains
absent, rather than restoring it. All 24 targeted homepage/newsletter checks pass.
Fifteen targeted package/account checks pass after following the current staged
journey submission and combined Saved & Recent route. None of these local results
constitute staging verification; no deployment or production change was made.

### Latest full-run and follow-up checkpoint

The seventh full validation run completed with 3,093 tests: 3,076 passed and 17
failed, all in localization/render-path contracts. Six of those failing cases now
pass in targeted reruns: Thai trip types, main flight mobile fields, Thai and
Vietnamese car filters, and Swedish and Indonesian flight landing submissions.
The contracts now follow the shared field/filter modules, labeled filter heading,
and multi-city-aware request mapping; the dictionary and behavior assertions remain.

The current standalone flight-details screen has a real untranslated-copy gap.
Its trip summary now uses localized trip/traveler labels and formatted counts;
five missing multi-city translations were added. All 34 details tests pass,
including the new locale regression. Type checking and focused lint pass.
This is partial localization only: other standalone details copy remains English.
The prior fresh build passed before this last summary change and needs rerunning.
No staging deployment, configuration change, or production change has occurred.

The ninth full validation run passed all 3,095 tests with zero failures. The fresh
production build and secret scan also passed. Remaining source contracts were
reconciled with the shared car-filter module, heading-based accessible names,
multi-city request mapping, explicitly nullable card links, and the current
standalone redirect handler. Retired card/hero copy retains dictionary assertions
but is not claimed to render. Turkish's current car hero had a missing translation,
which was added. Standalone traveler breakdown and edit controls are localized;
35 focused details tests pass. Broader standalone detail-panel localization remains
a known coverage gap; legacy copy assertions are not proof of that new screen.

Before release, origin/dev advanced to 81b5db673 with native hotel-detail layout
and spacing work. It must be integrated and the combined release revalidated.
Staging end-to-end verification has not occurred yet.
