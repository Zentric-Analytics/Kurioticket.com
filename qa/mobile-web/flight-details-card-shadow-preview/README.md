# Slightly stronger mobile Flight Details card shadow

Increase spread from -24px to -22px: `0 10px 28px -22px rgba(15,23,42,0.5)`. Offset, blur and opacity stay unchanged. Apply consistently to mobile itinerary, fare and selected provider cards, including loading states. Navbar control shadows stay unchanged.

The white page background, card/fare colors, blue borders, text, hero and geometry are untouched. Results, Hotels, desktop and native implementation changes are excluded from this adjustment.

Branch: `fix/mobile-flight-details-surface-consistency`.
Starting HEAD: `8b929320309488813aee9922ce98b9ea73dd8f0a`.
Latest dev inspected/merged safely: `89b6c7a4073097fbeef3f37fc4f6abacf7041d1f`. Incoming changes affected native Cars; Flight Details was unaffected.

Validation: 62 Details and 4 provider-card tests pass; relevant updated shadow expectations failed before implementation. Changed-file ESLint, TypeScript and diff checks pass. Fixture-backed Chromium at 320/390px verifies rendered shadow, unchanged backgrounds/geometry, no overflow and working Back, Save/Remove, keyboard navigation and clipboard Share. Before/after desktop screenshots at 640/1440px are pixel-identical. Source comparison confirms only the shadow spread changed in the four production files.

Preview uses isolated instrumentation-disabled development copy and mocked APIs; production instrumentation is unchanged. Device Safari/live authenticated actions were not tested.

[Before](before-mobile-390.png) · [After](after-mobile-390.png)
