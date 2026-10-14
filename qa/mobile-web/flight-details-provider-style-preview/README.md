# Mobile provider-card style parity

Flight Compare deals now follows the actual mobile Hotel provider-card styling. It retains its real provider/prices, Trip total label, blue selected outline and booking/selection handlers. No information icon is added, as requested.

| Property | Matched styling |
| --- | --- |
| Card | 76px minimum height, 12px internal padding, 12px radius, 1px border, white, no shadow |
| Outer inset / list | 16px inset, 8px between cards, 2px top / 6px bottom list padding |
| Provider name | Inter 12px, weight 600, 20px line height, #1A1A1A |
| Price | Inter 16px, weight 600, 20px line height, #1A1A1A |
| Total label | Inter 10px, weight 400, 16px line height, #595959 |
| Button | Inter 16px, 32px minimum height, natural width, 10px horizontal padding, 8px radius, #004BB8 |

The button's computed weight is 400 and line height 24px in both components because the existing global button font inheritance overrides layered utilities. Flight now uses the same classes, rather than forced smaller typography.

Columns and rows use CSS subgrid so the existing selection button shares the same baseline positions as the outer row. Provider logos use the same image styling; authoritative airline logos retain broken-image fallback via an optional provider treatment. Default identity-mark styling is unchanged.

Branch: `fix/mobile-flight-details-surface-consistency`.
Starting HEAD: `4195a5a63e33df9123e978be6a28b579227bd24c`.
Latest dev inspected/merged safely: `15fcdcf81b3ac544398c7c0d62f31947b56b6429`. Existing white-fare-card work is retained.

Validation: 62 Details and 6 provider/identity tests pass; changed-file lint, typecheck and diff checks pass. The parity test reads actual Hotel classes, and the real components are rendered together in an isolated preview. Chromium at 320/390/430px verifies matching computed card size, padding, border thickness/radius, shadow, text styles, button dimensions and relative provider/price/action positions. No horizontal overflow occurs. Stress fixtures verify long provider names, large naira prices, keyboard selection, enabled mocked provider handoff and existing navbar Back/Save/Share. Alignment checks use the measured Hotel baseline geometry instead of the previous centered-row target.

Hotel source/UI, hero, itinerary/fare cards, other fare-information panels, Results, native and desktop styling are unchanged. The identity-mark default and broken-logo fallback are covered. Device Safari and live checkout were not tested. The preview-only comparison route and instrumentation workaround are confined to an isolated non-git copy; no production instrumentation changes are included.

In the screenshots the Hotel card is above the Flight card:

[Before](before-390.png) · [After](after-390.png) · [Computed comparison](computed-style-comparison.json)
