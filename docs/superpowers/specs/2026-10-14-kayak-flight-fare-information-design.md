# Structured KAYAK Flight fare information

Status: proposed specification for approval; product implementation has not started.

## Baseline and scope

- Repository: Zentric-Analytics/Kurioticket.com.
- Starting dev: `3b69ab94aff5fb9a613ae27e94f79a2a7e7ffecf`.
- Existing branch: `fix/mobile-flight-details-surface-consistency`.
- Branch inspected at `da33d599829840db51488bec6fbec8ae91f759d2`, then fast-forwarded to dev. No branch was created and `work` was untouched.
- Implement provider normalization and existing Flight Details tabs on desktop web, mobile web, and native. Preserve Compare deals markup/styling, page layout, itinerary card design, and unrelated verticals.
- There must be no Flight Details Supplier information section, accordion, raw-fact fallback, or fifth tab.

## Verified current behavior

`normalizeSandboxOffers` reads fare family, fees, conditions, optional services, and segment cabin names. It separately flattens fees, badges, segment fares, fare family, aircraft fields, and airline baggage policies into attributes. `kayakFlightCardModel` copies those attributes to `providerDetails.suppliedFacts`.

`StandaloneFlightDetails` and `NativeFlightDetails` each render the raw supplier component beneath the fare tabs. Mobile web inherits the web rendering. `toPublicFlight` spreads provider details unchanged, and `toFlightDetailsOffer` builds on that serialization.

Existing limitations include conflating not-allowed baggage with not-included baggage, dropping optional-service scope, omitting quality-item facts, and discarding segment aircraft/duration from normalized Flight legs. Existing KAYAK fare grouping accounts for cabin data, fare terms, conditions, and extras.

## Chosen architecture

Add one provider normalization module, `src/services/travel/kayakFlightInformation.ts`, operating on structured option/result/data records before flattening. It is the only place that interprets KAYAK field semantics. React components only consume typed normalized values.

Reusing the raw-facts UI with label-based classification would retain schema ambiguity. Separate web/native classifiers would drift. Neither approach is used.

The normalizer returns structured segment updates, fare family, baggage terms, carrier policies, conditions, optional services, verified price data, and sanitized internal unmapped diagnostics. Join segment fares by exact provider segment references internally; do not publish these IDs. Duplicate or ambiguous matches must not assign one segment's facts to another.

Keep extensions optional so Duffel and older cached offers remain valid. Reuse existing Flight types wherever their meaning fits.

## Normalized model

### Segment and cabin facts

Reuse `FlightSegment.aircraft`, `duration`, and `FlightCabinDetails` for aircraft, validated duration, customer-facing cabin display name, and fare brand. Preserve segment association across all legs and carriers.

Add an optional typed cabin onboard-feature list for provider-authored descriptions that do not fit existing Duffel amenity fields. Supported kinds are seat, power, entertainment, meal, Wi-Fi, and overnight. Values are sanitized passenger-facing descriptions; kind-to-heading mapping is deliberate and shared. A quality-item code selects the semantic kind internally and is never displayed.

Keep Duffel's existing seat/power/Wi-Fi model intact. Do not synthesize inclusion states from feature existence. Preserve wording such as partial power availability and seat layouts without trying to reparse them into inaccurate boolean amenities. Avoid duplicate display of an equivalent normalized feature.

### Airline baggage policy

Add optional `FlightProviderDetails.airlineBaggagePolicies`, with carrier name/code and typed carry-on/checked policy descriptions. These represent airline policy, not purchased entitlement. Deduplicate identical policy entries for the same carrier only. Keep different carriers or genuinely different policies separate.

### Optional service pricing

Evolve `FlightOptionalService` into a backward-compatible union: existing priced services retain required numeric price/currency; an explicitly fee-based service may have no numeric price and carries a deliberate fee-pricing discriminator. It renders as “Available for a fee.” Never encode an unknown price as zero.

Retain existing type, description, maximum quantity, traveler count, per-traveler flag, and journey context. Preserve new KAYAK scope only when supplied and interpretable; resolve transport references into safe counts/context, never public IDs. Consumers and grouping must handle both service variants.

### Internal diagnostics

Retain sanitized unknown/unmapped facts only in the internal normalized Flight/cache representation or server-side normalization diagnostics. Do not put diagnostics in the public provider presentation type. Do not persist the raw provider payload or add logging of sensitive values.

## Mapping contract

| Structured source | Normalized destination | Presentation |
| --- | --- | --- |
| `option.fareFamily` string or understood name/displayName | Fare brand/family | Fare details |
| `segmentFares[].cabin.displayName` | Matching segment cabin | Fare details; no cabin code fallback |
| Segment `equipmentTypeName` | Segment aircraft name | Existing aircraft structure; available in Fare details |
| Segment finite nonnegative `duration` with verified minutes semantics | Segment duration | Existing itinerary representation; no duplicate tab row |
| Quality item seat | Typed seat description | Fare details |
| Quality item power/powerNegative | Typed power description | Fare details; preserve partial/negative wording |
| Quality item entertainment | Typed entertainment description | Fare details |
| Quality item food | Typed meal description | Fare details; do not invent inclusion |
| Quality item Wi-Fi with no explicit fee | Typed onboard Wi-Fi description | Fare details; do not call it free without provider wording |
| Quality item redEye | Typed overnight description | Fare details |
| Quality item explicitly indicating a fee | Fee-based optional service | Optional extras, not Fare details |
| `fees.carryOnBag`, `fees.checkedBag` | Explicit baggage entitlement/restriction terms | Fare conditions |
| `conditions.change`, `conditions.refund` | Existing conditions model, including supplied penalties | Fare conditions |
| Airline `baggagePolicies` | Carrier-specific policy group | Fare conditions, labelled Airline baggage policy |
| `optionalServices` explicitly optional/purchasable | Structured optional service | Optional extras |
| Verified exact base/total/tax amounts | Existing provider price structure | Existing Price breakdown |

