# Mobile Flight Details blue lines

Starting `dev`: `7e9698de73ada32da8768e10d467151672e67544`.

The selected fare card, selected provider card, and active-tab underline use
`#075EE8`. The provider border now declares 1.5px, matching the existing fare
card border. The tab underline retains its 3px height. Its focus ring also
uses the same blue. Existing backgrounds, shadows, and selection/booking
behavior are preserved. Desktop and native app implementations are unchanged.

Changed implementation: `MobileNativeFareInformationDeck.tsx`. Existing
provider-card and tab regression tests were updated in
`MobileNativeFareInformationDeck.test.ts` and `StandaloneFlightDetails.test.ts`.

Validation:

- All four provider-card tests passed; the updated styling assertion failed
  before the implementation and passed afterward.
- The affected fare-information tab regression passed.
- Changed-component and focused-test lint passed without findings.
- `npx tsc --noEmit` passed.
- At a 390px viewport, the browser measured all three blue styles as
  `rgb(7, 94, 232)` and verified both cards use the same border width. Both
  declare 1.5px in CSS; the preview Chromium computed both as 1px. The
  underline measured 3px. Switching tabs and returning to Compare deals worked.
- Preview uses deterministic fixture data and mocked APIs; no live booking
  or native device interaction was performed.

Previews:

- [Full mobile viewport](mobile.png)
- [Fare card](fare-card.png)
- [Provider card and tabs](deal-and-tabs.png)
