# Flight Results viewport stability and Back-to-top surfaces

Starting dev: `902e541cb753ea8c08da86c7d2cfefedf6a1de8c` (fetched and verified).
Existing branch: `fix/mobile-flight-details-surface-consistency`.
Original branch HEAD: `30ae861745779dee2a1dd6fb453eecc77c69e0e7`.
The branch was clean, 65 commits behind dev, and safely fast-forwarded. No branch was created, no unrelated work was overwritten, and `work` was untouched.

## Diagnosis and implementation

The Edit Search drawer's existing fixed-body lock makes window scroll read zero while its negative body top preserves the apparent page position. The window virtualizer continued consuming that zero offset. Separately, its ResizeObserver/window-resize measurement calculated `scrollMargin` from the temporarily fixed body's rectangle. A viewport-height change while the sheet was open therefore cached a displaced list origin. On dismissal, scroll restoration and asynchronous viewport/origin observers could combine coordinates from different document states and render rows outside the visible viewport.

The timing depends on whether a resize/measurement happens while the body is fixed and which restoration callback arrives first. That accounts for the intermittent behavior and why another overlay cycle can correct the stale range. The browser regression reproduced three blank frames immediately after close: visible-card counts `[0, 0, 0, 3, 3, 3]` across six sampled frames. Initial repeated cycles without a height change recovered normally in both Chromium and WebKit; the long-lived production blank state itself was not reproduced locally.

Only the mobile Flight list opts into a new viewport adapter:

- Keep the last unlocked window offset while the body is fixed, including nested picker changes. Keep virtualization enabled and preserve its existing row measurements.
- Avoid recalculating the list's document origin from fixed-body geometry.
- Observe body style restoration. Its MutationObserver microtask runs after the existing synchronous style restoration and `scrollTo`. Reconcile origin/width and notify the offset observer in one synchronous React commit before paint, including when the native scroll event is coalesced.
- Cancel any pending geometry frame when reconciling. Disconnect the observer and native listeners on disposal.

No new timers, navigation, search, spinner, inventory reset, or list remount are used. The shared scroll-lock implementation, canvas cleanup, drawer close animation and existing focus behavior remain unchanged. Other list consumers retain the default observer.

The existing single responsive Back-to-top button now uses `bg-white lg:bg-[#FEFFFF]`, matching the actual Flight cards: white on mobile/sm and RGB 254/255/255 at lg. Removing `sm:rounded-full` preserves `rounded-xl` at every size. Its position, safe-area offset, 44px size, arrow, border, shadows, z-index, 320px threshold, accessibility and click handler are unchanged.

## Scope and changed files

Production:

- `src/components/results/FlightResultsClient.tsx`: mobile-list opt-in and Back-to-top surface/shape only.
- `src/components/results/VirtualResultsList.tsx`: optional viewport observer/reconciliation; defaults retain the existing behavior.
- `src/components/results/flightResultsViewport.ts`: the opt-in Flight adapter.

Regression coverage:

- `src/components/results/flightResultsViewport.test.ts`
- `src/components/results/flightResultsProductionPolish.test.ts`
- `qa/mobile-web/helpers/flightResultsFixture.ts`
- `qa/mobile-web/tests/flights-edit-search.spec.ts`
- `qa/mobile-web/browserstack/flights-edit-search.playwright.config.ts`
- This report and the two previews below.

No Hotel, Car, native, Flight Details, Flight-card content/spacing/typography, provider, sorting/filtering, navbar, date-strip or filter-rail implementation was changed. The shared scroll lock was not modified. Existing untracked artifacts were preserved.

## Validation

