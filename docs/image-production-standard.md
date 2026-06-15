# Kurioticket image production standard

Kurioticket is a global travel metasearch product. Images are trust infrastructure, not decoration. They influence whether travelers believe a destination card, hotel result, car-rental entry point, or flight inspiration surface is credible.

## Core standard

Every image used in production should be:

1. **Registered** in `src/data/images/imageRegistry.ts` or documented as an approved provider pattern.
2. **Licensed** with enough metadata to prove the right to use it.
3. **Categorized** by product, usage, source, and status.
4. **Accessible** with meaningful alt text unless the image is purely decorative.
5. **Crop-approved** for desktop and mobile.
6. **Truthful** about what the traveler is seeing.

## Provider-real vs. marketing images

Provider-real images are supplied by travel inventory providers for a specific returned entity, such as a hotel property image from Hotelbeds. These images may appear in hotel results only when they correspond to the matched provider result and should not be reused for generic marketing cards, destination inspiration, or fallback imagery.

Marketing images are selected by Kurioticket for surfaces such as homepage hero modules, destination cards, car discovery cards, deal cards, and inspiration cards. Marketing images require source, creator, license, crop, and launch approval metadata before they become launch-critical.

## When paid premium stock is required

Paid premium stock should be required for:

- homepage hero imagery
- top global destination cards
- launch-critical flight inspiration cards
- hotel discovery hero/category modules
- car-rental discovery modules that imply quality or brand trust
- deal/explore/destination pages that will receive paid acquisition traffic
- any market where free imagery looks generic, stale, or inconsistent with the premium product bar

Paid stock should be purchased with broad enough commercial rights for web, mobile web, paid acquisition landing pages, email, and future app placements when possible.

## When free-approved images are acceptable

Free-approved Pexels or Unsplash images are acceptable for Phase 1 and lower-risk surfaces when:

- the source page or delivery URL is documented
- the license/source notes are captured
- the image is not random or placeholder-generated
- the image does not imply provider-specific hotel, room, amenity, price, rating, or availability facts
- it has passed desktop and mobile crop review

Free-approved images should not be treated as the final standard for global launch-critical premium surfaces.

## Generic hotel fallback rules

Generic hotel fallback images must not mislead users. They are only acceptable when a provider does not return a validated property image. They must never imply that a listed hotel has the shown pool, room, exterior, beach access, view, or amenity. Hotel-specific claims must come from provider data, not fallback imagery.

If provider-real imagery exists for a result, prefer provider-real imagery. If fallback imagery is shown, keep the surrounding language generic and avoid captions that imply the fallback is the exact property.

## Launch-critical image standards

Launch-critical images cannot have `temporary`, `replace-before-launch`, or `blocked` status. They must have:

- approved source/license metadata
- meaningful alt text
- desktop and mobile crop approval
- product and usage classification
- surface ownership
- clear replacement criteria if they are free-approved but intended to become premium-approved

## Premium image library recommendation

Build the initial premium library in batches of 60 images toward an initial 180-image library:

1. **Batch 1: top global trust surfaces** — homepage hero, top destinations, highest-traffic hotel and flight inspiration cards.
2. **Batch 2: regional expansion** — priority markets and localized destination cards.
3. **Batch 3: category depth** — car rental, deals, explore, recent-search fallbacks, and seasonal/evergreen variations.

Each batch should include mobile and desktop crop variants or source files large enough for consistent art direction.

## Staging QA checklist

For every launch-critical image in staging:

- Verify desktop crop at common laptop and large-desktop widths.
- Verify mobile crop at narrow and large mobile widths.
- Confirm important landmarks, vehicles, rooms, or skylines are not cut off.
- Confirm text overlays remain readable.
- Confirm image loading does not cause layout shift.
- Confirm alt text is meaningful and not keyword-stuffed.
- Confirm no placeholder, random, or unstable image source is used.
- Confirm provider-real hotel images correspond to the provider result and are not reused as generic stock.
- Confirm generic hotel fallbacks are presented as fallback visuals only.

