# Mobile Flight Details white background

Match the mobile Hotel Details main background with the existing `bg-white` utility (`#FFFFFF`). Update the loaded and loading page/section backgrounds and use `text-white` with `currentColor` for the existing hero-edge curve. Navbar already inherits its parent background.

No card, fare tint, border, text, image, geometry or behavior changes. Desktop retains `sm:bg-[#F7F9FC]`.

Branch: `fix/mobile-flight-details-surface-consistency`.
Starting HEAD: `bae2fa963352e4ffdfd788b7e690a9c07bc5a6fd`.
Dev fetched and fast-forwarded before implementation: `66116eb73f9e18b348de6c3779630a66670ce5f1`; Flight Details had no intervening changes.

Validation: 62 focused Details tests pass; changed-file ESLint, TypeScript and diff checks pass. Updated appearance checks fail against the old background. Fixture-backed Chromium at 320/390px confirms white page/navbar/loading background, unchanged hero/card geometry, no overflow, and working Back, Save/Remove and clipboard Share. Before/after desktop screenshots at 640/1440px are pixel-identical. Hero source/dimensions and card/fare/text styling are unchanged; only the decorative curve's surface color changes. Native and Results are untouched.

Browser previews use an isolated development copy with instrumentation disabled to bypass the existing preview compilation issue; production instrumentation is unchanged. Device Safari and live authenticated actions were not tested.

[Before](before-mobile-390.png) · [After](after-mobile-390.png) · [Loading](after-loading.png)
