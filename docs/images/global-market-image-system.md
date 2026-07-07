# Global Market Image System Foundation

## Goal

Kurioticket should resolve public marketing imagery by market first, then regional fallback, then global fallback. This lets each country marketplace become visually local over time without requiring a complete 200 plus country image library on day one.

## Resolution order

1. Market image: exact country marketplace, for example GH, BR, KE, ZA, or US.
2. Regional image: fallback bucket, for example west-africa, latin-america, or southern-africa.
3. Global image: final approved fallback for markets without local or regional coverage.

## Production standard

A launch-critical market image is production-ready only when it has approved source and commercial license notes, product and usage assignment, market or region assignment, meaningful alt text, desktop and mobile crop approval, stable local or approved provider URL, registry coverage, and no temporary or unapproved launch-critical status.

## Current Phase 1 scope

This phase adds the contract only. It does not change live homepage, deals, hotels, flights, cars, or destination visuals.

Implemented in this phase:

- Market scope fields on image types.
- Market audience values: local, outbound, inbound, and global.
- Resolver for market to region to global fallback.
- Seed market image registry entries.
- Validation for market code, region slug, and audience values.
- Unit tests for fallback behavior.

## Priority market pack scaffold

The first priority market scaffold adds explicit homepage hero contract entries for these markets:

US, GB, CA, BR, MX, GH, NG, KE, ZA, AE, IN, FR, DE, ES, IT, NL, TR, JP, KR, and AU.

These records are not final production image approvals. They are contract entries that let the resolver, registry, and tests prove market-level coverage while the team sources real premium or owned assets.

Regional fallback packs now cover:

north-america, latin-america, west-africa, east-africa, southern-africa, middle-east, south-asia, western-europe, east-asia, and oceania.

## Rollout plan

1. Add real country packs for priority markets.
2. Add regional fallback packs for global coverage.
3. Replace public marketing images that still need launch approval.
4. Connect homepage and public landing surfaces to the resolver.
5. Enforce market image audit checks in CI after approved assets are in place.
