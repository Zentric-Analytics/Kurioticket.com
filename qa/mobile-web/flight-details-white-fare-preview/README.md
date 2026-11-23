# White mobile fare cards

Use shared `bg-white` for all mobile Pick your fare cards. Remove the selected pale-blue `#F4F8FF` fill and background-color transition. Selection retains its existing blue outline; unselected cards retain their neutral outline. Geometry, shadows, prices, benefits, accessibility and selection handlers are unchanged. Desktop/native/Results are unchanged.

Branch: `fix/mobile-flight-details-surface-consistency`.
Starting HEAD: `72388966d5392fb03187497c512b56f0783686b9`.
Latest dev inspected/fast-forwarded: `bbb21f44e683529733afce998ad52c2c568c89a8`. Incoming supplier-information changes are retained.

Validation: 62 focused Details tests pass; new fill assertions fail before implementation. Changed-file ESLint, TypeScript and diff checks pass. Fixture-backed Chromium at 320/390px verifies both fare cards stay white when selection changes, the blue outline moves to the selected card, and mouse/keyboard selection still works. Navbar Back/Save/Share checks pass with no overflow. The mobile fare rail remains hidden at 640/1440px. Only mobile fare-card style classes change in production code.

Previews use mocked APIs and an isolated instrumentation-disabled development copy; production instrumentation is unchanged. Device Safari was not tested.

[Before](before-390.png) · [After](after-390.png)
