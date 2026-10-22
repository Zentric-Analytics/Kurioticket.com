# Remove mobile Flight Details bottom divider

Remove only the mobile bottom border on the outer Details section, including its loading counterpart. Keep the responsive desktop border and the provider-card blue outline, active-tab underline, card shadows, backgrounds and layout unchanged.

Branch: `fix/mobile-flight-details-surface-consistency`.
Starting HEAD: `16a2fd3a7aca8445fc7edf59d65a0e8abcb073e0`.

Validation: 62 focused Details tests pass; new absence-of-divider assertions fail against the old section styles. Changed-file ESLint, TypeScript and diff checks pass. Fixture-backed Chromium at 320/390px confirms the section bottom border is now 0px (previously 1px), no overflow, retained provider-card outline and working Back, Save/Remove and clipboard Share. Desktop screenshots at 640/1440px are pixel-identical. Device Safari was not tested. Preview instrumentation is disabled only in the isolated development copy; production instrumentation is unchanged.

[Before](before-390.png) · [After](after-390.png)
