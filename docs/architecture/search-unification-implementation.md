# Unified search implementation — persistent progress

Authorization: master assignment November24,2026. Local implementation U0–U7 is approved continuously; no push, main/dev merge, deployment, native publication, provider contact, credential/configuration change or live supplier test is authorized.

Starting branch `fix/android-production-search-20261123`, HEAD `2e3b9b2930a99bfe87b5d4f115af31b66d77cbbd`, clean. Remote main `71a893bee24f53f2ab5c037f05e33f12f012becc`, dev `09dd5e5147408729fbf2b11df6d27c740d9d0e99`. PR6941 now closed/unmerged, remote head `b9102765f044d2bdbdcce9685018ce620c3704be`. Local and remote contain equivalent earlier patches with different commit identities. U0 merges the existing remote working branch locally, preserving both histories, rather than resetting/rebasing or replacing the branch. The one conflict retains the reviewed remote diagnostic-redaction implementation; unused warning component/tests removed as in that remote revision.

Investigation basis: prior website/Android/iOS forensic evidence, consolidated S01–28 and aliases W01–11/KT01–11/A01–05, alignment AL01–33, and owner-approved U0–U7 sequence. Original artifacts remain outside source under outputs/search-architecture-consolidation-2026-11-24 and search-architecture-alignment-2026-11-24. Findings are reconciled by evidence, not silently closed by source changes.

## Authoritative ownership and callers

| Responsibility | Current owner / consumers | Intended owner / change | Compatibility |
|---|---|---|---|
| Location identity/rank/authority | locations types/search/discovery/selectionAuthority; all discovery routes; native gate/serializers diverge | Extend existing modules and common intent, not competing catalogue | Preserve scalar codes, signed ID/product/expiry handles and explicit refinement |
| Admission/context | Product routes, shared flags/session/policy | Shared contextual plan with product validation | Preserve truthful UA/IP, session v1, all production request guards |
| Flight execution | flightAggregator→Duffel/KAYAK; web/shared native | Active provider capabilities/orchestration, same product service | Preserve full itinerary, independent provider failure and existing actions |
| Hotel execution | hotelAggregator; separate Android legacy progressive | Shared authoritative hotel service with compatible batch adapter | Stable snapshot, cursor HMAC/TTL/pages/cache-before-action |
| Car execution | carAggregator→KAYAK; web/shared native | Provider-neutral product execution and provenance | Existing groups/offers/local clocks; no new transactions |
| Normalization/grouping/cache | Server adapters/shared domain helpers/certified caches | Independent outcomes, stage/ID accounting, truthful final projection | Live certification and sandbox isolation retained |
| Lifecycle | Server classifiers plus independent web/native inference | Shared lifecycle meaning and platform effects | Additive envelope/legacy readers, pending distinct from empty |
| Detail/refresh/handoff | Server caches/provider-specific dispatch; native compatibility screens | Original snapshot + registered capability dispatch | Existing authorized handoff only; expiry/revocation fail closed |
| Diagnostics/readiness | Admin services and provider logs, incomplete correlation | Canonical UUID/spans and active capabilities, private diagnostics | No raw keys/IP/session/customer values in public artifacts |
| Presentation | Website and shared Android/iOS native components | Retain independent render/navigation/accessibility | No visual redesign or provider SDK in clients |
| Auxiliary/dead code | Direct Duffel snapshots/Deals APIs, unused generic engine/capability interfaces | Deliberately scoped adapters; reuse existing engine only when connected | No deletion of exposed/possibly used compatibility APIs based on static absence |

## Unit register

| Unit | State | Evidence / remaining work |
|---|---|---|
| U0 | Complete (local) | Existing branch histories preserved; native baseline 2436/2436 and focused backend policy/contract baseline 30/30 passed; full backend baseline 5473/5473 passed |
| U1 | Implemented; wider acceptance in U7 | Typed identities including metropolitan scope, dynamic native airports, authenticated code/ID admission, shared Unicode/rank, bounded/cancellable discovery and hotel composition/pet restoration. Final combined focused suite 43/43; restoration/catalogue 12/12; native focused 49/49; final web/mobile TypeScript both passed. Discovery cancellation/rapid-input and full cross-consumer acceptance remain U7 checks. |
| U2 | Implemented; neutral projection in U4 | Active registrations consumed by flight/hotel/car services; existing flight capability module now consumed by registration; authentic context retained and no secrets added. Three centrally injected test adapters execute through product services. Focused 16/16; TypeScript verification recorded separately. |
| U3 | Pending | Product orchestration and hotel batch ownership |
| U4 | Pending | Neutral provenance/snapshots/final accounting |
| U5 | Pending | Shared lifecycle and connected readers |
| U6 | Pending | Compatibility/performance/freshness/cleanup |
| U7 | Pending | Cross-platform fixture inheritance and final regression |

## Validation and release limits

Evidence directory: outputs/search-unification-implementation-2026-11-24 outside repository. Initial native suite was invalidated by removal of the obsolete warning test while Node was collecting files (2436pass,1missing-file failure); rerun on stable merged source is required. This is an execution-order issue, not a baseline product failure. Backend baseline running separately. Future logs record exact commands/counts and pre-existing versus introduced failures.

Physical iOS validation and actual supplier acceptance are not available from Windows/local fixture tests. Android KAYAK403 remains open/external-rule unknown; no spoofing or live supplier test permitted. Preserve notice exactly: “Results are not bookable at this time. Live results will be available soon!!!”

U1 decisions: metropolitan selections are representable but are not silently admitted as flight airports; city selection still requires explicit airport refinement. KAYAK unsupported pet, child, room-composition and non-default driver-age criteria remain explicit limitations rather than invented supplier parameters. Native source adoption requires a future authorized release; no installed app has changed. Dynamic-import test harness keeps React Native ambient types outside the server type graph.

U2: criteria needing provider location resolution are admitted inside existing adapters, never by inventing a provider location ID for capability probing. Provider mode/environment declarations do not supersede existing credential, feature, production display-policy or upstream authorization gates. No provider permission is inferred. Test fixtures currently prove service participation; truthful public provenance/actions and web/native inheritance are U4/U7 acceptance, not claimed yet.
