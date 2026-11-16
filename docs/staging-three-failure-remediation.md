# Three staging failure remediation

## Saved flight clock contract

`src/shared/flights/savedFlightTime.ts` is the common web/native resolver. New saves persist real offset-qualified instants in the existing database DateTime columns, and preserve the provider's original departure/arrival strings plus resolved IANA zones under `payload.flightTime` version 1. Native replay payloads retain the original itinerary. Existing records are never rewritten or reinterpreted.

Explicit UTC/offset timestamps retain their stated meaning. Airport-local timestamps use the existing licensed Open Travel Data airport-to-IANA catalogue. Resolution samples offsets on both sides of a transition and requires exactly one round-tripping instant; missing zones, invalid calendar fields, DST gaps and folds fail closed. No suffix is added to manufacture UTC. Search reopening uses the preserved local departure date, preventing a UTC midnight crossing from changing the itinerary date. Both web save callers, the shared backend validator, and native mapping use this contract. The backend remains the persistence validation boundary for older clients sending raw airport-local values.

The saved page displays the preserved written airport times. Legacy records without versioned metadata retain their previous behavior. Explicit provider offsets disambiguate a DST fold; timezone-less ambiguous values require a new provider offer.

## KAYAK staging diagnosis

On November 16, the existing staging key authenticated for autocomplete and real hotel/car search. A controlled request comparison with the same key, endpoint, dates and IP succeeded with an ordinary browser user agent and returned 403 FORBIDDEN with HeadlessChrome. Actual normal staging-browser hotel and car pages also returned provider offers on the starting commit. Therefore a generic auth/config monitor bucket did not establish an expired key or absent hotel/car entitlement.

Preserve the incoming user agent and trusted client-IP boundary. Do not strip HeadlessChrome or retry a forbidden response under a disguised identity. Positive live provider acceptance uses an actual headed browser, with its unmodified user agent; headless checks separately verify the truthful unavailable/retry state. Safe diagnostics retain HTTP status and fixed error categories, never credential-bearing URLs or upstream response bodies. Existing bounded retry, partial results, normalized source attribution and sandbox-only booking restrictions remain in place.

## Image ownership

Three unavailable destination URLs are replaced by local, licensed Pexels derivatives. The fourth URL was synthesized from retired pool photo ID 7536261 across multiple destinations. Its slot now uses destination-specific assets, preserving duplicate-image validation; Paris uses an existing purchased project image. The repository fallback/catalogue and Flight Results PVR image are repaired. New files and provenance are in public/images/staging-remediation/SOURCES.md and the image registry.

Published CMS payloads are separate from repository fallbacks. Update the affected staging records through authenticated Save draft and Publish actions after the assets are deployed. Preserve unpublished owner edits and optimistic versions; never run raw SQL updates or modify production content. Verify the public content API and actual rendered images afterward.

## Delivery boundary

Use a protected PR to dev and exact-commit manual staging web deployment. The Preview worker remains suspended with Auto-Deploy Off; its stored active mode must not be resumed. These source changes include native JavaScript compatibility work, but authorize no native build, OTA update, TestFlight operation, production change, main update, or release-ledger advancement.