- TypeScript (`npx tsc --noEmit`): passed.
- ESLint for all changed TypeScript/TSX files: passed.
- `git diff --check`: passed.
- Focused Flight Results, drawer/picker, overlay, scroll-lock and viewport tests: 225 passed / one baseline failure (226 total). The baseline failure is the existing desktop Flight navbar loading source contract listed below.
- Direct changed-behavior/drawer/scroll-lock regression run: 48 passed, zero failures.
- Browser matrix: 14 applicable cases validated across Chromium mobile 320/390px, WebKit mobile 390px, and Chromium desktop 768/1440px. Six mobile-only cases intentionally skip desktop projects. The complete matrix initially passed 13 cases; the remaining WebKit stress test had an initial-request-readiness setup failure, then passed after readiness was based on completed requests and stable layout instead of assuming every nearby fare cell settles. No cancellation or layout assertions were removed.
- Each mobile stress case runs 10 cancellations at each of top, 1,800px and 6,500px scroll depths: 90 cancellations across the three mobile projects. It verifies exact scroll position, same visible card/location, same mounted list, bounded rows, count, selected Stops filter, Cheapest sort, URL/navigation count, request count, local/session state, body/root cleanup, no horizontal drift, focus restoration and no loading transition. It uses X, backdrop and Escape, changes viewport height and immediately reopens after completed dismissal.
- Inner airport, date and traveler pickers were each opened/closed before dismissing Edit Search, verifying the outer lock remains owned and final cleanup restores scrolling.
- Frame-level close regression passes without a blank frame following the toolbar-height change in both engines.
- Back-to-top computed color equals its result card at all five projects; size/radius/icon and scrolling to top pass.
- Existing 3,000-result Flight virtualization and desktop/mobile resize cases: four passed using the original assertions with the local preview transport adapter. Last result remains reachable with fewer than 30 mounted rows and a single mounted responsive layout.
- Full repository suite: **4,058 passed / nine failed / 4,067 total**. The untouched starting dev had **4,054 passed / the exact same nine failures / 4,063 total**. The four new unit tests account for the additional passes. No baseline tests or unrelated implementations were weakened or changed.

The baseline failures, reproduced before editing:

1. `AppHeader.mobileNavigation.test.ts`: results navbar can render filters as part of the mobile header body.
2. `carsFilterResultsTransition.test.ts`: Compare deals selection stays mounted and never uses the full-page Cars skeleton.
3. `carsResultsDesktopSurfaceParity.test.ts`: standalone Cars Results matches the Hotels white desktop body while preserving mobile canvases.
4. `carsResultsDesktopSurfaceParity.test.ts`: desktop Cars results body is compact, centered, and keeps shared surfaces aligned.
5. `carsResultsDesktopSurfaceParity.test.ts`: KAYAK car cards and loading canvases stay inside the same standalone desktop surface contract.
6. `carsResultsDesktopTypography.test.ts`: desktop Cars Results uses the same Inter foundation as mobile web.
7. `carsResultsStickySearch.test.ts`: source-contract: sticky editor lifecycle keeps scroll locking independent from nested controls.
8. `flightResultsHotelDesktopChrome.test.ts`: desktop Flight Results keeps page-owned navbar geometry while search waits for readiness.
9. `hotelMobileResultsNavEditIcon.test.ts`: mobile web Hotel results navbar uses an edit icon for the search summary.

## Previews and limits

Synthetic inventory was used; no live provider search or native app was involved. No reproduction video was available in the attachments. WebKit automation covers the engine and simulated toolbar-height changes; physical iOS Safari browser chrome/safe-area behavior was not tested on a device. The opt-in adapter relies on the existing fixed-body lock's inline `position: fixed` contract; changing that locking strategy requires updating its observer contract and tests together.

[Mobile 390px](mobile-390.png) · [Desktop 1440px](desktop-1440.png)

## Browser command

Start the application locally, then run:

```sh
QA_BASE_URL=http://127.0.0.1:3051 npx playwright test --config qa/mobile-web/browserstack/flights-edit-search.playwright.config.ts
```

Install Chromium and WebKit with Playwright first. Optional `QA_CHROMIUM_PATH`/`QA_WEBKIT_PATH` select installed executables. `QA_STATIC_ROOT` is only for the local environment's static-chunk transport adapter and is unnecessary with a normal local server.

## PR refresh against latest dev

Before opening the PR, latest dev was fetched again at `38464183e040aa9b731eaa260b45080796cf073e` and safely merged into the existing branch. Its 17 additional commits were Cars changes; the Flight implementation and PR scope remain unchanged.

After the merge, TypeScript, focused ESLint, all 48 direct regression tests and diff checks passed. The refreshed full suite reports **4,061 passed / nine failed / 4,070 total**. The exact same nine failures listed above were independently reproduced in an archived, untouched copy of latest dev (50 passed / nine failed across the seven affected test files). No additional failure was introduced.
