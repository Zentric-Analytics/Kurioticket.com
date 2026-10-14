# Uniform mobile provider action labels

Every mobile Flight Details provider action displays View deals, including unavailable, loading and redirecting states. Availability/price readiness/redirect guards and provider handoff are unchanged. Unavailable actions stay disabled. Accessible names always include View deals and append checkout unavailable or checking price when applicable; loading/redirecting actions expose aria-busy.

Validation: 62 Details and 6 provider tests pass; updated label assertion fails before implementation. Changed-file lint, typecheck and diff checks pass. Fixture-backed Chromium at 320/390px verifies available/unavailable/loading labels, disabled-state preservation, loading-to-ready transition, static label and aria-busy during redirect, mocked successful handoff with the original request payload, and no overflow. No real checkout occurs. Device Safari was not tested. Preview uses an isolated instrumentation-disabled copy; production instrumentation is unchanged.

[Available](available-390.png) · [Unavailable, still disabled](unavailable-390.png)
