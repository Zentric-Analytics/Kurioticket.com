# Mobile Flight Details navbar polish

Branch: `fix/mobile-flight-details-surface-consistency`

Starting HEAD: `09526c73dc15bd04b3d410e64d4b966516ac43d5`

Latest dev inspected: `b26cc3fba8d5b62e18c3c6995155415f962ac68b`

The branch was two commits behind dev; merged safely without conflicts at `6e36335ae7b51fe3153cd2c37c7677be3ba9b7a3`. Incoming changes concerned Cars, not Flight Details.

## Changes

The navbar now inherits the existing Details page background rather than repeating its color. Mobile navbar height is 60px plus safe-area inset (previously 64px), with 8px vertical and 16px horizontal padding. Back and the grouped Heart/Share control share a white rounded surface, subtle inset ring and lighter shadow, without backdrop blur. All controls retain 44px touch targets; the action group is 92px wide including its 4px gap. Existing Lucide icons now all measure 20px with stroke width 2 and no horizontal offsets. Behavior and accessibility attributes are preserved. Loading and loaded views use the same treatment.

## Validation

- Existing focused component tests: 62 passed, zero failed.
- ESLint on the four changed component/test files: passed.
- `npx tsc --noEmit`: passed.
- `git diff --check`: passed.
- Chromium at 320px and 390px: loading/loaded background and height match; background equals parent page and follows a temporary parent-color change; centered icons and 44px square targets; no horizontal overflow; keyboard order, Save/Remove, clipboard sharing, sticky navigation and Back query preservation pass.
- Chromium at 640px and 1440px: navbar hidden and before/after screenshots pixel-identical.
- Source below the navbar is byte-for-byte unchanged in loaded and loading components. Hero height stays 254px on mobile; no hero/content, Results, native or desktop UI changes.

Preview used deterministic API fixtures. An isolated non-git copy disabled instrumentation to bypass an existing development compilation issue; production instrumentation is unchanged. Browser checks used clipboard fallback and guest saved-flight state, not live account/network mutations. Device Safari was not run.

[Before, 390px](before-mobile-390.png) · [After, 390px](after-mobile-390.png) · [After, 320px](after-mobile-320.png) · [Loading](after-loading.png)
