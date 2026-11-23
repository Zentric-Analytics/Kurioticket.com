# Flight web preview: background and route controls

Both tasks are on `fix/mobile-flight-details-background`, starting from
`dev` SHA `10397fccfafc7984bbddbebee6bf951e8b67477b`.

1. Mobile Flight Details uses Flight Results' `#F5F7FB` background consistently
   across the loaded page, loading shell, hero curve, and scroll header cover.
2. Desktop Flight Results has a circular 32px swap button with a white
   background, existing arrow icon, light border, and subtle shadow. Separate
   divider segments stop above and below the button. The desktop route group
   increases from 230px to 270px at the existing XL breakpoint, giving each
   field approximately 16px more space. Smaller desktop widths remain fluid.

The requested change to click/focus behavior was withdrawn and is excluded.
No native app files changed. The mobile search form and desktop Details
background remain unchanged.

## Previews

- [Desktop form](desktop-form.png)
- [Desktop header](desktop-header.png)
- [Mobile Flight Details](../flight-details-background-preview/mobile.png)
- [Mobile scrolled](../flight-details-background-preview/mobile-scrolled.png)
- [Mobile loading](../flight-details-background-preview/mobile-loading.png)
- [Desktop Flight Details](../flight-details-background-preview/desktop.png)

## Validation

- Typecheck passed.
- All 26 desktop compact-header tests passed. Updated width and swap-divider
  tests failed before the implementation and passed afterward.
- All three affected mobile Details background/geometry tests passed.
- Browser checks at 1024, 1279, 1280, and 1440px verified button geometry,
  opaque background, divider separation, no horizontal overflow, and working
  swap in both directions. Search submission preserves the swapped airports.
- At 390px the new desktop swap control is hidden.
- Existing mobile background measurements and previews cover 390/639px;
  desktop Details backgrounds retain their colors at 640/1440px.
- Full Details file has seven baseline failures, down from eight after
  correcting an existing mis-escaped expression. See the mobile preview notes.
- Flight Results lint has one existing error and 26 existing warnings,
  reproduced on the unchanged source. Details lint has three existing errors.

Browser previews use deterministic mock flight/currency data rather than
creating real searches or bookings. Local dev-server hydration issues required
retrying a Details preview; validation here covers these presentation changes
and the desktop swap/submission flow, not the entire provider booking flow.
