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
