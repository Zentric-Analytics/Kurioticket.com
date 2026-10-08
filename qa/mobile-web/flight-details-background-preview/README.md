# Mobile Flight Details background

Starting `dev`: `10397fccfafc7984bbddbebee6bf951e8b67477b`.

Mobile Flight Results uses `#F5F7FB`. Flight Details previously repeated
`#F3F6FA` in the loaded and loading page backgrounds, hero section, hero curve,
and scroll header cover. Those surfaces now use `#F5F7FB` consistently.
Desktop backgrounds retain the existing `sm:` styles. Native app files and
the mobile Flight Results canvas were not changed. The additional desktop
form task is documented in [the combined preview](../combined-flight-preview/README.md).

Files changed:

- `src/components/results/flightDetails/StandaloneFlightDetails.tsx`
- `src/components/results/flightDetails/FlightDetailsLoadingShell.tsx`
- `src/components/results/flightDetails/StandaloneFlightDetails.test.ts`
- This preview directory.

Validation:

- `npx tsc --noEmit`: passed.
- Three affected background/geometry tests: passed; confirmed they failed
  before the color correction.
- Full Details test file: 54 passed, 7 failed. Starting `dev`: 53 passed,
  8 failed. Remaining failures reproduce on the baseline. Corrected a
  mis-escaped whitespace expression in the existing mobile composition test.
- Changed-file lint: three existing `react-hooks/set-state-in-effect` errors,
  also reproduced from the starting `dev` source. No new lint errors.
- Browser measurements at 390px and 639px: loaded and loading page surfaces
  use `rgb(245, 247, 251)` (`#F5F7FB`). The curve, hero section, and scrolled
  header cover match.
- Browser measurements at 640px and 1440px: loaded and loading page surfaces
  remain `rgb(247, 249, 252)` (`#F7F9FC`); desktop hero section remains white.
- Screenshots use deterministic mock Flight Details and currency responses.
  Local Next dev-server hydration errors required retrying the 640px preview;
  this validates rendered colors, not an end-to-end provider booking flow.

Previews:

- [Mobile](mobile.png)
- [Mobile scrolled](mobile-scrolled.png)
- [Mobile loading](mobile-loading.png)
- [Desktop](desktop.png)
