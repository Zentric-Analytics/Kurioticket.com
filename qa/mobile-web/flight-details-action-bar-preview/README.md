# Mobile Flight Details action bar

Added to `fix/mobile-flight-details-surface-consistency`, alongside the
approved shadow, spacing, and text-color changes. Starting `dev` remains
`0733e8d0612938f44ad03bdc343ae9ca0298d413`.

Back, Save, and Share now sit in a mobile bar above the hero image. The bar
uses the page's `#F5F7FB` background, remains sticky during scrolling, and
accounts for the top safe-area inset. Its shared component is used by the
loading and loaded views. Button handlers and accessible names are preserved.

The bar is 64px high before the safe-area inset. The hero's old reserved
button space was removed: its mobile minimum height is 254px instead of
318px. At ordinary font sizes, the bar and hero together retain the previous
318px height, so the itinerary does not shift down unnecessarily. Desktop
hero dimensions and overlay controls retain their existing responsive styles.
The old floating-controls cover and scroll-threshold effects were removed.

Validation:

- All 62 Details tests pass; the updated layout checks failed before the
  implementation and passed afterward. Existing booking/interaction checks
  were retained.
- Changed-file lint and typecheck pass.
- At 320px and 390px, the browser verified the loading/loaded bar background
  and height match, the hero begins below the bar, controls are above the
  image, scrolling keeps the bar at the top, and there is no horizontal overflow.
- Keyboard focus moves through Back, Save, and Share. Anonymous Save toggles
  on/off, Share invokes the mocked clipboard with the details link, and Back
  returns to Results with the origin/destination query preserved.
- The bar is hidden at 640px and 1440px. The 1440px desktop screenshot is
  pixel-identical to the previous desktop preview. Native app files are unchanged.
- Previews use deterministic flight data and mocked APIs. The same local
  instrumentation workaround documented in the surface preview was used;
  instrumentation was restored before the final typecheck and commit.

Previews:

- [Mobile](mobile-390.png)
- [Mobile scrolled](scrolled-390.png)
- [320px mobile](mobile-320.png)
- [Loading](loading.png)
- [Desktop](desktop-1440.png)
