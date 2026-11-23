# Mobile Flight Details provider card row

Place provider identity on the left, price with Trip total in the center, and the booking action on the right. Keep the selected blue outline, existing card shadow, real provider identity and existing price/checkout logic. Unavailable offers remain disabled.

Minimum card height changes from 92px to 80px. Nested grid columns align identity and price without duplicating markup or changing the radio-selection handlers. Action tap target increases from 36px to 44px; width becomes 88px at 320px and 96px from 360px. Responsive price typography keeps large prices readable. Provider names truncate within their column while retaining full accessible names. Provider logos fit the narrower column. Scoped important typography utilities counter the project's unlayered button font inheritance; action text stays on one line.

Branch: `fix/mobile-flight-details-surface-consistency`.
Starting HEAD: `aa9acfa30e4f5f2d9880468a4b6b8ce6be6b5d0d`.
Latest dev inspected/fast-forwarded: `b4cc100e665414c666448f280d0f333395a0f378`.

Validation: 62 Details and 5 provider-card tests pass. New row checks failed before implementation; existing caption/height assertions were updated without removing interaction coverage. Changed-file ESLint, TypeScript and diff checks pass. Fixture-backed Chromium at 320/390px verifies aligned centers, separate provider/price/action columns, no horizontal overflow, retained blue selection outline and disabled unavailable offers. Stress fixtures cover long provider names, large naira prices, keyboard offer selection and an enabled View deal through a mocked provider handoff. Navbar Back/Save/Share still work. Desktop before/after screenshots at 640/1440px are pixel-identical. Other fare-information panels, hero, itinerary/fare cards, Results, native and desktop implementation are unchanged.

Preview uses mocked APIs and an isolated development copy with instrumentation disabled; production instrumentation is unchanged. Checkout navigation is stubbed and never opens a real provider. Device Safari/live checkout were not tested.

[Before](before-390.png) · [After](after-390.png) · [Large price at 320px](long-price-320.png)
