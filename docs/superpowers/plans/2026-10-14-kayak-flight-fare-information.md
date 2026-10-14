# Structured KAYAK Flight Fare Information Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Replace raw Flight Details supplier rows with truthful provider-authored information in the existing fare tabs on web and native.

**Architecture:** Normalize structured KAYAK sources once on the server, then serialize only typed customer facts. Existing desktop, mobile web, and native tab renderers consume the same contract without classifying labels. Preserve Duffel models and existing fare-selection architecture.

**Tech Stack:** TypeScript, Next.js/React, Expo/React Native, Node test/assert, jiti, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-14-kayak-flight-fare-information-design.md` (approved).

## Global Constraints

- Use existing branch `fix/mobile-flight-details-surface-consistency`; never touch `work`.
- Baseline dev is `3b69ab94aff5fb9a613ae27e94f79a2a7e7ffecf`.
- No Flight Details Supplier information section, accordion, raw fallback, or fifth tab.
- Preserve Compare deals markup/styling, tab interactions, surrounding page design, and unrelated verticals.
- No invented inclusion, eligibility, taxes, or prices. Unknown fields remain invisible.
- Web and native consume one shared normalization contract.

## Review Focus

- Ambiguous/duplicate segment-fare references must not attach facts to the wrong segment; test in Task 1.
- Mixed carriers and differing baggage policies must remain separate without creating entitlement; test in Tasks 1 and 3.
- Legacy cached raw fields must not leak or mutate internal cache data; test in Task 2.
- A priced zero-cost service and an unpriced fee-based service must remain distinguishable; test in Tasks 1 and 3.
- Alternate sellers with differing features/rules must refresh all tabs and must not share an inaccurate fare-material identity; test in Tasks 2 and 4.

## Task 1: Shared structured provider normalization

**Files:** Create `src/services/travel/kayakFlightInformation.ts` and `.test.ts`; modify `src/lib/types.ts`, `src/services/travel/kayakSandbox.ts`, `src/services/travel/kayakPresentation.ts`, `src/components/results/kayakCardModels.ts`; update their existing focused tests.

**Interfaces:** Export `normalizeKayakFlightInformation(data: Record<string, unknown>, result: Record<string, unknown>, option: Record<string, unknown>, currency: string): KayakFlightInformation`. The result carries normalized fare family, segment facts keyed internally by segment reference, baggage fare terms, conditions, optional services, airline baggage policies, verified price data, and sanitized internal unmapped facts. Transport keys are resolved internally and never returned in public segment facts.

Add `FlightOnboardFeature` with `kind: "seat" | "power" | "entertainment" | "meal" | "wifi" | "overnight"` and `description: string`, exposed as optional `FlightCabinDetails.onboardFeatures`. Add `FlightAirlineBaggagePolicy` with carrier name/code and typed carry-on/checked descriptions, exposed as optional `FlightProviderDetails.airlineBaggagePolicies`. Existing priced `FlightOptionalService` entries remain valid; a union variant with `pricing: "fee-unspecified"`, absent price/currency, represents an explicitly paid unpriced service. Keep common scope/quantity fields in both variants.

- [ ] Write table-driven failing tests for all seven structured source classes and the actual passenger descriptions, using one-way/round-trip, multisegment, multicarrier, partial, malformed, unknown-code, and duplicate-reference fixtures.
- [ ] Run `JITI_TSCONFIG_PATHS=./tsconfig.json JITI_JSX=true node --import jiti/register src/services/travel/kayakFlightInformation.test.ts`; expect failure before implementation.
- [ ] Implement the contract at the structured-source boundary. Use exact semantic-code allowlists and safe description extraction; fee qualification is interpreted only here. Preserve partial/negative wording, included/not-included/not-allowed/unknown baggage distinctions, explicit penalties, zero amounts, and supplied service metadata. Keep diagnostics sanitized and internal.
- [ ] Integrate the output into sandbox offers and card models. Normalize aircraft/duration into segment structures. Remove the card model's flattened-label fare-term classification fallback; old offers without structured facts get truthful missing-data behavior.
- [ ] Run new tests plus `kayakSandbox.test.ts`, `kayakPresentation.test.ts`, `kayakCardModels.test.ts`, and `kayakFareInformationReview.test.ts`; require zero failures. Update obsolete assertions only where the intended product contract changed.
- [ ] Commit only the relevant normalization/types/tests with an implementation-focused message.

## Task 2: Public projection and fare-selection compatibility

**Files:** Modify `src/lib/types.ts`, `src/lib/searchCache.ts`, `src/services/travel/standaloneFlightDetails.ts`; test `src/lib/searchCache.test.ts`, `src/services/travel/kayakFareMaterialGrouping.test.ts`, `src/services/travel/standaloneFlightDetails.selectedKayakOffer.test.ts`, `src/services/travel/standaloneFlightDetails.selectedDealDetails.test.ts`, and `src/components/results/supplierInformation.test.ts`.

**Interfaces:** `toPublicFlight(result: NormalizedFlightResult): PublicFlightResult` projects customer provider details without raw/unmapped diagnostics and does not mutate the input. `toFlightDetailsOffer` preserves this projection and existing booking URL removal. Internal raw facts belong to an internal type/field omitted by public types. `kayakMaterialKey` incorporates onboard facts and carrier policies as well as existing conditions/services.

- [ ] Add failing tests asserting internal sanitized unmapped retention, no public `suppliedFacts`/diagnostics, no transport IDs/credentials, safe legacy cached projection, and unchanged cached source after serialization.
- [ ] Add failing seller-grouping tests for different carrier policies/onboard features and selection tests that expose the selected seller's facts rather than the first seller's facts.
- [ ] Run the named focused tests; confirm failures concern the new public boundary/grouping requirements.
- [ ] Implement explicit public provider projection and type separation. Include normalized facts in the fare-material identity while preserving equivalent-offer grouping and price/handoff behavior.
- [ ] Run those tests and existing Duffel `normalizeFlightResult.test.ts`; require zero failures and unchanged Duffel prices/services/conditions.
- [ ] Commit projection, grouping, and their regression tests.

## Task 3: Existing web/native fare-tab presentation

**Files:** Modify `src/components/results/flightDetails/StandaloneFlightDetails.tsx`, `src/components/results/flightDetails/MobileNativeFareInformationDeck.tsx`, `apps/mobile/src/features/search/NativeFlightDetails.tsx`; create shared `src/lib/flights/flightFareInformation.ts` only for fixed kind labels and presentation accessors; update relevant `.test.ts` files and `apps/mobile/src/features/search/nativeFareInformationDeck.test.ts` plus `detailWebParity.test.ts` where assertions touch supplier rendering.

**Interfaces:** All three clients read `FlightCabinDetails.onboardFeatures`, `FlightProviderDetails.airlineBaggagePolicies`, existing normalized baggage fare terms/conditions, and the optional-service union. If a shared helper is needed, `flightOnboardFeatureLabel(kind: FlightOnboardFeature["kind"]): string` returns a fixed passenger heading, never a raw API label. No UI interprets KAYAK codes or flattened strings.

- [ ] Add failing rendered mobile-web tab tests for each mapped fact and absence of raw schema names, codes, IDs, supplier title/components, unknown fields, and duplicate duration rows. Add matching desktop/native focused presentation assertions, preserving existing checks for tab behavior and layout.
- [ ] Add explicit tests that dimension policies alone never display included baggage, different carriers remain labelled, and extras distinguish exact zero-priced services from “Available for a fee.”
- [ ] Run relevant web/native fare suites and supplier-information tests; confirm the new absence/organization assertions fail on the old UI.
- [ ] Render supported features in existing Cabin/On board rows, aircraft through normalized segments, entitlement/policies in Fare conditions, and scoped optional services in extras. Preserve typography, spacing, and Compare deals markup. Guard unknown price before formatting.
- [ ] Remove Flight supplier imports/usages. Keep `NativeSupplierInformation` for Hotel. Search repository-wide before deciding whether the unused web supplier component should remain; adjust its own test only if genuinely removing unused code.
- [ ] Run focused presentation/selection/contract tests, root lint and typecheck, native typecheck; require zero failures. Commit the focused UI/test changes.

## Task 4: Browser validation and matched previews

**Files:** Add focused QA coverage under `qa/mobile-web/` following existing conventions; capture fixture and screenshots under a task-specific QA directory. Use scratch `work/kayak-fare-information-preview/provider-source.json` as the deterministic source, never as a special-case production rule.

**Interfaces:** Existing `/api/flights/details` contract supplies the normalized offer and its alternative sellers. Browser tests consume the real Flight Details page with a deterministic sandbox-response fixture; live sandbox checks, if available, are reported separately.

- [ ] Capture and retain baseline mobile/desktop images with current tabs and expanded Supplier information, clearly labelled before/fixture.
- [ ] Add browser assertions at 390px and 1440px for clean facts in each intended tab, no supplier section/IDs/schema labels, multi-carrier policy separation, selected-seller refresh, clean missing-data state, and unchanged Compare deals seller/price/action.
- [ ] Run the browser regression with the normalized rich fixture and a Duffel control offer. Verify active-offer switching and optional services; record actual results without claiming unsupported native-runtime tests.
- [ ] Capture after images at the same widths, scroll positions, tabs, currency, and fixture values as before. Inspect screenshots; include compact comparisons where useful.
- [ ] Commit the focused QA test/fixture and reviewable preview artifacts, excluding scratch logs and secrets.

## Task 5: Whole-change verification and delivery

- [ ] Recheck the final diff against dev for unrelated verticals, hero/card styling, Compare deals changes, raw fallback UI, and any untested contract extension.
- [ ] Run root `npx tsc --noEmit`, focused ESLint, native `npm run typecheck --prefix apps/mobile`, all normalization/selection/serialization/supplier/presentation suites identified above, and the focused browser test. Report each failure or environmental blocker; do not weaken tests.
- [ ] Map the user's 25 numbered test requirements to passing tests/runtime evidence. Report unsupported provider shapes as deliberately unmapped, never silently guessed.
- [ ] Deliver baseline/branch, changed files, mapped/hidden source fields, public/internal diagnostics boundary, shared web/native classification, test results, and before/after previews. Create/update a PR only when requested; do not merge automatically.

## Plan review

The five review-focus risks have explicit owners/tests. All specified source fields, three fare tabs, public cache boundary, Duffel compatibility, raw UI removal, and visual comparisons are covered. Product implementation awaits this plan's approval and an execution-method choice.
