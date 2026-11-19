# Mobile Flight Details surface consistency

Starting `dev`: `0733e8d0612938f44ad03bdc343ae9ca0298d413`.

The branch now also moves the mobile controls above the hero. See the
[latest combined previews](../flight-details-action-bar-preview/README.md).
The screenshots below capture the earlier surface-styling stage.

Mobile Details now uses the existing mobile Results card shadow:
`0 10px 28px -24px rgba(15, 23, 42, 0.5)`. Shadows remain visible but no longer
create the broad dark halo around the itinerary and selected fare cards.
Loading cards use the same shadow and spacing as loaded cards.

Spacing follows Results: 12px content padding, 4px outer inset for itinerary
cards, 12px gaps between itinerary cards and fare cards, and aligned 12px
insets for fare and provider cards. The horizontal fare/tab rails remain
scrollable.

Primary labels use Results' `slate-900`; prices and times use `slate-950`;
secondary text uses `slate-500`, with duration text using `slate-600`.
Font families, sizes, and weights are unchanged. Blue accents, the white hero
text, the `#F5F7FB` page background, and the selected fare's `#F4F8FF` fill
are retained. Desktop properties retain their existing responsive styles.
No native app, Results page, or booking logic was changed.

## Validation

- Relevant test files: 62 Details cases and four provider-card cases pass.
  Updated appearance assertions failed against the old styles and passed
  after implementation. Existing interaction/booking assertions were kept.
- Changed-file lint and TypeScript check passed with current dependencies.
- At 390px, browser measurements confirmed matching shadows on loaded and
  loading itinerary cards, selected fare and selected provider cards; card
  insets and the existing background/fare fill were verified. Tabs still work.
- At 640px and 1440px, desktop colors, shadows and geometry match the before
  measurements. The 1440px before/after screenshots are pixel-identical.
- Preview uses deterministic fixture data and mocked APIs. The local preview
  server's baseline background-maintenance instrumentation failed to compile;
  it was temporarily disabled for both before/after captures, then restored.
  No instrumentation or dependency-manifest changes are included.

## Previews

- [Before](before-390.png)
- [After](after-390.png)
- [Fare, provider card and tabs](after-fares.png)
- [Loading](after-loading.png)
- [Desktop](desktop.png)
