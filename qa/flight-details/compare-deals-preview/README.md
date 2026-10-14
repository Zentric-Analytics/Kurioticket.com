# Flight Compare deals inline totals

Starting dev: `7f88129b8fb2529e08feca1a333203140fb0b512` (verified by fetch; newer than the prompt's example SHA).
Branch: `fix/mobile-flight-details-surface-consistency`. The existing branch was fast-forwarded to dev; no branch was created and `work` was untouched.

## Exact source and changes

Reference: `src/components/results/hotelDetails/HotelPriceComparisonSection.tsx`, current `DesktopProviderOffer` and `MobileProviderOffer` implementations.

The Flight price/basis previously used stacked block elements, and desktop placed the provider above that block inside a two-column card. Mobile also had an unnecessary margin beside the price and larger CTA typography than current Hotel.

- Both web Flight cards now display provider | amount + Trip total inline | View deal, with no Hotel information icon.
- Desktop uses Hotel's exact 88px minimum height, neutral border, rounded-xl white surface, px-5/py-4, gap-6, three-column pattern, 18px semibold price/24px line height, inline 11px muted basis with gap-1.5, and h-9/w-112px/rounded-lg CTA with 16px text, px-4 and matching hover/disabled opacity. The comparison list uses the reference's 680px maximum width.
- Mobile uses the current Hotel 76px minimum height, padding/border/radius, baseline-centered content, 13px price (10px below 350px), 10px muted basis (9px below 350px), inline gap-1, and the current mobile CTA typography/padding/clamp and disabled opacity.
- Flight retains its selectable radio control spanning the provider/price columns. A shrinkable provider column and truncation keep long names from pushing the intact price+basis unit or CTA outside the card. Provider/logo identity and fallback paths are retained; desktop logos follow the reference's 32px height/132px maximum width and mobile logos its 64px/48px caps.
- Visible CTA copy is singular View deal, including disabled/pending presentation. Accessible names retain the visible label plus unavailable/checking-price status where applicable; busy/disabled state remains exposed.
- Radio and price accessible names explicitly include Trip total. Arrow/Home/End selection and focus behavior are preserved.
- Price calculation, currency conversion/formatting, and selected-offer redirect code are unchanged. Both selection and continuation still receive the clicked deal's offerId.

The remainder of `DetailsSurface` and `FareDetails` onward is byte-identical to starting dev, covering Fare details, Fare conditions and Optional extras. No native files, Hotel files, hero, itinerary, Pick your fare, navbar, Flight Results or sticky booking action were edited.

## Before/after previews

Synthetic KAYAK-backed Priceline offer, NGN 419,351, rendered with the existing currency formatter. These are deterministic sandbox-response fixtures, not a live KAYAK capture.

| Width | Before | After |
| --- | --- | --- |
| 320px | [Before](before-320.png) | [After](after-320.png) |
| 390px | [Before](before-390.png) | [After](after-390.png) |
| 640px | [Before](before-640.png) | [After](after-640.png) |
| 1440px | [Before](before-1440.png) | [After](after-1440.png) |

## Validation

- 122 focused Flight Details, identity/fallback, Compare deals, desktop parity, KAYAK normalization/material grouping, supplier regression and selected-offer cases passed.
- 13 new browser cases passed at 320, 375, 390, 640 and 1440px; two desktop runs intentionally skip the mobile-only loading contract. Checks include inline baseline grouping, no document/card overflow, compact height, very long provider names, large prices, provider logo identity, singular/accessible CTA, keyboard selection, pending/unavailable states and exact clicked-offer handoff.
- Six existing structured KAYAK fare-information browser cases passed on mobile/desktop, including seller refresh, missing data/policy-only truthfulness and Duffel control behavior.
- TypeScript, focused ESLint and git diff --check passed.
- Full `npm test -- --test-concurrency=2`: 4,047 passed / 1 failed / 4,048 total. The sole failure is `src/components/results/hotelDetails/StandaloneHotelDetails.test.ts` — “mobile Rate details preserves an already-sticky tab row while the modal is open”. It expects the old Rate details dialog after Hotel switched to a popover, and was reproduced independently from starting dev. Neither that test nor Hotel UI was modified or weakened.

CSS blockifies an inline-flex grid item to computed display:flex; tests assert flex behavior, baseline alignment and actual non-stacked geometry, while source regressions pin the reference's inline-flex classes.

Browser commands:

```sh
QA_BASE_URL=http://127.0.0.1:3051 QA_CHROMIUM_PATH=/usr/bin/chromium KAYAK_PREVIEW_STATIC_ROOT=/workspace/work/flight-details-navbar-preview-09526/.next/dev npx playwright test --config qa/flight-details/compare-deals.playwright.config.ts
QA_BASE_URL=http://127.0.0.1:3051 QA_CHROMIUM_PATH=/usr/bin/chromium KAYAK_PREVIEW_STATIC_ROOT=/workspace/work/flight-details-navbar-preview-09526/.next/dev npx playwright test --config qa/flight-details/playwright.config.ts
```

The static-root override is optional and only supports this isolated preview environment; normal application behavior is unchanged.

## Files changed

- `src/components/results/flightDetails/MobileNativeFareInformationDeck.tsx`
- `src/components/results/flightDetails/StandaloneFlightDetails.tsx`
- `src/components/results/flightDetails/MobileNativeFareInformationDeck.test.ts`
- `src/components/results/flightDetails/StandaloneFlightDetails.test.ts`
- `src/components/results/desktopFlightMobileParityPort.test.ts`
- `qa/flight-details/compare-deals-layout.spec.ts`
- `qa/flight-details/compare-deals.playwright.config.ts`
- This report and eight comparison screenshots.