## Required metadata for paid purchases

Every paid image purchase must capture:

- registry id
- image URL or local asset path
- source/vendor
- source page or asset id
- creator/photographer when available
- purchase date
- purchaser/account owner
- license type
- license receipt or invoice location
- allowed channels and geographies
- expiration/renewal date, if any
- exclusivity restrictions, if any
- model/property release status, if available
- approved products/usages
- crop notes and focal point
- desktop/mobile approval status
- launch-critical classification

## Phase 2 inventory classification

Phase 2 adds a non-rendering inventory layer for hard-coded image URLs that are not safe to migrate to registry imports yet. Use:

- `src/data/images/imageRegistry.ts` for approved, reusable, known production entries and provider URL patterns.
- `src/data/images/imageInventory.ts` for discovered image slots that need governance classification but must preserve current UI output.
- `src/data/images/imagePurchasePlan.ts` for the Phase 3 premium purchasing queue derived from inventory metadata.

Every inventory entry must classify the URL by product, usage, source, status, launch-critical flag, public surfaces, intended slot, content role, production priority, and premium replacement requirement. The content role answers whether the image is `provider-real`, `fallback-only`, `marketing`, `test-only`, `recent-search-derived`, or `replacement-needed`.

## Production priority scale

- `p0-launch-critical`: trust-critical launch surfaces such as homepage hero/discovery cards and hotel result fallback pools.
- `p1-public-important`: public pages that matter for acquisition, SEO, or result confidence, but can follow P0 purchasing.
- `p2-supporting`: supporting UI such as recent-search thumbnails or provider logos that are lower risk.
- `p3-internal-or-test`: test fixtures and non-production references.

Launch-critical images with `temporary`, `replace-before-launch`, or `blocked` status remain visible in the audit as governance debt. Phase 2 inventory may mark them this way to make the launch gap explicit; Phase 3 should resolve P0/P1 candidates with `premium-approved` or owned assets before launch.

## Premium replacement rules

Mark `premiumReplacementRequired: true` when an image appears on a high-trust public marketing or fallback surface, repeats across markets, receives paid traffic, or materially affects traveler confidence. This includes homepage fare discovery, market homepage destination modules, public destination cards, deals cards, flight-result route cards, and hotel fallback pools.

Do not mark provider-real images for premium replacement. Provider imagery is governed by provider contracts and should be validated as matching the returned entity. Do not mark test-only URLs for premium replacement. Recent-search-derived thumbnails may stay temporary unless they are promoted into paid acquisition or launch-critical public modules.

## Duplicate handling

Duplicates should be handled by source identity, not just exact URL. The same Unsplash or Pexels asset may appear with different `w`, `q`, or `ixlib` parameters. Keep duplicate visual identities inventoried when they are still hard-coded in different files, but the Phase 3 purchase plan should treat them as one replacement family where possible.

If an image becomes an approved reusable asset, move it into `imageRegistry.ts`, use multiple usages/page surfaces, and migrate call sites only in a dedicated UI-preserving PR.

## Provider, fallback, and marketing distinctions

Provider-real images are returned by contracted inventory providers for a specific hotel, airline, or travel entity. They must not be reused as generic marketing stock. Marketing images are Kurioticket-selected destination, deal, car, hotel-discovery, or route-inspiration images and need source/license/crop approval before launch. Fallback-only images are generic images shown only when provider-real imagery is missing; hotel fallback images must not imply exact property rooms, amenities, pools, views, ratings, price, or availability.

## Phase 3 shopping-list generation

Run `npm run audit:images` to view premium replacement candidate counts and suggested Phase 3 purchase categories. `src/data/images/imagePurchasePlan.ts` groups candidates into the first shopping categories and exposes `phase3FirstSixtyCandidateImages` as the seed list for the first 60-image buying pass. The first batch should prioritize P0 homepage discovery, market homepage destinations, and hotel fallback replacements before broader P1 destination/deal/result surfaces.
