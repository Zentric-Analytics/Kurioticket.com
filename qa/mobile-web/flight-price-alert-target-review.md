# Mobile Flight target alerts

Starting `dev`: `14e3d9dc976c5ee0ba759711a6c4b13da1b9be78`.

Mobile web Flight now uses a 1–15% price-drop slider, defaulting to 10%.
Desktop Flight retains its 1–50% range and modal presentation. Native Flight
reuses Hotel's target sheet instead of creating an automatic alert immediately
when the switch is turned on. Opening or cancelling the sheet does not create
an alert; saving creates a target alert. Existing automatic alerts remain
recognizable and pausable. Saved target alerts can be resumed.

Native saves use the lowest eligible live fare in its provider currency;
displayed metrics use the selected display currency when rates are available.
Hotel's existing labels, slider, currency conversion, and target save flow
remain in the shared component.

## Validation

- Web `npx tsc --noEmit`: passed.
- Native `npm run typecheck`: passed.
- Native full suite: 336 test files passed.
- Travel parity: 22 web/server contracts and 19 native contracts passed.
- Focused web alert tests: 13 passed.
- Changed web/QA lint: zero errors; one existing desktop ref-cleanup warning.
- Web full suite: 475 passed, 91 failed. The same starting `dev` revision had
  474 passed, 92 failed. No new failing files; the desktop-copy source check
  now scopes its assertion to the desktop editor.
- Browser coverage includes mobile and desktop bounds/defaults, no creation
  on open/cancel, target save, authoritative pause/resume, an out-of-range
  paused target, failed saving, and duplicate recovery.

Native tests cover models and component source contracts. An iOS/Android
simulator or device was not available; native sheet interactions were not
visually verified on a device.

## Run browser regression tests locally

Start the application and existing deterministic Flight fixture service:

```sh
npm run dev -- --webpack --hostname 127.0.0.1 --port 3040
node qa/mobile-web/browserstack/flight-fixture-proxy.mjs
```

In another terminal:

```sh
npx playwright test --config qa/mobile-web/browserstack/flight-price-alert-target.playwright.config.ts
```

`QA_BASE_URL` overrides the application URL and `QA_FLIGHT_FIXTURE_URL` the
fixture endpoint. `QA_CHROMIUM_PATH` selects an installed Chromium executable.
In environments that truncate large dev JS responses, `QA_LOCAL_CHUNKS=1`
serves exact local `.next/dev` assets through Playwright routing.
Auth and price-alert APIs are mocked: these tests create no real alerts.

Screenshots:

- [Mobile sheet](artifacts/flight-price-alert-390.png)
- [Desktop modal](artifacts/flight-price-alert-1440.png)