## Truthfulness and ambiguous source handling

- Known baggage states remain distinct: included, not included, not allowed, charge supplied, unknown. Unknown enums must not be prettified into customer copy.
- A supplied first-bag price does not make the bag an optional add-on. Only an actual optional-service source establishes a purchasable extra.
- Airline dimensions must never create carry-on/checked inclusion or purchased allowances.
- Quality-item fee detection belongs solely in normalization and uses explicit supported fields and deliberate provider wording. Fee-qualified Wi-Fi moves to extras even without an amount. Unrecognized codes/structures remain unmapped.
- Preserve descriptions such as “Power (some rows) & USB,” “Streaming entertainment,” and seat pitch/layout. Do not upgrade partial power to full power or feature availability to free inclusion.
- Do not derive free seat selection, change/refund eligibility, meals included, or taxes from unrelated fields.
- Validate amount, currency, source scope, and semantics before price breakdown mapping. `202` and `309` alone do not establish per-person versus trip-total semantics. Scale only a verified per-person source using the established search traveler count; never infer taxes as total minus base. Display-string and numeric duplicates produce one row.
- Missing or ambiguous fields yield omitted facts and existing clean empty states. No generic fallback renders raw data.
- No segment IDs, bag ordinals as raw schema fields, cabin/quality codes, badges, transport URLs, credentials, schema paths, segment type=flight, or unknown field labels reach tab UI.

## Public boundary and caching

Separate internal raw/unmapped diagnostics from `FlightProviderDetails` customer data. Remove raw facts from the public Flight type and project provider data explicitly during `toPublicFlight`; `toFlightDetailsOffer` inherits that safe projection.

The projection must strip legacy cached `suppliedFacts` without mutating the cached source. Internal diagnostics may remain for engineering, but both Flight search and Details responses contain only normalized presentation data. Preserve booking/handoff architecture; Flight Details still removes booking URLs as before.

Extend KAYAK fare-material grouping to include the new policy/fact/service distinctions where necessary. Selected-deal information must always use that deal's offer. Do not silently reuse another seller's fare facts. Do not require raw facts to hydrate or restore Details.

## Presentation changes

Remove supplier imports/usages from both Flight Details entry points. Update desktop FarePanel, mobile web fare deck, and native fare deck to show the normalized features and policies in their existing tabs and row/group components.

Fare details keeps Cabin, On board, and Price breakdown. Aircraft is provided through normalized segments; duration remains in the itinerary. Fare conditions adds baggage entitlement and the clearly labelled carrier-specific Airline baggage policy group alongside change/refund conditions. Extras renders exact supplied service prices or “Available for a fee,” plus supplied scope/quantity metadata.

Do not change Compare deals, fare-tab interaction, Pick your fare styling, navigation, hero styling, results cards, or other verticals. Content may grow naturally for rich provider facts; avoid decorative additions or a raw key/value dump.

`NativeSupplierInformation` remains because native Hotel Details uses it. Inspect all imports before removing the web component; remove it only if genuinely unused outside its own tests. If retained, its existence does not authorize Flight rendering.

## Regression coverage

Use realistic structured fixtures with one-way, round-trip, multiple segments, multiple carriers, rich and partial data. Include the user's aircraft/onboard examples as values, never normalization special cases.

Test the normalizer's exact destinations for fare family, cabin display names, aircraft, seat, power, entertainment, meal, Wi-Fi, overnight, baggage terms, separate policies, rules/penalties, and scoped optional services. Test paid/unpriced Wi-Fi and no optional services. Assert no policy-derived inclusion, no inferred taxes, and no fabricated prices.

Test unknown keys and codes, malformed/partial records, duplicate segment fare matches, missing descriptions, unknown baggage enums, zero prices/penalties, invalid currencies, malicious URL/credential-bearing values, and sanitized internal diagnostics. Confirm raw fields stay out of public serialized search and Details responses, including legacy cache input, without mutating internal data.

Replace obsolete Flight supplier-presence assertions with absence assertions; retain other legitimate vertical coverage. Add rendered web tab assertions and native focused contract/render tests where supported. Assert passenger facts appear only in the intended tab and no supplier title, raw IDs, raw quality codes, or schema labels appear.

Keep and run Duffel normalization, existing Flight Details, selected-offer, grouping, public serialization, web/native fare deck, and supplier-information suites. Verify selected seller changes refresh all facts and preserve Compare deals seller/price/action.

## Validation and delivery

Run root TypeScript check, native typecheck, focused lint, KAYAK normalization suites, Flight Details contract/selection tests, supplier regression tests, and focused web/native suites. Do not remove or weaken tests to pass.

Exercise rich KAYAK sandbox data in a browser across desktop/mobile widths; inspect all existing tabs, offer switching, multi-carrier policies, missing data, and a Duffel control offer. Clearly distinguish a deterministic sandbox-response fixture from a live sandbox run. Report environmental blockers honestly; never claim visual/native-runtime validation that did not run.

Delivery records baseline/branch, changed files, exact mapped and hidden fields, internal versus public raw-data handling, shared classification, test results, and unsupported shapes. Unclassified KAYAK fields remain invisible pending deliberate future mappings.

## Implementation acceptance

All 25 regression requirements in the user's request must have explicit test coverage or documented runtime evidence. No raw Supplier information rendering remains on either Flight Details implementation; all three clients consume the same normalized truth. The final diff stays focused on Flight normalization, types, serialization, existing tab consumers, and relevant tests.
