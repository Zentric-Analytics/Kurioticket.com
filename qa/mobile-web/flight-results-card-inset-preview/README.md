# Mobile Flight Results card inset

Remove the mobile result-list negative margins and extra width. Cards now follow the existing 12px page gutter instead of extending to within 4px of the screen edge. Card typography, internal padding, shadows, behavior, headers, fare strip and price alert are unchanged. Flight Details and native are unchanged.

Branch: `fix/mobile-flight-details-surface-consistency`.
Starting HEAD: `5c3bf80de37f1edc433bd08a3aaa71c80ebf9c7b`.
Latest dev inspected: `89b6c7a4073097fbeef3f37fc4f6abacf7041d1f` (already contained in this branch).

Validation: 26 production-polish, 3 final-parity and 7 batch-parity tests pass; updated inset assertion fails before implementation. Changed-file ESLint, TypeScript and diff checks pass. Fixture-backed Chromium confirms left/right gutters change from 4px to 12px at 320/390px, with no horizontal overflow and working card links to Flight Details. Desktop screenshots at 640/1440px are pixel-identical.

Preview uses mocked flight/currency/auth APIs and an isolated instrumentation-disabled development copy. Production instrumentation is unchanged; device Safari was not tested.

[Before](before-390.png) · [After](after-390.png)
